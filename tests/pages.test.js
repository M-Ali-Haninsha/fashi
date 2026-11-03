const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const h = require("./helpers");
const categoryModel = require("../models/category");
const couponModel = require("../models/couponModel");
const bannerModel = require("../models/banner");
const orderModel = require("../models/placeOrder");
const userModel = require("../models/userBase");

// Renders every page with realistic data, so a template that breaks after a
// change is caught here rather than by a visitor.
describe("every page renders", () => {
  let shopper, admin, product, order, coupon, category, addressId;

  before(async () => {
    await h.startDb();
    for (const name of ["women", "kids"]) await categoryModel.create({ name });
    product = await h.createProduct();
    category = await categoryModel.findOne({ name: "men" });
    coupon = await couponModel.create({
      couponname: "Welcome",
      couponcode: "WELCOME",
      discountvalue: 100,
      minpurchase: 0,
      startingdate: new Date(),
      expiredate: new Date(Date.now() + 86400000),
      status: true,
    });
    await bannerModel.create({ mainImageBanner: ["a", "b"], span1: "New", mainH1: "Summer sale", mainP: "Up to 50% off" });

    shopper = await h.signupShopper();
    await shopper.form("/addProfileTo", {
      firstname: "Asha", lastname: "K", address: "12 MG Road", country: "India",
      postcode: "682001", district: "Ernakulam", city: "Kochi", email: "asha@example.com", phone: "9876543210",
    });
    addressId = (await userModel.findById(shopper.userId)).address[0].id;
    await shopper.ajax("post", "/addToCart", { id: product.id });
    await shopper.ajax("post", "/placeOrder", { ...h.address, payment: "cod" });
    await shopper.ajax("post", "/addToCart", { id: product.id });
    order = await orderModel.findOne();
    admin = await h.createAdmin();
  });
  after(h.stopDb);

  const ok = async (agent, path) => {
    const res = await agent.get(path);
    assert.equal(res.status, 200, `${path} returned ${res.status}`);
    assert.doesNotMatch(res.text, /Something went wrong/, `${path} rendered the error page`);
  };

  it("public pages", async () => {
    const guest = request(h.app);
    for (const path of ["/", "/shop", "/shop?page=1&search=den&sortValue=-1", `/singleView?id=${product.id}`,
      "/userSignup", "/userLogin", "/fPassword", "/success", "/adminLogin"]) {
      await ok(guest, path);
    }
  });

  it("shopper pages", async () => {
    for (const path of ["/cart", "/checkout", "/checkout?addressIndex=0", "/userProfile", "/editProfile",
      `/editAddressFromUser?id=${addressId}`, "/selectAddress", "/yourOrder", `/userViewProduct?id=${order.id}`,
      "/orderSuccess", "/walletHistory"]) {
      await ok(shopper, path);
    }
  });

  it("admin pages", async () => {
    for (const path of ["/admin", "/admin?from=2020-01-01&to=2030-01-01", "/userInfo", "/productlist",
      "/addproduct", `/editproduct?id=${product.id}`, "/category", "/addCategory", `/editCategory?id=${category.id}`,
      "/coupon", "/addcoupon", `/editcoupon?id=${coupon.id}`, "/order", `/adminViewProduct?id=${order.id}`,
      "/bannerPage", "/addbannerPage", "/editbanner"]) {
      await ok(admin, path);
    }
  });

  it("builds Cloudinary image URLs from the configured cloud name", async () => {
    const res = await request(h.app).get(`/singleView?id=${product.id}`);
    assert.match(res.text, /https:\/\/res\.cloudinary\.com\/testcloud\/image\/upload\/fashi\/products\/a/);
    assert.doesNotMatch(res.text, /dxfq3iotg|df3qijj4a/);
  });

  it("keeps shop filters in the page links", async () => {
    for (let i = 0; i < 7; i++) await h.createProduct({ name: `Denim ${i}` });
    const res = await request(h.app).get("/shop?search=Denim&sortValue=-1");
    assert.match(res.text, /href="\?search=Denim&amp;sortValue=-1&amp;page=2"/);
  });
});
