const userModel = require("../models/userBase");

function historyEntry(type, amount, balance, transactionType) {
  return {
    transactionDate: new Date(),
    transactionType,
    transactionAmount: amount,
    transactionStatus: "successful",
    type,
    currentBalance: balance,
  };
}

// Takes money from the wallet only if the balance covers it (checked and
// changed in one database operation). Returns false when it does not.
async function debit(userId, amount, description = "wallet payment") {
  const user = await userModel.findOneAndUpdate(
    { _id: userId, "wallet.rPrice": { $gte: amount } },
    { $inc: { "wallet.rPrice": -amount } },
    { new: true }
  );
  if (!user) return false;
  await userModel.updateOne(
    { _id: userId },
    { $push: { walletHistory: historyEntry("Debit", amount, user.wallet.rPrice, description) } }
  );
  return true;
}

async function credit(userId, amount, description = "refund") {
  const user = await userModel.findOneAndUpdate(
    { _id: userId },
    { $inc: { "wallet.rPrice": amount } },
    { new: true }
  );
  await userModel.updateOne(
    { _id: userId },
    { $push: { walletHistory: historyEntry("Credit", amount, user.wallet.rPrice, description) } }
  );
}

module.exports = { debit, credit };
