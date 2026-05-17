const slugify  = require('slugify');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');
const { query, isMysql } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const toSlug = (t) => slugify(t, { lower: true, strict: true, locale: 'vi' });
const isStrongPassword = (password) =>
  typeof password === 'string'
  && password.length >= 8
  && /[A-Za-z]/.test(password)
  && /\d/.test(password)
  && /[^A-Za-z0-9]/.test(password);

const firstRow = (res) => res.rows[0];
const settingsKeyCol = isMysql ? 'setting_key' : 'key';
const settingsKeyAlias = isMysql ? '`key`' : 'key';

const fetchPermissionRows = async (codes) => {
  if (!codes.length) return [];
  const placeholders = codes.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await query(`SELECT id FROM permissions WHERE code IN (${placeholders})`, codes);
  return rows;
};

const postsCtrl = {
  getAll: asyncHandler(async (req, res) => {
    const { limit = 10, offset = 0 } = req.query;
    const { rows } = await query(
      `SELECT id, title, slug, thumbnail, seo_description AS excerpt, published_at, created_at
       FROM posts WHERE is_published = TRUE
       ORDER BY (published_at IS NULL), published_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    res.json({ data: rows });
  }),

  getOne: asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT p.*, u.full_name AS author_name
       FROM posts p LEFT JOIN admin_users u ON u.id = p.author_id
       WHERE p.slug = $1 AND p.is_published = TRUE`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Bài viết không tồn tại' });
    res.json(rows[0]);
  }),

  adminList: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    if (search) { params.push(`%${search}%`); where = `WHERE title ILIKE $1`; }
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await query(
      `SELECT p.id, p.title, p.slug, p.is_published, p.published_at, p.created_at,
              u.full_name AS author_name
       FROM posts p LEFT JOIN admin_users u ON u.id = p.author_id
       ${where} ORDER BY p.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: rows });
  }),

  create: asyncHandler(async (req, res) => {
    const { title, content, thumbnail, seo_title, seo_description, is_published } = req.body;
    if (!title) return res.status(400).json({ error: 'Tiêu đề bài viết là bắt buộc' });

    const slug = toSlug(title);
    const published_at = is_published ? new Date() : null;

    const result = await query(
      `INSERT INTO posts (author_id, title, slug, content, thumbnail, seo_title, seo_description, is_published, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [req.user.id, title, slug, content, thumbnail, seo_title, seo_description, !!is_published, published_at]
    );
    const { rows } = result.insertId
      ? await query('SELECT * FROM posts WHERE id = $1', [result.insertId])
      : await query('SELECT * FROM posts WHERE slug = $1', [slug]);
    res.status(201).json(rows[0]);
  }),

  update: asyncHandler(async (req, res) => {
    const { title, content, thumbnail, seo_title, seo_description, is_published } = req.body;
    const slug = title ? toSlug(title) : undefined;

    const { rows: cur } = await query('SELECT is_published FROM posts WHERE id = $1', [req.params.id]);
    if (!cur.length) return res.status(404).json({ error: 'Bài viết không tồn tại' });
    const published_at = (is_published && !cur[0].is_published) ? new Date() : undefined;

    await query(
      `UPDATE posts SET
         title           = COALESCE($1, title),
         slug            = COALESCE($2, slug),
         content         = COALESCE($3, content),
         thumbnail       = COALESCE($4, thumbnail),
         seo_title       = COALESCE($5, seo_title),
         seo_description = COALESCE($6, seo_description),
         is_published    = COALESCE($7, is_published),
         published_at    = COALESCE($8, published_at),
         updated_at      = NOW()
       WHERE id = $9`,
      [title, slug, content, thumbnail, seo_title, seo_description, is_published, published_at, req.params.id]
    );
    const { rows } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    if (!result.rowCount && !result.affectedRows) return res.status(404).json({ error: 'Bài viết không tồn tại' });
    res.json({ message: 'Đã xóa bài viết' });
  }),
};

