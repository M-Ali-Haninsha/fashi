const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const userModel = require("../models/userBase");
const productModel = require("../models/product");
const orderModel = require("../models/placeOrder");
const couponModel = require("../models/couponModel");

const giveWallet = (userId, amount) => userModel.updateOne({ _id: userId }, { $set: { "wallet.rPrice": amount } });
const wallet = async (userId) => (await userModel.findById(userId)).wallet.rPrice;
const stock = async (id) => (await productModel.findById(id)).quantity;

describe("cart, checkout and orders", () => {
  let shopper, product;

  before(h.startDb);
  after(h.stopDb);
  beforeEach(async () => {
    await h.clearDb();
    shopper = await h.signupShopper();
    product = await h.createProduct({ price: 1000, quantity: 3 });
  });

  const addToCart = (id = product.id) => shopper.ajax("post", "/addToCart", { id });
  const placeOrder = (payment) => shopper.ajax("post", "/placeOrder", { ...h.address, payment });

  it("cannot put more in the cart than is in stock", async () => {
    for (let i = 0; i < 3; i++) assert.equal((await addToCart()).status, 200);
    assert.equal((await addToCart()).status, 409);

    const res = await shopper.ajax("put", "/updateCart", { id: product.id, quantity: 10, stock: 999 });
    assert.equal(res.body.status, "out");
  });

  it("places a cash-on-delivery order, takes it out of stock and empties the cart", async () => {
    await addToCart();
    await addToCart();
    const res = await placeOrder("cod");

    assert.deepEqual(res.body, { status: "cod" });
    assert.equal(await stock(product.id), 1);
    const order = await orderModel.findOne();
    assert.equal(order.grandtotal, 2000);
    assert.equal(order.status, "processing");
    assert.equal((await shopper.get("/cart")).text.includes("Denim Jacket"), false);
  });

  it("refuses a wallet order without enough balance, and creates nothing", async () => {
    await giveWallet(shopper.userId, 500);
    await addToCart();
    const res = await placeOrder("wallet");

    assert.equal(res.status, 422);
    assert.match(res.body.msg, /Insufficient wallet balance/);
    assert.equal(await orderModel.countDocuments(), 0);
    assert.equal(await stock(product.id), 3);
    assert.equal(await wallet(shopper.userId), 500);
  });

  it("pays from the wallet when the balance covers it", async () => {
    await giveWallet(shopper.userId, 1500);
    await addToCart();
    await placeOrder("wallet");
    assert.equal(await wallet(shopper.userId), 500);
  });

  it("refunds a cancelled wallet order exactly once", async () => {
    await giveWallet(shopper.userId, 1000);
    await addToCart();
    await placeOrder("wallet");
    const order = await orderModel.findOne();

    await shopper.form("/userOrderCancel", { id: order.id });
    assert.equal(await wallet(shopper.userId), 1000);
    assert.equal(await stock(product.id), 3);

    const again = await shopper.form("/userOrderCancel", { id: order.id });
    assert.equal(again.status, 409);
    assert.equal(await wallet(shopper.userId), 1000);
    assert.equal(await stock(product.id), 3);
  });

  it("does not let a shopper see or cancel someone else's order", async () => {
    await addToCart();
    await placeOrder("cod");
    const order = await orderModel.findOne();

    const other = await h.signupShopper({ email: "ravi@example.com", username: "Ravi" });
    assert.equal((await other.get(`/userViewProduct?id=${order.id}`)).status, 404);
    assert.equal((await other.form("/userOrderCancel", { id: order.id })).status, 409);
    assert.equal((await orderModel.findById(order.id)).status, "processing");

    const success = await other.get("/orderSuccess");
    assert.equal(success.headers.location, "/yourOrder");
  });

  it("only allows a return after delivery, and refunds a confirmed return once", async () => {
    await addToCart();
    await placeOrder("cod");
    const order = await orderModel.findOne();
    assert.equal((await shopper.form("/userOrderReturn", { id: order.id })).status, 409);

    const admin = await h.createAdmin();
    await admin.csrf("/order");
    await admin.form("/confirmOrder", { id: order.id });
    await admin.form("/delivered", { id: order.id });
    await shopper.form("/userOrderReturn", { id: order.id });
    await admin.form("/confirmReturn", { id: order.id });
    assert.equal((await admin.form("/confirmReturn", { id: order.id })).status, 409);

    assert.equal(await wallet(shopper.userId), 1000);
    assert.equal(await stock(product.id), 3);
    assert.equal((await orderModel.findById(order.id)).status, "return confirmed");
  });

  it("applies a coupon, but only records it as used when the order is placed", async () => {
    await couponModel.create({
      couponname: "Welcome",
      couponcode: "WELCOME200",
      discountvalue: 200,
      minpurchase: 500,
      startingdate: new Date(Date.now() - 86400000),
      expiredate: new Date(Date.now() + 86400000),
      status: true,
    });
    await addToCart();

    const applied = await shopper.ajax("post", "/applyCoupon", { couponCode: "WELCOME200" });
    assert.equal(applied.body.status, true);
    assert.equal((await couponModel.findOne()).usedUser.length, 0);

    await placeOrder("cod");
    assert.equal((await orderModel.findOne()).grandtotal, 800);
    assert.equal((await couponModel.findOne()).usedUser.length, 1);

    await addToCart();
    const reuse = await shopper.ajax("post", "/applyCoupon", { couponCode: "WELCOME200" });
    assert.equal(reuse.body.status, false);
    assert.match(reuse.body.msg, /already used/);
  });

  describe("online payment", () => {
    async function startPayment() {
      await addToCart();
      const res = await placeOrder("paypal");
      assert.equal(res.body.status, true);
      assert.equal(res.body.key, "rzp_test_key");
      return res.body.order;
    }

    it("charges the server-side total and keeps the order pending until verified", async () => {
      const rzp = await startPayment();
      assert.equal(rzp.amount, 100000);
      assert.equal((await orderModel.findOne()).status, "payment pending");
      assert.equal(await stock(product.id), 3);
    });

    it("rejects a forged signature", async () => {
      const rzp = await startPayment();
      const res = await shopper.ajax("post", "/verifyPayment", {
        razorpay_order_id: rzp.id,
        razorpay_payment_id: "pay_1",
        razorpay_signature: "forged",
      });
      assert.equal(res.status, 400);
      assert.equal((await orderModel.findOne()).status, "payment pending");
    });

    it("completes the order once, and cannot be replayed", async () => {
      const rzp = await startPayment();
      const payment = {
        razorpay_order_id: rzp.id,
        razorpay_payment_id: "pay_1",
        razorpay_signature: h.sign(rzp.id, "pay_1"),
      };
      assert.equal((await shopper.ajax("post", "/verifyPayment", payment)).body.PaymentSuccess, true);
      assert.equal((await orderModel.findOne()).status, "processing");
      assert.equal(await stock(product.id), 2);

      await addToCart();
      const replay = await shopper.ajax("post", "/verifyPayment", payment);
      assert.equal(replay.status, 409);
      assert.equal(await orderModel.countDocuments(), 1);
      assert.equal(await stock(product.id), 2);
    });
  });
});
