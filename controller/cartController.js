const { json } = require("express");
const Cart = require("../models/cart");
const productsDb = require("../models/product");

const cart = async (req, res) => {
  try{
  userName = req.session.username;
  const userLoggedIn = req.session.userIn;

  const exists = await Cart. exists({ user: req.session.userId }).populate(
    "products.productId"
  );

  if(exists){

    const pageCart = await Cart.find({ user: req.session.userId }).populate(
      "products.productId"
    );
    const [{ products }] = pageCart;
    const cartlist = products.map(({ productId, quantity, cPrice }) => ({
      id: productId._id,
      name: productId.name,
      price: productId.price,
      image: productId.image,
      stock: productId.quantity,
      quantity: quantity,
      subPrice: cPrice,
    }));
    const total = cartlist.reduce((acc, value) => {
      return acc + value.subPrice;
    }, 0);
    await Cart.updateOne(
      { user: req.session.userId },
      { $set: { totalPrice: total } }
    );
  
    res.render("user/cart", { user: true, cartlist, userName, total ,exists});

  }else{

    res.render('user/cart',{user:true, exists})
  }
  }catch(err){
    console.log(err)
  }
};



const addToCart = async (req, res) => {
  try {
    const user = req.session.userId;
    if(user){
      const cart = await Cart.findOne({ user: user });

      const productId = req.query.id; // product object containing productId and quantity
  
      // check if the product already exists in the cart
      const existingProduct = await productsDb.findOne({ _id: productId });
      const pPrice = existingProduct.price;
  
      if (cart) {
        // if product exists, update the quantity and price
        const product = await Cart.findOne({
          user: user,
          "products.productId": productId,
        });
        if (product) {
          const exists = await Cart.findOneAndUpdate(
            { user: user, "products.productId": productId },
            {
              $inc: { "products.$.quantity": 1, "products.$.cPrice": pPrice },
            }
          );
        } else {
          // if product does not exist, add it to the cart
          await Cart.updateOne(
            { user: user },
            {
              $addToSet: {
                products: { productId: productId, quantity: 1, cPrice: pPrice },
              },
            }
          );
        }
      } else {
        await Cart.create([
          {
            user: user,
            products: { productId: productId, quantity: 1, cPrice: pPrice },
          },
        ]);
      }
  
      res.json({ status: true });
    }else{
      res.json({status: false})
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateCart = async (req, res) => {
  try {
    const user = req.session.userId;
    const id = req.body.id;
    const product = await productsDb.findOne({ _id: id });
    const quantity = parseInt(req.body.quantity);
    const stock = parseInt(req.body.stock);
    const price = product.price * quantity;

    if (stock >= quantity) {
      await Cart.updateOne(
        { user: user, "products.productId": id },
        {
          $set: { "products.$.quantity": quantity, "products.$.cPrice": price },
        }
      );

      const pageCart = await Cart.find({ user: user }).populate(
        "products.productId"
      );
      const [{ products }] = pageCart;
      const cartlist = products.map(({ cPrice }) => ({
        subPrice: cPrice,
      }));
      const total = cartlist.reduce((acc, value) => {
        return acc + value.subPrice;
      }, 0);
      await Cart.updateOne({ user: user }, { $set: { totalPrice: total } });

      res.json({ status: true, data: { price, total, stocks: "" } });
    } else {
      res.json({ status: "out", data: "out of stock" });
    }
  } catch (err) {
    console.log(err);
  }
};


const removeFromCart = async (req, res) => {
  try{
  const user = req.session.userId;
  const productIdToRemove = req.query.id;
  console.log(productIdToRemove);
  const rCart = await Cart.findOneAndUpdate(
    { user: user, "products.productId": productIdToRemove },
    { $pull: { products: { productId: productIdToRemove } } },
    { new: true }
  );
  res.redirect("/cart");
  }catch(err){
    console.log(err)
  }
};

module.exports = {
  cart,
  addToCart,
  removeFromCart,
  updateCart,
};
