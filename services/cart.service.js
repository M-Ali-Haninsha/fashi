const cartModel = require("../models/cart");
const productModel = require("../models/product");
const { notFound, badRequest } = require("../utils/httpError");

// The cart's lines with current prices from the database. Products that were
// deleted or unlisted since they were added are left out.
async function getItems(userId) {
  const cart = await cartModel.findOne({ user: userId }).populate("products.productId");
  const items = (cart?.products ?? [])
    .filter((line) => line.productId && line.productId.status !== false)
    .map(({ productId: p, quantity }) => ({
      id: p._id,
      name: p.name,
      price: p.price,
      image: p.image,
      stock: p.quantity,
      quantity,
      subPrice: p.price * quantity,
    }));
  const total = items.reduce((sum, item) => sum + item.subPrice, 0);
  return { items, total };
}

async function findSellable(productId) {
  const product = await productModel.findOne({ _id: productId, status: { $ne: false } });
  if (!product) throw notFound("Product not found");
  return product;
}

// Returns false when there is no more stock for another unit.
async function add(userId, productId) {
  const product = await findSellable(productId);
  const cart = await cartModel.findOne({ user: userId });
  const line = cart?.products.find((p) => p.productId.toString() === product.id);
  const quantity = (line?.quantity ?? 0) + 1;
  if (quantity > product.quantity) return false;

  if (line) {
    line.quantity = quantity;
    line.cPrice = product.price * quantity;
    await cart.save();
  } else if (cart) {
    cart.products.push({ productId: product._id, quantity, cPrice: product.price });
    await cart.save();
  } else {
    await cartModel.create({
      user: userId,
      products: [{ productId: product._id, quantity, cPrice: product.price }],
    });
  }
  return true;
}

// Stock is always read from the database, never taken from the request.
async function setQuantity(userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) throw badRequest("Invalid quantity");
  const product = await findSellable(productId);
  if (quantity > product.quantity) return { inStock: false };

  const result = await cartModel.updateOne(
    { user: userId, "products.productId": product._id },
    { $set: { "products.$.quantity": quantity, "products.$.cPrice": product.price * quantity } }
  );
  if (!result.matchedCount) throw notFound("This product is not in your cart");
  const { total } = await getItems(userId);
  return { inStock: true, price: product.price * quantity, total };
}

async function remove(userId, productId) {
  await cartModel.updateOne({ user: userId }, { $pull: { products: { productId } } });
}

async function clear(userId) {
  await cartModel.deleteOne({ user: userId });
}

module.exports = { getItems, add, setQuantity, remove, clear };
