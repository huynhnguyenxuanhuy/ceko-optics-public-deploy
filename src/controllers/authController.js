const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { getUserPermissions } = require('../middleware/auth');

const signAccess   = (userId) =>
  jwt.sign({ userId, type: 'access' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefresh  = (userId) =>
  jwt.sign({ userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const DUMMY_HASH = '$2a$12$ZyKeXjmiWYo.1WjO40HXHeLnJb8.SV36vkhu2il/n2Vv1FDmM3Fjq';

const isStrongPassword = (password) =>
  typeof password === 'string'
  && password.length >= 8
  && /[A-Za-z]/.test(password)
  && /\d/.test(password)
  && /[^A-Za-z0-9]/.test(password);

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
  }

  const { rows } = await query(
    'SELECT id, email, password_hash, full_name, is_active FROM admin_users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  const user = rows[0];

  // Luôn chạy bcrypt để tránh timing attack
  const validPass = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, DUMMY_HASH);

  if (!user || !validPass || !user.is_active) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
  }

  const accessToken  = signAccess(user.id);
  const refreshToken = signRefresh(user.id);

  // Lưu refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tokenHash(refreshToken), req.ip, req.get('user-agent') || '', expiresAt]
  );

  // Cập nhật last_login
  await query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [user.id]);

  const perms = await getUserPermissions(user.id);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.full_name },
    permissions: perms,
  });
});

// POST /api/auth/refresh
exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Thiếu refresh token' });

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn' });
  }

  if (payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Refresh token không hợp lệ' });
  }

  const { rows } = await query(
    `SELECT rt.id, u.is_active
     FROM refresh_tokens rt
     JOIN admin_users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
    [tokenHash(refreshToken)]
  );
  if (!rows.length || !rows[0].is_active) {
    return res.status(401).json({ error: 'Refresh token đã bị thu hồi' });
  }

  const accessToken = signAccess(payload.userId);
  res.json({ accessToken });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash(refreshToken)]);
  }
  res.json({ message: 'Đăng xuất thành công' });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, email, full_name, last_login FROM admin_users WHERE id = $1',
    [req.user.id]
  );
  const { rows: roleRows } = await query(
    `SELECT r.name
     FROM roles r
     JOIN admin_user_roles aur ON aur.role_id = r.id
     WHERE aur.admin_user_id = $1`,
    [req.user.id]
  );
  const perms = await getUserPermissions(req.user.id);
  const user  = rows[0];
  res.json({
    id: user.id, email: user.email, fullName: user.full_name,
    lastLogin: user.last_login, roles: roleRows.map(r => r.name),
    permissions: perms,
  });
});

// POST /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 8 ký tự, có chữ, số và ký tự đặc biệt' });
  }

  // Lấy password hash hiện tại
  const { rows } = await query(
    'SELECT password_hash FROM admin_users WHERE id = $1',
    [req.user.id]
  );

  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await query(
    'UPDATE admin_users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() WHERE id = $2',
    [newHash, req.user.id]
  );

  // Xóa tất cả refresh tokens → bắt đăng nhập lại trên thiết bị khác
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

  res.json({ message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
});
