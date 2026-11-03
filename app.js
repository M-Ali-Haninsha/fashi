const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const logger = require("morgan");
const { engine } = require("express-handlebars");
const config = require("./config/env");
const helpers = require("./utils/hbsHelpers");
const { csrfProtection } = require("./middleware/csrf");
const { exposeUser } = require("./middleware/auth");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");

// `sessionStore` is passed in by server.js (MongoDB) and by the tests.
function createApp({ sessionStore } = {}) {
  const app = express();
  app.set("trust proxy", 1);

  app.engine(
    "hbs",
    engine({
      extname: "hbs",
      defaultLayout: "layout",
      layoutsDir: path.join(__dirname, "views/layout"),
      partialsDir: path.join(__dirname, "views/partials"),
      helpers,
      runtimeOptions: { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true },
    })
  );
  app.set("view engine", "hbs");
  app.set("views", path.join(__dirname, "views"));

  // The pages load scripts, styles and fonts from several CDNs and use inline
  // scripts, so a Content-Security-Policy is left off; helmet's other headers apply.
  app.use(helmet({ contentSecurityPolicy: false }));
  if (!config.isTest) app.use(logger("dev"));
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(express.static(path.join(__dirname, "public")));

  app.use(
    session({
      secret: config.sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProduction,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );
  app.use(csrfProtection);
  app.use(exposeUser);

  app.use("/", userRouter);
  app.use("/", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
