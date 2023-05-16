const ordercollection = require("../models/placeOrder");
const cartcollection = require("../models/cart");
const usercollection = require('../models/userBase')
const productcollection = require('../models/product')
const couponcollection = require('../models/couponModel')
const Razorpay = require("razorpay");
require("dotenv").config();

var instance = new Razorpay({
  key_id: process.env.SECRET_KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

const placeOrder = async (req, res) => {
  try {
    const user = req.session.userId;

    const pageCart = await cartcollection
      .find({ user: user })
      .populate("products.productId");

    const [{ products }] = pageCart;
    const prod = products.map(({ productId, quantity, cPrice }) => ({
      id: productId._id,
      name: productId.name,
      price: productId.price,
      image: productId.image,
      quantity: quantity,
      subPrice: cPrice,
    }));
    const deliveryaddress = {
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      country: req.body.country,
      state: req.body.city,
      pincode: req.body.pincode,
      district: req.body.district,
      phonenumber: req.body.phone,
      email: req.body.mail,
      address: req.body.address,
    };

    const grandtotal = req.session.grandtotal;
    const product = prod;
    const paymentmethod = req.body.payment;
    const date = new Date();
    const stat = "processing"

    if (req.body.payment === "wallet") {
      const id = req.session.userId;
      await ordercollection.insertMany([
        {
          ordereduser: user,
          deliveryaddress: deliveryaddress,
          date: date,
          grandtotal: grandtotal,
          products: product,
          paymentmethod: paymentmethod,
          status:stat
        },
      ]);

      const coupon = req.session.code
      if(coupon){
        const coupondata = await couponcollection.findOne({couponcode:coupon})
        const couponprice = coupondata.discountvalue
        console.log(couponprice)
        const find = await cartcollection.findOne({ user: user });
      let total = find.totalPrice - couponprice ;
      const userWallet = await usercollection.find({_id:id})
      let wallet = userWallet[0].wallet.rPrice
        if(wallet > 0){
          if(wallet >= total){
  
            wallet = wallet - total
           
  
            req.session.wallet = wallet
            await usercollection.updateOne({_id:req.session.userId},{$set:{'wallet.rPrice':req.session.wallet}})

            for (const { productId, quantity } of products) {
              await productcollection.updateOne(
                { _id: productId._id },
                { $inc: { quantity: -quantity } }
              );
            }
      
            await cartcollection.deleteOne({ user: id });
            res.json({ status: "cod" });
          }else{ 
            res.json({status:false})

          }
        }
      }else{
        const find = await cartcollection.findOne({ user: user });
      let total = find.totalPrice ;

      const userWallet = await usercollection.find({_id:id})
      let wallet = userWallet[0].wallet.rPrice
        if(wallet > 0){
          if(wallet >= total){
  
            wallet = wallet - total
          
            const transaction = {
              transactionDate: new Date(),
              transactionType: "wallet payment",
              transactionAmount: total,
              transactionStatus: "successful",
              type:"Debit",
              currentBalance: wallet
            };
  
            // req.session.wallet = wallet
            await usercollection.updateOne({_id:req.session.userId},{$set:{'wallet.rPrice':wallet}})


            const test = await usercollection.updateOne({_id:req.session.userId},{$push:{walletHistory:transaction}},
            { writeConcern: { acknowledged: true } });

            console.log(test);

            for (const { productId, quantity } of products) {
              await productcollection.updateOne(
                { _id: productId._id },
                { $inc: { quantity: -quantity } }
              );
            }
      
            await cartcollection.deleteOne({ user: id });
            res.json({ status: "cod" });

          }else{ 
            
            const transaction = {
              transactionDate: new Date(),
              transactionType: "payment",
              transactionAmount: total,
              transactionStatus: "failed",
              description: "Insufficient wallet balance",
              currentBalance: wallet
            };
        
            await usercollection.updateOne({_id:req.session.userId},{$push:{'wallet.walletHistory':transaction}});
        
            res.json({status:false})
          }
        }
      }
      
      

     
    }
     else if (req.body.payment === "cod") {
      const id = req.session.userId;
      await ordercollection.insertMany([
        {
          ordereduser: user,
          deliveryaddress: deliveryaddress,
          date: date,
          grandtotal: grandtotal,
          products: product,
          paymentmethod: paymentmethod,
          status:stat
        },
      ]);


      // await usercollection.updateOne({_id:req.session.userId},{$set:{'wallet.rPrice':req.session.wallet}})

      for (const { productId, quantity } of products) {
        await productcollection.updateOne(
          { _id: productId._id },
          { $inc: { quantity: -quantity } }
        );
      }

      await cartcollection.deleteOne({ user: id });
      res.json({ status: "cod" });
    } else if (req.body.payment === "paypal") {
      const deliveryaddress = {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        country: req.body.country,
        state: req.body.city,
        pincode: req.body.pincode,
        district: req.body.district,
        phonenumber: req.body.phone,
        email: req.body.mail,
        address: req.body.address,
      };
      req.session.deliveryaddress= deliveryaddress

      var options = {
        amount: grandtotal * 100,
        currency: "INR",
        receipt: "",
      };

      instance.orders.create(options, function (err, order) {
        if (err) {
          console.log(err);
        } else {
          res.json({ status: true, order: order });
        }
      });
    }
    

   
  } catch (err) {
    console.log(err);
  }
};

const userVerifypayment = async function (req, res) {
  try {
    const user = req.session.userId;
    if (user) {
      let raz = req.body;

      const crypto = require("crypto");

      let hmac = crypto.createHmac("sha256", process.env.KEY_SECRET);
      
     
      hmac.update(
        raz["payment[razorpay_order_id]"] +
          "|" +
          raz["payment[razorpay_payment_id]"]
      );

      hmac = hmac.digest("hex");


      if (hmac == raz["payment[razorpay_signature]"]) {
        const user = req.session.userId;

        const pageCart = await cartcollection
          .find({ user: user })
          .populate("products.productId");

        const [{ products }] = pageCart;
        const prod = products.map(({ productId, quantity, cPrice }) => ({
          id: productId._id,
          name: productId.name,
          price: productId.price,
          image: productId.image,
          quantity: quantity,
          subPrice: cPrice,
        }));



        const grandtotal = req.session.grandtotal;
        const product = prod;
        const paymentmethod = "online";
        const date = new Date();
        const stat = "processing";
        

        await ordercollection.insertMany([
          {
            ordereduser: user,
            deliveryaddress: req.session.deliveryaddress,
            date: date,
            grandtotal: grandtotal,
            products: product,
            paymentmethod: paymentmethod,
            status:stat
          },
        ]);


        // await usercollection.updateOne({_id:req.session.userId},{$set:{'wallet.rPrice':req.session.wallet}})

        for (const { productId, quantity } of products) {
          await productcollection.updateOne(
            { _id: productId._id },
            { $inc: { quantity: -quantity } }
          );
        }

        await cartcollection.deleteOne({ user: user });
        res.json({ PaymentSuccess: true });
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const orderManagement = async (req, res) => {
  try{
  const find = await ordercollection.find();
  const orderData = find.map((order)=>{
    const date = new Date(order.date)
    const mainDate = date.toLocaleString()
    const id = order.id
    return{...order._doc,date:mainDate,id}
  })
  res.render("admin/order", { admin: true, orderData });
  }catch(err){
    console.log(err)
  }
};

const adminViewProduct = async(req, res)=>{
  try{
  const id = req.query.id
  const orderDetails = await ordercollection.find({_id:id})
  const user = orderDetails[0].ordereduser
  const products = orderDetails[0].products
  const userDetails = await usercollection.find({_id:user})
  res.render('admin/adminViewProduct', {admin:true,orderDetails,userDetails,products})
  }catch(err){
    console.log(err)
  }
}

module.exports = {
  placeOrder,
  userVerifypayment,
  orderManagement,
  adminViewProduct
};
