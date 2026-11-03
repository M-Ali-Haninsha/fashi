const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const h = require("./helpers");
const { migrate } = require("../scripts/migrate-legacy-data");

// Records shaped like the old version of Fashi wrote them.
describe("legacy data migration", () => {
  let db, userId;

  before(async () => {
    await h.startDb();
    db = mongoose.connection.db;
    await db.collection("adminblogs").insertOne({ adminMail: "Admin@Shop.com", adminPassword: 1234 });
    userId = new mongoose.Types.ObjectId();
    await db.collection("blogs").insertOne({
      _id: userId,
      username: "Asha",
      email: "Asha@Example.com ",
      phoneNo: 9876543210,
      password: "$2b$10$abcdefghijklmnopqrstuuJ4X5wFOEwq0q9yS2xF0D6P1XcMBWvC",
      userStatus: true,
      wallet: { rPrice: 100, walletHistory: [{ transactionType: "payment", transactionStatus: "failed" }] },
    });
    await db.collection("orderdatas").insertOne({
      ordereduser: userId.toString(),
      date: new Date(),
      grandtotal: 999,
      products: [],
      paymentmethod: "cod",
      status: "processing",
    });
    await db.collection("products").insertOne({ name: "Tee", quantity: -2, price: 10, image: ["x"] });
    await db.collection("banners").insertOne({ mainImageBanner: ["1690000000000-banner.jpg"] });
  });
  after(h.stopDb);

  it("upgrades old records and can run twice", async () => {
    const report = await migrate(db);
    assert.ok(report.some((l) => l.startsWith("admin passwords hashed: 1")));
    assert.ok(report.some((l) => l.includes("banners whose images must be re-uploaded in the admin panel: 1")));

    const admin = await db.collection("adminblogs").findOne();
    assert.equal(admin.adminMail, "admin@shop.com");
    assert.match(admin.adminPassword, /^\$2[aby]\$/);

    const user = await db.collection("blogs").findOne();
    assert.equal(user.email, "asha@example.com");
    assert.equal(user.wallet.walletHistory, undefined);
    assert.equal(user.wallet.rPrice, 100);

    const order = await db.collection("orderdatas").findOne();
    assert.ok(order.ordereduser instanceof mongoose.Types.ObjectId);
    assert.equal((await db.collection("products").findOne()).quantity, 0);

    const second = await migrate(db);
    assert.ok(second.some((l) => l.startsWith("admin passwords hashed: 0")));
  });

  it("lets the old admin log in with the old numeric password afterwards", async () => {
    const agent = h.browser();
    await agent.csrf("/adminLogin");
    const res = await agent.form("/adminLogged", { adminEmail: "admin@shop.com", adminPassword: "1234" });
    assert.equal(res.headers.location, "/admin");
  });

  it("shows migrated orders to their owner", async () => {
    const orderService = require("../services/order.service");
    const orders = await orderService.userOrders(userId.toString());
    assert.equal(orders.length, 1);
  });
});
