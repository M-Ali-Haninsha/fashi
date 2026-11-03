const nodemailer = require("nodemailer");
const config = require("../config/env");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: config.mail.user, pass: config.mail.pass },
});

async function sendOtp(email, otp) {
  await transporter.sendMail({
    from: config.mail.user,
    to: email,
    subject: "Your Fashi OTP",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });
}

async function sendPasswordReset(email, link) {
  await transporter.sendMail({
    from: config.mail.user,
    to: email,
    subject: "Reset your Fashi password",
    text: `Use this link to set a new password (valid for 30 minutes):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    html: `<p>Use this link to set a new password (valid for 30 minutes):</p><p><a href="${link}">${link}</a></p><p>If you did not ask for this, you can ignore this email.</p>`,
  });
}

module.exports = { sendOtp, sendPasswordReset };
