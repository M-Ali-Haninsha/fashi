// Creates the admin account, or resets its password if it already exists.
// Usage: npm run create-admin -- admin@example.com "a strong password"
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const config = require("../config/env");
const adminModel = require("../models/adminBase");

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error('Usage: npm run create-admin -- admin@example.com "password (8+ characters)"');
    process.exit(1);
  }

  await mongoose.connect(config.databaseUrl);
  await adminModel.updateOne(
    { adminMail: email.toLowerCase().trim() },
    { $set: { adminPassword: await bcrypt.hash(password, 10) } },
    { upsert: true }
  );
  console.log(`Admin ${email} is ready. Log in at ${config.appUrl}/adminLogin`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
