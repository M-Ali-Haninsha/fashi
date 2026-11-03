const crypto = require("crypto");
const bcrypt = require("bcrypt");
const config = require("../config/env");
const userModel = require("../models/userBase");
const adminModel = require("../models/adminBase");
const pendingSignupModel = require("../models/pendingSignup");
const mailService = require("./mail.service");
const { HttpError, badRequest, conflict } = require("../utils/httpError");

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const RESET_TTL_MS = 30 * 60 * 1000;

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const generateOtp = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

async function sendOtpOrFail(email, otp) {
  try {
    await mailService.sendOtp(email, otp);
  } catch (err) {
    console.error("OTP email failed:", err.message);
    throw new HttpError(502, "Could not send the OTP email, please try again");
  }
}

// Step 1 of signup: remember the details (with the password already hashed)
// and email an OTP. Nothing is added to the users collection yet.
async function startSignup({ username, email, phone, password }) {
  if (await userModel.exists({ email })) {
    throw conflict("An account with this email already exists");
  }
  const otp = generateOtp();
  await pendingSignupModel.findOneAndUpdate(
    { email },
    {
      email,
      otpHash: sha256(otp),
      attempts: 0,
      data: { username, email, phoneNo: phone, password: await bcrypt.hash(password, 10) },
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true }
  );
  await sendOtpOrFail(email, otp);
}

async function resendOtp(email) {
  const pending = await pendingSignupModel.findOne({ email });
  if (!pending) throw badRequest("Your signup has expired, please sign up again");
  const otp = generateOtp();
  pending.otpHash = sha256(otp);
  pending.attempts = 0;
  pending.expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await pending.save();
  await sendOtpOrFail(email, otp);
}

// Step 2 of signup: create the account once the OTP matches.
async function confirmSignup(email, otp) {
  const pending = await pendingSignupModel.findOne({ email });
  if (!pending || pending.expiresAt < new Date()) {
    throw badRequest("Your OTP has expired, please sign up again");
  }
  if (pending.attempts >= MAX_OTP_ATTEMPTS) {
    await pending.deleteOne();
    throw badRequest("Too many wrong attempts, please sign up again");
  }
  if (pending.otpHash !== sha256(otp)) {
    pending.attempts += 1;
    await pending.save();
    throw badRequest("Wrong OTP");
  }
  await userModel.create(pending.data);
  await pending.deleteOne();
}

// Returns the user, or a message to show on the login page.
async function login(email, password) {
  const user = await userModel.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: "Incorrect email or password" };
  }
  if (!user.userStatus) return { error: "Your account is blocked by admin" };
  return { user };
}

async function adminLogin(email, password) {
  const admin = await adminModel.findOne({ adminMail: email }).select("+adminPassword");
  // Old records stored the password as a plain number; those must be
  // upgraded with scripts/migrate-legacy-data.js before they can log in.
  if (typeof admin?.adminPassword !== "string") return false;
  return bcrypt.compare(password, admin.adminPassword);
}

// Emails a one-time link. The response is the same whether or not the email
// exists, so the form cannot be used to discover who has an account.
async function requestPasswordReset(email) {
  const user = await userModel.findOne({ email });
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  // updateOne (not save) so older records with unusual fields still work.
  await userModel.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_TTL_MS) } }
  );

  const link = `${config.appUrl}/updatePassPage?token=${token}`;
  try {
    await mailService.sendPasswordReset(email, link);
  } catch (err) {
    console.error("Reset email failed:", err.message);
    throw new HttpError(502, "Could not send the reset email, please try again");
  }
}

async function findByResetToken(token) {
  if (!token) return null;
  return userModel
    .findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } })
    .select("+resetTokenHash +resetTokenExpires");
}

async function resetPassword(token, password) {
  const user = await findByResetToken(token);
  if (!user) throw badRequest("This reset link is invalid or has expired");
  await userModel.updateOne(
    { _id: user._id },
    { $set: { password: await bcrypt.hash(password, 10) }, $unset: { resetTokenHash: 1, resetTokenExpires: 1 } }
  );
}

module.exports = {
  startSignup,
  resendOtp,
  confirmSignup,
  login,
  adminLogin,
  requestPasswordReset,
  findByResetToken,
  resetPassword,
};