const contactsCtrl = {
  create: asyncHandler(async (req, res) => {
    const { full_name, email, phone, subject, message } = req.body;
    if (!full_name || !message) {
      return res.status(400).json({ error: 'Họ tên và nội dung là bắt buộc' });
    }
    await query(
      'INSERT INTO contacts (full_name, email, phone, subject, message) VALUES ($1,$2,$3,$4,$5)',
      [full_name.trim(), email?.trim(), phone?.trim(), subject?.trim(), message.trim()]
    );
    res.status(201).json({ message: 'Gửi thành công. Chúng tôi sẽ phản hồi sớm nhất có thể!' });
  }),

  stats: asyncHandler(async (req, res) => {
    const now = new Date();
    const year = Math.min(9999, Math.max(2000, parseInt(req.query.year, 10) || now.getFullYear()));
    const rawMonth = parseInt(req.query.month, 10);
    const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;
    const monthFilter = month ? ' AND EXTRACT(MONTH FROM created_at) = $2' : '';
    const periodParams = month ? [year, month] : [year];

    const [monthlyR, subjectsR, totalAllR, unreadR, periodR] = await Promise.all([
      query(
        `SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
         FROM contacts
         WHERE EXTRACT(YEAR FROM created_at) = $1
         GROUP BY EXTRACT(MONTH FROM created_at)
         ORDER BY month`,
        [year]
      ),
      query(
        `SELECT COALESCE(NULLIF(subject, ''), 'Khác') AS subject, COUNT(*) AS count
         FROM contacts
         WHERE EXTRACT(YEAR FROM created_at) = $1${monthFilter}
         GROUP BY COALESCE(NULLIF(subject, ''), 'Khác')
         ORDER BY count DESC`,
        periodParams
      ),
      query('SELECT COUNT(*) AS count FROM contacts'),
      query('SELECT COUNT(*) AS count FROM contacts WHERE is_read = FALSE'),
      query(`SELECT COUNT(*) AS count FROM contacts WHERE EXTRACT(YEAR FROM created_at) = $1${monthFilter}`, periodParams),
    ]);

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: 0,
    }));
    monthlyR.rows.forEach(row => {
      const idx = Number(row.month) - 1;
      if (idx >= 0 && idx < 12) monthly[idx].count = Number(row.count || 0);
    });

    res.json({
      year,
      month,
      totalAll: Number(totalAllR.rows[0]?.count || 0),
      unread: Number(unreadR.rows[0]?.count || 0),
      totalPeriod: Number(periodR.rows[0]?.count || 0),
      subjects: subjectsR.rows.map(row => ({
        subject: row.subject || 'Khác',
        count: Number(row.count || 0),
      })),
      monthly,
    });
  }),

  list: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unread } = req.query;
    const offset = (page - 1) * limit;
    const where  = unread === 'true' ? 'WHERE is_read = FALSE' : '';
    const [listR, countR] = await Promise.all([
      query(`SELECT * FROM contacts ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [parseInt(limit), parseInt(offset)]),
      query(`SELECT COUNT(*) AS count FROM contacts ${where}`),
    ]);
    res.json({ data: listR.rows, total: parseInt(countR.rows[0].count) });
  }),

  markRead: asyncHandler(async (req, res) => {
    await query('UPDATE contacts SET is_read = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Đã đánh dấu đã đọc' });
  }),

  remove: asyncHandler(async (req, res) => {
    await query('DELETE FROM contacts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Đã xóa' });
  }),
};

const mediaCtrl = {
  upload: asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file được upload' });

    const url = `/uploads/${req.file.destination.includes('video') ? 'videos' : 'images'}/${req.file.filename}`;

    const result = await query(
      'INSERT INTO media (filename, url, mime_type, file_size, uploaded_by) VALUES ($1,$2,$3,$4,$5)',
      [req.file.originalname, url, req.file.mimetype, req.file.size, req.user.id]
    );
    const { rows } = result.insertId
      ? await query('SELECT * FROM media WHERE id = $1', [result.insertId])
      : await query('SELECT * FROM media WHERE url = $1 ORDER BY id DESC LIMIT 1', [url]);
    res.status(201).json(rows[0]);
  }),

  list: asyncHandler(async (req, res) => {
    const { page = 1, limit = 30, type } = req.query;
    const offset = (page - 1) * limit;
    const params = [parseInt(limit), parseInt(offset)];
    let where = '';
    if (type && ['image', 'video'].includes(type)) {
      params.unshift(`${type}/%`);
      where = 'WHERE mime_type LIKE $1';
    }
    const limitPos = type && ['image', 'video'].includes(type) ? 2 : 1;
    const offsetPos = limitPos + 1;
    const { rows } = await query(
      `SELECT m.*, u.full_name AS uploaded_by_name
       FROM media m LEFT JOIN admin_users u ON u.id = m.uploaded_by
       ${where} ORDER BY m.created_at DESC LIMIT $${limitPos} OFFSET $${offsetPos}`,
      params
    );
    res.json({ data: rows });
  }),

  remove: asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT url FROM media WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'File không tồn tại' });
    await query('DELETE FROM media WHERE id = $1', [req.params.id]);

    const filePath = path.join(process.cwd(), rows[0].url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: 'Đã xóa file' });
  }),
};

const settingsCtrl = {
  getPublic: asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT ${settingsKeyCol} AS setting_key, value FROM site_settings`);
    const settings = Object.fromEntries(rows.map(r => [r.setting_key, r.value]));
    res.json(settings);
  }),

  getAll: asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT id, ${settingsKeyCol} AS ${settingsKeyAlias}, value, type, label, updated_by, updated_at FROM site_settings ORDER BY id`);
    res.json(rows);
  }),

  update: asyncHandler(async (req, res) => {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }

    for (const [key, value] of Object.entries(updates)) {
      if (isMysql) {
        await query(
          `INSERT INTO site_settings (setting_key, value, updated_by, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by), updated_at = NOW()`,
          [key, String(value), req.user.id]
        );
      } else {
        await query(
          `INSERT INTO site_settings (key, value, updated_by, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (key) DO UPDATE SET
             value = EXCLUDED.value,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
          [key, String(value), req.user.id]
        );
      }
    }
    res.json({ message: 'Đã cập nhật cài đặt' });
  }),
};

