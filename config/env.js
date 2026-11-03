require("dotenv").config({ quiet: true });

const required = [
  "DATABASE",
  "SESSION_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "MAIL_USER",
  "MAIL_PASS",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE,
  sessionSecret: process.env.SESSION_SECRET,
  // Used to build links in emails, e.g. password reset.
  appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  isProduction,
  isTest: process.env.NODE_ENV === "test",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
  mail: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
};
