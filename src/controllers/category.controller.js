const Category = require("../models/category.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const { cloudinary } = require("../../config/cloudinary");
const successResponse = require("../utils/successResponse");
const mongoose = require("mongoose");





const populateChildrenRecursively = async (category) => {
  await category
    .populate([
      {
        path: "children",
        populate: [
          { path: "createdBy", select: "name email" },
          { path: "ancestors", select: "name slug" },
        ],
      },
      { path: "ancestors", select: "name slug" },
    ])
    .execPopulate();

  if (category.children && category.children.length > 0) {
    for (let child of category.children) {
      await populateChildrenRecursively(child);
    }
  }

  return category;
};


// GET ALL CATEGORIES (FULL TREE + PAGINATION + FILTERING)
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const filter = { parent: null }
  if (req.query.type) filter.type = req.query.type;
  if (req.query.active) filter.active = req.query.active === "true";
  const total = await Category.countDocuments(filter);
  const features = new APIFeatures(
    Category.find(filter).populate("createdBy", "name email"),
    req.query
  )
    .sort()
    .limitFields()
    .paginate(total);

  let categories = await features.query;
  for (let i = 0; i < categories.length; i++) {
    categories[i] = await populateChildrenRecursively(categories[i]);
  }

  return successResponse(
    res,
    {
      categories,
      pagination: features.pagination,
    },
    "Categories fetched successfully with nested children and pagination"
  );
});


// GET SINGLE CATEGORY
exports.getCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Validate if id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid category ID format", 400));
  }

  let category = await Category.findById(id).populate("createdBy", "name email");

  if (!category) return next(new AppError("No category found with that ID", 404));

  category = await populateChildrenRecursively(category);

  return successResponse(res, { category }, "Category fetched successfully with nested children");
});


// CREATE CATEGORY (ancestors auto-handled by schema)
exports.createCategory = catchAsync(async (req, res, next) => {
  // Extract and validate required fields
  const { name, description, type, active, metaTitle, metaDescription, parent } = req.body;

  // Validate required field: name
  if (!name || (typeof name === "string" && name.trim() === "")) {
    return next(new AppError("Category name is required", 400));
  }

  // Prepare category data
  const categoryData = {
    name: name.trim(),
    createdBy: req.user.id,
  };

  // Add optional fields if provided
  if (description !== undefined) categoryData.description = description;
  if (type !== undefined) categoryData.type = type;
  if (active !== undefined) categoryData.active = active;
  if (metaTitle !== undefined) categoryData.metaTitle = metaTitle;
  if (metaDescription !== undefined) categoryData.metaDescription = metaDescription;
  if (parent !== undefined) categoryData.parent = parent;

  // Handle image uploads (if any)
  if (req.files && req.files.length) {
    categoryData.images = req.files.map(file => ({
      url: file.path,
      altText: req.body.altText || "",
      type: file.fieldname,
    }));
  }

  // Create the category
  const newCategory = await Category.create(categoryData);

  return successResponse(res, { category: newCategory }, "Category created successfully", 201);
});


// UPDATE CATEGORY
exports.updateCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Validate if id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid category ID format", 400));
  }

  const category = await Category.findById(id);
  if (!category) return next(new AppError("No category found with that ID", 404));

  if (req.files && req.files.length) {
    if (category.images && category.images.length) {
      for (const img of category.images) {
        if (img.id) await cloudinary.uploader.destroy(img.id);
      }
    }

    req.body.images = req.files.map(file => ({
      url: file.path,
      altText: req.body.altText || "",
      type: file.fieldname,
    }));
  }

  const updatedCategory = await Category.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  return successResponse(res, { category: updatedCategory }, "Category updated successfully");
});


// DELETE CATEGORY
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Validate if id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid category ID format", 400));
  }

  const category = await Category.findById(id);
  if (!category) return next(new AppError("No category found with that ID", 404));

  if (category.images && category.images.length) {
    for (const img of category.images) {
      if (img.id) await cloudinary.uploader.destroy(img.id);
    }
  }

  await Category.findByIdAndDelete(id);
  return successResponse(res, null, "Category deleted successfully", 204);
});


