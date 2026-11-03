const cloudinary = require("cloudinary").v2;
const config = require("../config/env");

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

function uploadBuffer(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: `fashi/${folder}` }, (err, result) =>
      err ? reject(err) : resolve(result)
    );
    stream.end(file.buffer);
  });
}

// Uploads images and returns their Cloudinary public ids (shown with {{img id}}).
async function uploadImages(files, folder) {
  const results = await Promise.all((files ?? []).map((file) => uploadBuffer(file, folder)));
  return results.map((r) => r.public_id);
}

module.exports = { uploadImages };
