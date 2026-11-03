const userModel = require("../models/userBase");
const cartService = require("../services/cart.service");

// Pages for logged-in shoppers. Blocked accounts are logged out immediately.
async function requireUser(req, res, next) {
  if (!req.session.userId) {
    if (req.xhr || req.accepts(["html", "json"]) === "json") {
      return res.status(401).json({ status: false, msg: "Please log in first", login: true });
    }
    return res.redirect("/userLogin");
  }

  const user = await userModel.findById(req.session.userId).select("userStatus username");
  if (!user || !user.userStatus) {
    await new Promise((resolve) => req.session.destroy(resolve));
    return res.status(403).render("user/userLogin", {
      user: true,
      error1: "Your account is blocked by admin",
    });
  }

  res.locals.userName = user.username;
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect("/adminLogin");
}

// Makes the shopper's name and cart size available to every page (the header shows both).
async function exposeUser(req, res, next) {
  res.locals.userName = req.session.username || null;
  res.locals.cartCount = 0;
  if (req.session.userId && req.method === "GET" && !req.xhr) {
    res.locals.cartCount = await cartService.count(req.session.userId);
  }
  next();
}

module.exports = { requireUser, requireAdmin, exposeUser };