const categoriesCtrl = {
  getAll: asyncHandler(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order, name'
    );
    res.json(rows);
  }),

  create: asyncHandler(async (req, res) => {
    const { name, description, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên danh mục là bắt buộc' });
    const slug = toSlug(name);
    const result = await query(
      'INSERT INTO categories (name, slug, description, sort_order) VALUES ($1,$2,$3,$4)',
      [name, slug, description, sort_order || 0]
    );
    const { rows } = result.insertId
      ? await query('SELECT * FROM categories WHERE id = $1', [result.insertId])
      : await query('SELECT * FROM categories WHERE slug = $1', [slug]);
    res.status(201).json(rows[0]);
  }),

  update: asyncHandler(async (req, res) => {
    const { name, description, sort_order, is_active } = req.body;
    const slug = name ? toSlug(name) : undefined;
    const result = await query(
      `UPDATE categories SET
         name       = COALESCE($1, name),
         slug       = COALESCE($2, slug),
         description= COALESCE($3, description),
         sort_order = COALESCE($4, sort_order),
         is_active  = COALESCE($5, is_active),
         updated_at = NOW()
       WHERE id = $6`,
      [name, slug, description, sort_order, is_active, req.params.id]
    );
    if (!result.rowCount && !result.affectedRows) return res.status(404).json({ error: 'Danh mục không tồn tại' });
    const { rows } = await query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  }),

  remove: asyncHandler(async (req, res) => {
    await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Đã xóa danh mục' });
  }),
};

