const authService = require("../services/auth.service");
const { parseForm } = require("../utils/forms");
const s = require("../validators/schemas");

const page = (view, extra = {}) => (req, res) => res.render(view, { user: true, ...extra });

const signupPage = page("user/userSignup");
const loginPage = page("user/userLogin");
const forgotPasswordPage = page("user/fPassword");
const resetSentPage = page("user/success");

function otpPage(req, res) {
  if (!req.session.pendingEmail) return res.redirect("/userSignup");
  res.render("user/otpPage", { user: true });
}

async function signup(req, res) {
  const { data, error } = parseForm(s.signup, req.body);
  if (error) return res.status(400).render("user/userSignup", { user: true, exists: error });
  try {
    await authService.startSignup(data);
  } catch (err) {
    if (err.status === 409) return res.status(409).render("user/userSignup", { user: true, exists: err.message });
    throw err;
  }
  req.session.pendingEmail = data.email;
  res.redirect("/otpPage");
}

async function resendOtp(req, res) {
  if (!req.session.pendingEmail) return res.redirect("/userSignup");
  await authService.resendOtp(req.session.pendingEmail);
  res.redirect("/otpPage");
}

async function confirmOtp(req, res) {
  const email = req.session.pendingEmail;
  if (!email) return res.redirect("/userSignup");
  const { data, error } = parseForm(s.otp, req.body);
  if (error) return res.status(400).render("user/otpPage", { user: true, wrong: "Please enter the 6-digit OTP" });
  try {
    await authService.confirmSignup(email, data.otp);
  } catch (err) {
    if (err.status === 400) return res.status(400).render("user/otpPage", { user: true, wrong: err.message });
    throw err;
  }
  delete req.session.pendingEmail;
  res.redirect("/userLogin");
}

// A new session id on login prevents session fixation.
const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));

async function login(req, res) {
  const { data, error } = parseForm(s.login, req.body);
  if (error) return res.status(400).render("user/userLogin", { user: true, noUser: "Please enter your email and password" });

  const result = await authService.login(data.Email, data.pass);
  if (result.error) return res.status(401).render("user/userLogin", { user: true, noUser: result.error });

  await regenerate(req);
  req.session.userId = result.user._id.toString();
  req.session.username = result.user.username;
  res.redirect("/");
}

function logout(req, res) {
  req.session.destroy(() => res.redirect("/shop"));
}

async function forgotPassword(req, res) {
  const { data, error } = parseForm(s.forgotPassword, req.body);
  if (error) return res.status(400).render("user/fPassword", { user: true, error: "Please enter a valid email" });
  await authService.requestPasswordReset(data.fEmail);
  res.redirect("/success");
}

async function resetPasswordPage(req, res) {
  const valid = await authService.findByResetToken(req.query.token);
  if (!valid) {
    return res.status(400).render("user/fPassword", { user: true, error: "This reset link is invalid or has expired" });
  }
  res.render("user/updatePass", { user: true, token: req.query.token });
}

async function resetPassword(req, res) {
  const { data, error } = parseForm(s.resetPassword, req.body);
  if (error) return res.status(400).render("user/updatePass", { user: true, token: req.body.token, error });
  try {
    await authService.resetPassword(data.token, data.password);
  } catch (err) {
    if (err.status === 400) return res.status(400).render("user/fPassword", { user: true, error: err.message });
    throw err;
  }
  res.redirect("/userLogin");
}

module.exports = {
  signupPage,
  loginPage,
  forgotPasswordPage,
  resetSentPage,
  otpPage,
  signup,
  resendOtp,
  confirmOtp,
  login,
  logout,
  forgotPassword,
  resetPasswordPage,
  resetPassword,
};
