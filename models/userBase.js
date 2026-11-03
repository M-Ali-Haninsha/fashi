const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  address: String,
  country: String,
  postcode: Number,
  district: String,
  city: String,
  emailAddress: String,
  phone: Number,
});

const walletEntrySchema = new mongoose.Schema({
  transactionDate: { type: Date, default: Date.now },
  transactionType: { type: String, required: true },
  transactionAmount: { type: Number, required: true },
  transactionStatus: { type: String, required: true },
  type: { type: String, required: true },
  currentBalance: { type: Number, required: true },
});

const userBaseSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phoneNo: { type: Number, required: true },
  password: { type: String, required: true, select: false },
  userStatus: { type: Boolean, default: true },
  address: [addressSchema],
  wallet: {
    rPrice: { type: Number, default: 0, min: 0 },
  },
  walletHistory: [walletEntrySchema],
  // Password reset: only a hash of the emailed token is stored.
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false },
});

module.exports = mongoose.model("blog", userBaseSchema);
