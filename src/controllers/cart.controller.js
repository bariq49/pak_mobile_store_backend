const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const Coupon = require("../models/coupon.model");
const catchAsync = require("../utils/catchAsync");
const successResponse = require("../utils/successResponse");
const errorResponse = require("../utils/errorResponse");
const calculateCartTotals = require("../utils/calculateCartTotals");

const updateCartTotals = async (cart, userId) => {
  await calculateCartTotals(cart, userId);
  await cart.save();
  return cart;
};

/**
 * Extract product image URL with smart fallback logic
 * Priority: mainImage (direct URL) → image.original → image.thumbnail → null
 * @param {Object} product - Product document with populated image
 * @returns {string|null} - Image URL or null
 */
const getProductImageUrl = (product) => {
  if (!product) return null;

  // Priority 1: mainImage (direct URL string) - preferred for new products
  if (product.mainImage && typeof product.mainImage === "string" && product.mainImage.trim()) {
    return product.mainImage.trim();
  }

  // Priority 2: image.original (from populated Image model)
  if (product.image && typeof product.image === "object" && product.image.original) {
    return product.image.original;
  }

  // Priority 3: image.thumbnail (from populated Image model)
  if (product.image && typeof product.image === "object" && product.image.thumbnail) {
    return product.image.thumbnail;
  }

  // No image available
  return null;
};

/**
 * Find variant by ID, handling different ID formats
 * Handles formats like: ObjectId, "ObjectId.1", array index, etc.
 * @param {Array} variants - Array of variant objects
 * @param {string} variantId - Variant identifier from frontend
 * @returns {Object|null} - Found variant or null
 */
const findVariantById = (variants, variantId) => {
  if (!variants || !Array.isArray(variants) || !variantId) return null;
  
  const variantIdStr = String(variantId).trim();
  
  // Try 1: Direct ObjectId match
  let variant = variants.find(
    (v) => v._id && v._id.toString() === variantIdStr
  );
  if (variant) return variant;
  
  // Try 2: Extract ObjectId part (before first dot) - handles "ObjectId.1" format
  if (variantIdStr.includes('.')) {
    const objectIdPart = variantIdStr.split('.')[0];
    variant = variants.find(
      (v) => v._id && v._id.toString() === objectIdPart
    );
    if (variant) return variant;
  }
  
  // Try 3: Match by string comparison (for any other format)
  variant = variants.find(
    (v) => v._id && String(v._id) === variantIdStr
  );
  if (variant) return variant;
  
  // Try 4: Array index (if variantId is a number)
  const index = parseInt(variantIdStr, 10);
  if (!isNaN(index) && index >= 0 && index < variants.length) {
    return variants[index];
  }
  
  return null;
};

// Get Cart
exports.getCart = catchAsync(async (req, res) => {
  // Allow userId as query parameter (optional - for flexibility)
  // If not provided, use authenticated user's ID
  const userId = req.query.userId || req.user._id;
  
  // If userId is provided and it's different from authenticated user, 
  // you might want to add authorization check here
  // For now, allowing it for flexibility
  
  let cart = await Cart.findOne({ user: userId })
    .populate({
      path: "items.product",
      select: "name slug price sale_price image mainImage in_stock quantity shippingFee tax variants",
      populate: {
        path: "image",
        select: "original thumbnail",
      },
    })
    .populate("coupon", "code discountType discountValue expiryDate")
    .populate("user", "name email");

  if (!cart)
    return successResponse(
      res,
      { items: [], total: 0, discount: 0, shippingFee: 0, finalTotal: 0 },
      "Cart is empty"
    );

  cart = await updateCartTotals(cart, userId);

  // Map cart items with properly resolved image URLs and variant information
  const items = cart.items.map((i) => {
    const product = i.product;
    
    // Find variant if variantId is present
    let selectedVariant = null;
    let itemPrice = product.sale_price ?? product.price;
    let itemImage = getProductImageUrl(product);
    
    if (i.variantId && product.variants && Array.isArray(product.variants)) {
      selectedVariant = findVariantById(product.variants, i.variantId);
      
      if (selectedVariant) {
        // Use variant price if available
        if (selectedVariant.price !== undefined && selectedVariant.price !== null) {
          itemPrice = selectedVariant.price;
        }
        
        // Use variant image if available, otherwise fall back to product image
        if (selectedVariant.image && selectedVariant.image.trim()) {
          itemImage = selectedVariant.image.trim();
        }
      }
    }
    
    return {
      id: product._id,
      name: product.name,
      price: itemPrice,
      quantity: i.quantity,
      shippingFee: product.shippingFee ?? null,
      tax: product.tax !== undefined ? product.tax : null,
      image: itemImage,
      slug: product.slug,
      variantId: i.variantId || null,
      variant: selectedVariant ? {
        _id: selectedVariant._id,
        storage: selectedVariant.storage || null,
        ram: selectedVariant.ram || null,
        color: selectedVariant.color || null,
        bundle: selectedVariant.bundle || null,
        warranty: selectedVariant.warranty || null,
        price: selectedVariant.price || null,
        stock: selectedVariant.stock || null,
        sku: selectedVariant.sku || null,
        image: selectedVariant.image || null,
      } : null,
    };
  });

  return successResponse(
    res,
    {
      items,
      total: cart.total,
      discount: cart.discount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      codFee: cart.codFee,
      coupon: cart.coupon,
      shippingMethod: cart.shippingMethod,
      user: cart.user || null,
    },
    "Cart fetched successfully"
  );
});

