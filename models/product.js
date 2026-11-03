const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  // Cloudinary public ids.
  image: { type: Array, required: true },
  quantity: { type: Number, min: 0, default: 0 },
  price: { type: Number, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
  description: { type: String },
  status: { type: Boolean, default: true },
});

module.exports = mongoose.model("products", productSchema);
