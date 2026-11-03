const userModel = require("../models/userBase");
const { notFound } = require("../utils/httpError");
const s = require("../validators/schemas");

const toAddress = (b) => ({
  firstName: b.firstname,
  lastName: b.lastname,
  address: b.address,
  country: b.country,
  postcode: b.postcode,
  district: b.district,
  city: b.city,
  emailAddress: b.email,
  phone: b.phone,
});

async function currentUser(req) {
  const user = await userModel.findById(req.session.userId);
  if (!user) throw notFound("Account not found");
  return user;
}

// Only ever looks inside the logged-in user's own addresses.
async function ownAddress(req, addressId) {
  const user = await currentUser(req);
  const address = user.address.id(addressId);
  if (!address) throw notFound("Address not found");
  return address;
}

async function profile(req, res) {
  const detail = await currentUser(req);
  res.render("user/userProfile", { user: true, detail, balance: detail.wallet.rPrice });
}

async function addAddressPage(req, res) {
  const { address } = await currentUser(req);
  res.render("user/editUserProfile", { user: true, address });
}

async function editAddressPage(req, res) {
  const address = await ownAddress(req, s.objectId.parse(req.query.id));
  res.render("user/editaddressfromuser", { user: true, address });
}

// Used by both the profile and the checkout page; `redirectTo` decides where to go back.
const addAddress = (redirectTo) => async (req, res) => {
  await userModel.updateOne({ _id: req.session.userId }, { $push: { address: toAddress(req.body) } });
  res.redirect(redirectTo);
};

const updateAddress = (redirectTo) => async (req, res) => {
  const result = await userModel.updateOne(
    { _id: req.session.userId, "address._id": req.body.id },
    {
      $set: Object.fromEntries(Object.entries(toAddress(req.body)).map(([k, v]) => [`address.$.${k}`, v])),
    }
  );
  if (!result.matchedCount) throw notFound("Address not found");
  res.redirect(redirectTo);
};

async function chooseAddressPage(req, res) {
  const { address: add } = await currentUser(req);
  res.render("user/addAddress", { user: true, add });
}

async function editCheckoutAddressPage(req, res) {
  const address = await ownAddress(req, s.objectId.parse(req.body.addressId));
  res.render("user/editAddress", { user: true, address });
}

async function walletHistory(req, res) {
  const user = await currentUser(req);
  const history = user.walletHistory
    .map((entry) => ({ ...entry.toObject(), id: entry.id, transactionDate: entry.transactionDate?.toLocaleString() }))
    .reverse();
  res.render("user/walletHistory", { user: true, walletHistory: history });
}

module.exports = {
  profile,
  addAddressPage,
  editAddressPage,
  addAddress,
  updateAddress,
  chooseAddressPage,
  editCheckoutAddressPage,
  walletHistory,
};
