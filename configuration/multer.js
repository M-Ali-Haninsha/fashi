const multer = require('multer')
const path = require('path')
const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, path.join(__dirname, '../public/images/productImages'))
    },
     filename:(req, file, cb)=>{
        const name = Date.now()+'-'+ file.originalname;
        cb(null, name)
        }  
})

module.exports  = multer({storage:storage})