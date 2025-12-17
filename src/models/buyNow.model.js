const mongoose = require("mongoose");

const buyNowItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    // Variant support: store the variant identifier (from product.variants array)
    variantId: { 
      type: String, 
      default: null,
      index: true,
    },
  },
  { _id: false }
);

const buyNowSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One buy-now item per user
      index: true,
    },
    item: buyNowItemSchema, // Single item only

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    shippingMethod: {
      type: String,
      enum: ["standard", "express"],
      default: "standard",
    },
    codFee: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["stripe", "cod"],
      default: "stripe",
    },

    total: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

buyNowSchema.index({ user: 1 });

module.exports = mongoose.model("BuyNow", buyNowSchema);


