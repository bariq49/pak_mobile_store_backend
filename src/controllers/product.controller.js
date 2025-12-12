const Product = require("../models/product.model");
const Tag = require("../models/tag.model");
const Image = require("../models/image.model");
const Attribute = require("../models/attribute.model");
const Variation = require("../models/variation.model");
const VariationOption = require("../models/variationOption.model");
const Category = require("../models/category.model");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const safeDestroy = require("../utils/safeDestroy");
const successResponse = require("../utils/successResponse");
const errorResponse = require("../utils/errorResponse");
const { generateUniqueSlug, createSlug } = require("../utils/slug");
const formatAdditionalInfo = require("../utils/formatAdditionalInfo");
const { getImageUrl, deleteFromCloudinary } = require("../../config/cloudinary");
const mongoose = require("mongoose");

// ------------------ CATEGORY LOOKUP HELPER ------------------

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {string} id - String to check
 * @returns {boolean} Whether the string is a valid ObjectId
 */
const isValidObjectId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id) && 
         (String(new mongoose.Types.ObjectId(id)) === id);
};

/**
 * Find category by ID, name, or slug
 * Accepts: ObjectId string, category name, or category slug
 * @param {string} categoryInput - Category identifier (ObjectId, name, or slug)
 * @returns {Promise<object|null>} Category document or null
 */
const findCategoryByIdOrName = async (categoryInput) => {
  if (!categoryInput) return null;
  
  const trimmedInput = String(categoryInput).trim();
  
  if (!trimmedInput) return null;
  
  // Try to find by ObjectId first
  if (isValidObjectId(trimmedInput)) {
    const categoryById = await Category.findById(trimmedInput);
    if (categoryById) return categoryById;
  }
  
  // Try to find by slug (case-insensitive)
  const categoryBySlug = await Category.findOne({ 
    slug: trimmedInput.toLowerCase() 
  });
  if (categoryBySlug) return categoryBySlug;
  
  // Try to find by name (case-insensitive)
  const categoryByName = await Category.findOne({ 
    name: { $regex: new RegExp(`^${trimmedInput}$`, 'i') } 
  });
  if (categoryByName) return categoryByName;
  
  return null;
};

/**
 * Find subcategory within a parent category by ID, name, or slug
 * @param {object} parentCategory - Parent category document
 * @param {string} subCategoryInput - Subcategory identifier
 * @returns {object|null} Subcategory subdocument or null
 */
const findSubCategory = (parentCategory, subCategoryInput) => {
  if (!parentCategory || !subCategoryInput || !parentCategory.children) return null;
  
  const trimmedInput = String(subCategoryInput).trim();
  
  // Try to find by ObjectId
  if (isValidObjectId(trimmedInput)) {
    const subById = parentCategory.children.id(trimmedInput);
    if (subById) return subById;
  }
  
  // Try to find by slug
  const subBySlug = parentCategory.children.find(
    child => child.slug && child.slug.toLowerCase() === trimmedInput.toLowerCase()
  );
  if (subBySlug) return subBySlug;
  
  // Try to find by name
  const subByName = parentCategory.children.find(
    child => child.name && child.name.toLowerCase() === trimmedInput.toLowerCase()
  );
  if (subByName) return subByName;
  
  return null;
};

// ------------------ SKU GENERATION HELPERS ------------------

/**
 * Generate a random alphanumeric string
 * @param {number} length - Length of the random string
 * @returns {string} Random alphanumeric string (uppercase)
 */
const generateRandomString = (length = 6) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars: I, O, 0, 1
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Sanitize brand name for SKU (uppercase, remove special chars, limit length)
 * @param {string} brand - Brand name
 * @returns {string} Sanitized brand code
 */
const sanitizeBrandForSKU = (brand) => {
  if (!brand) return "PRD";
  return brand
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // Remove special characters
    .substring(0, 4); // Limit to 4 characters
};

/**
 * Validate SKU format
 * Valid format: Letters, numbers, hyphens, 4-30 characters
 * @param {string} sku - SKU to validate
 * @returns {boolean} Whether SKU is valid
 */
const isValidSKU = (sku) => {
  if (!sku || typeof sku !== "string") return false;
  const skuRegex = /^[A-Za-z0-9-]{4,30}$/;
  return skuRegex.test(sku.trim());
};

/**
 * Generate a unique SKU for a product
 * Format: [BRAND_CODE]-[RANDOM_6_CHARS]
 * Example: APPL-X7K9M2, SAM-P3R5T8
 * @param {string} brand - Product brand name
 * @param {number} maxAttempts - Maximum attempts to generate unique SKU
 * @returns {Promise<string>} Unique SKU
 */
const generateUniqueSKU = async (brand, maxAttempts = 10) => {
  const brandCode = sanitizeBrandForSKU(brand);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomPart = generateRandomString(6);
    const sku = `${brandCode}-${randomPart}`;
    
    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (!existingProduct) {
      return sku;
    }
  }
  
  // Fallback: Add timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${brandCode}-${generateRandomString(4)}-${timestamp}`;
};

/**
 * Check if a SKU already exists in the database
 * @param {string} sku - SKU to check
 * @param {string} excludeProductId - Product ID to exclude from check (for updates)
 * @returns {Promise<boolean>} Whether SKU exists
 */
const isSKUExists = async (sku, excludeProductId = null) => {
  const query = { sku };
  if (excludeProductId) {
    query._id = { $ne: excludeProductId };
  }
  const existingProduct = await Product.findOne(query);
  return !!existingProduct;
};

// ------------------ GET ALL PRODUCTS (WITH FILTERS) ------------------
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const countQuery = new APIFeatures(Product.find(), req.query);
  await countQuery.buildFilters();
  const filteredCount = await countQuery.query.countDocuments();
  const features = new APIFeatures(Product.find(), req.query);
  await features.buildFilters();
  features.sort().limitFields().paginate(filteredCount);

  const products = await features.query
    .populate("tags", "name slug")
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .populate({
      path: "variations",
      populate: { path: "attribute", select: "slug name type values" },
    })
    .populate({
      path: "variation_options",
      populate: {
        path: "attributes.attribute",
        select: "slug name type values",
      },
    })
    .populate("image gallery", "original thumbnail");

  const formattedProducts = products.map((p) => ({
    ...p.toObject(),
    additional_info: formatAdditionalInfo(p.toObject()),
  }));

  return successResponse(
    res,
    {
      products: formattedProducts,
      pagination: features.pagination,
    },
    "Products fetched successfully"
  );
});

