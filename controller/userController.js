const { otpGen } = require("../controller/otp");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const userBase = require("../models/userBase");
const products = require("../models/product");
const cart = require("../models/cart");
const url = require('url');
const ordercollection = require('../models/placeOrder')
const couponcollection = require('../models/couponModel')
const categorycollection = require('../models/category')
const mongoose = require('mongoose');
const bannercollection = require('../models/banner');
const blog = require("../models/userBase");
const { log } = require("console");
const category = require("../models/category");
//password encryption
const bcryptPassword = async (password) => {
  try {
    const hashpassword = await bcrypt.hash(password, 10);
    return hashpassword;
  } catch (err) {
    console.log(err);
  }
};

//node mailer
const mail = (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "johnabraha57@gmail.com",
      pass: "tiwbzhsjpldbeade",
    },
  });

  const mailOptions = {
    from: "johnabraha57@gmail.com",
    to: email,
    subject: "Your OTP",
    text: `Your OTP is ${otp}.`,
  };

  // send the email
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

//forgot email/pass
const forgotPassword = (email, userId) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user:process.env.NODEMAILEREMAIL,
      pass: process.env.NODEMAILERPASS,
    },
  });

  const mailOptions = {
    from: process.env.NODEMAILEREMAIL,
    to: email,
    subject: "Your OTP",
    html:
      '<p>click here"http://localhost:3000/updatePassPage?id=' +
      userId +
      '"</p>',
  };

  // send the email
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

//home page
const index =  async function(req, res) {
  userName = req.session.username;
  const banner = await bannercollection.findOne()
  const men = await categorycollection.findOne({name:"men"})
  const catId = men.id
  const menPro = await products.find({category:catId})
  const women = await categorycollection.findOne({name:"women"})
  const womenId = women.id
  const womenPro = await products.find({category:womenId})
  const kid = await categorycollection.findOne({name:"kids"})
  const kidId = kid.id
  const kidPro = await products.find({category:kidId})

  const baseCategory1 = await categorycollection.find().limit(1)
  const baseCategory2 = await categorycollection.find().skip(1).limit(1)
  const baseCategory3 = await categorycollection.find().skip(2).limit(1)

  res.render("user/index", { user: true, userName, banner, menPro,womenPro, kidPro ,baseCategory1,baseCategory2,baseCategory3});
};

//signup page
const signup = function (req, res, next) {
  res.render("user/userSignup", { user: true });
};

//get otp page
const otpPage = (req, res) => {
  res.render("user/otpPage", { user: true });
};

//otp page after clicking signup button
let otp;
let userdata;
const signupSubmit = async (req, res) => {
  try {
    const check = await userBase.exists({
      email: req.body.email,
    });
    if (check) {
      res.render("user/userSignup", {
        user: true,
        exists: "user already exists",
      });
    } else {
      otp = otpGen();
      userdata = req.body;
      mail(req.body.email, otp);
      res.redirect("/otpPage");
    }
  } catch (err) {
    console.log(err);
  }
};

const resendOtp = (req, res) => {
  otp = otpGen();
  mail(userdata.email, otp);
  res.redirect("/otpPage");
};

//otp page proceed
const proceedOtp = async (req, res) => {
  try {
    const Eotp = req.body.otp;
    const sentOtp = otp;
    console.log(Eotp, sentOtp);
    if (Eotp == sentOtp) {
      const userDetail = userdata;
      const { username, email, phone, password } = userDetail;
      const hashpassword = await bcryptPassword(password);
      const user = {
        username: username,
        email: email,
        phoneNo: phone,
        password: hashpassword,
      };
      await userBase.insertMany([user]);
      res.redirect("/userLogin");
    } else {
      res.render("user/otpPage", { user: true, wrong: "wrong otp" });
    }
  } catch (err) {
    console.log(err);
  }
};

//login page
const userLogin = (req, res) => {
  res.render("user/userLogin", { user: true });
};

