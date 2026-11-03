const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const userModel = require("../models/userBase");

const signupFields = { username: "Asha", email: "Asha@Example.com", phone: "9876543210", password: "secret123" };

describe("signup, login and password reset", () => {
  before(h.startDb);
  after(h.stopDb);
  beforeEach(h.clearDb);

  it("creates the account only after the 6-digit OTP is confirmed", async () => {
    const agent = h.browser();
    await agent.csrf("/userSignup");
    const res = await agent.form("/signupSub", signupFields);
    assert.equal(res.headers.location, "/otpPage");
    assert.equal(await userModel.countDocuments(), 0);

    const otp = h.sentOtps.get("asha@example.com");
    assert.match(otp, /^\d{6}$/);
    await agent.form("/otpSub", { otp });
    assert.equal(await userModel.countDocuments(), 1);

    const user = await userModel.findOne().select("+password");
    assert.notEqual(user.password, "secret123");
  });

  it("shows an error for a wrong OTP and locks out after 5 tries", async () => {
    const agent = h.browser();
    await agent.csrf("/userSignup");
    await agent.form("/signupSub", signupFields);
    const otp = h.sentOtps.get("asha@example.com");
    const wrong = otp === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i++) {
      const res = await agent.form("/otpSub", { otp: wrong });
      assert.equal(res.status, 400);
      assert.match(res.text, /Wrong OTP/);
    }
    await agent.form("/otpSub", { otp });
    assert.equal(await userModel.countDocuments(), 0);
  });

  it("keeps two people's signups apart", async () => {
    const a = h.browser();
    const b = h.browser();
    await a.csrf("/userSignup");
    await b.csrf("/userSignup");
    await a.form("/signupSub", signupFields);
    await b.form("/signupSub", { ...signupFields, email: "ravi@example.com", username: "Ravi" });

    await a.form("/otpSub", { otp: h.sentOtps.get("asha@example.com") });
    await b.form("/otpSub", { otp: h.sentOtps.get("ravi@example.com") });
    const names = (await userModel.find().sort({ username: 1 })).map((u) => u.username);
    assert.deepEqual(names, ["Asha", "Ravi"]);
  });

  it("rejects a duplicate email at signup", async () => {
    await h.signupShopper();
    const agent = h.browser();
    await agent.csrf("/userSignup");
    const res = await agent.form("/signupSub", signupFields);
    assert.equal(res.status, 409);
    assert.match(res.text, /already exists/);
  });

  it("does not reveal whether the email or the password was wrong", async () => {
    await h.signupShopper();
    const agent = h.browser();
    await agent.csrf();
    const badEmail = await agent.form("/loggedIn", { Email: "nobody@example.com", pass: "secret123" });
    const badPass = await agent.form("/loggedIn", { Email: "asha@example.com", pass: "wrong" });
    assert.match(badEmail.text, /Incorrect email or password/);
    assert.match(badPass.text, /Incorrect email or password/);
  });

  it("really logs out", async () => {
    const agent = await h.signupShopper();
    await agent.get("/signout");
    assert.equal((await agent.get("/userProfile")).headers.location, "/userLogin");
  });

  it("resets a password only with the emailed token, and only once", async () => {
    await h.signupShopper();
    const agent = h.browser();
    await agent.csrf("/fPassword");
    await agent.form("/updatePass", { fEmail: "asha@example.com" });

    const link = h.sentResetLinks.get("asha@example.com");
    const token = new URL(link).searchParams.get("token");
    assert.match(token, /^[a-f0-9]{64}$/);

    assert.equal((await agent.get(`/updatePassPage?token=${token}`)).status, 200);
    await agent.form("/setpass", { token, password: "brand-new-pass" });

    const login = h.browser();
    await login.csrf();
    const res = await login.form("/loggedIn", { Email: "asha@example.com", pass: "brand-new-pass" });
    assert.equal(res.headers.location, "/");

    // The same link cannot be used again.
    const reuse = await agent.form("/setpass", { token, password: "another-pass" });
    assert.equal(reuse.status, 400);
  });

  it("no longer lets anyone reset a password by user id", async () => {
    const shopper = await h.signupShopper();
    const attacker = h.browser();
    await attacker.csrf();
    const res = await attacker.form(`/setpass?id=${shopper.userId}`, { password: "hacked-pass" });
    assert.equal(res.status, 400);

    const login = h.browser();
    await login.csrf();
    const still = await login.form("/loggedIn", { Email: "asha@example.com", pass: "secret123" });
    assert.equal(still.headers.location, "/");
  });

  it("answers the same way for an unknown email on forgot-password", async () => {
    const agent = h.browser();
    await agent.csrf("/fPassword");
    const res = await agent.form("/updatePass", { fEmail: "nobody@example.com" });
    assert.equal(res.headers.location, "/success");
    assert.equal(h.sentResetLinks.size, 0);
  });
});
