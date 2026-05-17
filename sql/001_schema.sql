-- ============================================================
-- CEKO OPTICS — PostgreSQL Schema
-- ERD: categories, products, product_images, contacts,
--      admin_users, posts, media, site_settings,
--      roles, permissions, role_permissions, admin_user_roles
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── CATEGORIES ──────────────────────────────────────────────
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ── PRODUCTS ────────────────────────────────────────────────
CREATE TABLE products (
  id                  SERIAL PRIMARY KEY,
  category_id         INT REFERENCES categories(id) ON DELETE SET NULL,
  name                VARCHAR(200) NOT NULL,
  slug                VARCHAR(220) NOT NULL UNIQUE,
  short_description   TEXT,
  description         TEXT,
  specifications      JSONB DEFAULT '{}',
  index_refraction    VARCHAR(20),
  is_featured         BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  sort_order          INT DEFAULT 0,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- ── PRODUCT IMAGES ──────────────────────────────────────────
CREATE TABLE product_images (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(200),
  is_primary  BOOLEAN DEFAULT FALSE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── CONTACTS ────────────────────────────────────────────────
CREATE TABLE contacts (
  id          SERIAL PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(200),
  phone       VARCHAR(20),
  subject     VARCHAR(100),
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── ADMIN USERS ─────────────────────────────────────────────
CREATE TABLE admin_users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMP,
  password_changed_at TIMESTAMP DEFAULT NOW(),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ── POSTS ───────────────────────────────────────────────────
CREATE TABLE posts (
  id              SERIAL PRIMARY KEY,
  author_id       INT REFERENCES admin_users(id) ON DELETE SET NULL,
  title           VARCHAR(300) NOT NULL,
  slug            VARCHAR(300) NOT NULL UNIQUE,
  content         TEXT,
  thumbnail       VARCHAR(500),
  seo_title       VARCHAR(200),
  seo_description TEXT,
  is_published    BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ── MEDIA ───────────────────────────────────────────────────
CREATE TABLE media (
  id          SERIAL PRIMARY KEY,
  filename    VARCHAR(300) NOT NULL,
  url         VARCHAR(500) NOT NULL,
  mime_type   VARCHAR(100),
  file_size   INT,
  alt_text    VARCHAR(200),
  uploaded_by INT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── SITE SETTINGS ───────────────────────────────────────────
CREATE TABLE site_settings (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT,
  type        VARCHAR(20) DEFAULT 'text',
  label       VARCHAR(200),
  updated_by  INT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ── RBAC: ROLES ─────────────────────────────────────────────
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── RBAC: PERMISSIONS ───────────────────────────────────────
CREATE TABLE permissions (
  id     SERIAL PRIMARY KEY,
  code   VARCHAR(100) NOT NULL UNIQUE,  -- vd: products:create
  module VARCHAR(50) NOT NULL,           -- vd: products
  action VARCHAR(30) NOT NULL            -- vd: create
);

-- ── RBAC: ROLE_PERMISSIONS ──────────────────────────────────
CREATE TABLE role_permissions (
  role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- ── RBAC: ADMIN_USER_ROLES ──────────────────────────────────
CREATE TABLE admin_user_roles (
  admin_user_id INT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (admin_user_id, role_id)
);

-- ── REFRESH TOKENS ──────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  ip_address  INET,
  user_agent  TEXT,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── INDEXES ─────────────────────────────────────────────────
CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_products_slug       ON products(slug);
CREATE INDEX idx_products_active     ON products(is_active);
CREATE INDEX idx_product_images_prod ON product_images(product_id);
CREATE INDEX idx_posts_slug          ON posts(slug);
CREATE INDEX idx_posts_published     ON posts(is_published, published_at DESC);
CREATE INDEX idx_contacts_read       ON contacts(is_read, created_at DESC);
CREATE INDEX idx_media_uploaded_by   ON media(uploaded_by);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_exp  ON refresh_tokens(expires_at);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categories_updated
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_admin_users_updated
  BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_posts_updated
  BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