//login button
const loginSubmit = async (req, res) => {
  try {
    const email = req.body.Email;
    const password = req.body.pass;
    const user = await userBase.findOne({ email: email });
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        if (user.userStatus) {
          req.session.userId = user._id;
          req.session.userIn = true;
          req.session.username = user.username;

          res.redirect("/");
        } else {
          res.render("user/userLogin", {
            user: true,
            error: " your account is blocked ",
          });
        }
      } else {
        res.render("user/userLogin", {
          user: true,
          noUser: "Incorrect password",
        });
      }
    } else {
      res.render("user/userLogin", { user: true, noUser: "Incorrect email" });
    }
  } catch (err) {
    console.log(err);
  }
};

//page after clicking forgot password
const forgotPasswordPage = (req, res) => {
  res.render("user/fPassword", { user: true });
};

//page to update password
const updatePassword = (req, res) => {
  const id = req.query.id;
  res.render("user/updatePass", { user: true, id });
};

//mail to change password
const forgotPass = async (req, res) => {
  try {
    const userEmail = req.body.fEmail;
    const userD = await userBase.findOne({ email: userEmail });
    req.session.userMail = userD;
    //this is the function to send mail
    forgotPassword(userEmail, userD._id);
    res.redirect("/userLogin");
  } catch (err) {
    console.log(err);
  }
};

const updatePass = async (req, res) => {
  try {
    const id = req.query.id;
    const password = req.body.password;
    const hashPass = await bcryptPassword(password);
    await userBase.updateOne({ _id: id }, { $set: { password: hashPass } });
    res.redirect("/userLogin");
  } catch (err) {
    console.log(err);
  }
};

const Csuccess = (req, res) => {
  res.render("user/success");
};

const shop = async (req, res) => {
  try {
    const baseCategory = await categorycollection.find()
    
    var page = 1;
    if(req.query.page){
      page = req.query.page
    }
    const limit = 8

    const userName = req.session.username;
    var search = req.query.search || ''
    var categoryId = req.query.categoryId;
    var minPrice = req.query.minPrice || 0;
    var maxPrice = req.query.maxPrice || Number.MAX_VALUE
    var sortValue = req.query.sortValue || 1
    
    var minPrice = 0;    
    var maxPrice = Number.MAX_VALUE;


    
    if(req.query.minPrice){
      minPrice = req.query.minPrice
    }
     
    if(req.query.maxPrice){
      maxPrice = req.query.maxPrice
    }

    var sortValue = 1;
    if(req.query.sortValue){
      sortValue = req.query.sortValue
    }

    const query = {
      $or: [
        { name: {$regex: '.*' + search + '.*', $options: 'i'}}
      ],
      price : { $gte: minPrice, $lte : maxPrice}
    }

    if(categoryId){
      query.category = categoryId
    }
 
    

    const productData = await products.find(query).limit(limit * 1).skip((page - 1) * limit).sort({price: sortValue}).exec();

    const count = await products.find(query).countDocuments()
    totalPages = Math.ceil(count/limit)

    currentPage = page
    nextPage = currentPage + 1
    previousPage = currentPage - 1

    res.render("user/shop", { user: true, productData, userName,baseCategory, categoryId, minPrice, maxPrice, sortValue, nextPage, totalPages, currentPage, previousPage });
  } catch (err) {
    console.log(err);
  }
};

// const shop = async (req, res) => {
//   try {
//     const baseCategory = await categorycollection.find()
   
//     const userName = req.session.username;
//     let search =""

//     if(req.query.search){
//       search= req.query.search
//     }
//     const productData = await products.find({$or:[{name:{$regex:".*"+search+".*",$options:"i"}}]}).lean();
//     res.render("user/shop", { user: true, productData, userName,baseCategory });
//   } catch (err) {
//     console.log(err);
//   }
// };

// const shopsss = async (req, res) => {
//   try {
//     let search = req.query.search ||""
//     let filter2 = req.query.filter || 'ALL'
//     let sort = req.query.sort || "Low"
//     const pageNO = parseInt(req.query.page) || 1;
//     const perpage = 6;
//     const skip = perpage * (pageNO - 1)
//     const catData = await categorycollection.find({status : false})
//     let cat = []
//         for(i = 0; i < catData.length ; i++){
//             cat[i] = catData[i]._id
//         }

