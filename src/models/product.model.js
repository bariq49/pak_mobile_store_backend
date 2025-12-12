const mongoose = require("mongoose");
const { createSlug, generateUniqueSlug } = require("../utils/slug");

// Variant Schema for mobile products
const variantSchema = new mongoose.Schema(
  {
    storage: { type: String, trim: true }, // e.g., "64GB", "128GB", "256GB"
    ram: { type: String, trim: true }, // e.g., "4GB", "8GB"
    color: { type: String, trim: true },
    bundle: { type: String, trim: true }, // e.g., "With Charger", "Box Pack"
    warranty: { type: String, trim: true }, // e.g., "1 Year", "6 Months"
    price: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    sku: { type: String, trim: true },
    image: { type: String, trim: true }, // URL or cloudinary path
  },
  { _id: true }
);



const productSchema = new mongoose.Schema(
  {
    // ============ MANDATORY FIELDS ============
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    productName: { type: String, required: [true, "Product name is required"], trim: true },
    // Keep 'name' as alias for backward compatibility
    name: { type: String, trim: true },
    slug: { type: String, unique: true, index: true },
    brand: { type: String, required: [true, "Brand is required"], trim: true },
    model: { type: String, required: [true, "Model is required"], trim: true },
    price: { type: Number, required: [true, "Price is required"], min: 0 },
    // Main image (required - at least one)
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Image" },
    mainImage: { type: String, trim: true }, // Direct URL support

    // ============ OPTIONAL FIELDS ============
    description: { type: String, trim: true, maxlength: 5000, default: null },
    product_details: { type: String, trim: true, maxlength: 10000, default: null },
    
    // Pricing fields
    salePrice: { type: Number, min: 0, default: null },
    sale_price: { type: Number, min: 0, default: null }, // Legacy support
    tax: { type: Number, min: 0, default: null },
    
    // Product identifiers
    sku: { type: String, trim: true, uppercase: true, sparse: true, index: true },
    condition: {
      type: String,
      enum: ["new", "used", "refurbished", "open-box"],
      default: "new",
    },
    
    // Media
    gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "Image" }],
    galleryImages: [{ type: String, trim: true }], // Direct URL support
    videoUrl: { type: String, trim: true, default: null },
    
    // Mobile-specific fields
    whatsInTheBox: { type: String, trim: true, maxlength: 2000, default: null },
    variants: [variantSchema],

    // Tags
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
    
    // Product type & inventory
    product_type: {
      type: String,
      enum: ["simple", "variable"],
      default: "simple",
      required: true,
      index: true,
    },
    quantity: { type: Number, min: 0, default: 0 },
    
    // Sale management
    on_sale: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0, min: 0, index: true },
    sale_start: Date,
    sale_end: Date,
    min_price: Number,
    max_price: Number,
    
    // Legacy variations support
    variations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Variation" }],
    variation_options: [
      { type: mongoose.Schema.Types.ObjectId, ref: "VariationOption" },
    ],
    
    // Shipping
    shippingFee: { type: Number, min: 0, default: 0 },
    productWeight: { type: Number, min: 0, default: 0.5 }, // weight in KG
    shippingClass: {
      type: String,
      enum: ["standard", "fragile", "oversized"],
      default: "standard",
    },

    // Status
    in_stock: { type: Boolean, default: true, index: true },
    is_active: { type: Boolean, default: true, index: true },
    // Dynamic additional information as key-value pairs (all values must be strings)
    additional_info: { type: Map, of: String, default: new Map() },
    deletedAt: { type: Date, default: null, index: true },
    
    // Ratings
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, "Rating must be at least 0"],
      max: [5, "Rating cannot be more than 5"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: { type: Number, default: 0 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes
productSchema.index({
  name: "text",
  description: "text",
  brand: "text",
  model: "text",
});
productSchema.index({ ratingsAverage: -1 });
productSchema.index({ ratingsQuantity: -1 });
productSchema.virtual("reviewsCount").get(function () {
  return Array.isArray(this.reviews) ? this.reviews.length : 0;
});
productSchema.virtual("ratingSummary").get(function () {
  return {
    average: this.ratingsAverage || 0,
    total: this.ratingsQuantity || 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };
});

// Hooks
productSchema.pre("save", async function (next) {
  // Sync productName and name for backward compatibility
  if (this.productName && !this.name) {
    this.name = this.productName;
  } else if (this.name && !this.productName) {
    this.productName = this.name;
  }
  
  // Generate slug from productName or name
  const slugSource = this.productName || this.name;
  if ((this.isModified("productName") || this.isModified("name") || !this.slug) && slugSource) {
    const baseSlug = createSlug(slugSource);
    this.slug = await generateUniqueSlug(this.constructor, baseSlug, this._id);
  }
  
  // Sync salePrice and sale_price for backward compatibility
  if (this.salePrice !== undefined && this.salePrice !== null) {
    this.sale_price = this.salePrice;
  } else if (this.sale_price !== undefined && this.sale_price !== null) {
    this.salePrice = this.sale_price;
  }
  
  // Update stock status
  if (this.product_type === "simple") {
    this.in_stock = this.quantity > 0;
  } else if (this.variants && this.variants.length > 0) {
    // For variable products with variants, check total stock
    const totalStock = this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    this.in_stock = totalStock > 0;
  }
  
  next();
});

module.exports = mongoose.model("Product", productSchema);
