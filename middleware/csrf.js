const crypto = require("crypto");
const { forbidden } = require("../utils/httpError");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const sameToken = (a, b) =>
  typeof a === "string" &&
  a.length === b.length &&
  crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function checkToken(req, next) {
  const sent = req.get("x-csrf-token") || req.body?._csrf;
  if (!sameToken(sent, req.session.csrfToken)) {
    return next(forbidden("Your form expired, please refresh the page and try again"));
  }
  next();
}

// Every session gets a random token; pages put it in forms (`_csrf`) and
// AJAX requests send it as the X-CSRF-Token header. A request that changes
// data without the matching token is rejected, so other websites cannot
// submit actions on a logged-in user's behalf.
function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }
  res.locals.csrfToken = req.session.csrfToken;

  if (SAFE_METHODS.has(req.method)) return next();
  // File-upload forms are only parsed by multer later in the route, so their
  // token is checked by verifyCsrf placed after the upload middleware.
  if (req.is("multipart/form-data")) return next();
  checkToken(req, next);
}

function verifyCsrf(req, res, next) {
  checkToken(req, next);
}

module.exports = { csrfProtection, verifyCsrf };
