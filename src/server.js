require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const fs        = require('fs');

const routes    = require('./routes');
const bcrypt    = require('bcryptjs');
const { query } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

const assertSecret = (name, minLength = 48) => {
  const value = process.env[name] || '';
  if (isProduction && value.length < minLength) {
    throw new Error(`${name} phải tối thiểu ${minLength} ký tự khi chạy production`);
  }
};
assertSecret('JWT_SECRET');
assertSecret('JWT_REFRESH_SECRET');

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ── SECURITY ────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // cho phép serve ảnh
  contentSecurityPolicy: false,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều request. Vui lòng thử lại sau.' },
}));

app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:4000,http://127.0.0.1:3000,http://127.0.0.1:4000,null')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));

// ── BODY PARSING ────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── LOGGING ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── STATIC FILES (uploads) ──────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── PUBLIC WEBSITE ──────────────────────────────────────────
const publicDir = process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { extensions: ['html'] }));
}

// ── HEALTH CHECK ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  env: process.env.NODE_ENV,
  time: new Date().toISOString(),
}));

app.post('/api/setup/sync-production', async (req, res, next) => {
  if (!process.env.JWT_SECRET || req.get('x-setup-token') !== process.env.JWT_SECRET) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
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

    for (const [key, value] of Object.entries(settings)) {
      await query(`
        INSERT INTO site_settings (setting_key, value, type, label)
        VALUES (?, ?, 'text', ?)
        ON DUPLICATE KEY UPDATE value = VALUES(value)
      `, [key, value, key]);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── ROUTES ──────────────────────────────────────────────────
app.use('/api', routes);

// ── ERROR HANDLERS ──────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── START ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ CEKO Backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
