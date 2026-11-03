const { rateLimit } = require("express-rate-limit");
const config = require("../config/env");
const { errorPage } = require("./errorHandler");

// Slows down password, OTP and reset-email guessing: 20 tries per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).render("error", errorPage("429", "Too many attempts, please try again later")),
});

module.exports = { authLimiter };
