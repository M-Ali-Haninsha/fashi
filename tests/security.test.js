const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const request = require("supertest");
const h = require("./helpers");
const adminModel = require("../models/adminBase");
const userModel = require("../models/userBase");
const productModel = require("../models/product");

describe("security", () => {
  before(h.startDb);
  after(h.stopDb);
  beforeEach(h.clearDb);

  it("rejects the NoSQL-injection admin login that used to work", async () => {
    await adminModel.create({ adminMail: "admin@example.com", adminPassword: await bcrypt.hash("pass-123456", 4) });
    const agent = h.browser();
    const token = await agent.csrf("/adminLogin");
    const res = await agent
      .post("/adminLogged")
      .set("X-CSRF-Token", token)
      .send({ adminEmail: { $ne: null }, adminPassword: { $gt: 0 } });

    assert.equal(res.status, 401);
    const dashboard = await agent.get("/admin");
    assert.equal(dashboard.headers.location, "/adminLogin");
  });

  it("stores the admin password as a bcrypt hash and logs in with it", async () => {
    const agent = await h.createAdmin();
    const admin = await adminModel.findOne().select("+adminPassword");
    assert.match(admin.adminPassword, /^\$2[aby]\$/);
    assert.equal((await agent.get("/admin")).status, 200);
  });

  it("refuses a form submitted without the CSRF token", async () => {
    const agent = await h.signupShopper();
    const product = await h.createProduct();
    const res = await agent.post("/addToCart").type("form").send({ id: product.id });
    assert.equal(res.status, 403);
  });

  it("no longer changes data through GET links", async () => {
    const admin = await h.createAdmin();
    const shopper = await h.signupShopper();
    const res = await admin.get(`/blockuser?id=${shopper.userId}`);

    assert.equal(res.status, 404);
    assert.equal((await userModel.findById(shopper.userId)).userStatus, true);
  });

  it("checks for an admin session before accepting an upload", async () => {
    let uploaded = false;
    const uploadService = require("../services/upload.service");
    const original = uploadService.uploadImages;
    uploadService.uploadImages = async () => ((uploaded = true), []);
    try {
      const res = await request(h.app)
        .post("/addProductTo")
        .field("pName", "x")
        .attach("image", Buffer.from("img"), { filename: "a.png", contentType: "image/png" });
      assert.equal(res.status, 302);
      assert.equal(res.headers.location, "/adminLogin");
      assert.equal(uploaded, false);
      assert.equal(await productModel.countDocuments(), 0);
    } finally {
      uploadService.uploadImages = original;
    }
  });

  it("logs a blocked shopper out on their next request", async () => {
    const admin = await h.createAdmin();
    const shopper = await h.signupShopper();
    await admin.csrf("/userInfo");
    await admin.form("/blockuser", { id: shopper.userId });

    const res = await shopper.get("/userProfile");
    assert.equal(res.status, 403);
    assert.match(res.text, /blocked/);
    assert.equal((await shopper.get("/userProfile")).headers.location, "/userLogin");
  });

  it("does not share one shopper's name with other visitors", async () => {
    await h.signupShopper({ username: "Asha" });
    const res = await request(h.app).get("/shop");
    assert.doesNotMatch(res.text, /Asha/);
  });

  it("does not crash on search text with regex characters", async () => {
    await h.createProduct({ name: "Shirt (blue)" });
    const res = await request(h.app).get("/shop?search=" + encodeURIComponent("(blue"));
    assert.equal(res.status, 200);
    assert.match(res.text, /Shirt \(blue\)/);
  });

  it("hides unlisted products from the shop and the product page", async () => {
    const hidden = await h.createProduct({ name: "Hidden Hoodie", status: false });
    const shop = await request(h.app).get("/shop");
    assert.doesNotMatch(shop.text, /Hidden Hoodie/);
    assert.equal((await request(h.app).get(`/singleView?id=${hidden.id}`)).status, 404);
  });

  it("shows a real error page instead of hanging", async () => {
    const res = await request(h.app).get("/singleView?id=not-an-id");
    assert.equal(res.status, 404);
    assert.match(res.text, /Product not found/);
  });
});