//     let filter
//     filter2 === "ALL" ? filter = [...cat] : filter = req.query.filter.split(',')
//     if(filter2 != "ALL") {
//       for (let i = 0; i< filter.length; i++){
//         filter[i] = new ObjectId(filter[i])
//       }
//     }
//     req.query.sort == "High" ? sort = -1 : sort = 1
//     const data = await products.aggregate([
//       {$match : {name : {$regex : '^'+search, $options : 'i'},category : {$in : filter}}},
//       {$sort : {price : -1}},
//       {$skip : skip},
//       {$limit : perpage}
//     ])
    
//     const productCount = (await products.find(
//       {name : {$regex : search, $options :'i'}}).where("category").in([...filter])).length
  
//   const totalPage = Math.ceil(productCount / perpage)

//     res.render("user/shop", {user:true,data,
//       data2 : catData,
//       total : totalPage,
//       filter : filter,
//       sort : sort,
//       search : search
//       })
    

//   }catch{
//     console.log("error")
//   }
// };

const singleProduct = async (req, res) => {
  try {
    const userName = req.session.username;
    const id = req.query.id;
    const singleProductView = await products.findOne({ _id: id });
    res.render("user/singleProduct", {
      user: true,
      singleProductView,
      userName,
    });
  } catch (err) {
    console.log(err);
  }
};

const checkout = async (req, res) => {
  try {
    const urlObj = url.parse(req.url, true);
    const addressIndex = urlObj.query.addressIndex;


    const id = req.session.userId;
    const uAddressI = await userBase.findOne({ _id: id });
    const selectAddress = uAddressI.address[addressIndex];
    const uAddress = await userBase.findOne({ _id: id });
    const add = uAddress.address;
    const user = req.session.userId;
    const cProduct = await cart
      .find({ user: user })
      .populate("products.productId");
    const [{ products }] = cProduct;
    const productCheckout = products.map(({ productId, quantity, cPrice }) => ({
      id: productId._id,
      name: productId.name,
      price: productId.price,
      image: productId.image,
      quantity: quantity,
      subPrice: cPrice,
    }));
    const coupon = req.session.code
    if(coupon){
      const cActive = true
      const coupondata = await couponcollection.findOne({couponcode:coupon})
      const couponPrice = coupondata.discountvalue
      const find = await cart.findOne({ user: user });
      let total = find.totalPrice - couponPrice;
      const ttl = find.totalPrice
      req.session.grandtotal = total
      
      const userName = req.session.username;
      const rAdd = req.session.bodyadd;
      const walletdata = await userBase.findOne({_id:id})
      const wallet = walletdata.wallet.rPrice
      res.render("user/checkout", {
        user: true,
        userName,
        productCheckout,
        couponPrice,
        total,
        rAdd,
        ttl,
        wallet,
        add,
        cActive,
        selectAddress,
        coupon
      });
    }else{
      const cActive= false
      const walletdata = await userBase.findOne({_id:id})
      const wallet = walletdata.wallet.rPrice
        const find = await cart.findOne({ user: user });
    let total = find.totalPrice;
    const ttl = find.totalPrice
    req.session.grandtotal = total
    const userName = req.session.username;
    const rAdd = req.session.bodyadd;

    

   
    res.render("user/checkout", {
      user: true,
      userName,
      productCheckout,
      total,
      rAdd,
      ttl,
      wallet,
      add,
      cActive,
      selectAddress,
    });
    }


  
  } catch (err) {
    console.log(err);
  }
};

const profile = async (req, res) => {
  try {
    const userName = req.session.username;
    const id = req.session.userId;
    const detail = await userBase.findOne({ _id: id });
    const balance = detail.wallet.rPrice
    res.render("user/userProfile", { user: true, userName, detail, balance });
  } catch (err) {
    console.log(err);
  }
};

