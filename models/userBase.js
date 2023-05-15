const mongoose=require('mongoose');

const userBaseSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    phoneNo:{
        type:Number,
        required:true
    } ,
    password:{
        type:String,
        required:true
    } ,
    userStatus:{
        type:Boolean,
        default:true
    },
    address:[{
        firstName:{
            type:String
        
        },
        lastName:{
            type:String
            
        },
        address:{
            type:String
           
        } ,
        country:{
            type:String
            
        } ,
        postcode:{
            type:Number
            
        },
        district:{
            type:String
            
        },
        city:{
            type:String
            
        },
        emailAddress:{
            type:String
            
        },
        phone:{
            type:Number
        
        } 
    }],
    wallet:{
        rPrice:{
            type:Number,
            default:0
        }
    },
    walletHistory: [{
        transactionDate: {
            type: Date
        },
        transactionType: {
            type: String,
            required: true
        },
        transactionAmount: {
            type: Number,
            required: true
        },
        transactionStatus: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        currentBalance: {
            type: Number,
            required: true
        }
    }]
});

const blog=mongoose.model('blog', userBaseSchema);

module.exports = blog;