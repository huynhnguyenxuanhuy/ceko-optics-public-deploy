-- CEKO OPTICS - MySQL/MariaDB seed for cPanel
SET NAMES utf8mb4;

INSERT IGNORE INTO roles (name, description) VALUES
  ('super_admin', 'Toàn quyền hệ thống'),
  ('admin', 'Quản lý nội dung toàn bộ'),
  ('editor', 'Viết và chỉnh sửa nội dung'),
  ('viewer', 'Chỉ xem, không chỉnh sửa');

INSERT IGNORE INTO permissions (code, module, action) VALUES
  ('products:read','products','read'),('products:create','products','create'),('products:update','products','update'),('products:delete','products','delete'),
  ('categories:read','categories','read'),('categories:create','categories','create'),('categories:update','categories','update'),('categories:delete','categories','delete'),
  ('posts:read','posts','read'),('posts:create','posts','create'),('posts:update','posts','update'),('posts:delete','posts','delete'),('posts:publish','posts','publish'),
  ('media:read','media','read'),('media:upload','media','upload'),('media:delete','media','delete'),
  ('contacts:read','contacts','read'),('contacts:delete','contacts','delete'),
  ('settings:read','settings','read'),('settings:update','settings','update'),
  ('rbac:read','rbac','read'),('rbac:manage','rbac','manage'),
  ('users:read','users','read'),('users:create','users','create'),('users:update','users','update'),('users:delete','users','delete');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p WHERE r.name = 'super_admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.name = 'admin' AND p.code NOT IN ('rbac:manage','users:delete');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.name = 'editor' AND p.code IN (
  'products:read','products:create','products:update','categories:read','posts:read','posts:create','posts:update','media:read','media:upload','contacts:read'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p WHERE r.name = 'viewer' AND p.action = 'read';

INSERT IGNORE INTO admin_users (email, password_hash, full_name, is_active)
VALUES ('cekooptics@gmail.com', '$2a$12$ZyKeXjmiWYo.1WjO40HXHeLnJb8.SV36vkhu2il/n2Vv1FDmM3Fjq', 'CEKO Admin', TRUE);

INSERT IGNORE INTO admin_user_roles (admin_user_id, role_id)
SELECT u.id, r.id FROM admin_users u JOIN roles r
WHERE u.email = 'cekooptics@gmail.com' AND r.name = 'super_admin';

INSERT IGNORE INTO categories (name, slug, description, sort_order) VALUES
  ('Tròng đổi màu Photochromic', 'trong-doi-mau', 'Tròng kính tự động đổi màu theo ánh sáng', 1),
  ('Tròng chống ánh sáng xanh', 'chong-asx', 'Tròng kính Blue Cut chống tia xanh', 2),
  ('Tròng MR-8', 'mr-8', 'Tròng kính chiết suất cao MR-8 Nhật Bản', 3),
  ('Đa tròng Progressive', 'progressive', 'Tròng kính đa tròng Free Form', 4);

INSERT IGNORE INTO site_settings (setting_key, value, type, label) VALUES
  ('site_name','CEKO OPTICS','text','Tên website'),
  ('site_tagline','Chuyên gia tròng kính đổi màu thế hệ mới','text','Tagline'),
  ('hotline','0899527574','text','Hotline'),
  ('email','cekooptics@gmail.com','text','Email liên hệ'),
  ('address','Tầng 2 LK16, Khu Đại Hoàng Long, Phường Võ Cường, Tỉnh Bắc Ninh','text','Địa chỉ'),
  ('facebook','https://www.facebook.com/share/14bLRtqWpYB/','text','Facebook URL'),
  ('zalo','https://zalo.me/0899527574','text','Zalo OA URL'),
  ('logo_url','','text','Logo URL'),
  ('seo_title','CEKO OPTICS — Tròng kính đổi màu Hàn Quốc','text','SEO Title mặc định'),
  ('seo_description','Chuyên gia tròng kính đổi màu Photochromic, Blue Cut, MR-8. SHMC chuẩn Hàn Quốc.','text','SEO Description mặc định'),
  ('favicon_url','','text','Favicon URL'),
  ('footer_intro','Chuyên gia tròng kính đổi màu thế hệ mới. Better Vision · Better Protection · Better Life.','text','Dòng giới thiệu footer'),
  ('footer_copy','© 2026 CEKO OPTICS · cekooptics.com.vn · Tất cả quyền được bảo lưu','text','Copyright footer'),
  ('home_hero_eyebrow','Công nghệ Hàn Quốc · SHMC Coating','text','Hero eyebrow'),
  ('home_hero_title_html','Chuyên gia tròng kính<br><em>đổi màu</em> thế hệ mới','textarea','Hero title'),
  ('home_hero_subtitle','Chuyên gia tròng kính đổi màu thế hệ mới — Photochromic hiện đại, Blue Cut, MR-8 chiết suất cao. Công nghệ phủ SHMC chuẩn Hàn Quốc.','textarea','Hero subtitle'),
  ('home_cta_primary','Xem sản phẩm','text','CTA chính'),
  ('home_cta_secondary','Yêu cầu báo giá','text','CTA phụ'),
  ('about_eyebrow','Về chúng tôi','text','About eyebrow'),
  ('about_title_html','CEKO OPTICS — <em>Định vị thương hiệu</em>','textarea','About title'),
  ('about_vision_title','Tầm nhìn','text','Tầm nhìn title'),
  ('about_vision_text','Trở thành thương hiệu tròng kính đổi màu uy tín và đối tác tin cậy trong ngành quang học hiện đại tại Việt Nam và quốc tế.','textarea','Tầm nhìn text'),
  ('about_mission_title','Sứ mệnh','text','Sứ mệnh title'),
  ('about_mission_text','Mang đến giải pháp tròng kính chất lượng cao với công nghệ hiện đại, giúp bảo vệ thị lực tốt hơn trong cuộc sống hằng ngày.','textarea','Sứ mệnh text'),
  ('about_values_title','Giá trị cốt lõi','text','Giá trị title'),
  ('about_values','Chất lượng\nUy tín\nĐổi mới\nĐồng hành','textarea','Giá trị list'),
  ('commitment_eyebrow','Cam kết từ CEKO OPTICS','text','Cam kết eyebrow'),
  ('commitment_title_html','Đối tác tin cậy<br>của ngành quang học','textarea','Cam kết title'),
  ('commitment_text','CEKO OPTICS phù hợp cho đại lý kính mắt, cửa hàng quang học, phòng khám mắt và nhà phân phối trên toàn quốc.','textarea','Cam kết text'),
  ('contact_eyebrow','Liên hệ & Báo giá','text','Liên hệ eyebrow'),
  ('contact_title_html','Hợp tác cùng<br>CEKO OPTICS','textarea','Liên hệ title'),
  ('contact_text','Chuyên cung cấp tròng kính sỉ và OEM thương hiệu riêng. Liên hệ với chúng tôi để nhận bảng giá và tư vấn miễn phí.','textarea','Liên hệ text'),
  ('contact_button','Gửi yêu cầu →','text','Nút gửi form');

