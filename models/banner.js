const mongoose = require('mongoose')
const { array } = require('../configuration/multer')

const bannerSchema = new mongoose.Schema({
    mainImageBanner:{
        type:Array
    },
    span1:{
        type:String
    },
    mainH1:{
        type:String
    },
    mainP:{
        type:String
    }
})
const banner=mongoose.model('banner', bannerSchema);

module.exports = banner;