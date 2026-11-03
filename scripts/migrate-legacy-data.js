// One-off upgrade of data written by the old version of Fashi. Safe to run
// more than once: each step only touches records still in the old format.
// Usage: node scripts/migrate-legacy-data.js
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const config = require("../config/env");

// Upgrades the data and returns a report (one line per step).
async function migrate(db) {
  const report = [];

  // 1. Admin passwords were stored as plain numbers; hash them.
  const admins = await db.collection("adminblogs").find({ adminPassword: { $not: /^\$2[aby]\$/ } }).toArray();
  for (const admin of admins) {
    const hash = await bcrypt.hash(String(admin.adminPassword), 10);
    await db.collection("adminblogs").updateOne({ _id: admin._id }, { $set: { adminPassword: hash } });
  }
  report.push(`admin passwords hashed: ${admins.length} (log in with the same password as before)`);

  // 2. Emails are now matched in lowercase.
  for (const [collection, field] of [["blogs", "email"], ["adminblogs", "adminMail"]]) {
    const result = await db
      .collection(collection)
      .updateMany({ [field]: { $regex: "[A-Z]|^\\s|\\s$" } }, [
        { $set: { [field]: { $toLower: { $trim: { input: `$${field}` } } } } },
      ]);
    report.push(`${collection}: emails lowercased: ${result.modifiedCount}`);
  }

  // 3. Orders stored the customer as a string id; they now reference the user.
  const orders = await db.collection("orderdatas").find({ ordereduser: { $type: "string" } }).toArray();
  let converted = 0;
  for (const order of orders) {
    if (!mongoose.isValidObjectId(order.ordereduser)) continue;
    await db
      .collection("orderdatas")
      .updateOne({ _id: order._id }, { $set: { ordereduser: new mongoose.Types.ObjectId(order.ordereduser) } });
    converted++;
  }
  report.push(`orders linked to their user: ${converted} of ${orders.length}`);

  // 4. Failed wallet payments were pushed into a misplaced wallet.walletHistory field.
  const misplaced = await db
    .collection("blogs")
    .updateMany({ "wallet.walletHistory": { $exists: true } }, { $unset: { "wallet.walletHistory": "" } });
  report.push(`misplaced wallet history fields removed: ${misplaced.modifiedCount}`);

  // 5. Stock can no longer go below zero.
  const negative = await db.collection("products").updateMany({ quantity: { $lt: 0 } }, { $set: { quantity: 0 } });
  report.push(`products with negative stock reset to 0: ${negative.modifiedCount}`);

  // 6. Report what needs a human: duplicate emails/coupon codes block the new unique indexes.
  for (const [collection, field] of [["blogs", "email"], ["coupendatas", "couponcode"]]) {
    const dupes = await db
      .collection(collection)
      .aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }])
      .toArray();
    report.push(`${collection}: duplicate ${field} values to resolve by hand: ${dupes.length}`);
  }
  const banners = await db.collection("banners").countDocuments({ mainImageBanner: { $elemMatch: { $regex: "^\\d{13}-" } } });
  report.push(`banners whose images must be re-uploaded in the admin panel: ${banners}`);

  return report;
}

async function main() {
  await mongoose.connect(config.databaseUrl);
  const report = await migrate(mongoose.connection.db);
  console.log(report.map((line) => `- ${line}`).join("\n"));
  await mongoose.connection.syncIndexes();
  console.log("Indexes are up to date.");
  await mongoose.disconnect();
}

// Models must be registered for syncIndexes.
require("../models/userBase");
require("../models/adminBase");
require("../models/placeOrder");
require("../models/couponModel");
require("../models/pendingSignup");

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { migrate };
