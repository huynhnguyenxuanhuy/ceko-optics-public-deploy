-- ============================================================
-- CEKO OPTICS — Seed Data
-- ============================================================

-- ── ROLES ───────────────────────────────────────────────────
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Toàn quyền hệ thống'),
  ('admin',       'Quản lý nội dung toàn bộ'),
  ('editor',      'Viết và chỉnh sửa nội dung'),
  ('viewer',      'Chỉ xem, không chỉnh sửa');

-- ── PERMISSIONS ─────────────────────────────────────────────
INSERT INTO permissions (code, module, action) VALUES
  -- Products
  ('products:read',   'products', 'read'),
  ('products:create', 'products', 'create'),
  ('products:update', 'products', 'update'),
  ('products:delete', 'products', 'delete'),
  -- Categories
  ('categories:read',   'categories', 'read'),
  ('categories:create', 'categories', 'create'),
  ('categories:update', 'categories', 'update'),
  ('categories:delete', 'categories', 'delete'),
  -- Posts
  ('posts:read',   'posts', 'read'),
  ('posts:create', 'posts', 'create'),
  ('posts:update', 'posts', 'update'),
  ('posts:delete', 'posts', 'delete'),
  ('posts:publish','posts', 'publish'),
  -- Media
  ('media:read',   'media', 'read'),
  ('media:upload', 'media', 'upload'),
  ('media:delete', 'media', 'delete'),
  -- Contacts
  ('contacts:read',   'contacts', 'read'),
  ('contacts:delete', 'contacts', 'delete'),
  -- Settings
  ('settings:read',   'settings', 'read'),
  ('settings:update', 'settings', 'update'),
  -- RBAC
  ('rbac:read',   'rbac', 'read'),
  ('rbac:manage', 'rbac', 'manage'),
  -- Admin users
  ('users:read',   'users', 'read'),
  ('users:create', 'users', 'create'),
  ('users:update', 'users', 'update'),
  ('users:delete', 'users', 'delete');

-- ── ROLE PERMISSIONS ────────────────────────────────────────
-- super_admin: tất cả
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin';

-- admin: tất cả trừ rbac:manage, users:delete
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.code NOT IN ('rbac:manage','users:delete');

-- editor: read/create/update posts, products (không delete), media upload, contacts:read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'editor'
  AND p.code IN (
    'products:read','products:create','products:update',
    'categories:read',
    'posts:read','posts:create','posts:update',
    'media:read','media:upload',
    'contacts:read'
  );

-- viewer: chỉ read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND p.action = 'read';

-- ── ADMIN USER MẶC ĐỊNH ─────────────────────────────────────
-- Password bàn giao: admin102@ (đổi ngay sau khi khách nhận hệ thống)
INSERT INTO admin_users (email, password_hash, full_name, is_active)
VALUES (
  'cekooptics@gmail.com',
  '$2a$12$ZyKeXjmiWYo.1WjO40HXHeLnJb8.SV36vkhu2il/n2Vv1FDmM3Fjq',
  'Super Admin',
  TRUE
);

-- Gán role super_admin cho admin mặc định
INSERT INTO admin_user_roles (admin_user_id, role_id)
SELECT u.id, r.id FROM admin_users u, roles r
WHERE u.email = 'cekooptics@gmail.com' AND r.name = 'super_admin';

-- ── CATEGORIES MẶC ĐỊNH ─────────────────────────────────────
INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('Tròng đổi màu Photochromic', 'trong-doi-mau', 'Tròng kính tự động đổi màu theo ánh sáng', 1),
  ('Tròng chống ánh sáng xanh',  'chong-asx',     'Tròng kính Blue Cut chống tia xanh',        2),
  ('Tròng MR-8',                 'mr-8',           'Tròng kính chiết suất cao MR-8 Nhật Bản',   3),
  ('Đa tròng Progressive',       'progressive',    'Tròng kính đa tròng Free Form',             4);

-- ── SITE SETTINGS MẶC ĐỊNH ──────────────────────────────────
INSERT INTO site_settings (key, value, type, label) VALUES
  ('site_name',    'CEKO OPTICS',                             'text',  'Tên website'),
  ('site_tagline', 'Chuyên gia tròng kính đổi màu thế hệ mới','text', 'Tagline'),
  ('hotline',      '0899836994',                              'text',  'Hotline'),
  ('email',        'cekooptics@gmail.com',                    'text',  'Email liên hệ'),
  ('address',      'Tầng 2 LK16, Khu Đại Hoàng Long, Phường Võ Cường, Tỉnh Bắc Ninh', 'text', 'Địa chỉ'),
  ('facebook',     'https://www.facebook.com/share/14bLRtqWpYB/', 'text',  'Facebook URL'),
  ('zalo',         'https://zalo.me/0899836994',              'text',  'Zalo OA URL'),
  ('logo_url',     '',                                        'text',  'Logo URL'),
  ('seo_title',    'CEKO OPTICS — Tròng kính đổi màu Hàn Quốc', 'text', 'SEO Title mặc định'),
  ('seo_description','Chuyên gia tròng kính đổi màu Photochromic, Blue Cut, MR-8. SHMC chuẩn Hàn Quốc.', 'text', 'SEO Description mặc định');