// Add to cart
exports.addToCart = catchAsync(async (req, res) => {
  const { productId, variantId, quantity = 1 } = req.body;
  if (!productId) return errorResponse(res, "Product ID is required", 400);

  const product = await Product.findById(productId);
  if (!product) return errorResponse(res, "Product not found", 404);
  
  let selectedVariant = null;
  
  // If variantId is provided, validate and find the variant
  if (variantId) {
    if (!product.variants || !Array.isArray(product.variants)) {
      return errorResponse(res, "This product does not have variants", 400);
    }
    
    // Find the variant using flexible matching
    selectedVariant = findVariantById(product.variants, variantId);
    
    if (!selectedVariant) {
      return errorResponse(res, "Variant not found for this product", 404);
    }
    
    // Check variant stock
    if (selectedVariant.stock === undefined || selectedVariant.stock === null) {
      return errorResponse(res, "Variant stock information not available", 400);
    }
    
    if (selectedVariant.stock < quantity) {
      return errorResponse(res, "Insufficient variant stock", 400);
    }
  } else {
    // For simple products (no variant), check product stock
    if (!product.in_stock) {
      return errorResponse(res, "Product out of stock", 400);
    }
    
    // For variable products without variant selection, check if any variant has stock
    if (product.product_type === "variable") {
      if (!product.variants || product.variants.length === 0) {
        return errorResponse(res, "Please select a variant for this product", 400);
      }
      // If it's a variable product but no variant selected, don't allow adding
      return errorResponse(res, "Variant selection is required for this product", 400);
    }
    
    // For simple products, check quantity
    if (product.quantity < quantity) {
      return errorResponse(res, "Insufficient stock", 400);
    }
  }

  let cart = await Cart.findOne({ user: req.user._id });
  
  // Normalize variantId: extract ObjectId part if format is "ObjectId.something"
  let normalizedVariantId = null;
  if (variantId && selectedVariant && selectedVariant._id) {
    // Store the actual variant ObjectId for consistency
    normalizedVariantId = selectedVariant._id.toString();
  } else if (variantId) {
    // If variantId is a string with dot, extract the ObjectId part
    const variantIdStr = String(variantId).trim();
    if (variantIdStr.includes('.')) {
      normalizedVariantId = variantIdStr.split('.')[0];
    } else {
      normalizedVariantId = variantIdStr;
    }
  }
  
  // Create cart item with variant support
  const cartItem = {
    product: productId,
    quantity,
    ...(normalizedVariantId && { variantId: normalizedVariantId }),
  };
  
  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [cartItem],
    });
  } else {
    // Find existing item: match by product AND variantId (if provided)
    // Same product with different variants should be separate items
    const existingItem = cart.items.find((i) => {
      const productMatch = i.product.toString() === productId.toString();
      const variantMatch = variantId 
        ? (i.variantId && i.variantId.toString() === variantId.toString())
        : (!i.variantId || i.variantId === null);
      return productMatch && variantMatch;
    });
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push(cartItem);
    }
    await cart.save();
  }

  await updateCartTotals(cart, req.user._id);
  return successResponse(res, {}, "Product added to cart");
});

