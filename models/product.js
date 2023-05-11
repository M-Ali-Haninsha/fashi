const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name:{
        type:String,
        
    },
    image:{
        type:Array,
        required:true
    },
    quantity:{
        type:Number,
        
    },
    price:{
        type:Number,
        
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'category',
         
    },
    description:{
        type:String
    },
    status:{
        type:Boolean,
        default:true
    }
})

const products=mongoose.model('products', productSchema);

module.exports = products;