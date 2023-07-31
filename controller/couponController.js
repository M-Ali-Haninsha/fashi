const couponcollection = require('../models/couponModel')
const cartcollection = require('../models/cart')


const couponPage = async(req,res)=>{
  try{
    const find = await couponcollection.find()
    const couponlist = find.map((coupon)=>{
      const date = new Date(coupon.expiredate)
      const mainDate = date.toLocaleString()
      return{...coupon._doc,expiredate:mainDate}
    })
    res.render('admin/coupon', {admin:true, couponlist})
  }catch(err){
    console.log(err)
  }
}

const addCoupon = (req,res)=>{
  try{
  res.render('admin/addCoupon', {admin:true})
  }catch(err){
    console.log(err)
  }
}

const addCouponTo = async(req, res)=>{
    try {
        const coupondata={
           couponname:req.body.couponname,
           couponcode:req.body.couponcode,
           discountvalue:req.body.discountvalue,
           minpurchase:req.body.minpurchase,
           startingdate:req.body.startingdate,
           expiredate:req.body.expiredate,      
        }
        await couponcollection.insertMany([coupondata])
        res.redirect('addCoupon') 
     } catch (err) {
        console.log(err)
     }   
}

const editCoupon = async(req, res)=>{
  try{
     const id = req.query.id
    const couponData = await couponcollection.findOne({_id:id})
    res.render('admin/editCoupon',{admin:true, couponData})
  }catch{
    console.log("error")
  }
}

const editCouponTo = async (req, res) => {
    try {
      const couponId = req.query.id;
      const updatedCouponData = {
        couponname: req.body.couponname,
        couponcode: req.body.couponcode,
        discountvalue: req.body.discountvalue,
        minpurchase: req.body.minpurchase,
        startingdate: req.body.startingdate,
        expiredate: req.body.expiredate,
      };
      const filter = { _id: couponId };
      const update = { $set: updatedCouponData };
      await couponcollection.updateOne(filter, update);
      res.redirect('/coupon');
    } catch (err) {
      console.log(err);
    }
  };
  
  const deleteCoupon = async(req, res)=>{
    try{
    const dId = req.query.id
    await couponcollection.deleteOne({_id:dId})
    res.redirect('/coupon')
    }catch(err){
      console.log(err)
    }
  }

  const applyCoupon = async(req,res)=>{
    try{
       const user = req.session.userId
    const cart = await cartcollection.findOne({user:user})
    const total = cart.totalPrice
    const code = req.body.couponCode
    const coupon = await couponcollection.findOne({couponcode:code})
  
    if(coupon.status){
      if(total>coupon.minpurchase){
        if(coupon.expiredate>=new Date()){
          const userExists = await couponcollection.aggregate([{$match:{couponcode:code}},{$unwind:'$usedUser'}])
          let found=null
          for(const x of userExists){
            if(user == x.usedUser){
              found=true;
              break;
            }
          }
          if(found==null){
            await couponcollection.updateOne({couponcode:code},{$push:{usedUser:user}})
            req.session.code=code
            res.json({status:true})
          }else{
            res.json({status:false, msg:"already used"})
          }
        }else{
          res.json({status:false, msg:"coupon expired"})    
        }
      }else{
        res.json({status:false, msg:"minimum price required"})
      }
    }else{
      res.json({status:false, msg:"coupon is not activated"})
    }
    }catch{
      console.log("error")
    }
  }

  const cancelApplyCoupon = async(req, res)=>{
    try{
    await couponcollection.updateOne({couponcode: req.session.code},{$pull:{usedUser:req.session.userId}})
    req.session.code=null
    console.log("hiiiiiiiiiiiiiiiiiiii")
    console.log(couponcollection)
    res.json({status:true})
    }catch(err){
      console.log(err)
    }
  }

  const activateCoupon = async (req, res) => {
    try {
       await couponcollection.findByIdAndUpdate(
        { _id: req.query.id },
        { $set: { status: true } }
      );
      res.redirect("/coupon");
    } catch (error) {
      console.log(error.message);
    }
  };
  
  const deactivateCoupon = async (req, res) => {
    try {
      await couponcollection.findByIdAndUpdate(
        { _id: req.query.id },
        { $set: { status: false } }
      );
      res.redirect("/coupon");
    } catch (error) {
      console.log(error.message);
    }
  };


module.exports = {
    addCoupon,
    addCouponTo,
    couponPage,
    editCoupon,
    editCouponTo,
    deleteCoupon,
    applyCoupon,
    activateCoupon,
    deactivateCoupon,
    cancelApplyCoupon
}