const cartService = require("../services/cart.service");

async function cart(req, res) {
  const { items, total } = await cartService.getItems(req.session.userId);
  res.render("user/cart", { user: true, cartlist: items, total, exists: items.length > 0 });
}

async function addToCart(req, res) {
  const added = await cartService.add(req.session.userId, req.body.id);
  if (!added) return res.status(409).json({ status: false, msg: "No more stock for this product" });
  res.json({ status: true });
}

async function updateCart(req, res) {
  const result = await cartService.setQuantity(req.session.userId, req.body.id, req.body.quantity);
  if (!result.inStock) return res.json({ status: "out", data: "out of stock" });
  res.json({ status: true, data: { price: result.price, total: result.total, stocks: "" } });
}

async function removeFromCart(req, res) {
  await cartService.remove(req.session.userId, req.body.id);
  res.redirect("/cart");
}

module.exports = { cart, addToCart, updateCart, removeFromCart };
