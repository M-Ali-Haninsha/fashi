const authService = require("../services/auth.service");
const adminService = require("../services/admin.service");
const orderService = require("../services/order.service");
const couponService = require("../services/coupon.service");
const { parseForm } = require("../utils/forms");
const { withDisplayDate } = require("./order.controller");
const s = require("../validators/schemas");

const render = (view, extra = {}) => (req, res) => res.render(view, { admin: true, ...extra });

// Login

function loginPage(req, res) {
  if (req.session.admin) return res.redirect("/admin");
  res.render("admin/adminLogin");
}

async function login(req, res) {
  const { data, error } = parseForm(s.adminLogin, req.body);
  const ok = !error && (await authService.adminLogin(data.adminEmail, data.adminPassword));
  if (!ok) return res.status(401).render("admin/adminLogin", { error: "wrong credentials" });

  await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
  req.session.admin = true;
  res.redirect("/admin");
}

function logout(req, res) {
  req.session.destroy(() => res.redirect("/adminLogin"));
}

// Dashboard, users, orders

async function dashboard(req, res) {
  const filters = s.dashboard.parse(req.query);
  const data = await adminService.dashboard(filters);
  res.render("admin/adminHome", {
    admin: true,
    ...data,
    orderData: data.orderData.map(withDisplayDate),
    deliveredProducts: data.orderData,
  });
}

async function users(req, res) {
  res.render("admin/userList", { admin: true, uInfo: await adminService.listUsers() });
}

const setUserActive = (active) => async (req, res) => {
  await adminService.setUserActive(req.body.id, active);
  res.redirect("/userInfo");
};

async function orders(req, res) {
  const all = await orderService.allOrders();
  res.render("admin/order", { admin: true, orderData: all.map(withDisplayDate) });
}

async function order(req, res) {
  const { order: found, customer } = await orderService.orderWithCustomer(s.objectId.parse(req.query.id));
  res.render("admin/adminViewProduct", {
    admin: true,
    orderDetails: [found],
    userDetails: customer ? [customer] : [],
    products: found.products,
  });
}

const orderAction = (action) => async (req, res) => {
  await action(req.body.id);
  res.redirect("/order");
};

// Products

async function products(req, res) {
  res.render("admin/productList", { admin: true, product: await adminService.listProducts() });
}

async function addProductPage(req, res) {
  res.render("admin/addProduct", { admin: true, categoryData: await adminService.listCategories() });
}

async function addProduct(req, res) {
  await adminService.createProduct(req.body, req.files);
  res.redirect("/addProduct");
}

async function editProductPage(req, res) {
  const productData = await adminService.getProduct(s.objectId.parse(req.query.id));
  const categoryData = await adminService.listCategories();
  const cat = categoryData.find((c) => String(c._id) === String(productData.category));
  res.render("admin/editProduct", { admin: true, productData, categoryData, cat });
}

async function editProduct(req, res) {
  await adminService.updateProduct(s.objectId.parse(req.query.id), req.body, req.files);
  res.redirect("/productList");
}

async function removeProductImage(req, res) {
  await adminService.removeProductImage(req.body.productId, req.body.imageName);
  res.json({ status: true });
}

const setProductListed = (listed) => async (req, res) => {
  await adminService.setProductListed(req.body.id, listed);
  res.redirect("/productlist");
};

// Categories

async function categories(req, res) {
  const msg = req.session.categoryMsg;
  delete req.session.categoryMsg;
  res.render("admin/category", { admin: true, catInfo: await adminService.listCategories(), msg });
}

async function addCategory(req, res) {
  const { error } = await adminService.createCategory(req.body.name);
  if (error) return res.status(409).render("admin/addCategory", { admin: true, error });
  res.redirect("/addCategory");
}

async function editCategoryPage(req, res) {
  res.render("admin/editCategory", { admin: true, cCat: await adminService.getCategory(s.objectId.parse(req.query.id)) });
}

async function editCategory(req, res) {
  const { error } = await adminService.renameCategory(req.body.id, req.body.name);
  if (error) {
    const cCat = await adminService.getCategory(req.body.id);
    return res.status(409).render("admin/editCategory", { admin: true, cCat, err1: error });
  }
  res.redirect("/category");
}

async function deleteCategory(req, res) {
  if (!(await adminService.deleteCategory(req.body.id))) {
    req.session.categoryMsg = "This category still has products, so it cannot be deleted";
  }
  res.redirect("/category");
}

// Coupons

async function coupons(req, res) {
  const list = await couponService.list();
  const couponlist = list.map((c) => ({ ...c.toObject(), expiredate: c.expiredate.toLocaleString() }));
  res.render("admin/coupon", { admin: true, couponlist });
}

async function addCoupon(req, res) {
  await couponService.create(req.body);
  res.redirect("/addCoupon");
}

async function editCouponPage(req, res) {
  res.render("admin/editCoupon", { admin: true, couponData: await couponService.get(s.objectId.parse(req.query.id)) });
}

async function editCoupon(req, res) {
  await couponService.update(s.objectId.parse(req.query.id), req.body);
  res.redirect("/coupon");
}

const setCouponActive = (active) => async (req, res) => {
  await couponService.setActive(req.body.id, active);
  res.redirect("/coupon");
};

async function deleteCoupon(req, res) {
  await couponService.remove(req.body.id);
  res.redirect("/coupon");
}

// Banner

async function bannerPage(req, res) {
  res.render("admin/banner", { admin: true, banner: await adminService.getBanner() });
}

async function editBannerPage(req, res) {
  res.render("admin/editbanner", { admin: true, banner: await adminService.getBanner() });
}

const saveBanner = (redirectTo) => async (req, res) => {
  await adminService.saveBanner(req.body, req.files);
  res.redirect(redirectTo);
};

module.exports = {
  loginPage,
  login,
  logout,
  dashboard,
  users,
  setUserActive,
  orders,
  order,
  orderAction,
  products,
  addProductPage,
  addProduct,
  editProductPage,
  editProduct,
  removeProductImage,
  setProductListed,
  categories,
  addCategoryPage: render("admin/addCategory"),
  addCategory,
  editCategoryPage,
  editCategory,
  deleteCategory,
  coupons,
  addCouponPage: render("admin/addCoupon"),
  addCoupon,
  editCouponPage,
  editCoupon,
  setCouponActive,
  deleteCoupon,
  bannerPage,
  addBannerPage: render("admin/addbannerPage"),
  editBannerPage,
  saveBanner,
};
