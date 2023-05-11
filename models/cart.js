const mongoose = require('mongoose')

const cartSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'blog',
        required:true
    },
    products:[{
        productId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'products',
            required:true
        },
        quantity:{
        type:Number,
        default:0
    },
    cPrice:{
        type:Number,
       
    }
}],
    totalPrice:{
        type:Number,
        default:0
        
    }
}) 

const cart=mongoose.model('carts', cartSchema);

module.exports = cart;