INSERT IGNORE INTO products (category_id, name, slug, short_description, description, index_refraction, is_featured, sort_order) VALUES
  ((SELECT id FROM categories WHERE slug='trong-doi-mau'),'1.56 Photochromic Grey SHMC','1-56-photochromic-grey-shmc','Đổi màu xám, SHMC, chặn 100% tia UV.','Tròng đổi màu nhanh, độ bền màu cao, màu sắc rõ nét và hạn chế ngả vàng.','1.56',TRUE,1),
  ((SELECT id FROM categories WHERE slug='trong-doi-mau'),'1.56 Photochromic Grey Blue Cut SHMC','1-56-photochromic-grey-blue-cut-shmc','Bestseller cho dân văn phòng: đổi màu nhanh, chống ánh sáng xanh, giá tối ưu.','Tích hợp Photochromic, Blue Cut và SHMC; phù hợp làm việc màn hình, lái xe và hoạt động ngoài trời.','1.56',TRUE,2),
  ((SELECT id FROM categories WHERE slug='trong-doi-mau'),'1.56 Photochromic Brown SHMC','1-56-photochromic-brown-shmc','Đổi màu nâu tự nhiên, SHMC, bảo vệ UV toàn diện.','Màu nâu dịu mắt, phản ứng ánh sáng ổn định, phù hợp sử dụng hằng ngày.','1.56',FALSE,3),
  ((SELECT id FROM categories WHERE slug='trong-doi-mau'),'1.60 Photochromic Grey Blue Cut SHMC','1-60-photochromic-grey-blue-cut-shmc','Mỏng hơn, đổi màu xám, chống ánh sáng xanh.','Thiết kế mỏng nhẹ hơn 1.56, tích hợp Blue Cut và lớp phủ SHMC cao cấp.','1.60',TRUE,4),
  ((SELECT id FROM categories WHERE slug='trong-doi-mau'),'1.67 Photochromic Spinning Coating Grey/Brown BC SHMC','1-67-photochromic-spinning-coating-grey-brown-bc-shmc','Chiết suất cao, spinning coating, tuỳ chọn xám/nâu.','Dòng chiết suất cao cho độ cận lớn, mỏng đẹp, đổi màu bền và chống ánh sáng xanh.','1.67',FALSE,5),
  ((SELECT id FROM categories WHERE slug='trong-doi-mau'),'MR-8 Photochromic Series','mr-8-photochromic-series','Dòng MR-8 đổi màu cao cấp: Grey, Brown, Pink, Purple, Blue, Green.','Vật liệu MR-8 mỏng nhẹ, trong suốt cao, phù hợp gọng khoan và thiết kế hiện đại.','1.60',TRUE,6),
  ((SELECT id FROM categories WHERE slug='chong-asx'),'1.56 Blue Cut SHMC','1-56-blue-cut-shmc','Kinh tế, đủ tính năng, lọc ánh sáng xanh có hại.','Giảm mỏi mắt khi dùng màn hình, màu sắc tự nhiên, chống UV toàn diện.','1.56',TRUE,7),
  ((SELECT id FROM categories WHERE slug='chong-asx'),'1.60 Blue Cut SHMC','1-60-blue-cut-shmc','Mỏng hơn 1.56, chống ánh sáng xanh, SHMC.','Độ truyền sáng cao, không gây mờ sương, phù hợp sử dụng lâu trên màn hình.','1.60',FALSE,8),
  ((SELECT id FROM categories WHERE slug='chong-asx'),'1.60 MR-8 Blue Cut SHMC','1-60-mr-8-blue-cut-shmc','MR-8 mỏng nhẹ, Blue Cut, SHMC.','Vật liệu MR-8 cao cấp kết hợp lọc ánh sáng xanh, phù hợp gọng khoan hiện đại.','1.60',TRUE,9),
  ((SELECT id FROM categories WHERE slug='chong-asx'),'1.67 Blue Cut SHMC','1-67-blue-cut-shmc','Chiết suất cao, chống ánh sáng xanh, mỏng đẹp.','Dành cho độ cận cao, giữ thẩm mỹ gọng kính và bảo vệ mắt trước thiết bị số.','1.67',FALSE,10),
  ((SELECT id FROM categories WHERE slug='mr-8'),'1.60 MR-8 SHMC','1-60-mr-8-shmc','MR-8 trong suốt, mỏng nhẹ, SHMC.','Tăng thẩm mỹ, hạn chế méo hình, phù hợp độ cận cao và gọng khoan.','1.60',FALSE,11),
  ((SELECT id FROM categories WHERE slug='mr-8'),'1.60 MR-8 Blue Cut SHMC','1-60-mr8-blue-cut-shmc','MR-8 Blue Cut, mỏng nhẹ và sang trọng.','Kết hợp vật liệu MR-8 với lọc ánh sáng xanh, đeo lâu thoải mái.','1.60',TRUE,12),
  ((SELECT id FROM categories WHERE slug='mr-8'),'1.60 MR-8 Photochromic Grey Blue Cut SHMC','1-60-mr-8-photochromic-grey-blue-cut-shmc','MR-8 đổi màu xám, Blue Cut, SHMC.','Dòng cao cấp mỏng nhẹ, đổi màu đậm, phù hợp gọng khoan và khách hàng cần thẩm mỹ.','1.60',TRUE,13),
  ((SELECT id FROM categories WHERE slug='progressive'),'1.56 Progressive Free Form SHMC','1-56-progressive-free-form-shmc','Đa tròng Free Form, chuyển vùng nhìn mượt.','Tối ưu tầm nhìn xa, trung gian và gần; thích hợp người trung niên.','1.56',FALSE,14),
  ((SELECT id FROM categories WHERE slug='progressive'),'Progressive Photochromic Blue Cut SHMC','progressive-photochromic-blue-cut-shmc','Đa tròng kết hợp đổi màu và chống ánh sáng xanh.','Giải pháp đa năng cho người cần nhìn nhiều khoảng cách và thường xuyên ra ngoài.','',TRUE,15);

