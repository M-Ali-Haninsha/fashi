const express = require('express');
const router = express.Router();
const adminControl = require('../controller/adminController')
const categoryControl = require('../controller/categoryController')
const productControl = require('../controller/productController')
const adminMiddleware = require("../middleware/adminMiddleware")
const upload = require('../configuration/multer')
const couponControl = require('../controller/couponController')
const orderControl = require('../controller/orderController')
const bannerControl = require('../controller/bannercontroller')


/* GET users listing. */
router.get('/admin',adminMiddleware, adminControl.adminHome)

router.get('/adminLogin', adminControl.adminLogin)

router.post('/adminLogged', adminControl.adminLoginButton)

router.get('/userInfo', adminMiddleware, adminControl.userInfo)

router.get('/blockuser', adminMiddleware, adminControl.blockUser)

router.get('/unblockuser', adminMiddleware, adminControl.unblockUser)

router.get('/listProduct',adminMiddleware, adminControl.listProduct)

router.get('/unlistProduct', adminMiddleware, adminControl.unlistProduct)

router.get('/category', adminMiddleware, categoryControl.pageCategory)

router.get('/addCategory',adminMiddleware, categoryControl.addCategory)

router.post('/categoryAdd',adminMiddleware, categoryControl.toAddCategory)

router.get('/editCategory',adminMiddleware, categoryControl.editCategory)

router.post('/editCategoryTo',adminMiddleware, categoryControl.editCategoryTo)

router.get('/productlist', adminMiddleware, productControl.prductlist )

router.get('/addproduct', adminMiddleware, productControl.addProduct)

router.get('/deleteCategory',adminMiddleware, categoryControl.deleteCategory)

router.post('/addProductTo', upload.array('image',3),adminMiddleware, productControl.addProductTo)

router.get('/editproduct', adminMiddleware, productControl.editProduct)

router.delete('/imagePull', adminMiddleware, productControl.pullImage)

router.post('/editProductTo',upload.array('image',3), adminMiddleware, productControl.editProductTo)

router.get('/coupon',adminMiddleware, couponControl.couponPage)

router.get('/editcoupon',adminMiddleware, couponControl.editCoupon)

router.post('/editCouponTo',adminMiddleware, couponControl.editCouponTo)

router.get('/addcoupon',adminMiddleware, couponControl.addCoupon)

router.post('/addCouponTo',adminMiddleware, couponControl.addCouponTo)

router.get('/deleteCoupon',adminMiddleware, couponControl.deleteCoupon)

router.get('/activateCoupon',adminMiddleware, couponControl.activateCoupon)

router.get('/deactivateCoupon',adminMiddleware, couponControl.deactivateCoupon)

router.get('/order',adminMiddleware, orderControl.orderManagement)

router.get('/adminViewProduct',adminMiddleware, orderControl.adminViewProduct)

router.get('/confirmOrder',adminMiddleware, adminControl.confirmOrder)

router.get('/delivered',adminMiddleware, adminControl.delivered)

router.get('/confirmReturn',adminMiddleware, adminControl.confirmReturn)

router.get('/cancelOrder',adminMiddleware, adminControl.cancelOrder)

router.get('/bannerPage',adminMiddleware, bannerControl.bannerPage)

router.get('/addbannerPage',adminMiddleware, bannerControl.addbannerPage)

router.post('/addbannerTo',upload.array('image'),adminMiddleware, bannerControl.addbannerTo)

router.get('/editbanner',adminMiddleware, bannerControl.editbannerpage)

router.post('/editbannerto',upload.array('image'),adminMiddleware, bannerControl.editbannerto)

router.get('/adminLogout', adminControl.adminLogout)


module.exports = router;
