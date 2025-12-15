const mongoose = require("mongoose");
const Deal = require("../models/deal.model");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const catchAsync = require("../utils/catchAsync");
const successResponse = require("../utils/successResponse");
const errorResponse = require("../utils/errorResponse");
const APIFeatures = require("../utils/apiFeatures");
const { deleteFromCloudinary } = require("../../config/cloudinary");

// ---------------- CREATE DEAL ----------------
exports.createDeal = catchAsync(async (req, res, next) => {
  let dealData = req.body;

  // Debug: Log incoming request
  console.log("=== CREATE DEAL REQUEST ===");
  console.log("Body type:", typeof req.body);
  console.log("Has deal field:", !!req.body.deal);
  console.log("Has files:", !!req.files);
  if (req.files) {
    console.log("Files received:", Object.keys(req.files));
  }

  if (typeof req.body.deal === "string") {
    try {
      dealData = JSON.parse(req.body.deal);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return errorResponse(res, "Invalid JSON in deal field", 400);
    }
  }

  const {
    title,
    description,
    discountType,
    discountValue,
    startDate,
    endDate,
    products = [],
    categories = [],
    subCategories = [],
    isGlobal = false,
    isActive = false,
    priority = 1,
    btnText,
  } = dealData;

  // Ensure arrays are actually arrays
  const productsArray = Array.isArray(products) ? products : [];
  const categoriesArray = Array.isArray(categories) ? categories : [];
  const subCategoriesArray = Array.isArray(subCategories) ? subCategories : [];

  if (!title || !discountType || !discountValue || !startDate || !endDate) {
    return errorResponse(res, "Missing required fields", 400);
  }

  // Validate discountType
  if (!["percentage", "fixed", "flat"].includes(discountType)) {
    return errorResponse(
      res,
      "Invalid discountType. Must be 'percentage', 'fixed', or 'flat'",
      400
    );
  }

  // Validate discountValue
  if (isNaN(discountValue) || discountValue < 0) {
    return errorResponse(res, "discountValue must be a positive number", 400);
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return errorResponse(res, "Invalid date format", 400);
  }
  if (start >= end) {
    return errorResponse(res, "startDate must be before endDate", 400);
  }

  // ✅ Validate Products
  let validProducts = [];
  if (productsArray.length > 0) {
    // Validate all product IDs are valid ObjectIds
    const invalidProductIds = productsArray.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidProductIds.length > 0) {
      return errorResponse(
        res,
        `Invalid product ID format: ${invalidProductIds.join(", ")}`,
        400
      );
    }

    const productDocs = await Product.find({
      _id: { $in: productsArray.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select("_id name");
    if (productDocs.length !== productsArray.length) {
      const missing = productsArray.filter(
        (id) => !productDocs.some((p) => p._id.toString() === id)
      );
      return errorResponse(
        res,
        `Invalid product IDs: ${missing.join(", ")}`,
        400
      );
    }
    validProducts = productDocs.map((p) => p._id);
  }

  // ✅ Validate Categories
  let validCategories = [];
  if (categoriesArray.length > 0) {
    // Validate all category IDs are valid ObjectIds
    const invalidCategoryIds = categoriesArray.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidCategoryIds.length > 0) {
      return errorResponse(
        res,
        `Invalid category ID format: ${invalidCategoryIds.join(", ")}`,
        400
      );
    }

    const categoryDocs = await Category.find({
      _id: { $in: categoriesArray.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select("_id name");
    if (categoryDocs.length !== categoriesArray.length) {
      const missing = categoriesArray.filter(
        (id) => !categoryDocs.some((c) => c._id.toString() === id)
      );
      return errorResponse(
        res,
        `Invalid category IDs: ${missing.join(", ")}`,
        400
      );
    }
    validCategories = categoryDocs.map((c) => c._id);
  }

  // ✅ Validate SubCategories
  let validSubCategories = [];
  if (subCategoriesArray.length > 0) {
    // Validate all subCategory IDs are valid ObjectIds
    const invalidSubCategoryIds = subCategoriesArray.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidSubCategoryIds.length > 0) {
      return errorResponse(
        res,
        `Invalid subCategory ID format: ${invalidSubCategoryIds.join(", ")}`,
        400
      );
    }

    const subDocs = await Category.find({
      _id: { $in: subCategoriesArray.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select("_id name");
    if (subDocs.length !== subCategoriesArray.length) {
      const missing = subCategoriesArray.filter(
        (id) => !subDocs.some((c) => c._id.toString() === id)
      );
      return errorResponse(
        res,
        `Invalid subCategory IDs: ${missing.join(", ")}`,
        400
      );
    }
    validSubCategories = subDocs.map((c) => c._id);
  }

  // ✅ Handle Images
  let image = { desktop: null, mobile: null };
  if (req.files?.desktop?.[0]) {
    const desktopFile = req.files.desktop[0];
    // Cloudinary returns URL in path, secure_url, or url property
    const desktopUrl = desktopFile.path || desktopFile.secure_url || desktopFile.url;
    // Cloudinary returns public_id in filename or public_id property
    const desktopPublicId = desktopFile.filename || desktopFile.public_id;
    
    if (desktopUrl) {
      image.desktop = {
        url: desktopUrl,
        public_id: desktopPublicId || null,
      };
    }
  }
  if (req.files?.mobile?.[0]) {
    const mobileFile = req.files.mobile[0];
    // Cloudinary returns URL in path, secure_url, or url property
    const mobileUrl = mobileFile.path || mobileFile.secure_url || mobileFile.url;
    // Cloudinary returns public_id in filename or public_id property
    const mobilePublicId = mobileFile.filename || mobileFile.public_id;
    
    if (mobileUrl) {
      image.mobile = {
        url: mobileUrl,
        public_id: mobilePublicId || null,
      };
    }
  }

  // Debug: Log data before creation
  console.log("Deal data to create:", {
    title,
    discountType,
    discountValue,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    productsCount: validProducts.length,
    categoriesCount: validCategories.length,
    subCategoriesCount: validSubCategories.length,
    hasImage: !!image.desktop || !!image.mobile,
    createdBy: req.user?._id,
  });

  const deal = await Deal.create({
      title,
      description,
      discountType,
      discountValue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      products: validProducts,
      categories: validCategories,
      subCategories: validSubCategories,
      isGlobal,
      isActive,
      priority,
      image,
      btnText,
      createdBy: req.user?._id,
    });

  console.log("✅ Deal created successfully:", deal._id);
  return successResponse(res, { deal }, "Deal created successfully", 201);
});

// ---------------- GET ALL DEALS ----------------
exports.getAllDeals = catchAsync(async (req, res) => {
  const totalDeals = await Deal.countDocuments();
  const features = new APIFeatures(Deal.find(), req.query);
  await features.buildFilters();
  features.sort().limitFields().paginate(totalDeals);

  const deals = await features.query
    .populate("categories", "name slug")
    .populate("subCategories", "name slug")
    .populate({
      path: "products",
      select: "name slug price sale_price image category subCategory",
      populate: [
        { path: "image", select: "original thumbnail" },
        { path: "category", select: "name slug" },
        { path: "subCategory", select: "name slug" },
      ],
    })
    .lean();

  const formattedDeals = [];
  for (const deal of deals) {
    const catProducts = await Product.find({
      $or: [
        { category: { $in: deal.categories.map((c) => c._id) } },
        { subCategory: { $in: deal.subCategories.map((s) => s._id) } },
        { _id: { $in: deal.products.map((p) => p._id) } },
      ],
    })
      .populate("image", "original thumbnail")
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .lean();

    const discountedProducts = catProducts.map((p) => {
      let discountedPrice = p.sale_price || p.price;
      if (deal.discountType === "percentage") {
        discountedPrice = p.price - (p.price * deal.discountValue) / 100;
      } else if (["fixed", "flat"].includes(deal.discountType)) {
        discountedPrice = Math.max(0, p.price - deal.discountValue);
      }
      return { ...p, discountedPrice };
    });

    formattedDeals.push({ ...deal, products: discountedProducts });
  }

  return successResponse(
    res,
    { deals: formattedDeals, pagination: features.pagination },
    "Deals fetched successfully"
  );
});

// ---------------- GET SINGLE DEAL ----------------
exports.getDeal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const deal = await Deal.findById(id)
    .populate("categories", "name slug")
    .populate("subCategories", "name slug")
    .populate("products", "name slug price sale_price category subCategory");

  if (!deal) return errorResponse(res, "Deal not found", 404);
  return successResponse(res, { deal }, "Deal fetched successfully");
});

// ---------------- UPDATE DEAL ----------------
exports.updateDeal = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return errorResponse(res, "Invalid deal ID", 400);
  }

  // Find the deal
  const deal = await Deal.findById(id);
  if (!deal) {
    return errorResponse(res, "Deal not found", 404);
  }

  let dealData = req.body;

  // Handle JSON string in deal field (for multipart/form-data)
  if (typeof req.body.deal === "string") {
    try {
      dealData = JSON.parse(req.body.deal);
    } catch {
      return errorResponse(res, "Invalid JSON in deal field", 400);
    }
  }

  const {
    title,
    description,
    discountType,
    discountValue,
    startDate,
    endDate,
    products,
    categories,
    subCategories,
    isGlobal,
    isActive,
    priority,
    btnText,
  } = dealData;

  // Validate required fields if provided
  if (title !== undefined && !title) {
    return errorResponse(res, "Title cannot be empty", 400);
  }
  if (discountType !== undefined && !["percentage", "fixed", "flat"].includes(discountType)) {
    return errorResponse(res, "Invalid discountType. Must be 'percentage', 'fixed', or 'flat'", 400);
  }
  if (discountValue !== undefined && (isNaN(discountValue) || discountValue < 0)) {
    return errorResponse(res, "discountValue must be a positive number", 400);
  }
  if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
    return errorResponse(res, "startDate must be before endDate", 400);
  }

  // ✅ Validate Products if provided
  let validProducts = deal.products; // Keep existing if not provided
  if (products !== undefined) {
    if (Array.isArray(products) && products.length > 0) {
      const productDocs = await Product.find({
        _id: { $in: products.map((id) => new mongoose.Types.ObjectId(id)) },
      }).select("_id name");
      if (productDocs.length !== products.length) {
        const missing = products.filter(
          (id) => !productDocs.some((p) => p._id.toString() === id)
        );
        return errorResponse(
          res,
          `Invalid product IDs: ${missing.join(", ")}`,
          400
        );
      }
      validProducts = productDocs.map((p) => p._id);
    } else {
      validProducts = [];
    }
  }

  // ✅ Validate Categories if provided
  let validCategories = deal.categories;
  if (categories !== undefined) {
    if (Array.isArray(categories) && categories.length > 0) {
      const categoryDocs = await Category.find({
        _id: { $in: categories.map((id) => new mongoose.Types.ObjectId(id)) },
      }).select("_id name");
      if (categoryDocs.length !== categories.length) {
        const missing = categories.filter(
          (id) => !categoryDocs.some((c) => c._id.toString() === id)
        );
        return errorResponse(
          res,
          `Invalid category IDs: ${missing.join(", ")}`,
          400
        );
      }
      validCategories = categoryDocs.map((c) => c._id);
    } else {
      validCategories = [];
    }
  }

  // ✅ Validate SubCategories if provided
  let validSubCategories = deal.subCategories;
  if (subCategories !== undefined) {
    if (Array.isArray(subCategories) && subCategories.length > 0) {
      const subDocs = await Category.find({
        _id: { $in: subCategories.map((id) => new mongoose.Types.ObjectId(id)) },
      }).select("_id name");
      if (subDocs.length !== subCategories.length) {
        const missing = subCategories.filter(
          (id) => !subDocs.some((c) => c._id.toString() === id)
        );
        return errorResponse(
          res,
          `Invalid subCategory IDs: ${missing.join(", ")}`,
          400
        );
      }
      validSubCategories = subDocs.map((c) => c._id);
    } else {
      validSubCategories = [];
    }
  }

  // ✅ Handle Images - Update only if new files are uploaded
  const imageUpdate = { ...deal.image };
  
  // Delete old desktop image if new one is uploaded
  if (req.files?.desktop?.[0]) {
    if (imageUpdate.desktop?.url) {
      try {
        await deleteFromCloudinary(imageUpdate.desktop.url);
      } catch (err) {
        console.error("Error deleting old desktop image:", err);
        // Continue even if deletion fails
      }
    }
    imageUpdate.desktop = {
      url: req.files.desktop[0].path,
      public_id: req.files.desktop[0].filename,
    };
  }

  // Delete old mobile image if new one is uploaded
  if (req.files?.mobile?.[0]) {
    if (imageUpdate.mobile?.url) {
      try {
        await deleteFromCloudinary(imageUpdate.mobile.url);
      } catch (err) {
        console.error("Error deleting old mobile image:", err);
        // Continue even if deletion fails
      }
    }
    imageUpdate.mobile = {
      url: req.files.mobile[0].path,
      public_id: req.files.mobile[0].filename,
    };
  }

  // Build update object (only include fields that are provided)
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (discountType !== undefined) updateData.discountType = discountType;
  if (discountValue !== undefined) updateData.discountValue = discountValue;
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (endDate !== undefined) updateData.endDate = new Date(endDate);
  if (products !== undefined) updateData.products = validProducts;
  if (categories !== undefined) updateData.categories = validCategories;
  if (subCategories !== undefined) updateData.subCategories = validSubCategories;
  if (isGlobal !== undefined) updateData.isGlobal = isGlobal;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (priority !== undefined) updateData.priority = priority;
  if (btnText !== undefined) updateData.btnText = btnText;
  if (req.files?.desktop?.[0] || req.files?.mobile?.[0]) {
    updateData.image = imageUpdate;
  }

  // Update the deal
  const updatedDeal = await Deal.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("categories", "name slug")
    .populate("subCategories", "name slug")
    .populate("products", "name slug price sale_price category subCategory");

  return successResponse(res, { deal: updatedDeal }, "Deal updated successfully");
});

// ---------------- DELETE DEAL ----------------
exports.deleteDeal = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return errorResponse(res, "Invalid deal ID", 400);
  }

  // Find the deal
  const deal = await Deal.findById(id);
  if (!deal) {
    return errorResponse(res, "Deal not found", 404);
  }

  // Delete images from Cloudinary
  const deletePromises = [];
  
  if (deal.image?.desktop?.url) {
    deletePromises.push(
      deleteFromCloudinary(deal.image.desktop.url).catch((err) => {
        console.error("Error deleting desktop image:", err);
      })
    );
  }
  
  if (deal.image?.mobile?.url) {
    deletePromises.push(
      deleteFromCloudinary(deal.image.mobile.url).catch((err) => {
        console.error("Error deleting mobile image:", err);
      })
    );
  }

  // Wait for image deletions (don't fail if deletion fails)
  await Promise.allSettled(deletePromises);

  // Delete the deal
  await Deal.findByIdAndDelete(id);

  return successResponse(res, null, "Deal deleted successfully");
});
