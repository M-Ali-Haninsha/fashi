const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({

    couponname: { 
        type: String,
        required: true 
    },
    
  couponcode: { 
    type: String,
    required: true 
},

  discountvalue: { 
    type: Number, 
    required: true 
},

usedUser:{
  type:Array
},

  minpurchase: { 
    type: Number, 
    required: true 
},
  startingdate: { 
    type: Date, 
    required: true 
},
  expiredate: { 
    type: Date, 
    required: true 
},
  status: { 
    type: Boolean, 
    default: false 
},
});

const couponcollection = new mongoose.model("coupendatas", couponSchema);

module.exports = couponcollection;