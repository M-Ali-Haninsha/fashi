const crypto = require("crypto");
const Razorpay = require("razorpay");
const config = require("../config/env");
const orderModel = require("../models/placeOrder");
const productModel = require("../models/product");
const userModel = require("../models/userBase");
const cartService = require("./cart.service");
const couponService = require("./coupon.service");
const walletService = require("./wallet.service");
const { badRequest, notFound, conflict, unprocessable } = require("../utils/httpError");

const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

// Order statuses, as shown to shoppers and used by the views.
const STATUS = {
  pendingPayment: "payment pending",
  processing: "processing",
  shipped: "Shipped",
  delivered: "delivered", // returns are possible for 2 days
  completed: "Order delivered", // after the return window
  returnRequested: "return requested",
  returnConfirmed: "return confirmed",
  canceled: "Order canceled",
};
const RETURN_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const PAID_METHODS = ["online", "wallet"];

// Cart total, coupon discount and the amount to pay, all computed on the server.
async function summary(userId, couponCode) {
  const { items, total } = await cartService.getItems(userId);
  if (!items.length) throw badRequest("Your cart is empty");

  let discount = 0;
  if (couponCode) {
    ({ discount } = await couponService.evaluate(couponCode, userId, total));
  }
  return { items, total, discount, grandtotal: total - discount, couponCode: couponCode || undefined };
}

const orderLines = (items) =>
  items.map(({ id, name, price, image, quantity, subPrice }) => ({ id, name, price, image, quantity, subPrice }));

// Takes the items out of stock, one atomic update per product. If any item is
// short, the ones already taken are put back.
async function reserveStock(items) {
  const done = [];
  for (const item of items) {
    const result = await productModel.updateOne(
      { _id: item.id, quantity: { $gte: item.quantity } },
      { $inc: { quantity: -item.quantity } }
    );
    if (!result.modifiedCount) {
      await restoreStock(done);
      throw conflict(`Sorry, ${item.name} does not have enough stock left`);
    }
    done.push(item);
  }
}

async function restoreStock(items) {
  for (const item of items) {
    await productModel.updateOne({ _id: item.id }, { $inc: { quantity: item.quantity } });
  }
}

// Puts the money of a paid order back in the wallet, at most once per order.
async function refundOnce(order, reason) {
  if (!PAID_METHODS.includes(order.paymentmethod)) return;
  const claimed = await orderModel.updateOne(
    { _id: order._id, refundedAt: null },
    { $set: { refundedAt: new Date() } }
  );
  if (claimed.modifiedCount) {
    await walletService.credit(order.ordereduser, order.grandtotal, reason);
  }
}

// Cash on delivery and wallet orders.
async function placeOrder(userId, { payment, address, couponCode }) {
  const s = await summary(userId, couponCode);
  await reserveStock(s.items);

  let couponMarked = false;
  try {
    if (s.couponCode) {
      couponMarked = await couponService.markUsed(s.couponCode, userId);
      if (!couponMarked) throw badRequest("You have already used this coupon");
    }
    if (payment === "wallet" && !(await walletService.debit(userId, s.grandtotal))) {
      throw unprocessable("Insufficient wallet balance");
    }
  } catch (err) {
    await restoreStock(s.items);
    if (couponMarked) await couponService.unmarkUsed(s.couponCode, userId);
    throw err;
  }

  const order = await orderModel.create({
    ordereduser: userId,
    deliveryaddress: address,
    date: new Date(),
    grandtotal: s.grandtotal,
    discount: s.discount,
    couponCode: s.couponCode,
    products: orderLines(s.items),
    paymentmethod: payment,
    status: STATUS.processing,
  });
  await cartService.clear(userId);
  return order;
}

// Online payment, step 1: a Razorpay order for the server-computed amount, and
// a matching pending order that only this checkout can complete.
async function startOnlinePayment(userId, { address, couponCode }) {
  const s = await summary(userId, couponCode);
  for (const item of s.items) {
    if (item.quantity > item.stock) throw conflict(`Sorry, ${item.name} does not have enough stock left`);
  }

  const rzpOrder = await razorpay.orders.create({
    amount: Math.round(s.grandtotal * 100),
    currency: "INR",
    receipt: `fashi_${Date.now()}`,
  });
  await orderModel.create({
    ordereduser: userId,
    deliveryaddress: address,
    date: new Date(),
    grandtotal: s.grandtotal,
    discount: s.discount,
    couponCode: s.couponCode,
    products: orderLines(s.items),
    paymentmethod: "online",
    status: STATUS.pendingPayment,
    razorpayOrderId: rzpOrder.id,
  });
  return { order: rzpOrder, key: config.razorpay.keyId };
}

