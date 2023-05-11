const mongoose = require("mongoose");

const orderSchema= new mongoose.Schema({
    ordereduser:{type:String,required:true}, 
    deliveryaddress:{
        firstname:{type:String},
        lastname:{type:String},
        country:{type:String},
        state:{type:String},
        pincode:{type:Number},
        district:{type:String},
        phonenumber:{type:Number},
        email:{type:String},
        address:{type:String},
    },
    date:{type:Date, required:true},
    grandtotal:{type:Number,required:true},
    products:{type:Array,required:true},
    paymentmethod:{type:String,required:true},
    status:{type:String,required:true}
   
    
})
  
const ordercollection =new mongoose.model("orderdatas", orderSchema);
module.exports = ordercollection