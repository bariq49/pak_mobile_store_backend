const multer = require("multer");
const { getCloudinaryStorage } = require("../../config/cloudinary");
const imageFileFilter = require("./multerFileFilter");

const uploadCategory = multer({
  storage: getCloudinaryStorage("ecommerce/categories"),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: imageFileFilter,
});

const uploadCategoryFields = uploadCategory.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "banner", maxCount: 1 },
  { name: "mobile", maxCount: 1 },
  { name: "gallery", maxCount: 5 },
]);

// Optional upload middleware - only processes files if multipart/form-data
// Otherwise allows JSON requests to pass through
const optionalUploadCategory = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  
  // Only use multer if it's multipart/form-data
  if (contentType.includes("multipart/form-data")) {
    return uploadCategoryFields(req, res, next);
  }
  
  // For JSON requests, just continue (body already parsed by express.json())
  next();
};

module.exports = uploadCategoryFields;
module.exports.optional = optionalUploadCategory;
