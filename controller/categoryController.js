const category = require("../models/category");
const products = require("../models/product");

const pageCategory = async (req, res) => {
  try{
  const categoryData = await category.find().lean();
  if(req.session.msg){
    res.render("admin/category", { admin: true, catInfo: categoryData, msg:"products founded under this category" });
  }else{
    req.session.msg=false
    res.render("admin/category", { admin: true, catInfo: categoryData });
  }
  }catch(err){
    console.log(err)
  }
};

const addCategory = (req, res) => {
  try{
  res.render("admin/addCategory", { admin: true });
  }catch(err){
    console.log(err)
  }
};

const toAddCategory = async (req, res) => {
  try {
    const name = req.body.name;
    const find = await category.findOne({ name: name });
    if (find) {
      res.render("admin/addCategory", { admin: true, error: "already exists" });
    } else {
      category.insertMany({ name: name });
      res.redirect("/addCategory");
    }
  } catch (err) {
    console.log(err);
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await products.exists({category:id})
    console.log("hiiiiiii")
    console.log(product)
    if(product){
      req.session.msg=product
      res.redirect('/category')
    }else{
    await category.deleteOne({ _id: id });
    res.redirect("/category");
    }
  } catch (error) {
    console.log(error);
  }
};

const editCategory = async (req, res) => {
  try {
    const eId = req.query.id;
    const cCat = await category.findOne({ _id: eId });
    res.render("admin/editCategory", { admin: true, cCat });
  } catch (err) {
    console.log(err);
  }
};

const editCategoryTo = async (req, res) => {
  try {
    const existingCategory = await category.findOne({ name: req.body.name })
    if(existingCategory){
      res.render('admin/editCategory', {admin:true, err1:"already exists"})
    }else{    await category.findByIdAndUpdate(
      { _id: req.body.id },
      { $set: { name: req.body.name } }
    );
    res.redirect("/category");
  }
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  pageCategory,
  addCategory,
  toAddCategory,
  deleteCategory,
  editCategory,
  editCategoryTo,
};