// ------------------ GET SINGLE PRODUCT ------------------
exports.getProduct = catchAsync(async (req, res, next) => {
  const { slug } = req.params;

  if (!slug || typeof slug !== "string" || slug.trim() === "") {
    return errorResponse(res, "Product slug is required", 400);
  }

  const product = await Product.findOne({ slug: slug.trim().toLowerCase() })
    .populate("tags", "name slug")
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .populate({
      path: "variations",
      populate: {
        path: "attribute",
        model: "Attribute",
        select: "slug name type values",
      },
    })
    .populate({
      path: "variation_options",
      populate: {
        path: "attributes.attribute",
        model: "Attribute",
        select: "slug name type values",
      },
    })
    .populate("image", "original thumbnail")
    .populate("gallery", "original thumbnail")
    .populate({
      path: "reviews",
      match: { is_approved: true },
      populate: {
        path: "user",
        select: "name email",
      },
    });

  if (!product)
    return errorResponse(res, "No product found with that slug", 404);

  const productData = product.toObject();

  // Format reviews: helpful / not_helpful counts
  productData.reviews = productData.reviews.map((review) => ({
    ...review,
    helpful: review.helpfulUsers ? review.helpfulUsers.length : 0,
    not_helpful: review.notHelpfulUsers ? review.notHelpfulUsers.length : 0,
    helpfulUsers: undefined,
    notHelpfulUsers: undefined,
  }));

  // Format additional_info
  productData.additional_info = formatAdditionalInfo(productData);

  return successResponse(
    res,
    { product: productData },
    "Product fetched successfully"
  );
});

// ------------------ VALIDATION HELPERS ------------------

/**
 * Validate mandatory fields for product creation
 * Note: Category validation is handled separately with better error messages
 */
const validateMandatoryFields = (data, hasMainImage) => {
  const errors = [];

  if (!data.productName && !data.name) {
    errors.push("productName is required");
  }

  if (!data.brand) {
    errors.push("brand is required");
  }

  if (!data.model) {
    errors.push("model is required");
  }

  // Category is validated separately with findCategoryByIdOrName()
  // This allows for better error messages (category not found vs category required)

  if (data.price === undefined || data.price === null || data.price === "") {
    errors.push("price is required");
  } else if (isNaN(Number(data.price)) || Number(data.price) < 0) {
    errors.push("price must be a valid positive number");
  }

  if (!hasMainImage && !data.mainImage) {
    errors.push("mainImage is required (at least 1 main/featured image)");
  }

  return errors;
};

/**
 * Validate variants array if provided
 */
const validateVariants = (variants) => {
  const errors = [];

  if (!Array.isArray(variants)) {
    errors.push("variants must be an array");
    return errors;
  }

  variants.forEach((variant, index) => {
    // Validate variant price if provided
    if (variant.price !== undefined && variant.price !== null) {
      if (isNaN(Number(variant.price)) || Number(variant.price) < 0) {
        errors.push(`variants[${index}].price must be a valid positive number`);
      }
    }

    // Validate variant stock if provided
    if (variant.stock !== undefined && variant.stock !== null) {
      if (isNaN(Number(variant.stock)) || Number(variant.stock) < 0) {
        errors.push(`variants[${index}].stock must be a valid non-negative number`);
      }
    }
  });

  return errors;
};

/**
 * Parse and validate additional_info
 * Converts object or JSON string to a Map<String, String>
 * Ensures all values are strings
 * @param {any} additionalInfo - additional_info from request (object, string, or undefined)
 * @returns {Map<string, string>} Validated Map with string values
 * @throws {AppError} If JSON is invalid or values are not strings
 */
const parseAndValidateAdditionalInfo = (additionalInfo) => {
  // If missing or null, return empty Map
  if (!additionalInfo || additionalInfo === null || additionalInfo === "") {
    return new Map();
  }

  let parsed;
  
  // If it's already an object, use it directly
  if (typeof additionalInfo === "object" && !Array.isArray(additionalInfo)) {
    parsed = additionalInfo;
  }
  // If it's a string, try to parse as JSON
  else if (typeof additionalInfo === "string") {
    try {
      parsed = JSON.parse(additionalInfo);
      // After parsing, must be an object
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new AppError("additional_info must be a valid JSON object", 400);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Invalid JSON for additional_info", 400);
    }
  }
  // If it's an array or other invalid type, return empty Map
  else {
    return new Map();
  }

  // Convert to Map and ensure all values are strings
  const infoMap = new Map();
  for (const [key, value] of Object.entries(parsed)) {
    // Convert key to string
    const stringKey = String(key).trim();
    if (!stringKey) continue; // Skip empty keys
    
    // Convert value to string (handle null/undefined)
    const stringValue = value === null || value === undefined 
      ? "" 
      : String(value);
    
    infoMap.set(stringKey, stringValue);
  }

  return infoMap;
};

/**
 * Parse JSON string or return object
 */
const parseJSON = (data, fieldName) => {
  if (!data) return null;
  if (typeof data === "object") return data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      throw new AppError(`Invalid JSON for ${fieldName}`, 400);
    }
  }
  return null;
};

/**
 * Parse array from string or return array
 */
const parseArray = (data, fieldName) => {
  if (!data) return [];
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
      throw new AppError(`Invalid JSON for ${fieldName}`, 400);
    }
  }
  if (!Array.isArray(data)) {
    throw new AppError(`${fieldName} must be an array`, 400);
  }
  return data;
};

// ------------------ HELPER: Extract Cloudinary URL from uploaded file ------------------
const getUploadedImageUrl = (file) => {
  if (!file) return null;
  // Cloudinary storage returns the URL in file.path
  return file.path || file.secure_url || file.url || null;
};

