const router   = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const upload   = require('../middleware/upload');

const authCtrl    = require('../controllers/authController');
const prodCtrl    = require('../controllers/productController');
const {
  postsCtrl, contactsCtrl, mediaCtrl,
  settingsCtrl, categoriesCtrl, rbacCtrl,
} = require('../controllers/otherControllers');

// ── RATE LIMITS ──────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  message: { error: 'Quá nhiều lần đăng nhập. Thử lại sau 15 phút.' },
  standardHeaders: true, legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5,
  message: { error: 'Gửi quá nhiều lần. Thử lại sau 1 giờ.' },
});

// ════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════
router.post('/auth/login',   loginLimiter, authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout',  authCtrl.logout);
router.get ("/auth/me",      authenticate, authCtrl.me);
router.post("/auth/change-password", authenticate, authCtrl.changePassword);

// ════════════════════════════════════════════════════════════
// PUBLIC
// ════════════════════════════════════════════════════════════
router.get('/categories',    categoriesCtrl.getAll);
router.get('/products',      prodCtrl.getAll);
router.get('/products/:slug',prodCtrl.getOne);
router.get('/posts',         postsCtrl.getAll);
router.get('/posts/:slug',   postsCtrl.getOne);
router.get('/settings',      settingsCtrl.getPublic);
router.post('/contacts',     contactLimiter, contactsCtrl.create);

// ════════════════════════════════════════════════════════════
// ADMIN — yêu cầu authenticate trên tất cả
// ════════════════════════════════════════════════════════════
router.use('/admin', authenticate);

// ── PRODUCTS ────────────────────────────────────────────────
router.get   ('/admin/products',                    authorize('products:read'),   prodCtrl.adminList);
router.get   ('/admin/products/:id',                authorize('products:read'),   prodCtrl.adminGetOne);
router.post  ('/admin/products',                    authorize('products:create'), prodCtrl.create);
router.put   ('/admin/products/:id',                authorize('products:update'), prodCtrl.update);
router.delete('/admin/products/:id',                authorize('products:delete'), prodCtrl.remove);
router.post  ('/admin/products/:id/images',         authorize('products:update'), prodCtrl.addImage);
router.delete('/admin/products/:id/images/:imageId',authorize('products:update'), prodCtrl.removeImage);

// ── CATEGORIES ──────────────────────────────────────────────
router.get   ('/admin/categories',     authorize('categories:read'),   categoriesCtrl.getAll);
router.post  ('/admin/categories',     authorize('categories:create'), categoriesCtrl.create);
router.put   ('/admin/categories/:id', authorize('categories:update'), categoriesCtrl.update);
router.delete('/admin/categories/:id', authorize('categories:delete'), categoriesCtrl.remove);

// ── POSTS ───────────────────────────────────────────────────
router.get   ('/admin/posts',     authorize('posts:read'),   postsCtrl.adminList);
router.post  ('/admin/posts',     authorize('posts:create'), postsCtrl.create);
router.put   ('/admin/posts/:id', authorize('posts:update'), postsCtrl.update);
router.delete('/admin/posts/:id', authorize('posts:delete'), postsCtrl.remove);

// ── MEDIA ───────────────────────────────────────────────────
router.get   ('/admin/media',         authorize('media:read'),   mediaCtrl.list);
router.post  ('/admin/media/upload',  authorize('media:upload'),
  upload.single('file'), mediaCtrl.upload);
router.delete('/admin/media/:id',     authorize('media:delete'), mediaCtrl.remove);

// ── CONTACTS ────────────────────────────────────────────────
router.get   ('/admin/contacts/stats',    authorize('contacts:read'),   contactsCtrl.stats);
router.get   ('/admin/contacts',          authorize('contacts:read'),   contactsCtrl.list);
router.patch ('/admin/contacts/:id/read', authorize('contacts:read'),   contactsCtrl.markRead);
router.delete('/admin/contacts/:id',      authorize('contacts:delete'), contactsCtrl.remove);

// ── SETTINGS ────────────────────────────────────────────────
router.get('/admin/settings',     authorize('settings:read'),   settingsCtrl.getAll);
router.put('/admin/settings',     authorize('settings:update'), settingsCtrl.update);

// ── RBAC ────────────────────────────────────────────────────
router.get ('/admin/roles',                     authorize('rbac:read'),   rbacCtrl.getRoles);
router.post('/admin/roles',                     authorize('rbac:manage'), rbacCtrl.createRole);
router.put ('/admin/roles/:id/permissions',     authorize('rbac:manage'), rbacCtrl.updateRolePerms);
router.get ('/admin/permissions',               authorize('rbac:read'),   rbacCtrl.getPermissions);

// ── USERS ───────────────────────────────────────────────────
router.get  ('/admin/users',             authorize('users:read'),   rbacCtrl.getUsers);
router.post ('/admin/users',             authorize('users:create'), rbacCtrl.createUser);
router.put  ('/admin/users/:id/roles',   authorize('users:update'), rbacCtrl.updateUserRoles);
router.patch('/admin/users/:id/toggle',  authorize('users:update'), rbacCtrl.toggleUser);

module.exports = router;
