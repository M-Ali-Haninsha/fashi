const catalogService = require("../services/catalog.service");
const s = require("../validators/schemas");
const { errorPage } = require("../middleware/errorHandler");

async function home(req, res) {
  res.render("user/index", { user: true, ...(await catalogService.homePage()) });
}

async function shop(req, res) {
  const filters = s.shop.parse(req.query);
  const data = await catalogService.shop(filters);
  res.render("user/shop", {
    user: true,
    ...data,
    categoryId: filters.categoryId,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice === Number.MAX_SAFE_INTEGER ? "" : filters.maxPrice,
    sortValue: filters.sortValue,
    search: filters.search,
    // Keeps the filters in the page links (see the pagination helper).
    pageQuery: { ...req.query },
  });
}

async function product(req, res) {
  const id = s.objectId.safeParse(req.query.id);
  if (!id.success) return res.status(404).render("error", errorPage("404", "Product not found"));
  res.render("user/singleProduct", { user: true, singleProductView: await catalogService.product(id.data) });
}

module.exports = { home, shop, product };
