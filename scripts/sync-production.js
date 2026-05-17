require('dotenv').config();

const bcrypt = require('bcryptjs');
const { query, pool } = require('../src/config/db');

const settings = {
  hotline: '089 95 27574',
  zalo: 'https://zalo.me/0899527574',
  facebook: 'https://www.facebook.com/share/14bLRtqWpYB/',
  email: 'cekooptics@gmail.com',
  site_name: 'CEKO OPTICS',
  site_tagline: 'Chuyên gia tròng kính đổi màu thế hệ mới',
  seo_title: 'CEKO OPTICS - Tròng kính đổi màu Hàn Quốc',
  seo_description: 'Chuyên gia tròng kính đổi màu Photochromic, Blue Cut, MR-8. SHMC chuẩn Hàn Quốc.',
};

async function main() {
  const passwordHash = await bcrypt.hash('Admin@2026', 12);
  await query(`
    INSERT INTO admin_users (email, password_hash, full_name, is_active)
    VALUES (?, ?, ?, TRUE)
    ON DUPLICATE KEY UPDATE
      password_hash = VALUES(password_hash),
      full_name = VALUES(full_name),
      is_active = TRUE,
      password_changed_at = CURRENT_TIMESTAMP
  `, ['cekooptics@gmail.com', passwordHash, 'CEKO Admin']);

  for (const [key, value] of Object.entries(settings)) {
    await query(`
      INSERT INTO site_settings (setting_key, value, type, label)
      VALUES (?, ?, 'text', ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value)
    `, [key, value, key]);
  }

  console.log('Production data synced');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (pool && pool.end) {
      await pool.end();
    }
  });
