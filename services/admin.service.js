const orderModel = require("../models/placeOrder");
const userModel = require("../models/userBase");
const productModel = require("../models/product");
const categoryModel = require("../models/category");
const bannerModel = require("../models/banner");
const uploadService = require("./upload.service");
const { STATUS, closeReturnWindows } = require("./order.service");
const { badRequest, notFound } = require("../utils/httpError");

const DELIVERED = [STATUS.delivered, STATUS.completed];

// Sales report and the dashboard's counters. `from`/`to` limit the report.
async function dashboard({ from, to }) {
  await closeReturnWindows();

  const reportQuery = { status: { $in: DELIVERED } };
  if (from || to) {
    reportQuery.date = {};
    if (from) reportQuery.date.$gte = from;
    if (to) reportQuery.date.$lte = to;
  }

  const [deliveredOrders, byStatus, byPayment, usercount, categories] = await Promise.all([
    orderModel.find(reportQuery).sort({ date: -1 }),
    orderModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    orderModel.aggregate([
      { $match: { status: { $in: DELIVERED } } },
      { $group: { _id: "$paymentmethod", count: { $sum: 1 } } },
    ]),
    userModel.countDocuments(),
    categoryModel.find({ name: { $in: ["men", "women", "kids"] } }),
  ]);

  const statusCount = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const paymentCount = Object.fromEntries(byPayment.map((p) => [p._id, p.count]));

  // How many delivered order lines belong to each of the men/women/kids categories.
  const allDelivered = await orderModel.find({ status: { $in: DELIVERED } }, "products");
  const productIds = allDelivered.flatMap((o) => o.products.map((p) => p.id));
  const soldProducts = await productModel.find({ _id: { $in: productIds } }, "category");
  const soldPerCategory = (name) => {
    const category = categories.find((c) => c.name === name);
    return category ? soldProducts.filter((p) => String(p.category) === String(category._id)).length : 0;
  };

  return {
    orderData: deliveredOrders,
    totalCollection: deliveredOrders.reduce((sum, o) => sum + o.grandtotal, 0),
    usercount,
    codCount: paymentCount.cod ?? 0,
    onlineCount: paymentCount.online ?? 0,
    walletCount: paymentCount.wallet ?? 0,
    statusProcessingCount: statusCount[STATUS.processing] ?? 0,
    statusShippedCount: statusCount[STATUS.shipped] ?? 0,
    statusDeliveredCount: statusCount[STATUS.delivered] ?? 0,
    statusSuccedfulCount: statusCount[STATUS.completed] ?? 0,
    statusreturnConfirmedCount: statusCount[STATUS.returnConfirmed] ?? 0,
    productsInMenCategoryCount: soldPerCategory("men"),
    productsInWomenCategoryCount: soldPerCategory("women"),
    productsInkidCategoryCount: soldPerCategory("kids"),
  };
}

const listUsers = () => userModel.find().select("username email phoneNo userStatus").lean();

async function setUserActive(id, userStatus) {
  const result = await userModel.updateOne({ _id: id }, { $set: { userStatus } });
  if (!result.matchedCount) throw notFound("User not found");
}

// Products

const listProducts = () => productModel.find().populate("category");

async function getProduct(id) {
  const product = await productModel.findById(id).lean();
  if (!product) throw notFound("Product not found");
  return product;
}

async function categoryByName(name) {
  const category = await categoryModel.findOne({ name });
  if (!category) throw badRequest("Please choose a valid category");
  return category;
}

async function createProduct(data, files) {
  if (!files?.length) throw badRequest("Please add at least one image");
  const category = await categoryByName(data.category);
  const image = await uploadService.uploadImages(files, "products");
  await productModel.create({
    name: data.pName,
    image,
    quantity: data.pQuantity,
    price: data.pPrice,
    category: category._id,
    description: data.description,
  });
}

async function updateProduct(id, data, files) {
  const category = await categoryByName(data.pCategory);
  const update = {
    name: data.pName,
    quantity: data.pQuantity,
    price: data.pPrice,
    description: data.description,
    category: category._id,
  };
  if (files?.length) update.image = await uploadService.uploadImages(files, "products");
  const result = await productModel.updateOne({ _id: id }, { $set: update });
  if (!result.matchedCount) throw notFound("Product not found");
}

async function removeProductImage(id, image) {
  await productModel.updateOne({ _id: id }, { $pull: { image } });
}

async function setProductListed(id, status) {
  const result = await productModel.updateOne({ _id: id }, { $set: { status } });
  if (!result.matchedCount) throw notFound("Product not found");
}

// Categories

const listCategories = () => categoryModel.find().lean();

async function getCategory(id) {
  const category = await categoryModel.findById(id);
  if (!category) throw notFound("Category not found");
  return category;
}

const nameTaken = (name, exceptId) =>
  categoryModel.exists({
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    ...(exceptId && { _id: { $ne: exceptId } }),
  });

async function createCategory(name) {
  if (await nameTaken(name)) return { error: "already exists" };
  await categoryModel.create({ name });
  return {};
}

async function renameCategory(id, name) {
  if (await nameTaken(name, id)) return { error: "already exists" };
  const result = await categoryModel.updateOne({ _id: id }, { $set: { name } });
  if (!result.matchedCount) throw notFound("Category not found");
  return {};
}

// Returns false (and deletes nothing) while products still use the category.
async function deleteCategory(id) {
  if (await productModel.exists({ category: id })) return false;
  await categoryModel.deleteOne({ _id: id });
  return true;
}

// Banner (the home page has a single banner document)

const getBanner = () => bannerModel.findOne();

async function saveBanner(data, files) {
  const update = { span1: data.span1, mainH1: data.mainH1, mainP: data.mainP, direction: data.direction };
  if (files?.length) update.mainImageBanner = await uploadService.uploadImages(files, "banners");
  await bannerModel.updateOne({}, { $set: update }, { upsert: true });
}

module.exports = {
  dashboard,
  listUsers,
  setUserActive,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  removeProductImage,
  setProductListed,
  listCategories,
  getCategory,
  createCategory,
  renameCategory,
  deleteCategory,
  getBanner,
  saveBanner,
};
