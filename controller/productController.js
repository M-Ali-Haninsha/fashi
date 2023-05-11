const { response } = require("express");
const category = require("../models/category");
const products = require("../models/product");

const prductlist = async (req, res) => {
  const product = await products.find().populate("category");
  res.render("admin/productList", { admin: true, product });
};
const addProduct = async (req, res) => {
  const categoryData = await category.find().lean();
  res.render("admin/addProduct", { admin: true, categoryData });
};

const addProductTo = async (req, res) => {
  try {
    const img = req.files.map((image) => image.filename);
    const categoryId = await category.findOne({ name: req.body.category });
    const product = new products({
      name: req.body.pName,
      image: img,
      quantity: req.body.pQuantity,
      price: req.body.pPrice,
      category: categoryId._id,
      description:req.body.description
    });
    await product.save();
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

// const editProductTo = async(req, res)=>{
//     try{
//         const img = req.files.map((image)=>image.filename)
//         await products.findByIdAndUpdate({_id:req.query.id},{$set:{name:req.body.pName,
//              image:img,
//              quantity:req.body.pQuantity,
//              price:req.body.pPrice,
//              category:req.body.pCategory._id}})
//              res.redirect('/productList')
//     }catch(err){
//         console.log(err)
//     }
// }

// const editProductTo = async (req, res) => {
//   try {
//     const Fcategory = await category.findOne({ name: req.body.pCategory });
//     const categoryiD = Fcategory._id;
//     let updatedFields = {
//       name: req.body.pName,
//       quantity: req.body.pQuantity,
//       price: req.body.pPrice,
//       category: categoryiD,
//     };

//     if (req.files && req.files.length > 0) {
//       updatedFields.image = req.files.map((image) => image.filename);
//     }

//     await products.findByIdAndUpdate(
//       { _id: req.query.id },
//       { $set: updatedFields }
//     );

//     res.redirect("/productList");
//   } catch (err) {
//     console.log(err);
//   }
// };
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

    if (req.files && req.files.length > 0) {
      // New images were uploaded, add them to the updatedFields object
      updatedFields.image = req.files.map((image) => image.filename);
      
      // Get the existing product and append the new image(s) to the existing image array
      const existingProduct = await products.findById(req.query.id);
      if (existingProduct.image) {
        updatedFields.image = existingProduct.image.concat(updatedFields.image);
      }
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
  const productId = req.body.productId;
  const imageName = req.body.imageName;


  await products.updateOne({_id:productId},{$pull:{image:imageName}})
  res.json({status:true})
 
}
// const editProductTo = async(req, res) => {
//     try {
//       const product = await products.findById(req.query.id);
//       const images = product.image;

//       // check if there are new images uploaded
//       let newImages = [];
//       if (req.files) {
//         newImages = req.files.map((file) => file.filename);
//       }

//       // check if any image is deleted
//       const deleteImages = req.body.deleteImages;

//       if (deleteImages) {
//         if (typeof deleteImages === "string") {
//           // if only one image is deleted
//           const index = images.indexOf(deleteImages);
//           if (index !== -1) {
//             images.splice(index, 1);
//             fs.unlinkSync(path.join(__dirname, "..", "public", "images", "productImages", deleteImages));
//           }
//         } else {
//           // if multiple images are deleted
//           deleteImages.forEach((img) => {
//             const index = images.indexOf(img);
//             if (index !== -1) {
//               images.splice(index, 1);
//               fs.unlinkSync(path.join(__dirname, "..", "public", "images", "productImages", img));
//             }
//           });
//         }
//       }

//       // add new images
//       const updatedImages = [...images, ...newImages].slice(0, 3);

//       await products.findByIdAndUpdate(
//         { _id: req.query.id },
//         {
//           $set: {
//             name: req.body.pName,
//             image: updatedImages,
//             quantity: req.body.pQuantity,
//             price: req.body.pPrice,
//             category: req.body.pCategory._id,
//           },
//         }
//       );
//       res.redirect("/productList");
//     } catch (err) {
//       console.log(err);
//     }
//   };

module.exports = {
  prductlist,
  addProduct,
  addProductTo,
  editProduct,
  editProductTo,
  pullImage
};
