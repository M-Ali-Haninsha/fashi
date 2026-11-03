const multer = require("multer");
const { badRequest } = require("../utils/httpError");

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Images stay in memory and are streamed straight to Cloudinary, so nothing
// is written to the server's disk (or ends up committed to git).
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(badRequest(`Unsupported file type: ${file.mimetype}`));
  },
});

module.exports = { imageUpload };
