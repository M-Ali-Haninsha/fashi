const adminMongoose = require('mongoose')

const adminSchema= new adminMongoose.Schema({
    adminMail:{
        type: String,
        required: true
    },
    adminPassword:{
        type: Number,
        required: true
    }
});

const adminBlog = adminMongoose.model('adminBlog', adminSchema)
module.exports= adminBlog