INSERT IGNORE INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, p.name, TRUE, 0
FROM products p JOIN (
  SELECT '1-56-photochromic-grey-shmc' slug, '/uploads/images/ceko-1-56-photogrey-shmc.jpg' url UNION ALL
  SELECT '1-56-photochromic-grey-blue-cut-shmc', '/uploads/images/ceko-1-56-photochromic-grey-blue-cut-shmc.jpg' UNION ALL
  SELECT '1-56-photochromic-brown-shmc', '/uploads/images/ceko-1-56-photogrey-shmc.jpg' UNION ALL
  SELECT '1-60-photochromic-grey-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-photogrey-shmc.jpg' UNION ALL
  SELECT '1-67-photochromic-spinning-coating-grey-brown-bc-shmc', '/uploads/images/ceko-1-67-blue-cut-shmc.jpg' UNION ALL
  SELECT 'mr-8-photochromic-series', '/uploads/images/ceko-1-60-mr8-blue-cut-photogrey-shmc.jpg' UNION ALL
  SELECT '1-56-blue-cut-shmc', '/uploads/images/ceko-1-60-clear-blue-cut-shmc.jpg' UNION ALL
  SELECT '1-60-blue-cut-shmc', '/uploads/images/ceko-1-60-clear-blue-cut-shmc.jpg' UNION ALL
  SELECT '1-60-mr-8-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-shmc.jpg' UNION ALL
  SELECT '1-67-blue-cut-shmc', '/uploads/images/ceko-1-67-blue-cut-shmc.jpg' UNION ALL
  SELECT '1-60-mr-8-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-shmc.jpg' UNION ALL
  SELECT '1-60-mr8-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-shmc.jpg' UNION ALL
  SELECT '1-60-mr-8-photochromic-grey-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-photogrey-shmc.jpg' UNION ALL
  SELECT '1-56-progressive-free-form-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-shmc.jpg' UNION ALL
  SELECT 'progressive-photochromic-blue-cut-shmc', '/uploads/images/ceko-1-60-mr8-blue-cut-photogrey-shmc.jpg'
) v ON v.slug = p.slug;
