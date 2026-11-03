const couponModel = require("../models/couponModel");
const { badRequest, notFound } = require("../utils/httpError");

// Checks a coupon against the cart total and returns the discount, which is
// never more than the total. Throws with a message for the shopper otherwise.
async function evaluate(code, userId, total) {
  const coupon = await couponModel.findOne({ couponcode: code });
  const now = new Date();
  if (!coupon) throw badRequest("Invalid coupon code");
  if (!coupon.status) throw badRequest("This coupon is not active");
  if (coupon.startingdate > now) throw badRequest("This coupon is not valid yet");
  if (coupon.expiredate < now) throw badRequest("This coupon has expired");
  if (total < coupon.minpurchase) {
    throw badRequest(`Minimum purchase of ₹${coupon.minpurchase} required`);
  }
  if (coupon.usedUser.some((u) => String(u) === String(userId))) {
    throw badRequest("You have already used this coupon");
  }
  return { coupon, discount: Math.min(coupon.discountvalue, total) };
}

// Records the use when the order is placed (not when the coupon is applied).
// Returns false if this user already used it.
async function markUsed(code, userId) {
  const result = await couponModel.updateOne(
    { couponcode: code, usedUser: { $ne: String(userId) } },
    { $push: { usedUser: String(userId) } }
  );
  return result.modifiedCount === 1;
}

async function unmarkUsed(code, userId) {
  await couponModel.updateOne({ couponcode: code }, { $pull: { usedUser: String(userId) } });
}

// Admin

const list = () => couponModel.find().sort({ expiredate: -1 });

async function get(id) {
  const coupon = await couponModel.findById(id);
  if (!coupon) throw notFound("Coupon not found");
  return coupon;
}

function checkDates({ startingdate, expiredate }) {
  if (expiredate < startingdate) throw badRequest("The expiry date must be after the start date");
}

async function create(data) {
  checkDates(data);
  if (await couponModel.exists({ couponcode: data.couponcode })) {
    throw badRequest("A coupon with this code already exists");
  }
  await couponModel.create(data);
}

async function update(id, data) {
  checkDates(data);
  const clash = await couponModel.exists({ couponcode: data.couponcode, _id: { $ne: id } });
  if (clash) throw badRequest("A coupon with this code already exists");
  const result = await couponModel.updateOne({ _id: id }, { $set: data });
  if (!result.matchedCount) throw notFound("Coupon not found");
}

async function setActive(id, status) {
  const result = await couponModel.updateOne({ _id: id }, { $set: { status } });
  if (!result.matchedCount) throw notFound("Coupon not found");
}

async function remove(id) {
  await couponModel.deleteOne({ _id: id });
}

module.exports = { evaluate, markUsed, unmarkUsed, list, get, create, update, setActive, remove };
