
const adminlog= (req, res, next) => {
    let admin = req.session.admin
    if (admin) {
        next()
    } else {
        res.redirect('/adminLogin')
    }
}

module.exports=adminlog