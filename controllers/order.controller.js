const userModel = require("../models/userBase");
const orderService = require("../services/order.service");
const couponService = require("../services/coupon.service");
const cartService = require("../services/cart.service");
const { HttpError } = require("../utils/httpError");

const withDisplayDate = (order) => ({ ...order.toObject(), id: order.id, date: order.date.toLocaleString() });

async function checkoutPage(req, res) {
  const userId = req.session.userId;
  const { items } = await cartService.getItems(userId);
  if (!items.length) return res.redirect("/cart");

  // A coupon that stopped being valid (expired, cart changed) is dropped quietly.
  let summary;
  try {
    summary = await orderService.summary(userId, req.session.couponCode);
  } catch (err) {
    if (!(err instanceof HttpError) || !req.session.couponCode) throw err;
    delete req.session.couponCode;
    summary = await orderService.summary(userId);
  }

  const user = await userModel.findById(userId);
  const index = Number.parseInt(req.query.addressIndex, 10);
  res.render("user/checkout", {
    user: true,
    productCheckout: summary.items,
    ttl: summary.total,
    total: summary.grandtotal,
    couponPrice: summary.discount,
    coupon: summary.couponCode,
    cActive: Boolean(summary.couponCode),
    wallet: user.wallet.rPrice,
    add: user.address,
    selectAddress: Number.isInteger(index) ? user.address[index] : undefined,
    rAdd: req.session.bodyadd,
  });
}

// Remembers an address typed on the checkout page to prefill the form.
function rememberAddress(req, res) {
  req.session.bodyadd = req.body;
  res.redirect("/checkout");
}

const deliveryAddress = (b) => ({
  firstname: b.firstname,
  lastname: b.lastname,
  country: b.country,
  state: b.city,
  pincode: b.pincode,
  district: b.district,
  phonenumber: b.phone,
  email: b.mail,
  address: b.address,
});

async function placeOrder(req, res) {
  const userId = req.session.userId;
  const input = {
    address: deliveryAddress(req.body),
    couponCode: req.session.couponCode,
  };
  if (req.body.payment === "paypal" || req.body.payment === "online") {
    const { order, key } = await orderService.startOnlinePayment(userId, input);
    return res.json({ status: true, order, key });
  }
  await orderService.placeOrder(userId, { ...input, payment: req.body.payment });
  delete req.session.couponCode;
  res.json({ status: "cod" });
}

async function verifyPayment(req, res) {
  await orderService.confirmOnlinePayment(req.session.userId, req.body);
  delete req.session.couponCode;
  res.json({ PaymentSuccess: true });
}

async function applyCoupon(req, res) {
  const { total } = await cartService.getItems(req.session.userId);
  try {
    await couponService.evaluate(req.body.couponCode, req.session.userId, total);
  } catch (err) {
    if (err.status === 400) return res.json({ status: false, msg: err.message });
    throw err;
  }
  req.session.couponCode = req.body.couponCode;
  res.json({ status: true });
}

function cancelCoupon(req, res) {
  delete req.session.couponCode;
  res.json({ status: true });
}

async function orderSuccess(req, res) {
  const orderDetails = await orderService.latestOrder(req.session.userId);
  if (!orderDetails) return res.redirect("/yourOrder");
  res.render("user/orderSuccess", { user: true, orderDetails });
}

async function myOrders(req, res) {
  const orders = await orderService.userOrders(req.session.userId);
  res.render("user/yourOrder", { user: true, userOrder: orders.map(withDisplayDate) });
}

async function myOrder(req, res) {
  const order = await orderService.userOrder(req.session.userId, req.query.id);
  res.render("user/yourOrderProduct", { user: true, userPro: order.products, orderData: [order] });
}

async function cancelOrder(req, res) {
  await orderService.cancelByUser(req.session.userId, req.body.id);
  res.redirect("/yourOrder");
}

async function returnOrder(req, res) {
  await orderService.requestReturn(req.session.userId, req.body.id);
  res.redirect("/yourOrder");
}

module.exports = {
  checkoutPage,
  rememberAddress,
  placeOrder,
  verifyPayment,
  applyCoupon,
  cancelCoupon,
  orderSuccess,
  myOrders,
  myOrder,
  cancelOrder,
  returnOrder,
  withDisplayDate,
};
