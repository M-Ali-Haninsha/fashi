const { response } = require("express");
const category = require("../models/category");
const products = require("../models/product");
const cloudinary = require('../configuration/cloudinary')

const prductlist = async (req, res) => {
  try{
  const product = await products.find().populate("category");
  res.render("admin/productList", { admin: true, product });
  }catch(err){
    console.log(err)
  }
};

const addProduct = async (req, res) => {
  try{
  const categoryData = await category.find().lean();
  res.render("admin/addProduct", { admin: true, categoryData });
  }catch(err){
    console.log(err)
  }
};

const addProductTo = async (req, res) => {
  try {
    let img = []
    for(const file of req.files){
     const result = await cloudinary.uploader.upload(file.path)
       img.push(result.public_id)

      }
    const categoryId = await category.findOne({ name: req.body.category });
    const product = new products({
      name: req.body.pName,
      image: img,
      quantity: req.body.pQuantity,
      price: req.body.pPrice,
      category: categoryId._id,
      description:req.body.description
    });
    const data = await product.save();
    console.log(data);
    res.redirect("/addProduct");
  } catch (err) {
    console.log(err);
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const productData = await products.findOne({ _id: id }).lean();
    const categoryData = await category.find().lean();
    const cat = await category.findOne({ _id: productData.category });
    res.render("admin/editProduct", {
      admin: true,
      categoryData,
      productData,
      cat,
    });
  } catch (err) {
    console.log(err);
  }
};


const editProductTo = async (req, res) => {
  try {
    const Fcategory = await category.findOne({ name: req.body.pCategory });
    const categoryiD = Fcategory._id;
    let updatedFields = {
      name: req.body.pName,
      quantity: req.body.pQuantity,
      price: req.body.pPrice,
      description: req.body.description,
      category: categoryiD,
    };
    
    // Check if new images were uploaded
    if (req.files && req.files.length > 0) {
      let img = [];
      for(const file of req.files){
        const result = await cloudinary.uploader.upload(file.path);
        img.push(result.public_id);
        console.log(result);
      }
      
      // Replace existing images with new images
      updatedFields.image = img;
    }

    await products.findByIdAndUpdate(
      { _id: req.query.id },
      { $set: updatedFields }
    );

    res.redirect("/productList");
  } catch (err) {
    console.log(err);
  }
};



const pullImage = async(req, res)=>{
  try{
  const productId = req.body.productId;
  const imageName = req.body.imageName;
  await products.updateOne({_id:productId},{$pull:{image:imageName}})
  res.json({status:true})
  }catch(err){
    console.log(err)
  }
}


module.exports = {
  prductlist,
  addProduct,
  addProductTo,
  editProduct,
  editProductTo,
  pullImage
};
