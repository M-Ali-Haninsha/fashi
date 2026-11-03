const productModel = require("../models/product");
const categoryModel = require("../models/category");
const bannerModel = require("../models/banner");
const { notFound } = require("../utils/httpError");

const PAGE_SIZE = 6;
const listed = { status: { $ne: false } };
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function productsIn(categoryName) {
  const category = await categoryModel.findOne({ name: categoryName });
  return category ? productModel.find({ ...listed, category: category._id }) : [];
}

async function homePage() {
  const [banner, menPro, womenPro, kidPro, categories, productData] = await Promise.all([
    bannerModel.findOne(),
    productsIn("men"),
    productsIn("women"),
    productsIn("kids"),
    categoryModel.find().limit(3),
    productModel.find(listed).limit(6),
  ]);
  return {
    banner,
    menPro,
    womenPro,
    kidPro,
    productData,
    // The home page shows the first three categories in separate blocks.
    baseCategory1: categories.slice(0, 1),
    baseCategory2: categories.slice(1, 2),
    baseCategory3: categories.slice(2, 3),
  };
}

// Search, category, price range and sort, with pagination. `filters` has
// already been validated (see validators).
async function shop({ page, search, categoryId, minPrice, maxPrice, sortValue }) {
  const query = {
    ...listed,
    price: { $gte: minPrice, $lte: maxPrice },
  };
  if (search) query.name = { $regex: escapeRegex(search), $options: "i" };
  if (categoryId) query.category = categoryId;

  const [productData, count, baseCategory] = await Promise.all([
    productModel
      .find(query)
      .sort({ price: sortValue })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    productModel.countDocuments(query),
    categoryModel.find(),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return {
    productData,
    baseCategory,
    totalPages,
    currentPage: page,
    nextPage: page + 1,
    previousPage: page - 1,
  };
}

async function product(id) {
  const found = await productModel.findOne({ _id: id, ...listed });
  if (!found) throw notFound("Product not found");
  return found;
}

module.exports = { homePage, shop, product };
