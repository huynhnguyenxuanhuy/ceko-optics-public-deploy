// Bọc async route handler, tự bắt lỗi không cần try/catch
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.message}`);

  // Postgres unique violation
  if (err.code === '23505') {
    const field = err.detail?.match(/\((.+?)\)/)?.[1] || 'field';
    return res.status(409).json({ error: `${field} đã tồn tại` });
  }
  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Dữ liệu tham chiếu không hợp lệ' });
  }
  // Validation errors từ express-validator
  if (err.type === 'validation') {
    return res.status(422).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status < 500 ? err.message : 'Lỗi máy chủ nội bộ',
  });
};

// 404 handler
const notFound = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} không tồn tại` });
};

module.exports = { asyncHandler, errorHandler, notFound };
