const cloudinary = require('cloudinary').v2;


// Configuration 
cloudinary.config({
  cloud_name: "df3qijj4a",
  api_key: "575787315449472",
  api_secret: "2oytwYtaGv1ywLaCazbfcRtgbiQ",
  secure: true
});

module.exports = cloudinary