// ------------------ HELPER: Process variant images from uploaded files ------------------
const processVariantImages = (files, variants) => {
  if (!variants || !Array.isArray(variants)) return variants;

  return variants.map((variant, index) => {
    // Check for individual variant image field (variant_0_image, variant_1_image, etc.)
    const variantImageField = `variant_${index}_image`;
    if (files[variantImageField]?.length) {
      variant.image = getUploadedImageUrl(files[variantImageField][0]);
    }
    return variant;
  });
};

// ------------------ CREATE PRODUCT ------------------
exports.createProduct = catchAsync(async (req, res, next) => {
  let productData = req.body;

  // Parse product JSON if sent as string (for multipart/form-data)
  if (typeof req.body.product === "string") {
    try {
      productData = JSON.parse(req.body.product);
    } catch {
      return errorResponse(res, "Invalid JSON in product field", 400);
    }
  }

  // Extract all fields from request
  let {
    // Mandatory fields
    productName,
    name, // Legacy support
    brand,
    model,
    category,
    subCategory,
    price,
    mainImage,

    // Optional pricing fields
    salePrice,
    sale_price, // Legacy support
    tax,

    // Optional media fields
    galleryImages,
    videoUrl,

    // Optional product info
    description,
    product_details,
    whatsInTheBox,
    condition,
    sku,
    tags,

    // Optional mobile-specific fields
    variants,

    // Legacy/system fields
    additional_info,
    on_sale,
    sale_start,
    sale_end,
    variations,
    variation_options,
    product_type,
    max_price,
    min_price,
    quantity,
  } = productData;

  // Use productName or fallback to name for backward compatibility
  const finalProductName = productName || name;

  // ----------- PROCESS UPLOADED IMAGES -----------
  // Check for main image from file upload (mainImage or image field)
  const hasUploadedMainImage = !!(req.files?.mainImage?.length || req.files?.image?.length);
  const uploadedMainImageUrl = hasUploadedMainImage
    ? getUploadedImageUrl(req.files?.mainImage?.[0] || req.files?.image?.[0])
    : null;

  // Use uploaded image URL or fallback to provided URL
  const finalMainImage = uploadedMainImageUrl || mainImage;

  // ----------- VALIDATE MANDATORY FIELDS -----------
  const mandatoryErrors = validateMandatoryFields(
    { ...productData, productName: finalProductName, mainImage: finalMainImage },
    hasUploadedMainImage
  );

  if (mandatoryErrors.length > 0) {
    return errorResponse(
      res,
      `Validation failed: ${mandatoryErrors.join(", ")}`,
      400,
      mandatoryErrors
    );
  }

  // ----------- VALIDATE CATEGORY -----------
  // Category can be: ObjectId, category name, or category slug
  if (!category || String(category).trim() === "") {
    return errorResponse(res, "Category is required", 400);
  }

  const categoryDoc = await findCategoryByIdOrName(category);
  if (!categoryDoc) {
    return errorResponse(
      res, 
      `Category "${category}" not found. Please provide a valid category ID, name, or slug.`, 
      404
    );
  }

  // Get the actual category ObjectId for storing in database
  const categoryId = categoryDoc._id;

  // Validate subcategory if provided
  let subCategoryId = null;
  if (subCategory) {
    const subCategoryDoc = findSubCategory(categoryDoc, subCategory);
    if (!subCategoryDoc) {
      return errorResponse(
        res, 
        `Sub-category "${subCategory}" not found in category "${categoryDoc.name}". Please provide a valid sub-category ID, name, or slug.`, 
        404
      );
    }
    subCategoryId = subCategoryDoc._id;
  }

  // ----------- PARSE ARRAYS & OBJECTS -----------
  try {
    tags = parseArray(tags, "tags");
    variations = parseArray(variations, "variations");
    variation_options = parseArray(variation_options, "variation_options");
    variants = parseArray(variants, "variants");
    galleryImages = parseArray(galleryImages, "galleryImages");
    // Parse and validate additional_info (converts to Map<String, String>)
    additional_info = parseAndValidateAdditionalInfo(additional_info);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 400);
  }

  // ----------- PROCESS GALLERY IMAGES -----------
  // Get URLs from uploaded gallery images
  const uploadedGalleryUrls = [];
  if (req.files?.gallery?.length) {
    req.files.gallery.forEach((file) => {
      const url = getUploadedImageUrl(file);
      if (url) uploadedGalleryUrls.push(url);
    });
  }
  if (req.files?.galleryImages?.length) {
    req.files.galleryImages.forEach((file) => {
      const url = getUploadedImageUrl(file);
      if (url) uploadedGalleryUrls.push(url);
    });
  }

  // Combine uploaded gallery URLs with provided URLs
  const finalGalleryImages = [
    ...uploadedGalleryUrls,
    ...(galleryImages || []).filter((url) => typeof url === "string" && url.trim()),
  ];

  // ----------- PROCESS VARIANT IMAGES -----------
  if (variants && variants.length > 0 && req.files) {
    variants = processVariantImages(req.files, variants);

    // Also check for variantImages array field
    if (req.files.variantImages?.length) {
      req.files.variantImages.forEach((file, index) => {
        if (variants[index] && !variants[index].image) {
          variants[index].image = getUploadedImageUrl(file);
        }
      });
    }
  }

  // ----------- VALIDATE VARIANTS (IF PROVIDED) -----------
  if (variants && variants.length > 0) {
    const variantErrors = validateVariants(variants);
    if (variantErrors.length > 0) {
      return errorResponse(
        res,
        `Variant validation failed: ${variantErrors.join(", ")}`,
        400,
        variantErrors
      );
    }

    // Auto-generate SKU for variants that don't have one
    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].sku || !isValidSKU(variants[i].sku)) {
        const variantCode = variants[i].storage || variants[i].color || `V${i + 1}`;
        const sanitizedVariantCode = variantCode.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 4);
        variants[i].sku = `${sanitizeBrandForSKU(brand)}-${sanitizedVariantCode}-${generateRandomString(4)}`;
      } else {
        variants[i].sku = variants[i].sku.toUpperCase().trim();
      }
    }
  }


  // ----------- SKU GENERATION -----------
  let finalSKU = null;
  
  if (sku && isValidSKU(sku)) {
    // Check if provided SKU already exists
    const skuExists = await isSKUExists(sku);
    if (skuExists) {
      return errorResponse(
        res,
        `SKU "${sku}" already exists. Please provide a unique SKU or leave it empty for auto-generation.`,
        400
      );
    }
    finalSKU = sku.toUpperCase().trim();
  } else {
    // Auto-generate unique SKU
    finalSKU = await generateUniqueSKU(brand);
  }

  // ----------- TAGS -----------
  const tagIds = [];
  for (const tag of tags) {
    const tagName = typeof tag === "string" ? tag : tag.name;
    if (!tagName) continue;

    const slug = tag.slug || createSlug(tagName);
    let existingTag = await Tag.findOne({ slug });
    if (!existingTag) {
      existingTag = await Tag.create({ name: tagName, slug });
    }
    tagIds.push(existingTag._id);
  }

  // ----------- LEGACY VARIATIONS -----------
  const variationIds = [];
  const attributeMap = {};

  for (const variation of variations) {
    if (!variation.attribute) continue;

    const attrName = variation.attribute.name;
    const attrSlug = variation.attribute.slug || createSlug(attrName);
    let attribute = await Attribute.findOne({ slug: attrSlug });

    if (!attribute) {
      attribute = await Attribute.create({
        name: attrName,
        slug: attrSlug,
        type: variation.attribute.type,
        values:
          variation.attribute.values?.map((v) => ({
          value: v.value,
          image: v.image || null,
          })) || [],
      });
    }

    const variationDoc = await Variation.create({
      value: variation.value,
      attribute: attribute._id,
    });

    variationIds.push(variationDoc._id);
    attributeMap[attrSlug] = attribute._id;
  }

  // ----------- LEGACY IMAGE MODEL (for backward compatibility) -----------
  let imageDocId = null;
  if (finalMainImage) {
    const imageDoc = new Image({
      original: finalMainImage,
      thumbnail: finalMainImage,
    });
    await imageDoc.save();
    imageDocId = imageDoc._id;
  }

  // Legacy gallery (Image model references)
  let galleryDocIds = [];
  if (finalGalleryImages.length > 0) {
    const imageDocs = await Promise.all(
      finalGalleryImages.map(async (url) => {
        const img = new Image({ original: url, thumbnail: url });
        await img.save();
        return img;
      })
    );
    galleryDocIds = imageDocs.map((img) => img._id);
  }

  // ----------- SALE FIELDS VALIDATION -----------
  const finalSalePrice = salePrice || sale_price;

  if (on_sale && finalSalePrice >= price) {
    return errorResponse(res, "Sale price must be less than regular price", 400);
  }

  if (on_sale && (!sale_start || !sale_end)) {
    return errorResponse(
      res,
      "Both sale_start and sale_end are required when on_sale is true",
      400
    );
  }

  // ----------- DETERMINE PRODUCT TYPE -----------
  const finalProductType =
    product_type || (variants && variants.length > 0 ? "variable" : "simple");

  // ----------- CREATE PRODUCT -----------
  const baseSlug = createSlug(finalProductName);
  const uniqueSlug = await generateUniqueSlug(Product, baseSlug);

  const product = await Product.create({
    // Mandatory fields
    productName: finalProductName,
    name: finalProductName, // For backward compatibility
    slug: uniqueSlug,
    category: categoryId,
    subCategory: subCategoryId,
    brand,
    model,
    price: Number(price),

    // Images - Store URLs directly
    mainImage: finalMainImage,
    image: imageDocId, // Legacy Image model reference
    galleryImages: finalGalleryImages, // Array of URLs
    gallery: galleryDocIds, // Legacy Image model references

    // Optional pricing
    salePrice: finalSalePrice ? Number(finalSalePrice) : null,
    sale_price: finalSalePrice ? Number(finalSalePrice) : null,
    tax: tax ? Number(tax) : null,

    // Optional media
    videoUrl: videoUrl || null,

    // Optional product info
    description: description || null,
    product_details: product_details || null,
    whatsInTheBox: whatsInTheBox || null,
    condition: condition || "new",
    sku: finalSKU,
    tags: tagIds,

    // Mobile-specific fields
    variants: variants || [],

    // System fields
    additional_info,
    product_type: finalProductType,
    on_sale: on_sale || false,
    sale_start: on_sale ? new Date(sale_start) : null,
    sale_end: on_sale ? new Date(sale_end) : null,
    max_price: finalProductType === "variable" ? max_price : null,
    min_price: finalProductType === "variable" ? min_price : null,
    variations: variationIds,
    variation_options: [],
    is_active: true,
    quantity: quantity !== undefined && quantity !== null ? Number(quantity) : 0,
  });

  // ----------- LEGACY VARIATION OPTIONS -----------
  const variationOptionIds = [];
  for (const option of variation_options) {
    const attributesMapped = option.attributes?.map((attr) => ({
      attribute: attributeMap[attr.name] || attributeMap[createSlug(attr.name)],
      value: attr.value,
    }));

    const optionSlugBase = option.slug || createSlug(option.title);
    const optionSlug = await generateUniqueSlug(VariationOption, optionSlugBase);

    const variationOptionDoc = await VariationOption.create({
      title: option.title,
      price: option.price,
      quantity: option.quantity,
      sku: option.sku,
      is_disable: option.is_disable || false,
      image: option.image || null,
      attributes: attributesMapped || [],
      product: product._id,
      slug: optionSlug,
    });

    variationOptionIds.push(variationOptionDoc._id);
  }

  product.variation_options = variationOptionIds;
  await product.save();

  // Return success response with consistent format
  return res.status(201).json({
    success: true,
    status: "success",
    message: "Product created successfully",
    product: product,
    data: { product },
  });
});

