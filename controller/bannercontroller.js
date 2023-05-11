const bannercollection = require('../models/banner')

const bannerPage = async(req, res)=>{
    const banner =  await bannercollection.findOne()
    res.render('admin/banner', {admin:true, banner})
}

const addbannerPage = (req, res)=>{
    res.render('admin/addbannerPage', {admin:true})
}

const addbannerTo = async(req, res)=>{
    try{
const img = req.files.map((image) => image.filename);
    const banner = await bannercollection.insertMany([{mainImageBanner:img, span1:req.body.span, mainH1:req.body.mainBannerMainHeading, mainP:req.body.paragraph}])
    console.log(banner)
    res.redirect('/bannerPage')
    }catch{
        console.log("error")
    }

    
}

const editbannerpage = async(req, res)=>{
    try{
        const banner = await bannercollection.findOne()
        console.log(banner)
        res.render('admin/editbanner',{admin:true, banner})
    }catch{
        console.log("error")
    }
}

const editbannerto = async(req, res)=>{
    try{
        let updatedFields = {
            span1: req.body.subheading,
            mainH1: req.body.MainH,
            mainP: req.body.para
          };
          if (req.files && req.files.length > 0) {
            updatedFields.image = req.files.map((image) => image.filename);
          }
          await bannercollection.updateOne(
            {},
            { $set: updatedFields }
          );
          res.redirect('/editbanner')
    }catch{
        console.log("error")
    }
}
module.exports={
    bannerPage,
    addbannerPage,
    addbannerTo,
    editbannerpage,
    editbannerto
}