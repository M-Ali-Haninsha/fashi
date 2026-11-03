// Shared test setup: fake config, an in-memory MongoDB, stubs for email,
// Cloudinary and Razorpay, and a browser-like agent that handles CSRF tokens.
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE: "mongodb://placeholder",
  SESSION_SECRET: "test-secret",
  APP_URL: "http://localhost:3000",
  CLOUDINARY_CLOUD_NAME: "testcloud",
  CLOUDINARY_API_KEY: "x",
  CLOUDINARY_API_SECRET: "x",
  RAZORPAY_KEY_ID: "rzp_test_key",
  RAZORPAY_KEY_SECRET: "rzp_test_secret",
  MAIL_USER: "shop@example.com",
  MAIL_PASS: "x",
});

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server-core");
const { createApp } = require("../app");
const mailService = require("../services/mail.service");
const uploadService = require("../services/upload.service");
const orderService = require("../services/order.service");
const adminModel = require("../models/adminBase");
const categoryModel = require("../models/category");
const productModel = require("../models/product");
const userModel = require("../models/userBase");

const sentOtps = new Map();
const sentResetLinks = new Map();
mailService.sendOtp = async (email, otp) => sentOtps.set(email, otp);
mailService.sendPasswordReset = async (email, link) => sentResetLinks.set(email, link);
uploadService.uploadImages = async (files) => files.map((_, i) => `fashi/products/test-${i}`);
orderService.razorpay.orders.create = async ({ amount }) => ({
  id: `order_${crypto.randomBytes(6).toString("hex")}`,
  amount,
  currency: "INR",
});

let mongo;
async function startDb() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await mongoose.connection.syncIndexes();
}
async function stopDb() {
  await mongoose.disconnect();
  await mongo?.stop();
}
async function clearDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  sentOtps.clear();
  sentResetLinks.clear();
}

const app = createApp();

// A cookie-keeping client. `csrf()` loads a page and reads the token from
// the <meta name="csrf-token"> tag, like the pages' own scripts do.
function browser() {
  const agent = request.agent(app);
  let token;
  agent.csrf = async (page = "/userLogin") => {
    const res = await agent.get(page);
    token = /name="csrf-token" content="([a-f0-9]+)"/.exec(res.text)?.[1];
    if (!token) throw new Error(`No CSRF token on ${page} (status ${res.status})`);
    return token;
  };
  // Form post with the token, as a browser form would send it.
  agent.form = async (path, fields = {}) => {
    if (!token) await agent.csrf();
    return agent.post(path).type("form").send({ _csrf: token, ...fields });
  };
  // jQuery-style AJAX call with the token header.
  agent.ajax = async (method, path, fields = {}) => {
    if (!token) await agent.csrf();
    return agent[method](path)
      .set("X-Requested-With", "XMLHttpRequest")
      .set("X-CSRF-Token", token)
      .type("form")
      .send(fields);
  };
  return agent;
}

async function createAdmin(email = "admin@example.com", password = "admin-pass-123") {
  await adminModel.create({ adminMail: email, adminPassword: await bcrypt.hash(password, 4) });
  const agent = browser();
  await agent.csrf("/adminLogin");
  const res = await agent.form("/adminLogged", { adminEmail: email, adminPassword: password });
  if (res.status !== 302) throw new Error(`admin login failed: ${res.status}`);
  return agent;
}

// Signs up through the real OTP flow and returns a logged-in browser.
async function signupShopper({ email = "asha@example.com", password = "secret123", username = "Asha" } = {}) {
  const agent = browser();
  await agent.csrf("/userSignup");
  await agent.form("/signupSub", { username, email, phone: "9876543210", password });
  await agent.form("/otpSub", { otp: sentOtps.get(email) });
  const res = await agent.form("/loggedIn", { Email: email, pass: password });
  if (res.status !== 302 || res.headers.location !== "/") throw new Error(`login failed: ${res.status}`);
  agent.userId = (await userModel.findOne({ email }))._id.toString();
  await agent.csrf("/userProfile");
  return agent;
}

async function createProduct({ name = "Denim Jacket", price = 1000, quantity = 5, status = true } = {}) {
  const category = (await categoryModel.findOne({ name: "men" })) ?? (await categoryModel.create({ name: "men" }));
  return productModel.create({ name, price, quantity, status, image: ["fashi/products/a"], category: category._id });
}

const address = {
  firstname: "Asha",
  lastname: "K",
  address: "12 MG Road",
  country: "India",
  city: "Kerala",
  district: "Ernakulam",
  pincode: "682001",
  phone: "9876543210",
  mail: "asha@example.com",
};

const sign = (orderId, paymentId) =>
  crypto.createHmac("sha256", "rzp_test_secret").update(`${orderId}|${paymentId}`).digest("hex");

module.exports = {
  app,
  browser,
  startDb,
  stopDb,
  clearDb,
  sentOtps,
  sentResetLinks,
  createAdmin,
  signupShopper,
  createProduct,
  address,
  sign,
};