const editProfile = async(req, res) => {
  const userName = req.session.username;
  const id = req.session.userId
  const useraddress = await blog.find({_id:id })
  const [{address}]=useraddress

  res.render("user/editUserProfile", { user: true, userName, address });
};

const editaddressfromuser = async(req, res)=>{
  const userName = req.session.username;
  const id = req.session.userId
  const user = await blog.findOne({ _id: id, 'address._id': req.query.id });
const address = user.address.find(a => a._id.toString() === req.query.id);

  res.render("user/editaddressfromuser", {user:true, userName, address})
}

const editaddressfromuserto = async(req, res)=>{
  try{
    const userId = req.session.userId;
    const {
      firstname,
      lastname,
      address,
      country,
      postcode,
      district,
      city,
      email,
      phone,
    } = req.body;

    await userBase.updateOne(
      { _id:userId,"address._id": req.body.id },
      {
        $set: {
            "address.$.firstName": firstname,
            "address.$.lastName": lastname,
            "address.$.address": address,
            "address.$.country": country,
            "address.$.postcode": postcode,
            "address.$.district": district,
            "address.$.city": city,
            "address.$.emailAddress": email,
            "address.$.phone": phone,
          
        },
      }
    );
    res.redirect("/userProfile");    
  }catch(err){
    console.log("error",err)
  }
}

const addProfileTo = async (req, res) => {
  try {
    const userId = req.session.userId;
    const {
      firstname,
      lastname,
      address,
      country,
      postcode,
      district,
      city,
      email,
      phone,
    } = req.body;
    await userBase.updateOne(
      { _id: userId },
      {
        $push: {
          address: {
            firstName: firstname,
            lastName: lastname,
            address: address,
            country: country,
            postcode: postcode,
            district: district,
            city: city,
            emailAddress: email,
            phone: phone,
          },
        },
      }
    );
    res.redirect("/userProfile");
  } catch (err) {
    console.log(err);
  }
};

const addProfileFromCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;
    const {
      firstname,
      lastname,
      address,
      country,
      postcode,
      district,
      city,
      email,
      phone,
    } = req.body;
    await userBase.updateOne(
      { _id: userId },
      {
        $push: {
          address: {
            firstName: firstname,
            lastName: lastname,
            address: address,
            country: country,
            postcode: postcode,
            district: district,
            city: city,
            emailAddress: email,
            phone: phone,
          },
        },
      }
    );
    res.redirect("/checkout");
  } catch (err) {
    console.log(err);
  }
};

const selectAddress = async (req, res) => {
  try {
    const userName = req.session.username;
    const id = req.session.userId;
    const uAddress = await userBase.findOne({ _id: id });
    const add = uAddress.address;
    res.render("user/addAddress", { user: true, userName, add });
  } catch (err) {
    console.log(err);
  }
};

const editaddress = async(req, res)=>{
  try{
    const userName = req.session.username;
    const userId = req.session.userId
    const id = req.body.addressId
    const user = await userBase.findOne({ address: { $elemMatch: { _id: id } } });
    const address = user.address.find((item) => item._id.toString() === id.toString());
    res.render('user/editAddress', {user:true, userName, address})
  }catch(err){
    console.log(err)
  }
}

const updateAddress = async(req, res)=>{
  try{
    const userId = req.session.userId;
    const {
      firstname,
      lastname,
      address,
      country,
      postcode,
      district,
      city,
      email,
      phone,
    } = req.body;

    await userBase.updateOne(
      { _id:userId,"address._id": req.body.id },
      {
        $set: {
            "address.$.firstName": firstname,
            "address.$.lastName": lastname,
            "address.$.address": address,
            "address.$.country": country,
            "address.$.postcode": postcode,
            "address.$.district": district,
            "address.$.city": city,
            "address.$.emailAddress": email,
            "address.$.phone": phone,
          
        },
      }
    );
    res.redirect("/checkout");    
  }catch{
    console.log("error")
  }
}


