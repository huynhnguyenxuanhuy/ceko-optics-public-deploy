const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// ── XÁC THỰC TOKEN ──────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Thiếu token xác thực' });
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Token không hợp lệ' });
    }

    // Kiểm tra user còn active không và token có bị cũ sau khi đổi mật khẩu không
    const { rows } = await query(
      'SELECT id, email, full_name, is_active, password_changed_at FROM admin_users WHERE id = $1',
      [payload.userId]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'Tài khoản không hợp lệ hoặc đã bị khóa' });
    }

    const changedAt = rows[0].password_changed_at ? Math.floor(new Date(rows[0].password_changed_at).getTime() / 1000) : 0;
    if (payload.iat && changedAt && payload.iat < changedAt) {
      return res.status(401).json({ error: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

// ── LẤY PERMISSIONS CỦA USER ────────────────────────────────
const getUserPermissions = async (userId) => {
  const { rows } = await query(
    `SELECT DISTINCT p.code
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN admin_user_roles aur ON aur.role_id = rp.role_id
     WHERE aur.admin_user_id = $1`,
    [userId]
  );
  return rows.map(r => r.code);
};

// ── KIỂM TRA PERMISSION ─────────────────────────────────────
// Dùng: authorize('products:create')
const authorize = (...requiredPerms) => async (req, res, next) => {
  try {
    const userPerms = await getUserPermissions(req.user.id);

    // Super admin bypass (có permission rbac:manage)
    if (userPerms.includes('rbac:manage')) return next();

    const hasAll = requiredPerms.every(p => userPerms.includes(p));
    if (!hasAll) {
      return res.status(403).json({ error: 'Không có quyền thực hiện thao tác này' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, authorize, getUserPermissions };
