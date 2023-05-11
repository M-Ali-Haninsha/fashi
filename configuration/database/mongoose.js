
const mongoose = require('mongoose');
const dotenv = require('dotenv')
mongoose.set('strictQuery',false)
mongoose.connect(process.env.DATABASE).then(()=>{
        console.log('connection succesful')
    }).catch((error)=>{
        console.log('something wrong',error)
    });