// ------------------ UPDATE PRODUCT ------------------
exports.updateProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let updateData = req.body;

  // Parse product JSON if sent as string (for multipart/form-data)
  if (typeof req.body.product === "string") {
    try {
      updateData = JSON.parse(req.body.product);
    } catch {
      return errorResponse(res, "Invalid JSON in product field", 400);
    }
  }

  const product = await Product.findById(id);
  if (!product) return errorResponse(res, "Product not found", 404);

  // Extract all fields from request
  let {
    // Name fields
    productName,
    name, // Legacy support

    // Category fields
    category,
    subCategory,

    // Basic product info
    description,
    product_details,
    brand,
    model,
    price,
    quantity,

    // Pricing fields
    salePrice,
    sale_price, // Legacy support
    tax,

    // Media fields
    mainImage,
    galleryImages,
    videoUrl,

    // Product details
    whatsInTheBox,
    condition,
    sku,

    // Mobile-specific fields
    variants,

    // System fields
    tags,
    variations,
    variation_options,
    product_type,
    additional_info,
    on_sale,
    sale_start,
    sale_end,
  } = updateData;

  // Use productName or fallback to name for backward compatibility
  const finalProductName = productName || name;

  // ----------- PROCESS UPLOADED IMAGES -----------
  const hasUploadedMainImage = !!(req.files?.mainImage?.length || req.files?.image?.length);
  const uploadedMainImageUrl = hasUploadedMainImage
    ? getUploadedImageUrl(req.files?.mainImage?.[0] || req.files?.image?.[0])
    : null;

  // Use uploaded image URL or fallback to provided URL
  const finalMainImage = uploadedMainImageUrl || mainImage;

  // ----------- VALIDATE CATEGORY (if provided) -----------
  let categoryId = product.category;
  let subCategoryId = product.subCategory;

  if (category !== undefined) {
    const categoryDoc = await findCategoryByIdOrName(category);
    if (!categoryDoc) {
      return errorResponse(
        res,
        `Category "${category}" not found. Please provide a valid category ID, name, or slug.`,
        404
      );
    }
    categoryId = categoryDoc._id;

    if (subCategory !== undefined) {
      if (subCategory === null || subCategory === "") {
        subCategoryId = null;
      } else {
        const subCategoryDoc = findSubCategory(categoryDoc, subCategory);
        if (!subCategoryDoc) {
          return errorResponse(
            res,
            `Sub-category "${subCategory}" not found in category "${categoryDoc.name}".`,
            404
          );
        }
        subCategoryId = subCategoryDoc._id;
      }
    }
  }

  // ----------- PARSE ARRAYS & OBJECTS -----------
  try {
    tags = parseArray(tags, "tags");
    variations = parseArray(variations, "variations");
    variation_options = parseArray(variation_options, "variation_options");
    variants = parseArray(variants, "variants");
    galleryImages = parseArray(galleryImages, "galleryImages");
    // Parse and validate additional_info (converts to Map<String, String>)
    additional_info = parseAndValidateAdditionalInfo(additional_info);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 400);
  }

  // ----------- PROCESS GALLERY IMAGES -----------
  const uploadedGalleryUrls = [];
  if (req.files?.gallery?.length) {
    req.files.gallery.forEach((file) => {
      const url = getUploadedImageUrl(file);
      if (url) uploadedGalleryUrls.push(url);
    });
  }
  if (req.files?.galleryImages?.length) {
    req.files.galleryImages.forEach((file) => {
      const url = getUploadedImageUrl(file);
      if (url) uploadedGalleryUrls.push(url);
    });
  }

  // Combine uploaded gallery URLs with provided URLs (if galleryImages is provided, replace; otherwise append)
  let finalGalleryImages = product.galleryImages || [];
  if (galleryImages !== undefined) {
    finalGalleryImages = [
      ...uploadedGalleryUrls,
      ...(galleryImages || []).filter((url) => typeof url === "string" && url.trim()),
    ];
  } else if (uploadedGalleryUrls.length > 0) {
    finalGalleryImages = [...(product.galleryImages || []), ...uploadedGalleryUrls];
  }

  // ----------- PROCESS VARIANT IMAGES -----------
  if (variants && variants.length > 0 && req.files) {
    variants = processVariantImages(req.files, variants);

    // Also check for variantImages array field
    if (req.files.variantImages?.length) {
      req.files.variantImages.forEach((file, index) => {
        if (variants[index] && !variants[index].image) {
          variants[index].image = getUploadedImageUrl(file);
        }
      });
    }
  }

  // ----------- VALIDATE VARIANTS (IF PROVIDED) -----------
  if (variants && variants.length > 0) {
    const variantErrors = validateVariants(variants);
    if (variantErrors.length > 0) {
      return errorResponse(
        res,
        `Variant validation failed: ${variantErrors.join(", ")}`,
        400,
        variantErrors
      );
    }

    // Auto-generate SKU for variants that don't have one
    const currentBrand = brand || product.brand;
    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].sku || !isValidSKU(variants[i].sku)) {
        const variantCode = variants[i].storage || variants[i].color || `V${i + 1}`;
        const sanitizedVariantCode = variantCode.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 4);
        variants[i].sku = `${sanitizeBrandForSKU(currentBrand)}-${sanitizedVariantCode}-${generateRandomString(4)}`;
      } else {
        variants[i].sku = variants[i].sku.toUpperCase().trim();
      }
    }
  }

  // ----------- SKU VALIDATION/GENERATION -----------
  if (sku !== undefined) {
    if (sku && isValidSKU(sku)) {
      // Check if provided SKU already exists (excluding current product)
      const skuExists = await isSKUExists(sku, product._id);
      if (skuExists) {
        return errorResponse(
          res,
          `SKU "${sku}" already exists. Please provide a unique SKU or leave it empty for auto-generation.`,
          400
        );
      }
      product.sku = sku.toUpperCase().trim();
    } else if (sku === null || sku === "") {
      // If SKU is explicitly set to null/empty, auto-generate
      const currentBrand = brand || product.brand;
      product.sku = await generateUniqueSKU(currentBrand);
    }
    // If invalid format, keep existing SKU (don't update)
  }

  // ----------- HANDLE TAGS -----------
  if (tags !== undefined) {
    const tagIds = [];
    for (const tag of tags) {
      const tagName = typeof tag === "string" ? tag : tag.name;
      if (!tagName) continue;

      const slug = tag.slug || createSlug(tagName);
      let existingTag = await Tag.findOne({ slug });
      if (!existingTag) {
        existingTag = await Tag.create({ name: tagName, slug });
      }
      tagIds.push(existingTag._id);
    }
    product.tags = tagIds;
  }

  // ----------- HANDLE SLUG UPDATE (if name changed) -----------
  if (finalProductName && finalProductName !== product.name && finalProductName !== product.productName) {
    const baseSlug = createSlug(finalProductName);
    const uniqueSlug = await generateUniqueSlug(Product, baseSlug, product._id);
    product.slug = uniqueSlug;
    product.name = finalProductName;
    product.productName = finalProductName;
  }

  // ----------- LEGACY IMAGE MODEL (for backward compatibility) -----------
  if (finalMainImage !== undefined) {
    // Update Image model reference if mainImage changed
    if (finalMainImage && finalMainImage !== product.mainImage) {
      let imageDocId = product.image;
      if (finalMainImage) {
        // Check if Image document exists, otherwise create new
        if (product.image) {
          const existingImage = await Image.findById(product.image);
          if (existingImage) {
            existingImage.original = finalMainImage;
            existingImage.thumbnail = finalMainImage;
            await existingImage.save();
            imageDocId = existingImage._id;
          } else {
            const imageDoc = new Image({
              original: finalMainImage,
              thumbnail: finalMainImage,
            });
            await imageDoc.save();
            imageDocId = imageDoc._id;
          }
        } else {
          const imageDoc = new Image({
            original: finalMainImage,
            thumbnail: finalMainImage,
          });
          await imageDoc.save();
          imageDocId = imageDoc._id;
        }
        product.image = imageDocId;
      }
    }
    product.mainImage = finalMainImage || null;
  }

  // Update gallery Image model references
  if (finalGalleryImages !== undefined && finalGalleryImages.length > 0) {
    const galleryDocIds = [];
    for (const url of finalGalleryImages) {
      const imageDoc = new Image({ original: url, thumbnail: url });
      await imageDoc.save();
      galleryDocIds.push(imageDoc._id);
    }
    product.gallery = galleryDocIds;
  }

  // ----------- SALE FIELDS VALIDATION -----------
  const finalSalePrice = salePrice || sale_price;
  const finalPrice = price !== undefined ? Number(price) : product.price;

  if (on_sale !== undefined) {
    product.on_sale = on_sale || false;

    if (on_sale && finalSalePrice !== undefined) {
      if (finalSalePrice >= finalPrice) {
        return errorResponse(res, "Sale price must be less than regular price", 400);
      }
      if (!sale_start || !sale_end) {
        return errorResponse(
          res,
          "Both sale_start and sale_end are required when on_sale is true",
          400
        );
      }
      product.sale_start = new Date(sale_start);
      product.sale_end = new Date(sale_end);
    } else if (!on_sale) {
      product.sale_start = null;
      product.sale_end = null;
    }
  }

  // ----------- UPDATE PRODUCT FIELDS -----------
  if (description !== undefined) product.description = description;
  if (product_details !== undefined) product.product_details = product_details;
  if (additional_info !== undefined) product.additional_info = additional_info;
  if (category !== undefined) product.category = categoryId;
  if (subCategory !== undefined) product.subCategory = subCategoryId;
  if (price !== undefined) product.price = Number(price);
  if (finalSalePrice !== undefined) {
    product.salePrice = finalSalePrice ? Number(finalSalePrice) : null;
    product.sale_price = finalSalePrice ? Number(finalSalePrice) : null;
  }
  if (tax !== undefined) product.tax = tax ? Number(tax) : null;
  if (brand !== undefined) product.brand = brand;
  if (model !== undefined) product.model = model;
  if (quantity !== undefined) product.quantity = quantity !== null ? Number(quantity) : 0;
  if (product_type !== undefined) product.product_type = product_type;
  if (whatsInTheBox !== undefined) product.whatsInTheBox = whatsInTheBox || null;
  if (condition !== undefined) product.condition = condition || "new";
  if (videoUrl !== undefined) product.videoUrl = videoUrl || null;
  if (variants !== undefined) product.variants = variants || [];
  if (galleryImages !== undefined) product.galleryImages = finalGalleryImages;
  // Update additional_info (completely replace with new structure)
  if (additional_info !== undefined) {
    product.additional_info = additional_info;
  }

  // ----------- LEGACY VARIATIONS -----------
  if (variations !== undefined) {
    product.variations = [];
    for (const variation of variations) {
      if (!variation.attribute) continue;

      const attrName = variation.attribute.name;
      const attrSlug = variation.attribute.slug || createSlug(attrName);
      let attribute = await Attribute.findOne({ slug: attrSlug });

      if (!attribute) {
        attribute = await Attribute.create({
          name: attrName,
          slug: attrSlug,
          type: variation.attribute.type,
          values:
            variation.attribute.values?.map((v) => ({
              value: v.value,
              image: v.image || null,
            })) || [],
        });
      }

      const variationDoc = await Variation.create({
        value: variation.value,
        attribute: attribute._id,
      });

      product.variations.push(variationDoc._id);
    }
  }

  if (variation_options !== undefined) {
    product.variation_options = [];
    for (const option of variation_options) {
      const newOption = await VariationOption.create({
        ...option,
        product: product._id,
      });
      product.variation_options.push(newOption._id);
    }
  }

  await product.save();

  return successResponse(res, { product }, "Product updated successfully", 200);
});

