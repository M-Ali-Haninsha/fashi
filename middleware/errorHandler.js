const multer = require("multer");
const mongoose = require("mongoose");
const { HttpError } = require("../utils/httpError");

const wantsJson = (req) => req.xhr || req.accepts(["html", "json"]) === "json";

// The error page draws the status code's first and last digit around a ring.
const errorPage = (code, message) => ({ layout: false, code, first: code[0], last: code[code.length - 1], message });

function statusAndMessage(err) {
  if (err instanceof HttpError) return [err.status, err.message];
  if (err instanceof multer.MulterError) return [400, err.message];
  if (err instanceof mongoose.Error.CastError) return [404, "Page not found"];
  if (err instanceof mongoose.Error.ValidationError) return [400, err.message];
  if (err.type === "entity.parse.failed") return [400, "Malformed request body"];
  return [500, "Something went wrong on our side. Please try again."];
}

function notFoundHandler(req, res) {
  res.status(404);
  if (wantsJson(req)) return res.json({ status: false, msg: "Not found" });
  res.render("error", errorPage("404", "Page not found"));
}

// Express 5 forwards errors thrown in async handlers here. Express recognises
// an error handler by its four parameters, so `next` must stay.
function errorHandler(err, req, res, next) {
  const [status, message] = statusAndMessage(err);
  if (status >= 500) console.error(err);
  if (res.headersSent) return next(err);

  res.status(status);
  if (wantsJson(req)) return res.json({ status: false, msg: message });
  res.render("error", errorPage(String(status), message));
}

module.exports = { notFoundHandler, errorHandler, errorPage };
