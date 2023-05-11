const userBase = require("../models/userBase")


const activeOrNot = async(req, res, next)=>{
    const user = req.session.userId
    const userData = await userBase.findOne({_id:user})
    if(userData.userStatus){
        next()
    }else{
        res.render('user/userLogin',{user:true, error1:"your account is blocked by admin"})
    }
}

module.exports=activeOrNot