//  Update item quantity
exports.updateCartItem = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { quantity, variantId } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return errorResponse(res, "Cart not found", 404);

  // Find item by productId and variantId (if provided)
  const item = cart.items.find((i) => {
    const productMatch = i.product.toString() === productId.toString();
    const variantMatch = variantId 
      ? (i.variantId && i.variantId.toString() === variantId.toString())
      : (!i.variantId || i.variantId === null);
    return productMatch && variantMatch;
  });
  
  if (!item) return errorResponse(res, "Product not in cart", 404);

  if (quantity <= 0) {
    // Remove item: filter by both productId and variantId
    cart.items = cart.items.filter((i) => {
      const productMatch = i.product.toString() === productId.toString();
      const variantMatch = variantId 
        ? (i.variantId && i.variantId.toString() === variantId.toString())
        : (!i.variantId || i.variantId === null);
      return !(productMatch && variantMatch);
    });
  } else {
    const product = await Product.findById(productId);
    if (!product) return errorResponse(res, "Product not found", 404);
    
    // Check stock based on whether variant is used
    if (variantId && item.variantId) {
      // Check variant stock
      if (!product.variants || !Array.isArray(product.variants)) {
        return errorResponse(res, "Product variants not found", 400);
      }
      
      const variant = findVariantById(product.variants, variantId);
      
      if (!variant) {
        return errorResponse(res, "Variant not found", 404);
      }
      
      if (variant.stock === undefined || variant.stock === null || variant.stock < quantity) {
        return errorResponse(res, "Insufficient variant stock", 400);
      }
    } else {
      // Check product stock for simple products
      if (!product.in_stock || product.quantity < quantity) {
        return errorResponse(res, "Insufficient stock", 400);
      }
    }
    
    item.quantity = quantity;
  }

  await updateCartTotals(cart, req.user._id);
  return successResponse(res, { cart }, "Cart updated successfully");
});

//  Remove item
exports.removeFromCart = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { variantId } = req.query; // Accept variantId as query parameter
  
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return errorResponse(res, "Cart not found", 404);

  // Remove item by productId and variantId (if provided)
  cart.items = cart.items.filter((i) => {
    const productMatch = i.product.toString() === productId.toString();
    const variantMatch = variantId 
      ? (i.variantId && i.variantId.toString() === variantId.toString())
      : (!i.variantId || i.variantId === null);
    return !(productMatch && variantMatch);
  });
  
  await updateCartTotals(cart, req.user._id);

  return successResponse(res, { cart }, "Item removed from cart");
});

//  Clear cart
exports.clearCart = catchAsync(async (req, res) => {
  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items: [], coupon: null, discount: 0 }
  );
  return successResponse(res, {}, "Cart cleared successfully");
});

// Apply Coupon (Improved Version)
exports.applyCoupon = catchAsync(async (req, res) => {
  const { code } = req.body;
  if (!code) return errorResponse(res, "Coupon code is required", 400);

  // 1️⃣ Find coupon
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
  });

  if (!coupon) return errorResponse(res, "Invalid coupon", 400);
  if (coupon.isExpired) return errorResponse(res, "Coupon expired", 400);
  if (coupon.startDate && coupon.startDate > new Date())
    return errorResponse(res, "Coupon not yet active", 400);

  // 2️⃣ Find user's cart
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product"
  );
  if (!cart) return errorResponse(res, "Cart not found", 404);

  // 3️⃣ Calculate current subtotal
  let subtotal = 0;
  for (const item of cart.items) {
    const product = item.product;
    const price = product.sale_price ?? product.price ?? 0;
    subtotal += price * item.quantity;
  }

  // 4️⃣ Check eligibility
  if (subtotal < (coupon.minCartValue || 0))
    return errorResponse(
      res,
      `Cart total must be at least ${coupon.minCartValue}`,
      400
    );

  // 5️⃣ Check usage limits
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    return errorResponse(res, "Coupon usage limit reached", 400);

  const userUsage = coupon.userUsage?.get(req.user._id.toString()) || 0;
  if (coupon.perUserLimit && userUsage >= coupon.perUserLimit)
    return errorResponse(res, "You have already used this coupon", 400);

  // 6️⃣ Apply coupon to cart
  cart.coupon = coupon._id;
  await updateCartTotals(cart, req.user._id);

  // 7️⃣ Update usage counts
  coupon.usedCount += 1;
  coupon.userUsage.set(req.user._id.toString(), userUsage + 1);
  await coupon.save();

  return successResponse(res, { cart }, "Coupon applied successfully");
});

