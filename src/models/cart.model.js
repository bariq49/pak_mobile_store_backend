const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    // Variant support: store the variant identifier (from product.variants array)
    // Can be the variant _id (ObjectId) or a string identifier
    // Stored as String to handle various formats from frontend
    variantId: { 
      type: String, 
      default: null,
      index: true,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [cartItemSchema],

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

cartSchema.index({ user: 1 });

module.exports = mongoose.model("Cart", cartSchema);
