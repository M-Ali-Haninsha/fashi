const adminBase = require("../models/adminBase");
const products = require("../models/product");
const productcollection = require("../models/product");
const blog = require("../models/userBase");
const categorycollection = require('../models/category.js')
const ordercollection = require('../models/placeOrder');
const { log } = require("handlebars");


const adminHome = async(req, res, next) => {
  try{

const from = req.query.from;
const to = req.query.to;

let query = { status: "delivered" };

if (from && to) {
  query.date = { $gte: new Date(from), $lte: new Date(to) };
} else if (from) {
  query.date = { $gte: new Date(from) };
} else if (to) {
  query.date = { $lte: new Date(to) };
}

const deliveredProducts = await ordercollection.find(query);

const orderData = deliveredProducts.map((order) => {
  const date = new Date(order.date);
  const mainDate = date.toLocaleString();
  return { ...order._doc, date: mainDate };
});




  const codCount = await ordercollection.findOne({paymentmethod:"cod",  status :"delivered"}).count() 
  const onlineCount = await ordercollection.findOne({paymentmethod:"online",  status :"delivered"}).count() 
  const walletCount = await ordercollection.findOne({paymentmethod:"wallet",  status :"delivered"}).count() 

  const men = await ordercollection.find({ status: 'delivered' }, 'products')
  const menProducts = men.flatMap(order => order.products).flat()

  const menProductIds = menProducts.map(product => product.id);

  const menCat = await categorycollection.findOne({name:"men"})
  const menCatId = menCat._id
  const productsInMenCategory = await productcollection.find({ category: menCatId, _id: { $in: menProductIds } })
const productsInMenCategoryCount = productsInMenCategory.length

//kids
const kids = await ordercollection.find({ status: 'delivered' }, 'products')
  const kidProducts = kids.flatMap(order => order.products).flat()

  const kidProductIds = kidProducts.map(product => product.id);

  const kidCat = await categorycollection.findOne({name:"kids"})
  const kidCatId = kidCat._id
  const productsInKidCategory = await productcollection.find({ category: kidCatId, _id: { $in: kidProductIds } })
  const productsInkidCategoryCount = productsInKidCategory.length

  //womens
  const women = await ordercollection.find({ status: 'delivered' }, 'products')
  const womenProducts = women.flatMap(order => order.products).flat()

  const womenProductIds = womenProducts.map(product => product.id);

  const womenCat = await categorycollection.findOne({name:"women"})
  const womenCatId = womenCat._id
  const productsInWomenCategory = await productcollection.find({ category: womenCatId, _id: { $in: womenProductIds } })
  const productsInWomenCategoryCount = productsInWomenCategory.length



  const statusDeliveredCount = await ordercollection.find({ status: 'delivered' }).count()
  const statusShippedCount = await ordercollection.find({ status: 'Shipped' }).count()
  const statusreturnConfirmedCount = await ordercollection.find({ status: 'return confirmed' }).count()
  const statusProcessingCount = await ordercollection.find({ status: 'processing' }).count()  
  const statusSuccedfulCount = await ordercollection.find({ status: 'Order delivered' }).count()
  res.render("admin/adminHome", { admin: true , orderData,deliveredProducts,statusSuccedfulCount, statusProcessingCount,statusShippedCount,statusDeliveredCount, statusreturnConfirmedCount , codCount, onlineCount, walletCount,productsInMenCategoryCount,productsInkidCategoryCount,productsInWomenCategoryCount})  
  }catch(err){
    console.log(err)
  }

};

const adminLogin = (req, res) => {
  try{
    res.render("admin/adminLogin");
  }catch(err){
    console.log(err)
  }
 
};

const adminLoginButton = async (req, res) => {
  try{
      const adminCheck = await adminBase.exists({
    adminMail:req.body.adminEmail,
    adminPassword:req.body.adminPassword
  })
  if(adminCheck){
    req.session.admin=true
    res.render('admin/adminHome', {admin:true})
  }else{
    res.render('admin/adminLogin', { error:"wrong credentials"})
  }
  }catch(err){
    console.log(err)
  }
};


