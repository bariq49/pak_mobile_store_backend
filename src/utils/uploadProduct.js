const multer = require("multer");
const { getCloudinaryStorage } = require("../../config/cloudinary");
const imageFileFilter = require("./multerFileFilter");

// Cloudinary storage for product images
const productStorage = getCloudinaryStorage("ecommerce/products");

// Configure multer with increased limits for product images
const uploadProduct = multer({
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 20, // Maximum 20 files total (mainImage + gallery + variant images)
  },
  fileFilter: imageFileFilter,
});

// Field configuration for product image uploads
// Supports: mainImage (1), gallery (10), variant images (up to 10)
const productImageFields = [
  { name: "mainImage", maxCount: 1 },
  { name: "image", maxCount: 1 }, // Legacy support
  { name: "gallery", maxCount: 10 },
  { name: "galleryImages", maxCount: 10 },
  // Variant images - support up to 10 variants with individual images
  { name: "variantImages", maxCount: 10 },
  { name: "variant_0_image", maxCount: 1 },
  { name: "variant_1_image", maxCount: 1 },
  { name: "variant_2_image", maxCount: 1 },
  { name: "variant_3_image", maxCount: 1 },
  { name: "variant_4_image", maxCount: 1 },
  { name: "variant_5_image", maxCount: 1 },
  { name: "variant_6_image", maxCount: 1 },
  { name: "variant_7_image", maxCount: 1 },
  { name: "variant_8_image", maxCount: 1 },
  { name: "variant_9_image", maxCount: 1 },
];

// Error handler middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "error",
        message: "File too large. Maximum file size is 5MB per image.",
        errors: [err.message],
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        status: "error",
        message: "Too many files. Maximum 20 images allowed.",
        errors: [err.message],
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        status: "error",
        message: err.message || "Only JPG, PNG, and WebP images are allowed.",
        errors: [err.message],
      });
    }
    return res.status(400).json({
      status: "error",
      message: "File upload error",
      errors: [err.message],
    });
  }
  next(err);
};

module.exports = uploadProduct;
module.exports.productImageFields = productImageFields;
module.exports.handleMulterError = handleMulterError;