-- CEKO PRODUCT CATALOG
WITH category_ids AS (
  SELECT slug, id FROM categories
), seeded_products AS (
  INSERT INTO products (category_id, name, slug, short_description, description, index_refraction, is_featured, sort_order)
  VALUES
    ((SELECT id FROM category_ids WHERE slug = 'trong-doi-mau'), '1.56 Photochromic Grey SHMC', '1-56-photochromic-grey-shmc', 'Đổi màu xám, SHMC, chặn 100% tia UV.', 'Tròng đổi màu nhanh, độ bền màu cao, màu sắc rõ nét và hạn chế ngả vàng.', '1.56', TRUE, 1),
    ((SELECT id FROM category_ids WHERE slug = 'trong-doi-mau'), '1.56 Photochromic Grey Blue Cut SHMC', '1-56-photochromic-grey-blue-cut-shmc', 'Bestseller cho dân văn phòng: đổi màu nhanh, chống ánh sáng xanh, giá tối ưu.', 'Tích hợp Photochromic, Blue Cut và SHMC; phù hợp làm việc màn hình, lái xe và hoạt động ngoài trời.', '1.56', TRUE, 2),
    ((SELECT id FROM category_ids WHERE slug = 'trong-doi-mau'), '1.56 Photochromic Brown SHMC', '1-56-photochromic-brown-shmc', 'Đổi màu nâu tự nhiên, SHMC, bảo vệ UV toàn diện.', 'Màu nâu dịu mắt, phản ứng ánh sáng ổn định, phù hợp sử dụng hằng ngày.', '1.56', FALSE, 3),
    ((SELECT id FROM category_ids WHERE slug = 'trong-doi-mau'), '1.60 Photochromic Grey Blue Cut SHMC', '1-60-photochromic-grey-blue-cut-shmc', 'Mỏng hơn, đổi màu xám, chống ánh sáng xanh.', 'Thiết kế mỏng nhẹ hơn 1.56, tích hợp Blue Cut và lớp phủ SHMC cao cấp.', '1.60', TRUE, 4),
    ((SELECT id FROM category_ids WHERE slug = 'trong-doi-mau'), '1.67 Photochromic Spinning Coating Grey/Brown BC SHMC', '1-67-photochromic-spinning-coating-grey-brown-bc-shmc', 'Chiết suất cao, spinning coating, tuỳ chọn xám/nâu.', 'Dòng chiết suất cao cho độ cận lớn, mỏng đẹp, đổi màu bền và chống ánh sáng xanh.', '1.67', FALSE, 5),
    ((SELECT id FROM category_ids WHERE slug = 'trong-doi-mau'), 'MR-8 Photochromic Series', 'mr-8-photochromic-series', 'Dòng MR-8 đổi màu cao cấp: Grey, Brown, Pink, Purple, Blue, Green.', 'Vật liệu MR-8 mỏng nhẹ, trong suốt cao, phù hợp gọng khoan và thiết kế hiện đại.', '1.60', TRUE, 6),
    ((SELECT id FROM category_ids WHERE slug = 'chong-asx'), '1.56 Blue Cut SHMC', '1-56-blue-cut-shmc', 'Kinh tế, đủ tính năng, lọc ánh sáng xanh có hại.', 'Giảm mỏi mắt khi dùng màn hình, màu sắc tự nhiên, chống UV toàn diện.', '1.56', TRUE, 7),
    ((SELECT id FROM category_ids WHERE slug = 'chong-asx'), '1.60 Blue Cut SHMC', '1-60-blue-cut-shmc', 'Mỏng hơn 1.56, chống ánh sáng xanh, SHMC.', 'Độ truyền sáng cao, không gây mờ sương, phù hợp sử dụng lâu trên màn hình.', '1.60', FALSE, 8),
    ((SELECT id FROM category_ids WHERE slug = 'chong-asx'), '1.60 MR-8 Blue Cut SHMC', '1-60-mr-8-blue-cut-shmc', 'MR-8 mỏng nhẹ, Blue Cut, SHMC.', 'Vật liệu MR-8 cao cấp kết hợp lọc ánh sáng xanh, phù hợp gọng khoan hiện đại.', '1.60', TRUE, 9),
    ((SELECT id FROM category_ids WHERE slug = 'chong-asx'), '1.67 Blue Cut SHMC', '1-67-blue-cut-shmc', 'Chiết suất cao, chống ánh sáng xanh, mỏng đẹp.', 'Dành cho độ cận cao, giữ thẩm mỹ gọng kính và bảo vệ mắt trước thiết bị số.', '1.67', FALSE, 10),
    ((SELECT id FROM category_ids WHERE slug = 'mr-8'), '1.60 MR-8 SHMC', '1-60-mr-8-shmc', 'MR-8 trong suốt, mỏng nhẹ, SHMC.', 'Tăng thẩm mỹ, hạn chế méo hình, phù hợp độ cận cao và gọng khoan.', '1.60', FALSE, 11),
    ((SELECT id FROM category_ids WHERE slug = 'mr-8'), '1.60 MR-8 Blue Cut SHMC', '1-60-mr8-blue-cut-shmc', 'MR-8 Blue Cut, mỏng nhẹ và sang trọng.', 'Kết hợp vật liệu MR-8 với lọc ánh sáng xanh, đeo lâu thoải mái.', '1.60', TRUE, 12),
    ((SELECT id FROM category_ids WHERE slug = 'mr-8'), '1.60 MR-8 Photochromic Grey Blue Cut SHMC', '1-60-mr-8-photochromic-grey-blue-cut-shmc', 'MR-8 đổi màu xám, Blue Cut, SHMC.', 'Dòng cao cấp mỏng nhẹ, đổi màu đậm, phù hợp gọng khoan và khách hàng cần thẩm mỹ.', '1.60', TRUE, 13),
    ((SELECT id FROM category_ids WHERE slug = 'progressive'), '1.56 Progressive Free Form SHMC', '1-56-progressive-free-form-shmc', 'Đa tròng Free Form, chuyển vùng nhìn mượt.', 'Tối ưu tầm nhìn xa, trung gian và gần; thích hợp người trung niên.', '1.56', FALSE, 14),
    ((SELECT id FROM category_ids WHERE slug = 'progressive'), 'Progressive Photochromic Blue Cut SHMC', 'progressive-photochromic-blue-cut-shmc', 'Đa tròng kết hợp đổi màu và chống ánh sáng xanh.', 'Giải pháp đa năng cho người cần nhìn nhiều khoảng cách và thường xuyên ra ngoài.', '', TRUE, 15)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, slug, name
)
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, img.url, p.name, TRUE, 0
FROM products p
JOIN (VALUES
  ('1-56-photochromic-grey-blue-cut-shmc', '/uploads/images/ceko-1-56-photochromic-grey-blue-cut-shmc.jpg'),
  ('1-56-photochromic-grey-shmc', '/uploads/images/ceko-1-56-photogrey-shmc.jpg'),
  ('1-60-blue-cut-shmc', '/uploads/images/ceko-1-60-clear-blue-cut-shmc.jpg'),
  ('1-60-mr-8-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-shmc.jpg'),
  ('1-60-mr-8-photochromic-grey-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-photogrey-shmc.jpg'),
  ('1-67-blue-cut-shmc', '/uploads/images/ceko-1-67-blue-cut-shmc.jpg')
) AS img(slug, url) ON img.slug = p.slug
WHERE NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id AND pi.url = img.url);


-- CEKO PRODUCT IMAGE LINKS
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, img.url, p.name, TRUE, 0
FROM products p
JOIN (VALUES
  ('1-56-photochromic-grey-blue-cut-shmc', '/uploads/images/ceko-1-56-photochromic-grey-blue-cut-shmc.jpg'),
  ('1-56-photochromic-grey-shmc', '/uploads/images/ceko-1-56-photogrey-shmc.jpg'),
  ('1-60-blue-cut-shmc', '/uploads/images/ceko-1-60-clear-blue-cut-shmc.jpg'),
  ('1-60-mr-8-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-shmc.jpg'),
  ('1-60-mr8-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-shmc.jpg'),
  ('1-60-mr-8-photochromic-grey-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-photogrey-shmc.jpg'),
  ('1-67-blue-cut-shmc', '/uploads/images/ceko-1-67-blue-cut-shmc.jpg')
) AS img(slug, url) ON img.slug = p.slug
WHERE NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id AND pi.url = img.url);