// ------------------ DELETE PRODUCT ------------------
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return errorResponse(res, "No product found with that ID", 404);

  if (product.image?.original) await safeDestroy(product.image.original);
  if (product.gallery?.length) {
    for (const imgId of product.gallery) await safeDestroy(imgId);
  }

  await Product.findByIdAndDelete(req.params.id);

  return successResponse(res, "Product deleted successfully", 204);
});

// ------------------ GET PRODUCTS BY PARENT CATEGORY (WITH FILTERS) ------------------
exports.getProductsByCategory = catchAsync(async (req, res, next) => {
  const { parent: parentSlug } = req.query;

  // Step 1: Create base query
  let query = Product.find();

  // Step 2: Apply all filters using APIFeatures
  const features = new APIFeatures(query, req.query);
  await features.buildFilters();

  // Step 3: Get the filter object that was built
  const filter = features.query.getFilter();

  // Step 4: Count total products AFTER applying all filters
  const totalProducts = await Product.countDocuments(filter);

  // Step 5: Apply sorting, field limiting, and pagination
  features.sort().limitFields().paginate(totalProducts);

  const products = await features.query
    .populate("tags", "name slug")
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .populate({
      path: "variations",
      populate: { path: "attribute", select: "slug name type values" },
    })
    .populate({
      path: "variation_options",
      populate: {
        path: "attributes.attribute",
        select: "slug name type values",
      },
    })
    .populate("image gallery", "original thumbnail");

  const formattedProducts = products.map((p) => ({
    ...p.toObject(),
    additional_info: formatAdditionalInfo(p.toObject()),
  }));

  return successResponse(
    res,
    {
      products: formattedProducts,
      pagination: features.pagination,
    },
    "Products fetched successfully by parent category"
  );
});

