require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const fs        = require('fs');

const routes    = require('./routes');
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
