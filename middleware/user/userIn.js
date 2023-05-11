const userIn= (req, res, next) => {
    const user = req.session.userIn
    if (user) {
        next()
    } else {
        res.redirect('/userLogin')
    }
}



module.exports=userIn