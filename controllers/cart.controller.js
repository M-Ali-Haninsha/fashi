const cartService = require("../services/cart.service");

async function cart(req, res) {
  const { items, total } = await cartService.getItems(req.session.userId);
  res.render("user/cart", {
    user: true,
    cartlist: items.map((item) => ({
      ...item,
      atMax: item.quantity >= item.stock,
      outOfStock: item.stock <= 0 || item.quantity > item.stock,
    })),
    total,
    exists: items.length > 0,
  });
}

async function addToCart(req, res) {
  const added = await cartService.add(req.session.userId, req.body.id);
  const count = await cartService.count(req.session.userId);
  if (!added) return res.status(409).json({ status: false, msg: "No more stock for this product", count });
  res.json({ status: true, count });
}

async function updateCart(req, res) {
  const result = await cartService.setQuantity(req.session.userId, req.body.id, req.body.quantity);
  const count = await cartService.count(req.session.userId);
  if (!result.inStock) {
    return res.json({ status: "out", data: `Only ${result.stock} left in stock`, stock: result.stock, count });
  }
  res.json({ status: true, data: { price: result.price, total: result.total, stocks: "" }, stock: result.stock, count });
}

async function removeFromCart(req, res) {
  await cartService.remove(req.session.userId, req.body.id);
  res.redirect("/cart");
}

module.exports = { cart, addToCart, updateCart, removeFromCart };
