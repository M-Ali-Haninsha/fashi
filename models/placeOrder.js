const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  ordereduser: { type: mongoose.Schema.Types.ObjectId, ref: "blog", required: true },
  deliveryaddress: {
    firstname: String,
    lastname: String,
    country: String,
    state: String,
    pincode: Number,
    district: String,
    phonenumber: Number,
    email: String,
    address: String,
  },
  date: { type: Date, required: true },
  grandtotal: { type: Number, required: true, min: 0 },
  // What the shopper paid with: "cod", "wallet" or "online" (Razorpay).
  paymentmethod: { type: String, required: true },
  products: { type: Array, required: true },
  status: { type: String, required: true },
  couponCode: String,
  discount: { type: Number, default: 0 },
  razorpayOrderId: { type: String, index: { unique: true, sparse: true } },
  razorpayPaymentId: String,
  deliveredAt: Date,
  // Set once money has been returned to the wallet, so it can only happen once.
  refundedAt: Date,
});

module.exports = mongoose.model("orderdatas", orderSchema);