// CREATE SUBCATEGORY
exports.createSubCategory = catchAsync(async (req, res, next) => {
  const { parentId } = req.params;

  // Validate if parentId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(parentId)) {
    return next(new AppError("Invalid parent category ID format", 400));
  }

  // Validate that parent category exists
  const parentCategory = await Category.findById(parentId);
  if (!parentCategory) {
    return next(new AppError("Parent category not found. Cannot create subcategory under a non-existent category.", 404));
  }

  // Extract and validate required fields from req.body
  const { name, description, type, active, metaTitle, metaDescription } = req.body || {};

  // Validate required field: name
  if (!name || (typeof name === "string" && name.trim() === "")) {
    return next(new AppError("Category name is required", 400));
  }

  // Prepare subcategory data
  const subCategoryData = {
    name: String(name).trim(),
    parent: parentId,
    createdBy: req.user.id,
  };

  // Add optional fields if provided
  if (description !== undefined) subCategoryData.description = description;
  if (type !== undefined) subCategoryData.type = type;
  if (active !== undefined) {
    // Handle both boolean and string "true"/"false"
    subCategoryData.active = active === true || active === "true";
  }
  if (metaTitle !== undefined) subCategoryData.metaTitle = metaTitle;
  if (metaDescription !== undefined) subCategoryData.metaDescription = metaDescription;

  // Handle image uploads (if any)
  if (req.files && Object.keys(req.files).length > 0) {
    const imageArray = [];
    Object.keys(req.files).forEach(fieldName => {
      const files = Array.isArray(req.files[fieldName]) ? req.files[fieldName] : [req.files[fieldName]];
      files.forEach(file => {
        imageArray.push({
          url: file.path,
          altText: req.body.altText || "",
          type: fieldName,
        });
      });
    });
    if (imageArray.length > 0) {
      subCategoryData.images = imageArray;
    }
  }

  // Create the subcategory
  const subCategory = await Category.create(subCategoryData);

  return successResponse(res, { subCategory }, "Subcategory created successfully", 201);
});


// UPDATE SUBCATEGORY
exports.updateSubCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Validate if id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid subcategory ID format", 400));
  }

  const subCategory = await Category.findById(id);
  if (!subCategory) return next(new AppError("No subcategory found with that ID", 404));

  if (req.files && Object.keys(req.files).length > 0) {
    if (subCategory.images && subCategory.images.length) {
      for (const img of subCategory.images) {
        if (img.id) await cloudinary.uploader.destroy(img.id);
      }
    }

    req.body.images = req.files.map(file => ({
      url: file.path,
      altText: req.body.altText || "",
      type: file.fieldname,
    }));
  }

  const updatedSubCategory = await Category.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  return successResponse(res, { subCategory: updatedSubCategory }, "Subcategory updated successfully");
});


// DELETE SUBCATEGORY
exports.deleteSubCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Validate if id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid subcategory ID format", 400));
  }

  const subCategory = await Category.findById(id);
  if (!subCategory) return next(new AppError("No subcategory found with that ID", 404));

  if (subCategory.images && subCategory.images.length) {
    for (const img of subCategory.images) {
      if (img.id) await cloudinary.uploader.destroy(img.id);
    }
  }

  await Category.findByIdAndDelete(id);

  return successResponse(res, null, "Subcategory deleted successfully", 204);
});


// GET ALL SUBCATEGORIES (OPTIONAL FILTER BY PARENT)
exports.getAllSubCategories = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.parentId) filter.parent = req.query.parentId;

  const total = await Category.countDocuments(filter);

  const features = new APIFeatures(
    Category.find(filter)
      .populate("createdBy", "name email")
      .populate("parent", "name slug type"),
    req.query
  );

  features.sort().limitFields().paginate(total);

  const subCategories = await features.query;

  return successResponse(
    res,
    { subCategories, pagination: features.pagination },
    "Subcategories fetched successfully"
  );
});


exports.getCategoryPath = catchAsync(async (req, res, next) => {
  const category = await Category.aggregate([
    { $match: { slug: req.params.slug } },
    {
      $lookup: {
        from: "categories",
        localField: "ancestors",
        foreignField: "_id",
        as: "ancestorDetails",
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        "ancestorDetails.name": 1,
        "ancestorDetails.slug": 1,
      },
    },
  ]);

  if (!category || !category[0]) {
    return next(new AppError("Category not found", 404));
  }

  const data = category[0];
  const names = [...data.ancestorDetails.map(a => a.name), data.name];
  const fullPath = names.join(" > ");

  return successResponse(res, { fullPath, pathArray: names }, "Category path generated successfully");
});
