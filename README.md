# CEKO OPTICS — Backend API

## Stack
- **Node.js** + **Express** — REST API
- **PostgreSQL** — Database
- **JWT** — Xác thực (access token 15m + refresh token 7d)
- **RBAC** — Phân quyền theo role/permission

---

## Cài đặt

```bash
cd ceko-backend
npm install

# Copy env
cp .env.example .env
# Chỉnh DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# Tạo database
createdb ceko_optics

# Chạy schema + seed
npm run db:init

# Chạy dev
npm run dev
```

---

## Tài khoản mặc định
- **Email:** admin@cekooptics.com.vn
- **Password:** Admin@2026
- **⚠️ Đổi ngay sau khi deploy!**

---

## API Endpoints

### Auth
| Method | Path | Mô tả |
|--------|------|-------|
| POST | /api/auth/login | Đăng nhập |
| POST | /api/auth/refresh | Làm mới access token |
| POST | /api/auth/logout | Đăng xuất |
| GET  | /api/auth/me | Thông tin user hiện tại |

### Public
| Method | Path | Mô tả |
|--------|------|-------|
| GET | /api/categories | Danh sách danh mục |
| GET | /api/products | Danh sách sản phẩm |
| GET | /api/products/:slug | Chi tiết sản phẩm |
| GET | /api/posts | Danh sách bài viết |
| GET | /api/posts/:slug | Chi tiết bài viết |
| GET | /api/settings | Cài đặt website (public) |
| POST | /api/contacts | Gửi form liên hệ |

### Admin (cần Bearer Token)
| Method | Path | Permission |
|--------|------|-----------|
| GET    | /api/admin/products | products:read |
| POST   | /api/admin/products | products:create |
| PUT    | /api/admin/products/:id | products:update |
| DELETE | /api/admin/products/:id | products:delete |
| POST   | /api/admin/products/:id/images | products:update |
| GET    | /api/admin/posts | posts:read |
| POST   | /api/admin/posts | posts:create |
| PUT    | /api/admin/posts/:id | posts:update |
| DELETE | /api/admin/posts/:id | posts:delete |
| GET    | /api/admin/media | media:read |
| POST   | /api/admin/media/upload | media:upload |
| DELETE | /api/admin/media/:id | media:delete |
| GET    | /api/admin/contacts | contacts:read |
| PATCH  | /api/admin/contacts/:id/read | contacts:read |
| DELETE | /api/admin/contacts/:id | contacts:delete |
| GET    | /api/admin/settings | settings:read |
| PUT    | /api/admin/settings | settings:update |
| GET    | /api/admin/roles | rbac:read |
| POST   | /api/admin/roles | rbac:manage |
| PUT    | /api/admin/roles/:id/permissions | rbac:manage |
| GET    | /api/admin/users | users:read |
| POST   | /api/admin/users | users:create |
| PUT    | /api/admin/users/:id/roles | users:update |
| PATCH  | /api/admin/users/:id/toggle | users:update |

---

## RBAC Roles mặc định
| Role | Quyền |
|------|-------|
| **super_admin** | Tất cả |
| **admin** | Tất cả trừ rbac:manage, users:delete |
| **editor** | Xem/tạo/sửa sản phẩm, bài viết, upload media |
| **viewer** | Chỉ xem |

---

## Cấu trúc thư mục
```
ceko-backend/
├── sql/
│   ├── 001_schema.sql     ← Tạo 13 bảng
│   └── 002_seed.sql       ← Roles, permissions, admin user
├── src/
│   ├── config/
│   │   └── db.js          ← PostgreSQL pool
│   ├── middleware/
│   │   ├── auth.js        ← JWT authenticate + authorize (RBAC)
│   │   ├── errorHandler.js← Global error handler
│   │   └── upload.js      ← Multer config
│   ├── controllers/
│   │   ├── authController.js      ← Login/Refresh/Logout/Me
│   │   ├── productController.js   ← CRUD sản phẩm + ảnh
│   │   └── otherControllers.js    ← Posts/Contacts/Media/Settings/RBAC
│   ├── routes/
│   │   └── index.js       ← Tất cả routes
│   └── server.js          ← Entry point
├── uploads/               ← Thư mục upload (tạo auto)
├── .env.example
├── package.json
└── README.md
```

---

## Bảo mật
- Helmet (HTTP headers)
- CORS whitelist
- Rate limit: login (10 lần/15 phút), form liên hệ (5 lần/giờ)
- JWT access token ngắn (15m) + refresh token dài (7d)
- Refresh token lưu DB — có thể revoke
- Bcrypt password hash (cost 12)
- Timing-safe login (chống user enumeration)
- Input validation trên tất cả routes
