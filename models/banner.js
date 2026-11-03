const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  // Cloudinary public ids.
  mainImageBanner: { type: Array },
  span1: { type: String },
  mainH1: { type: String },
  mainP: { type: String },
  direction: { type: String },
});

module.exports = mongoose.model("banner", bannerSchema);
