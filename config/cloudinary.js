const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Get Cloudinary storage for multer
 * @param {string} defaultFolder - Default folder path in Cloudinary
 * @returns {CloudinaryStorage} Cloudinary storage instance
 */
const getCloudinaryStorage = (defaultFolder = "ecommerce/others") => {
  return new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const folder = req.folder || defaultFolder;

      return {
        folder,
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
          { width: 1200, height: 1200, crop: "limit", quality: "auto" },
        ],
        public_id: `${Date.now()}-${file.originalname
          .split(".")[0]
          .replace(/[^a-zA-Z0-9-_]/g, "")}`,
      };
    },
  });
};

/**
 * Upload a single image to Cloudinary from buffer or path
 * @param {string|Buffer} fileInput - File path or buffer
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result with secure_url
 */
const uploadToCloudinary = async (fileInput, options = {}) => {
  const defaultOptions = {
    folder: "ecommerce/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1200, height: 1200, crop: "limit", quality: "auto" },
    ],
    resource_type: "image",
  };

  const uploadOptions = { ...defaultOptions, ...options };

  try {
    // If fileInput is a buffer, use upload_stream
    if (Buffer.isBuffer(fileInput)) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(fileInput);
      });
    }

    // If fileInput is a path or URL
    return await cloudinary.uploader.upload(fileInput, uploadOptions);
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array} files - Array of file objects with path or buffer
 * @param {object} options - Upload options
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleToCloudinary = async (files, options = {}) => {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map((file) => {
    const fileInput = file.buffer || file.path;
    return uploadToCloudinary(fileInput, options);
  });

  return Promise.all(uploadPromises);
};

/**
 * Delete an image from Cloudinary by public_id or URL
 * @param {string} imageUrl - Image URL or public_id
 * @returns {Promise<object>} Deletion result
 */
const deleteFromCloudinary = async (imageUrl) => {
  try {
    let publicId = imageUrl;

    // Extract public_id from URL if full URL is provided
    if (imageUrl.includes("cloudinary.com")) {
      const urlParts = imageUrl.split("/");
      const uploadIndex = urlParts.findIndex((part) => part === "upload");
      if (uploadIndex !== -1) {
        // Get everything after 'upload/v{version}/'
        const pathAfterUpload = urlParts.slice(uploadIndex + 2).join("/");
        // Remove file extension
        publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");
      }
    }

    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Get image URL from Cloudinary upload result or existing URL
 * @param {object|string} input - Upload result object or URL string
 * @returns {string|null} Image URL
 */
const getImageUrl = (input) => {
  if (!input) return null;
  if (typeof input === "string") return input;
  return input.secure_url || input.url || null;
};

module.exports = {
  cloudinary,
  getCloudinaryStorage,
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  getImageUrl,
};
