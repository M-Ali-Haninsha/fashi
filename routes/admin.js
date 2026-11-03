const express = require("express");
const admin = require("../controllers/admin.controller");
const orderService = require("../services/order.service");
const { requireAdmin } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const { authLimiter } = require("../middleware/rateLimit");
const { imageUpload } = require("../middleware/upload");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

const router = express.Router();
const withId = validate({ body: s.withId });

// Admin pages share the root path with the shop, so each route lists
// requireAdmin itself. For uploads it runs before the file is read, and the
// CSRF token (sent inside the multipart form) is checked right after.
const upload = (field, max) => [requireAdmin, imageUpload.array(field, max), verifyCsrf];

router.get("/adminLogin", admin.loginPage);
router.post("/adminLogged", authLimiter, admin.login);
router.get("/adminLogout", admin.logout);

router.get("/admin", requireAdmin, admin.dashboard);

// Users
router.get("/userInfo", requireAdmin, admin.users);
router.post("/blockuser", requireAdmin, withId, admin.setUserActive(false));
router.post("/unblockuser", requireAdmin, withId, admin.setUserActive(true));

// Orders
router.get("/order", requireAdmin, admin.orders);
router.get("/adminViewProduct", requireAdmin, admin.order);
router.post("/confirmOrder", requireAdmin, withId, admin.orderAction(orderService.ship));
router.post("/delivered", requireAdmin, withId, admin.orderAction(orderService.deliver));
router.post("/cancelOrder", requireAdmin, withId, admin.orderAction(orderService.cancelByAdmin));
router.post("/confirmReturn", requireAdmin, withId, admin.orderAction(orderService.confirmReturn));

// Products
router.get("/productlist", requireAdmin, admin.products);
router.get("/addproduct", requireAdmin, admin.addProductPage);
router.post("/addProductTo", ...upload("image", 3), validate({ body: s.newProduct }), admin.addProduct);
router.get("/editproduct", requireAdmin, admin.editProductPage);
router.post("/editProductTo", ...upload("image", 3), validate({ body: s.editProduct }), admin.editProduct);
router.delete("/imagePull", requireAdmin, validate({ body: s.removeImage }), admin.removeProductImage);
router.post("/listProduct", requireAdmin, withId, admin.setProductListed(true));
router.post("/unlistProduct", requireAdmin, withId, admin.setProductListed(false));

// Categories
router.get("/category", requireAdmin, admin.categories);
router.get("/addCategory", requireAdmin, admin.addCategoryPage);
router.post("/categoryAdd", requireAdmin, validate({ body: s.category }), admin.addCategory);
router.get("/editCategory", requireAdmin, admin.editCategoryPage);
router.post("/editCategoryTo", requireAdmin, validate({ body: s.renameCategory }), admin.editCategory);
router.post("/deleteCategory", requireAdmin, withId, admin.deleteCategory);

// Coupons
router.get("/coupon", requireAdmin, admin.coupons);
router.get("/addcoupon", requireAdmin, admin.addCouponPage);
router.post("/addCouponTo", requireAdmin, validate({ body: s.coupon }), admin.addCoupon);
router.get("/editcoupon", requireAdmin, admin.editCouponPage);
router.post("/editCouponTo", requireAdmin, validate({ body: s.coupon }), admin.editCoupon);
router.post("/activateCoupon", requireAdmin, withId, admin.setCouponActive(true));
router.post("/deactivateCoupon", requireAdmin, withId, admin.setCouponActive(false));
router.post("/deleteCoupon", requireAdmin, withId, admin.deleteCoupon);

// Banner
router.get("/bannerPage", requireAdmin, admin.bannerPage);
router.get("/addbannerPage", requireAdmin, admin.addBannerPage);
router.post("/addbannerTo", ...upload("image", 2), validate({ body: s.newBanner }), admin.saveBanner("/bannerPage"));
router.get("/editbanner", requireAdmin, admin.editBannerPage);
router.post("/editbannerto", ...upload("image", 2), validate({ body: s.editBanner }), admin.saveBanner("/editbanner"));

module.exports = router;
