const express = require("express");
const auth = require("../controllers/auth.controller");
const shop = require("../controllers/shop.controller");
const account = require("../controllers/account.controller");
const cart = require("../controllers/cart.controller");
const order = require("../controllers/order.controller");
const { requireUser } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const validate = require("../middleware/validate");
const s = require("../validators/schemas");

const router = express.Router();

// Browsing
router.get("/", shop.home);
router.get("/shop", shop.shop);
router.get("/singleView", shop.product);

// Signup, login, password reset
router.get("/userSignup", auth.signupPage);
router.post("/signupSub", authLimiter, auth.signup);
router.get("/otpPage", auth.otpPage);
router.post("/otpSub", authLimiter, auth.confirmOtp);
router.get("/resendOtp", authLimiter, auth.resendOtp);
router.get("/userLogin", auth.loginPage);
router.post("/loggedIn", authLimiter, auth.login);
router.get("/signout", auth.logout);
router.get("/fPassword", auth.forgotPasswordPage);
router.post("/updatePass", authLimiter, auth.forgotPassword);
router.get("/success", auth.resetSentPage);
router.get("/updatePassPage", auth.resetPasswordPage);
router.post("/setpass", authLimiter, auth.resetPassword);

// Everything below needs a logged-in, unblocked shopper (requireUser).

// Cart
router.get("/cart", requireUser, cart.cart);
router.post("/addToCart", requireUser, validate({ body: s.withId }), cart.addToCart);
router.put("/updateCart", requireUser, validate({ body: s.cartQuantity }), cart.updateCart);
router.post("/removeFromCart", requireUser, validate({ body: s.withId }), cart.removeFromCart);

// Profile and addresses
router.get("/userProfile", requireUser, account.profile);
router.get("/editProfile", requireUser, account.addAddressPage);
router.post("/addProfileTo", requireUser, validate({ body: s.address }), account.addAddress("/userProfile"));
router.get("/editAddressFromUser", requireUser, account.editAddressPage);
router.post("/editaddressfromuserto", requireUser, validate({ body: s.addressWithId }), account.updateAddress("/userProfile"));
router.get("/walletHistory", requireUser, account.walletHistory);

// Checkout
router.get("/checkout", requireUser, order.checkoutPage);
router.get("/selectAddress", requireUser, account.chooseAddressPage);
router.post("/add", requireUser, order.rememberAddress);
router.post("/addProfileFromCheckout", requireUser, validate({ body: s.address }), account.addAddress("/checkout"));
router.post("/editaddress", requireUser, account.editCheckoutAddressPage);
router.post("/updateFromCheckout", requireUser, validate({ body: s.addressWithId }), account.updateAddress("/checkout"));
router.post("/applyCoupon", requireUser, validate({ body: s.couponCode }), order.applyCoupon);
router.post("/cancelCoupon", requireUser, order.cancelCoupon);
router.post("/placeOrder", requireUser, validate({ body: s.checkout }), order.placeOrder);
router.post("/verifyPayment", requireUser, validate({ body: s.verifyPayment }), order.verifyPayment);

// Orders
router.get("/orderSuccess", requireUser, order.orderSuccess);
router.get("/yourOrder", requireUser, order.myOrders);
router.get("/userViewProduct", requireUser, order.myOrder);
router.post("/userOrderCancel", requireUser, validate({ body: s.withId }), order.cancelOrder);
router.post("/userOrderReturn", requireUser, validate({ body: s.withId }), order.returnOrder);

module.exports = router;
