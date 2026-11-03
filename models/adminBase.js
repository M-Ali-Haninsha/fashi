const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  adminMail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  // bcrypt hash; create or reset with `npm run create-admin`.
  adminPassword: {
    type: String,
    required: true,
    select: false,
  },
});

module.exports = mongoose.model("adminBlog", adminSchema);