function signatureIsValid(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac("sha256", config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return (
    typeof signature === "string" &&
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

// Online payment, step 2: verify Razorpay's signature, then complete the
// pending order exactly once.
async function confirmOnlinePayment(userId, { orderId, paymentId, signature }) {
  if (!signatureIsValid(orderId, paymentId, signature)) {
    throw badRequest("Payment verification failed");
  }
  const order = await orderModel.findOneAndUpdate(
    { ordereduser: userId, razorpayOrderId: orderId, status: STATUS.pendingPayment },
    { $set: { status: STATUS.processing, razorpayPaymentId: paymentId } },
    { new: true }
  );
  if (!order) throw conflict("This payment has already been processed");

  try {
    await reserveStock(order.products.map((p) => ({ ...p, id: p.id })));
  } catch (err) {
    // Paid, but the stock ran out in the meantime: cancel and refund.
    await orderModel.updateOne({ _id: order._id }, { $set: { status: STATUS.canceled } });
    await refundOnce(order, "refund: out of stock");
    throw conflict(`${err.message}. Your payment has been refunded to your wallet.`);
  }
  if (order.couponCode) await couponService.markUsed(order.couponCode, userId);
  await cartService.clear(userId);
  return order;
}

// Shoppers

// Orders past the 2-day return window move from "delivered" to "Order delivered".
async function closeReturnWindows() {
  await orderModel.updateMany(
    { status: STATUS.delivered, deliveredAt: { $lte: new Date(Date.now() - RETURN_WINDOW_MS) } },
    { $set: { status: STATUS.completed } }
  );
}

async function userOrders(userId) {
  await closeReturnWindows();
  return orderModel.find({ ordereduser: userId, status: { $ne: STATUS.pendingPayment } }).sort({ date: -1 });
}

async function userOrder(userId, orderId) {
  const order = await orderModel.findOne({ _id: orderId, ordereduser: userId });
  if (!order) throw notFound("Order not found");
  return order;
}

const latestOrder = (userId) =>
  orderModel.findOne({ ordereduser: userId, status: { $ne: STATUS.pendingPayment } }).sort({ date: -1 });

// Moves an order from one of `from` to `to` in a single update, so two clicks
// cannot both succeed. Returns the order as it was before.
async function transition(filter, from, to, extra = {}) {
  const order = await orderModel.findOneAndUpdate(
    { ...filter, status: { $in: from } },
    { $set: { status: to, ...extra } }
  );
  if (!order) throw conflict("This order cannot be changed in its current state");
  return order;
}

async function cancelByUser(userId, orderId) {
  const order = await transition(
    { _id: orderId, ordereduser: userId },
    [STATUS.processing, STATUS.shipped],
    STATUS.canceled
  );
  await restoreStock(order.products);
  await refundOnce(order, "refund: order cancelled");
}

async function requestReturn(userId, orderId) {
  await closeReturnWindows();
  await transition({ _id: orderId, ordereduser: userId }, [STATUS.delivered], STATUS.returnRequested);
}

// Admin

async function allOrders() {
  await closeReturnWindows();
  return orderModel.find({ status: { $ne: STATUS.pendingPayment } }).sort({ date: -1 });
}

async function orderWithCustomer(orderId) {
  const order = await orderModel.findById(orderId);
  if (!order) throw notFound("Order not found");
  const customer = await userModel.findById(order.ordereduser);
  return { order, customer };
}

const ship = (id) => transition({ _id: id }, [STATUS.processing], STATUS.shipped);

const deliver = (id) =>
  transition({ _id: id }, [STATUS.shipped], STATUS.delivered, { deliveredAt: new Date() });

async function cancelByAdmin(id) {
  const order = await transition({ _id: id }, [STATUS.processing, STATUS.shipped], STATUS.canceled);
  await restoreStock(order.products);
  await refundOnce(order, "refund: order cancelled by store");
}

async function confirmReturn(id) {
  const order = await transition({ _id: id }, [STATUS.returnRequested], STATUS.returnConfirmed);
  await restoreStock(order.products);
  // Cash-on-delivery orders were paid at the door, so they are refunded too.
  const claimed = await orderModel.updateOne({ _id: id, refundedAt: null }, { $set: { refundedAt: new Date() } });
  if (claimed.modifiedCount) await walletService.credit(order.ordereduser, order.grandtotal, "refund: return");
}

module.exports = {
  STATUS,
  summary,
  placeOrder,
  startOnlinePayment,
  confirmOnlinePayment,
  signatureIsValid,
  userOrders,
  userOrder,
  latestOrder,
  cancelByUser,
  requestReturn,
  allOrders,
  orderWithCustomer,
  ship,
  deliver,
  cancelByAdmin,
  confirmReturn,
  closeReturnWindows,
  razorpay,
};
