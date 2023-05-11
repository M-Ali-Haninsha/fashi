var express = require('express');
var router = express.Router();
const myController = require('../controller/userController');
const otpC = require('../controller/otp')
const cartControl=require('../controller/cartController')
const userMiddleware = require('../middleware/userMiddleware')
const activeOrNot = require('../middleware/userActiveOrNot')
const userIn = require('../middleware/user/userIn')
const orderControl = require('../controller/orderController')
const couponControl = require('../controller/couponController')

/* GET home page. */
router.get('/', myController.index);

router.get('/userSignup', myController.signup)

router.get('/otpPage', myController.otpPage)

router.post('/signupSub', myController.signupSubmit)

router.get('/userLogin', myController.userLogin)

router.post('/loggedIn', myController.loginSubmit)

router.post('/otpSub', myController.proceedOtp)

router.get('/resendOtp', myController.resendOtp)

router.get('/fPassword', myController.forgotPasswordPage)

router.get('/updatePassPage', myController.updatePassword)

router.post('/updatePass', myController.forgotPass)

router.get('/success', myController.Csuccess)

router.post('/setpass', myController.updatePass)

router.get('/shop', myController.shop)

router.get('/singleView', myController.singleProduct)

router.get('/cart', userIn,activeOrNot, cartControl.cart)

router.get('/addToCart',  userIn,activeOrNot, cartControl.addToCart)

router.put('/updateCart', userIn,activeOrNot, cartControl.updateCart)

router.get("/removeFromCart",  userIn,activeOrNot, cartControl.removeFromCart)

router.get("/checkout", userIn,activeOrNot, myController.checkout)

router.get('/userProfile', userIn,activeOrNot, myController.profile)

router.get('/editAddressFromUser', userIn,activeOrNot, myController.editaddressfromuser)

router.post('/editaddressfromuserto', userIn,activeOrNot, myController.editaddressfromuserto)

router.get('/editProfile', userIn,activeOrNot, myController.editProfile)

router.post('/addProfileTo', userIn,activeOrNot, myController.addProfileTo)

router.post('/addProfileFromCheckout', userIn,activeOrNot, myController.addProfileFromCheckout)

router.get('/selectAddress', userIn,activeOrNot, myController.selectAddress)

router.post('/add', userIn,activeOrNot, myController.add)

router.post('/editaddress', userIn,activeOrNot, myController.editaddress)

router.post('/updateFromCheckout', userIn,activeOrNot, myController.updateAddress)

router.post('/placeOrder',  userIn,activeOrNot,orderControl.placeOrder )

router.post('/verifyPayment',  userIn,activeOrNot,orderControl.userVerifypayment)

router.post('/applyCoupon', userIn,activeOrNot, couponControl.applyCoupon)

router.get('/cancelCoupon',  userIn,activeOrNot,couponControl.cancelApplyCoupon)

router.get('/orderSuccess', userIn,activeOrNot, myController.orderSuccess)

router.get('/yourOrder', userIn,activeOrNot, myController.yourOrder)

router.get('/userOrderCancel', userIn,activeOrNot, myController.userCancelOrder)

router.get('/userOrderReturn', userIn,activeOrNot, myController.userOrderReturn)

router.get('/userViewProduct', userIn,activeOrNot, myController.userViewProduct)



router.get('/signout', myController.signout)

module.exports = router;
