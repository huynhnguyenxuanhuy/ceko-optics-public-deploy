const slugify  = require('slugify');
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const toSlug = (text) =>
  slugify(text, { lower: true, strict: true, locale: 'vi' });

const normalizeProduct = (product) => {
  if (!product) return product;
  if (typeof product.specifications === 'string') {
    try { product.specifications = JSON.parse(product.specifications); } catch { product.specifications = {}; }
  }
  return product;
};

const getProductImages = async (productId) => {
  const { rows } = await query(
    'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, id',
    [productId]
  );
  return rows;
};

const findProductById = async (id) => {
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  return normalizeProduct(rows[0]);
};

const findProductBySlug = async (slug, onlyActive = false) => {
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1${onlyActive ? ' AND p.is_active = TRUE' : ''}`,
    [slug]
  );
  return normalizeProduct(rows[0]);
};

exports.getAll = asyncHandler(async (req, res) => {
  const { category, featured, limit = 20, offset = 0 } = req.query;
  const conditions = ['p.is_active = TRUE'];
  const params = [];

  if (category) {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (featured === 'true') conditions.push('p.is_featured = TRUE');

  params.push(parseInt(limit), parseInt(offset));

  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS primary_image
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.sort_order ASC, p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json({ data: rows.map(normalizeProduct) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const product = await findProductBySlug(req.params.slug, true);
  if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  product.images = await getProductImages(product.id);
  res.json(product);
});

exports.adminList = asyncHandler(async (req, res) => {
  const { search, category, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const where  = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`p.name ILIKE $${params.length}`);
  }
  if (category) {
    params.push(category);
    where.push(`c.slug = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(parseInt(limit), parseInt(offset));

  const [listRes, countRes] = await Promise.all([
    query(
      `SELECT p.id, p.name, p.slug, p.is_active, p.is_featured, p.sort_order,
              c.name AS category_name, p.created_at
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ORDER BY p.sort_order, p.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    ),
    query(
      `SELECT COUNT(*) AS count FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereClause}`,
      params.slice(0, -2)
    ),
  ]);

  res.json({
    data:  listRes.rows,
    total: parseInt(countRes.rows[0].count),
    page:  parseInt(page),
    limit: parseInt(limit),
  });
});

exports.adminGetOne = asyncHandler(async (req, res) => {
  const product = await findProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  product.images = await getProductImages(product.id);
  res.json(product);
});

exports.create = asyncHandler(async (req, res) => {
  const { category_id, name, short_description, description,
          specifications, index_refraction, is_featured, sort_order } = req.body;

  if (!name) return res.status(400).json({ error: 'Tên sản phẩm là bắt buộc' });

  const slug = toSlug(name);

  const result = await query(
    `INSERT INTO products
       (category_id, name, slug, short_description, description,
        specifications, index_refraction, is_featured, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [category_id || null, name, slug, short_description, description,
     JSON.stringify(specifications || {}), index_refraction, !!is_featured, sort_order || 0]
  );
  const product = result.insertId ? await findProductById(result.insertId) : await findProductBySlug(slug);
  res.status(201).json(product);
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { category_id, name, short_description, description,
          specifications, index_refraction, is_featured, is_active, sort_order } = req.body;

  const existing = await findProductById(id);
  if (!existing) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

  const slug = name ? toSlug(name) : undefined;

  await query(
    `UPDATE products SET
       category_id       = COALESCE($1, category_id),
       name              = COALESCE($2, name),
       slug              = COALESCE($3, slug),
       short_description = COALESCE($4, short_description),
       description       = COALESCE($5, description),
       specifications    = COALESCE($6, specifications),
       index_refraction  = COALESCE($7, index_refraction),
       is_featured       = COALESCE($8, is_featured),
       is_active         = COALESCE($9, is_active),
       sort_order        = COALESCE($10, sort_order),
       updated_at        = NOW()
     WHERE id = $11`,
    [category_id, name, slug, short_description, description,
     specifications ? JSON.stringify(specifications) : null,
     index_refraction, is_featured, is_active, sort_order, id]
  );
  res.json(await findProductById(id));
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM products WHERE id = $1', [req.params.id]);
  if (!result.rowCount && !result.affectedRows) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  res.json({ message: 'Đã xóa sản phẩm' });
});

exports.addImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { url, alt_text, is_primary, sort_order } = req.body;

  if (!url) return res.status(400).json({ error: 'URL ảnh là bắt buộc' });

  if (is_primary) {
    await query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [id]);
  }

  const result = await query(
    'INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES ($1,$2,$3,$4,$5)',
    [id, url, alt_text, !!is_primary, sort_order || 0]
  );
  const { rows } = result.insertId
    ? await query('SELECT * FROM product_images WHERE id = $1', [result.insertId])
    : await query('SELECT * FROM product_images WHERE product_id = $1 AND url = $2 ORDER BY id DESC LIMIT 1', [id, url]);
  res.status(201).json(rows[0]);
});

exports.removeImage = asyncHandler(async (req, res) => {
  await query('DELETE FROM product_images WHERE id = $1 AND product_id = $2', [req.params.imageId, req.params.id]);
  res.json({ message: 'Đã xóa ảnh' });
});