const orderSuccess = async(req,res)=>{
  try{
    const userName = req.session.username;
    const orderDetails = await ordercollection.findOne().sort({date:-1}).limit(1)
    res.render('user/orderSuccess',{user:true, userName, orderDetails})
  }catch(err){
    console.log(err)
  }
}

const yourOrder = async(req, res)=>{
  try{
    const user = req.session.userId
    const find = await ordercollection.find({ordereduser:user})
    const userOrder = find.map((order)=>{
      const date = new Date(order.date)
      const mainDate = date.toLocaleString()
      const id = order.id
      return{...order._doc,date:mainDate,id}
    })
    const userName = req.session.username;
    res.render('user/yourOrder',{user:true, userName, userOrder})
  }catch{
    console.log("error")
  }
}

const userCancelOrder = async(req, res)=>{
  try{
    const id = req.query.id
    console.log("start")

console.log(id)
    // Retrieve the order from the database
    const order = await ordercollection.findOne({ _id: id })


    // Retrieve the products from the database
    const productIds = order.products.map(product => product.id)


    const productList = await products.find({ _id: { $in: productIds } })


    // Update the product quantities
    let updatedProducts = []
    order.products.forEach(item => {
      const dbproduct =  productList.find(p => p._id.toString() === item.id.toString())

      if (dbproduct) {
        const quantity = item.quantity
        const newQuantity = dbproduct.quantity + quantity

        updatedProducts.push({
          id: dbproduct._id,
          quantity: newQuantity
        })
      }
    })

    // Update the product quantities in the database
    for (let i = 0; i < updatedProducts.length; i++) {
      const { id, quantity } = updatedProducts[i]
      await products.updateOne({ _id: id }, { $set: { quantity } })
    }

    const method = order.paymentmethod
    if (method == "online") {
    const price = order.grandtotal
    const user = order.ordereduser
    await blog.updateOne({ _id: user }, { $inc: { 'wallet.rPrice': price } })
    }

    await ordercollection.updateOne({_id:id},{status:"Order canceled"})
    res.redirect('/yourOrder')
  }catch(err){
    console.log("error",err)
  }
}

const userOrderReturn = async(req, res)=>{
  try{
    const id = req.query.id
    await ordercollection.updateOne({_id:id},{status:"return requested"})
    res.redirect('/yourOrder')
  }catch{
    console.log("error")
  }
}


const userViewProduct = async(req, res)=>{
  try{
    const userName = req.session.username;
    const id = req.query.id
    const orderData = await ordercollection.find({_id:id})
    const userPro = orderData[0].products
    res.render('user/yourOrderProduct', {user:true, userName, userPro, orderData})
  }catch{
    console.log("error")
  }
}

const add = (req, res) => {
  req.session.bodyadd = req.body;
  console.log(req.body)
  res.redirect("/checkout");
};


const walletHistory = async(req, res)=>{
  try{
 const userName = req.session.username;
  const walletHistoryData = await blog.find({_id:req.session.userId})
  const find = walletHistoryData[0].walletHistory
  const walletHistory = find.map((order)=>{
    const date = new Date(order.transactionDate)
    const mainDate = date.toLocaleString()
    const id = order.id
    return{...order._doc,transactionDate:mainDate,id}
  })

  res.render('user/walletHistory', {user:true,userName, walletHistory})
  }catch(err){
    console.log(err)
  }
 
}

const signout = (req, res) => {
  req.session.userIn = false;
  req.session.username = false;
  res.redirect("/shop");
};
module.exports = {
  index,
  signup,
  otpPage,
  signupSubmit,
  userLogin,
  proceedOtp,
  loginSubmit,
  forgotPasswordPage,
  updatePassword,
  forgotPass,
  Csuccess,
  updatePass,
  shop,
  singleProduct,
  resendOtp,
  signout,
  checkout,
  profile,
  editProfile,
  addProfileTo,
  selectAddress,
  add,
  editaddress,
  orderSuccess,
  yourOrder,
  userViewProduct,
  addProfileFromCheckout,
  updateAddress,
  userCancelOrder,
  userOrderReturn,
  editaddressfromuser,
  editaddressfromuserto,
  walletHistory
};