// Remove Coupon (Improved Version)
exports.removeCoupon = catchAsync(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return errorResponse(res, "Cart not found", 404);

  if (!cart.coupon)
    return errorResponse(res, "No coupon applied to this cart", 400);

  // 1️⃣ Fetch the coupon document
  const coupon = await Coupon.findById(cart.coupon);
  if (coupon) {
    // 2️⃣ Decrease global usage count safely
    if (coupon.usedCount > 0) coupon.usedCount -= 1;

    // 3️⃣ Decrease user's personal usage count
    const userId = req.user._id.toString();
    const userUsageCount = coupon.userUsage.get(userId) || 0;
    if (userUsageCount > 0) {
      coupon.userUsage.set(userId, userUsageCount - 1);
    }

    // 4️⃣ Save coupon updates
    await coupon.save();
  }

  // 5️⃣ Clear coupon from cart
  cart.coupon = null;
  cart.discount = 0;

  // 6️⃣ Recalculate totals
  await updateCartTotals(cart, req.user._id);

  return successResponse(res, { cart }, "Coupon removed successfully");
});

//  Set shipping method
exports.setShippingMethod = catchAsync(async (req, res) => {
  const { method } = req.body;
  if (!["standard", "express"].includes(method))
    return errorResponse(res, "Invalid shipping method", 400);

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return errorResponse(res, "Cart not found", 404);

  cart.shippingMethod = method;
  await updateCartTotals(cart, req.user._id);

  return successResponse(res, { cart }, `Shipping method updated to ${method}`);
});

// Set payment method (Card / COD)
exports.setPaymentMethod = catchAsync(async (req, res) => {
  const { method } = req.body;
  if (!["stripe", "cod"].includes(method))
    return errorResponse(res, "Invalid payment method", 400);

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return errorResponse(res, "Cart not found", 404);

  cart.paymentMethod = method;
  await calculateCartTotals(cart, req.user._id);
  await cart.save();

  return successResponse(
    res,
    {
      total: cart.total,
      discount: cart.discount,
      shippingFee: cart.shippingFee,
      codFee: cart.codFee,
      finalTotal: cart.finalTotal,
      paymentMethod: cart.paymentMethod,
    },
    `Payment method set to ${method}`
  );
});

// Admin: Get any user's cart
exports.getUserCart = catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) return errorResponse(res, "User ID is required", 400);

  let cart = await Cart.findOne({ user: userId })
    .populate({
      path: "items.product",
      select: "name slug price sale_price image mainImage in_stock quantity shippingFee tax variants",
      populate: {
        path: "image",
        select: "original thumbnail",
      },
    })
    .populate("coupon", "code discountType discountValue expiryDate")
    .populate("user", "name email");

  if (!cart)
    return successResponse(
      res,
      { 
        items: [], 
        total: 0, 
        discount: 0, 
        shippingFee: 0, 
        finalTotal: 0,
        user: null
      },
      "Cart is empty"
    );

  cart = await updateCartTotals(cart, userId);

  // Map cart items with properly resolved image URLs and variant information
  const items = cart.items.map((i) => {
    const product = i.product;
    
    // Find variant if variantId is present
    let selectedVariant = null;
    let itemPrice = product.sale_price ?? product.price;
    let itemImage = getProductImageUrl(product);
    
    if (i.variantId && product.variants && Array.isArray(product.variants)) {
      selectedVariant = findVariantById(product.variants, i.variantId);
      
      if (selectedVariant) {
        // Use variant price if available
        if (selectedVariant.price !== undefined && selectedVariant.price !== null) {
          itemPrice = selectedVariant.price;
        }
        
        // Use variant image if available, otherwise fall back to product image
        if (selectedVariant.image && selectedVariant.image.trim()) {
          itemImage = selectedVariant.image.trim();
        }
      }
    }
    
    return {
      id: product._id,
      name: product.name,
      price: itemPrice,
      quantity: i.quantity,
      shippingFee: product.shippingFee ?? null,
      tax: product.tax !== undefined ? product.tax : null,
      image: itemImage,
      slug: product.slug,
      variantId: i.variantId || null,
      variant: selectedVariant ? {
        _id: selectedVariant._id,
        storage: selectedVariant.storage || null,
        ram: selectedVariant.ram || null,
        color: selectedVariant.color || null,
        bundle: selectedVariant.bundle || null,
        warranty: selectedVariant.warranty || null,
        price: selectedVariant.price || null,
        stock: selectedVariant.stock || null,
        sku: selectedVariant.sku || null,
        image: selectedVariant.image || null,
      } : null,
    };
  });

  return successResponse(
    res,
    {
      items,
      total: cart.total,
      discount: cart.discount,
      shippingFee: cart.shippingFee,
      finalTotal: cart.finalTotal,
      codFee: cart.codFee,
      coupon: cart.coupon,
      shippingMethod: cart.shippingMethod,
      user: cart.user,
    },
    "User cart fetched successfully"
  );
});