const rbacCtrl = {
  getRoles: asyncHandler(async (req, res) => {
    const { rows: roles } = await query('SELECT * FROM roles ORDER BY id');
    const { rows: perms } = await query(
      `SELECT rp.role_id, p.code
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id`
    );
    res.json(roles.map(role => ({
      ...role,
      permissions: perms.filter(p => p.role_id === role.id).map(p => p.code),
    })));
  }),

  getPermissions: asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM permissions ORDER BY module, action');
    res.json(rows);
  }),

  createRole: asyncHandler(async (req, res) => {
    const { name, description, permissions = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên role là bắt buộc' });

    const result = await query('INSERT INTO roles (name, description) VALUES ($1,$2)', [name, description]);
    const { rows: roleRows } = result.insertId
      ? await query('SELECT * FROM roles WHERE id = $1', [result.insertId])
      : await query('SELECT * FROM roles WHERE name = $1', [name]);
    const role = roleRows[0];

    for (const p of await fetchPermissionRows(permissions)) {
      await query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2)', [role.id, p.id]);
    }
    res.status(201).json(role);
  }),

  updateRolePerms: asyncHandler(async (req, res) => {
    const { permissions = [] } = req.body;
    const { id } = req.params;

    await query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    for (const p of await fetchPermissionRows(permissions)) {
      await query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2)', [id, p.id]);
    }
    res.json({ message: 'Đã cập nhật permissions' });
  }),

  getUsers: asyncHandler(async (req, res) => {
    const { rows: users } = await query('SELECT id, email, full_name, is_active, last_login, created_at FROM admin_users ORDER BY created_at');
    const { rows: roles } = await query(
      `SELECT aur.admin_user_id, r.name
       FROM admin_user_roles aur
       JOIN roles r ON r.id = aur.role_id`
    );
    res.json(users.map(user => ({
      ...user,
      roles: roles.filter(r => r.admin_user_id === user.id).map(r => r.name),
    })));
  }),

  createUser: asyncHandler(async (req, res) => {
    const { email, password, full_name, roles = [] } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, mật khẩu và họ tên là bắt buộc' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'Mật khẩu tối thiểu 8 ký tự, có chữ, số và ký tự đặc biệt' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO admin_users (email, password_hash, full_name) VALUES ($1,$2,$3)',
      [email.toLowerCase(), hash, full_name]
    );
    const { rows: userRows } = result.insertId
      ? await query('SELECT id, email, full_name FROM admin_users WHERE id = $1', [result.insertId])
      : await query('SELECT id, email, full_name FROM admin_users WHERE email = $1', [email.toLowerCase()]);
    const user = userRows[0];
    for (const roleName of roles) {
      const { rows: [role] } = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
      if (role) await query('INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES ($1,$2)', [user.id, role.id]);
    }
    res.status(201).json(user);
  }),

  updateUserRoles: asyncHandler(async (req, res) => {
    const { roles = [] } = req.body;
    const { id } = req.params;

    await query('DELETE FROM admin_user_roles WHERE admin_user_id = $1', [id]);
    for (const roleName of roles) {
      const { rows: [role] } = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
      if (role) await query('INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES ($1,$2)', [id, role.id]);
    }
    res.json({ message: 'Đã cập nhật roles' });
  }),

  toggleUser: asyncHandler(async (req, res) => {
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ error: 'Không thể tự khóa tài khoản đang đăng nhập' });
    }
    const { rows } = await query('SELECT id, is_active FROM admin_users WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'User không tồn tại' });
    const nextActive = !rows[0].is_active;
    await query('UPDATE admin_users SET is_active = $1, updated_at = NOW() WHERE id = $2', [nextActive, req.params.id]);
    res.json({ id: rows[0].id, is_active: nextActive });
  }),
};

module.exports = { postsCtrl, contactsCtrl, mediaCtrl, settingsCtrl, categoriesCtrl, rbacCtrl };