// ------------------ GET PRODUCTS BY CATEGORY + SUB CATEGORIES (WITH FILTERS) ------------------
exports.getProductsByCategorySubCategories = catchAsync(
  async (req, res, next) => {
    const { parent: parentSlug, child: childSlug } = req.query;

    // Step 1: Base filter
    const filter = {};
    const andConditions = [];

    // Step 2: Parent category check
    if (parentSlug) {
      const parentCategory = await Category.findOne({ slug: parentSlug });
      if (!parentCategory) {
        return errorResponse(res, "Parent category not found", 404);
      }
      andConditions.push({ category: parentCategory._id });

      // Step 3: Child category check (only if child is provided)
      if (childSlug) {
        const childCategory = parentCategory.children.find(
          (child) => child.slug === childSlug
        );
        if (!childCategory) {
          return errorResponse(res, "Child category not found", 404);
        }
        andConditions.push({ subCategory: childCategory._id });
      }
    }

    // Apply category filters
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // Step 4: Create count query with all filters
    const countQuery = new APIFeatures(Product.find(filter), req.query);
    await countQuery.buildFilters();

    // Get the count of filtered products
    const filteredCount = await countQuery.query.countDocuments();

    // Step 5: Query with all filters + pagination
    const features = new APIFeatures(Product.find(filter), req.query);
    await features.buildFilters();
    features.sort().limitFields().paginate(filteredCount); // Use filtered count

    const products = await features.query
      .populate("tags", "name slug")
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .populate({
        path: "variations",
        populate: { path: "attribute", select: "slug name type values" },
      })
      .populate({
        path: "variation_options",
        populate: {
          path: "attributes.attribute",
          select: "slug name type values",
        },
      })
      .populate("image gallery", "original thumbnail");

    const formattedProducts = products.map((p) => ({
      ...p.toObject(),
      additional_info: formatAdditionalInfo(p.toObject()),
    }));

    return successResponse(
      res,
      {
        products: formattedProducts,
        pagination: features.pagination, // Make sure to include pagination in response
      },
      "Products fetched successfully by parent & child category"
    );
  }
);