const userInfo = async (req, res) => {
  try {
    const userData = await blog.find().lean();
    res.render("admin/userList", { admin: true, uInfo: userData });
  } catch (err) {
    console.log(err);
  }
};

const blockUser = async (req, res) => {
  try {
    const userData = await blog.findByIdAndUpdate(
      { _id: req.query.id },
      { $set: { userStatus: false } }
    );
    res.redirect("/userInfo");
  } catch (err) {
    console.log(err);
  }
};

const unblockUser = async (req, res) => {
  try {
    const userData = await blog.findByIdAndUpdate(
      { _id: req.query.id },
      { $set: { userStatus: true } }
    );
    res.redirect("/userInfo");
  } catch (err) {
    console.log(err);
  }
};

const listProduct = async (req, res) => {
  try {
    const pData = await products.findByIdAndUpdate(
      { _id: req.query.id },
      { $set: { status: false } }
    );
    res.redirect("/productlist");
  } catch (error) {
    console.log(error.message);
  }
};

const unlistProduct = async (req, res) => {
  try {
    await products.findByIdAndUpdate(
      { _id: req.query.id },
      { $set: { status: true } }
    );
    res.redirect("/productlist");
  } catch (error) {
    console.log(error.message);
  }
};

const confirmOrder = async(req, res)=>{
  try{
    const id = req.query.id
    await ordercollection.updateOne({_id:id},{status:"Shipped"})
    res.redirect('/order')
  }catch{
    console.log("error")
  }
}

const delivered = async(req, res)=>{
  try{
    const id = req.query.id
    await ordercollection.updateOne({_id:id},{$set:{status:"delivered"}})
    setTimeout(async () => {
      await ordercollection.updateOne({ _id: id }, { $set: { status: 'Order delivered' } });
    },2 * 24 * 60 * 60 * 1000);
    // 14 * 24 * 60 * 60 * 1000
    res.redirect('/order')
  }catch{
    console.log("error")
  }
}

const cancelOrder = async(req, res)=>{
  try{
    const id = req.query.id
    await ordercollection.updateOne({_id:id},{$set:{status:"order canceled"}})
    res.redirect('/order')
  }catch{
    console.log("error")
  }
}






const confirmReturn = async (req, res) => {
  try {
    const id = req.query.id

    // Retrieve the order from the database
    const order = await ordercollection.findOne({ _id: id })

    // Retrieve the products from the database
    const productIds = order.products.map(product => product.id)

    const productList = await productcollection.find({ _id: { $in: productIds } })

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
      await productcollection.updateOne({ _id: id }, { $set: { quantity } })
    }

    const method = order.paymentmethod
   
      const price = order.grandtotal
      const user = order.ordereduser
      await blog.updateOne({ _id: user }, { $inc: { 'wallet.rPrice': price } })

      let currWallet = await blog.findOne({_id:user}) 
      let wallet = currWallet.wallet.rPrice
      const transaction = {
        transactionDate: new Date(),
        transactionType: "wallet payment",
        transactionAmount: price,
        transactionStatus: "successful",
        type:"Credit",
        currentBalance: wallet
      };

      await blog.updateOne({_id:user},{$push:{walletHistory:transaction}},
        { writeConcern: { acknowledged: true } });


    await ordercollection.updateOne({ _id: id }, { $set: { status: "return confirmed" } })




    res.redirect('/order')
  } catch (err) {
    console.log("Error in confirmReturn:", err)
  }
}




const adminLogout = (req, res)=>{
  try{
  req.session.admin=false
  res.redirect('/adminLogin')
  }catch(err){
    console.log(err)
  }

}
module.exports = {
  adminHome,
  adminLogin,
  adminLoginButton,
  userInfo,
  blockUser,
  unblockUser,
  listProduct,
  unlistProduct,
  adminLogout,
  confirmOrder,
  delivered,
  confirmReturn,
  cancelOrder
};