// ------------------ GET sales PRODUCTS (WITH FILTERS) ------------------
exports.getSaleProducts = catchAsync(async (req, res, next) => {
  // Base filter: only products that are deals (on sale)
  const filter = { on_sale: true }; // OR use `is_deal: true` if you have that field

  // Count total deal products
  const totalProducts = await Product.countDocuments(filter);

  // Apply API features (filters, sort, pagination)
  const features = new APIFeatures(Product.find(filter), req.query);
  await features.buildFilters();
  features.sort().limitFields().paginate(totalProducts);

  // Fetch products with population
  const products = await features.query
    .populate("tags", "name slug")
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .populate({
      path: "variations",
      populate: { path: "attribute", select: "slug name type values" },
    })
    .populate({
      path: "variation_options",
      populate: {
        path: "attributes.attribute",
        select: "slug name type values",
      },
    })
    .populate("image gallery", "original thumbnail");

  // Format products
  const formattedProducts = products.map((p) => ({
    ...p.toObject(),
    additional_info: formatAdditionalInfo(p.toObject()),
  }));

  // Success response
  return successResponse(
    res,
    {
      products: formattedProducts,
      pagination: features.pagination,
    },
    "Deal products fetched successfully"
  );
});

// ------------------ GET NEW SELLER PRODUCTS (WITH FILTERS) ------------------
exports.getNewSellerProducts = catchAsync(async (req, res, next) => {
  // Base filter: (optional) if sellerId is passed in query
  const filter = {};
  if (req.query.sellerId) {
    filter.seller = req.query.sellerId; // assuming Product has a 'seller' field
  }

  // Count total products for seller (or all)
  const totalProducts = await Product.countDocuments(filter);

  // Apply API features (filters, pagination, etc.)
  const features = new APIFeatures(Product.find(filter), req.query);
  await features.buildFilters();

  // Force sorting by newest first
  features.query = features.query.sort({ createdAt: -1 });
  features.limitFields().paginate(totalProducts);

  // Fetch products
  const products = await features.query
    .populate("tags", "name slug")
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .populate({
      path: "variations",
      populate: { path: "attribute", select: "slug name type values" },
    })
    .populate({
      path: "variation_options",
      populate: {
        path: "attributes.attribute",
        select: "slug name type values",
      },
    })
    .populate("image gallery", "original thumbnail");

  // Format products
  const formattedProducts = products.map((p) => ({
    ...p.toObject(),
    additional_info: formatAdditionalInfo(p.toObject()),
  }));

  // Success response
  return successResponse(
    res,
    {
      products: formattedProducts,
      pagination: features.pagination,
    },
    "New seller products fetched successfully"
  );
});

// ------------------ GET BEST SELLER PRODUCTS (WITH FILTERS) ------------------
exports.getBestSellerProducts = catchAsync(async (req, res, next) => {
  // Base filter: Only products with ratings (ratingsQuantity > 0)
  const filter = {
    is_active: true,
    in_stock: true,
    ratingsQuantity: { $gt: 0 }, // Only products with at least 1 rating
  };

  if (req.query.sellerId) {
    filter.seller = req.query.sellerId;
  }

  // Count total products for seller (or all)
  const totalProducts = await Product.countDocuments(filter);

  // Apply API features (filters, pagination, etc.)
  const features = new APIFeatures(Product.find(filter), req.query);
  await features.buildFilters();

  // Sort by best selling (ratings average and quantity)
  features.query = features.query.sort({
    ratingsAverage: -1,
    ratingsQuantity: -1,
    createdAt: -1,
  });

  features.limitFields().paginate(totalProducts);

  // Fetch products
  const products = await features.query
    .populate("tags", "name slug")
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .populate({
      path: "variations",
      populate: { path: "attribute", select: "slug name type values" },
    })
    .populate({
      path: "variation_options",
      populate: {
        path: "attributes.attribute",
        select: "slug name type values",
      },
    })
    .populate("image gallery", "original thumbnail");

  // Format products
  const formattedProducts = products.map((p) => ({
    ...p.toObject(),
    additional_info: formatAdditionalInfo(p.toObject()),
  }));

  // Success response
  return successResponse(
    res,
    {
      products: formattedProducts,
      pagination: features.pagination,
    },
    "Best seller products fetched successfully"
  );
});

// ------------------ GET RELATED PRODUCTS ------------------
exports.getRelatedProducts = catchAsync(async (req, res, next) => {
  const { slug } = req.params;

  // 1. Find current product by slug
  const currentProduct = await Product.findOne({ slug }).select("category subCategory");
  if (!currentProduct) return errorResponse(res, "Product not found", 404);

  // 2. Base filter (exclude current product)
  const filter = {
    _id: { $ne: currentProduct._id },
    is_active: true,
  };

  // 3. Check if category/subCategory passed in query, else fallback to current product
  if (req.query.parent || req.query.child) {
    // yahan APIFeatures parent/child filter handle karega automatically
  } else {
    if (currentProduct.subCategory) {
      filter.subCategory = currentProduct.subCategory;
    } else {
      filter.category = currentProduct.category;
    }
  }

  // 4. Count total related products
  const countQuery = new APIFeatures(Product.find(filter), req.query);
  await countQuery.buildFilters();
  const totalProducts = await countQuery.query.countDocuments();

  // 5. Apply filters + pagination + sorting
  const features = new APIFeatures(Product.find(filter), req.query);
  await features.buildFilters();
  features.sort().limitFields().paginate(totalProducts);

  // 6. Query related products
  const relatedProducts = await features.query
    .populate("tags", "name slug")
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .populate({
      path: "variations",
      populate: { path: "attribute", select: "slug name type values" },
    })
    .populate({
      path: "variation_options",
      populate: {
        path: "attributes.attribute",
        select: "slug name type values",
      },
    })
    .populate("image gallery", "original thumbnail");

  // 7. Format products
  const formattedProducts = relatedProducts.map((p) => ({
    ...p.toObject(),
    additional_info: formatAdditionalInfo(p.toObject()),
  }));

  // 8. Response
  return successResponse(
    res,
    {
      products: formattedProducts,
      pagination: features.pagination,
    },
    "Related products fetched successfully"
  );
});

// ------------------ GET TOP 10 SALES PRODUCTS ------------------
exports.getTopSalesProducts = catchAsync(async (req, res, next) => {
  // Base filter: only active & in-stock products
  const baseFilter = { is_active: true, in_stock: true };

  // Allow optional category or seller filters
  if (req.query.categoryId) {
    baseFilter.category = req.query.categoryId;
  }
  if (req.query.sellerId) {
    baseFilter.seller = req.query.sellerId;
  }

  // 🔹 Step 1: Fetch top-selling products (salesCount > 0)
  const salesFilter = { ...baseFilter, salesCount: { $gt: 0 } };

  let products = await Product.find(salesFilter)
    .sort({ salesCount: -1, ratingsAverage: -1 })
    .limit(10)
    .populate("tags", "name slug")
    .populate("category", "name slug")
    .populate("subCategory", "name slug")
    .populate({
      path: "variations",
      populate: { path: "attribute", select: "slug name type values" },
    })
    .populate({
      path: "variation_options",
      populate: {
        path: "attributes.attribute",
        select: "slug name type values",
      },
    })
    .populate("image gallery", "original thumbnail");

  // 🔹 Step 2: If no sales data found, fallback to top-rated products
  if (!products || products.length === 0) {
    products = await Product.find(baseFilter)
      .sort({ ratingsAverage: -1, ratingsQuantity: -1 })
      .limit(10)
      .populate("tags", "name slug")
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .populate({
        path: "variations",
        populate: { path: "attribute", select: "slug name type values" },
      })
      .populate({
        path: "variation_options",
        populate: {
          path: "attributes.attribute",
          select: "slug name type values",
        },
      })
      .populate("image gallery", "original thumbnail");

    if (!products || products.length === 0) {
      return errorResponse(res, "No products available", 404);
    }

    const formattedTopRated = products.map((p) => ({
      ...p.toObject(),
      additional_info: formatAdditionalInfo(p.toObject()),
    }));

    return successResponse(
      res,
      { products: formattedTopRated },
      "No sales yet — showing top-rated products"
    );
  }

  // 🔹 Step 3: Return top-selling products
  const formattedTopSales = products.map((p) => ({
    ...p.toObject(),
    additional_info: formatAdditionalInfo(p.toObject()),
  }));

  return successResponse(
    res,
    { products: formattedTopSales },
    "Top 10 best-selling products fetched successfully"
  );
});

