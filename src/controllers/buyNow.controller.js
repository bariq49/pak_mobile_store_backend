const BuyNow = require("../models/buyNow.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const successResponse = require("../utils/successResponse");
const errorResponse = require("../utils/errorResponse");
const { calculateTotalsFromItems } = require("../utils/calculateCartTotals");
const { applyDealsToProducts } = require("../services/dealEvaluationService");

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

/**
 * Extract product image URL with smart fallback logic
 */
const getProductImageUrl = (product) => {
  if (!product) return null;
  if (product.mainImage && typeof product.mainImage === "string" && product.mainImage.trim()) {
    return product.mainImage.trim();
  }
  if (product.image && typeof product.image === "object" && product.image.original) {
    return product.image.original;
  }
  if (product.image && typeof product.image === "object" && product.image.thumbnail) {
    return product.image.thumbnail;
  }
  return null;
};

// Set Buy Now Item (replaces previous if exists)
exports.setBuyNowItem = catchAsync(async (req, res) => {
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
    
    // For variable products without variant selection, require variant
    if (product.product_type === "variable") {
      if (!product.variants || product.variants.length === 0) {
        return errorResponse(res, "Please select a variant for this product", 400);
      }
      return errorResponse(res, "Variant selection is required for this product", 400);
    }
    
    // For simple products, check quantity
    if (product.quantity < quantity) {
      return errorResponse(res, "Insufficient stock", 400);
    }
  }

  // Normalize variantId: extract ObjectId part if format is "ObjectId.something"
  let normalizedVariantId = null;
  if (variantId && selectedVariant && selectedVariant._id) {
    normalizedVariantId = selectedVariant._id.toString();
  } else if (variantId) {
    const variantIdStr = String(variantId).trim();
    if (variantIdStr.includes('.')) {
      normalizedVariantId = variantIdStr.split('.')[0];
    } else {
      normalizedVariantId = variantIdStr;
    }
  }

  // Create or update buy-now item (replaces previous)
  const buyNowItem = {
    product: productId,
    quantity,
    ...(normalizedVariantId && { variantId: normalizedVariantId }),
  };

  let buyNow = await BuyNow.findOne({ user: req.user._id });
  
  if (buyNow) {
    // Replace existing buy-now item
    buyNow.item = buyNowItem;
    buyNow.coupon = null;
    buyNow.discount = 0;
    await buyNow.save();
  } else {
    // Create new buy-now
    buyNow = await BuyNow.create({
      user: req.user._id,
      item: buyNowItem,
    });
  }

  // Populate product before calculating totals
  await buyNow.populate({
    path: 'item.product',
    select: 'name slug price sale_price image mainImage in_stock quantity shippingFee tax variants weight shippingClass',
    populate: {
      path: 'image',
      select: 'original thumbnail',
    },
  });

  // Calculate totals (this function now preserves the populated product)
  buyNow = await calculateBuyNowTotals(buyNow, req.user._id);
  
  // Ensure product is still populated after calculation
  if (!buyNow.item.product || typeof buyNow.item.product === 'string' || (buyNow.item.product._id && !buyNow.item.product.name)) {
    await buyNow.populate({
      path: 'item.product',
      select: 'name slug price sale_price image mainImage in_stock quantity shippingFee tax variants weight shippingClass',
      populate: {
        path: 'image',
        select: 'original thumbnail',
      },
    });
  }

  // Format response with full product details (same as GET endpoint)
  let buyNowProduct = buyNow.item.product;
  
  // If product is not populated or is just an ID, fetch it
  if (!buyNowProduct || typeof buyNowProduct === 'string' || (buyNowProduct._id && !buyNowProduct.name)) {
    // Re-fetch the product if it was lost
    const productId = typeof buyNowProduct === 'string' 
      ? buyNowProduct 
      : (buyNowProduct?._id || buyNow.item.product);
    
    buyNowProduct = await Product.findById(productId)
      .select('name slug price sale_price image mainImage in_stock quantity shippingFee tax variants weight shippingClass')
      .populate('image', 'original thumbnail')
      .lean();
    
    if (!buyNowProduct) {
      return errorResponse(res, "Product not found", 404);
    }
  }
  
  // Validate product data exists
  if (!buyNowProduct || !buyNowProduct.name) {
    return errorResponse(res, "Failed to load product details", 500);
  }
  
  // Convert to plain object if it's a Mongoose document
  let productObj = buyNowProduct;
  if (buyNowProduct.toObject) {
    productObj = buyNowProduct.toObject();
  }
  
  // Always apply deals to ensure we have the latest deal pricing
  const productsWithDeals = await applyDealsToProducts([productObj]);
  if (productsWithDeals && productsWithDeals.length > 0) {
    productObj = productsWithDeals[0];
  }
  
  // Get deal pricing from product (now guaranteed to have deal pricing fields)
  const originalPrice = productObj.originalPrice ?? (productObj.sale_price ?? productObj.price ?? 0);
  const dealPrice = productObj.dealPrice ?? null;
  const appliedDealId = productObj.appliedDealId ?? null;
  const appliedDealVariant = productObj.appliedDealVariant ?? null;
  
  let buyNowSelectedVariant = null;
  // Use deal price if available, otherwise use original price
  let itemPrice = dealPrice !== null ? dealPrice : originalPrice;
  let itemImage = getProductImageUrl(productObj);

  if (buyNow.item.variantId && productObj.variants && Array.isArray(productObj.variants)) {
    buyNowSelectedVariant = findVariantById(productObj.variants, buyNow.item.variantId);
    
    if (buyNowSelectedVariant) {
      // For variants, apply deal discount if deal exists
      if (buyNowSelectedVariant.price !== undefined && buyNowSelectedVariant.price !== null) {
        if (dealPrice !== null && originalPrice > 0) {
          // Calculate discount percentage from deal
          const discountPercent = ((originalPrice - dealPrice) / originalPrice) * 100;
          // Apply same discount to variant price
          itemPrice = buyNowSelectedVariant.price - (buyNowSelectedVariant.price * discountPercent / 100);
        } else {
          itemPrice = buyNowSelectedVariant.price;
        }
      }
      if (buyNowSelectedVariant.image && buyNowSelectedVariant.image.trim()) {
        itemImage = buyNowSelectedVariant.image.trim();
      }
    }
  }

  // Format item to match cart items structure exactly
  const formattedItem = {
    id: productObj._id,
    name: productObj.name,
    price: itemPrice,
    originalPrice: originalPrice,
    dealPrice: dealPrice,
    appliedDealId: appliedDealId,
    appliedDealVariant: appliedDealVariant,
    quantity: buyNow.item.quantity,
    shippingFee: productObj.shippingFee ?? null,
    tax: productObj.tax !== undefined ? productObj.tax : null,
    image: itemImage,
    slug: productObj.slug,
    variantId: buyNow.item.variantId || null,
    variant: buyNowSelectedVariant ? {
      _id: buyNowSelectedVariant._id,
      storage: buyNowSelectedVariant.storage || null,
      ram: buyNowSelectedVariant.ram || null,
      color: buyNowSelectedVariant.color || null,
      bundle: buyNowSelectedVariant.bundle || null,
      warranty: buyNowSelectedVariant.warranty || null,
      price: buyNowSelectedVariant.price || null,
      stock: buyNowSelectedVariant.stock || null,
      sku: buyNowSelectedVariant.sku || null,
      image: buyNowSelectedVariant.image || null,
    } : null,
  };

  return successResponse(
    res,
    {
      // Return both 'item' (singular) and 'items' (array) for frontend compatibility
      item: formattedItem,
      items: [formattedItem], // Array format to match cart response structure
      total: buyNow.total,
      discount: buyNow.discount,
      shippingFee: buyNow.shippingFee,
      finalTotal: buyNow.finalTotal,
      codFee: buyNow.codFee,
      coupon: buyNow.coupon,
      shippingMethod: buyNow.shippingMethod,
      paymentMethod: buyNow.paymentMethod,
    },
    "Buy Now item set successfully"
  );
});

// Get Buy Now Item with calculated totals
exports.getBuyNowItem = catchAsync(async (req, res) => {
  let buyNow = await BuyNow.findOne({ user: req.user._id })
    .populate({
      path: "item.product",
      select: "name slug price sale_price image mainImage in_stock quantity shippingFee tax variants weight shippingClass",
      populate: {
        path: "image",
        select: "original thumbnail",
      },
    })
    .populate("coupon", "code discountType discountValue expiryDate");

  if (!buyNow || !buyNow.item) {
    return successResponse(
      res,
      { 
        item: null, 
        items: [], 
        total: 0, 
        discount: 0, 
        shippingFee: 0, 
        finalTotal: 0,
        codFee: 0,
        coupon: null,
        shippingMethod: "standard",
        paymentMethod: "stripe"
      },
      "No Buy Now item"
    );
  }

  // Ensure product is populated
  if (!buyNow.item.product || typeof buyNow.item.product === 'string' || (buyNow.item.product._id && !buyNow.item.product.name)) {
    await buyNow.populate({
      path: 'item.product',
      select: 'name slug price sale_price image mainImage in_stock quantity shippingFee tax variants weight shippingClass',
      populate: {
        path: 'image',
        select: 'original thumbnail',
      },
    });
  }

  // Calculate totals (this will apply deals and set deal pricing fields on buyNow.item.product)
  buyNow = await calculateBuyNowTotals(buyNow, req.user._id);
  
  // After calculateBuyNowTotals, always re-populate product to ensure we have all fields
  // The product might have been set to a plain object which doesn't persist correctly
  await buyNow.populate({
    path: 'item.product',
    select: 'name slug price sale_price image mainImage in_stock quantity shippingFee tax variants weight shippingClass',
    populate: {
      path: 'image',
      select: 'original thumbnail',
    },
  });
  
  // Get product ID for fetching
  const productId = buyNow.item.product?._id || buyNow.item.product;
  if (!productId) {
    return errorResponse(res, "Product not found in buy-now item", 404);
  }
  
  // Fetch product fresh and apply deals
  const fetchedProduct = await Product.findById(productId)
    .select('name slug price sale_price image mainImage in_stock quantity shippingFee tax variants weight shippingClass')
    .populate('image', 'original thumbnail')
    .lean();
  
  if (!fetchedProduct) {
    return errorResponse(res, "Product not found", 404);
  }
  
  // Apply deals to get deal pricing
  const productsWithDeals = await applyDealsToProducts([fetchedProduct]);
  const product = productsWithDeals && productsWithDeals.length > 0 ? productsWithDeals[0] : {
    ...fetchedProduct,
    originalPrice: fetchedProduct.sale_price ?? fetchedProduct.price ?? 0,
    dealPrice: null,
    appliedDealId: null,
    appliedDealVariant: null,
  };

  // Format response
  // Get deal pricing from product (now guaranteed to have deal pricing fields)
  const originalPrice = product.originalPrice ?? (product.sale_price ?? product.price ?? 0);
  const dealPrice = product.dealPrice ?? null;
  const appliedDealId = product.appliedDealId ?? null;
  const appliedDealVariant = product.appliedDealVariant ?? null;
  
  let selectedVariant = null;
  // Use deal price if available, otherwise use original price
  let itemPrice = dealPrice !== null ? dealPrice : originalPrice;
  let itemImage = getProductImageUrl(product);

  if (buyNow.item.variantId && product.variants && Array.isArray(product.variants)) {
    selectedVariant = findVariantById(product.variants, buyNow.item.variantId);
    
    if (selectedVariant) {
      // For variants, apply deal discount if deal exists
      if (selectedVariant.price !== undefined && selectedVariant.price !== null) {
        if (dealPrice !== null && originalPrice > 0) {
          // Calculate discount percentage from deal
          const discountPercent = ((originalPrice - dealPrice) / originalPrice) * 100;
          // Apply same discount to variant price
          itemPrice = selectedVariant.price - (selectedVariant.price * discountPercent / 100);
        } else {
          itemPrice = selectedVariant.price;
        }
      }
      if (selectedVariant.image && selectedVariant.image.trim()) {
        itemImage = selectedVariant.image.trim();
      }
    }
  }

  // Format item to match cart items structure exactly
  const formattedItem = {
    id: product._id,
    name: product.name,
    price: itemPrice,
    originalPrice: originalPrice,
    dealPrice: dealPrice,
    appliedDealId: appliedDealId,
    appliedDealVariant: appliedDealVariant,
    quantity: buyNow.item.quantity,
    shippingFee: product.shippingFee ?? null,
    tax: product.tax !== undefined ? product.tax : null,
    image: itemImage,
    slug: product.slug,
    variantId: buyNow.item.variantId || null,
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

  return successResponse(
    res,
    {
      // Return both 'item' (singular) and 'items' (array) for frontend compatibility
      item: formattedItem,
      items: [formattedItem], // Array format to match cart response structure
      total: buyNow.total,
      discount: buyNow.discount,
      shippingFee: buyNow.shippingFee,
      finalTotal: buyNow.finalTotal,
      codFee: buyNow.codFee,
      coupon: buyNow.coupon,
      shippingMethod: buyNow.shippingMethod,
      paymentMethod: buyNow.paymentMethod,
    },
    "Buy Now item fetched successfully"
  );
});

// Clear Buy Now Item
exports.clearBuyNowItem = catchAsync(async (req, res) => {
  await BuyNow.findOneAndDelete({ user: req.user._id });
  return successResponse(res, {}, "Buy Now item cleared successfully");
});

// Helper: Calculate Buy Now totals
const calculateBuyNowTotals = async (buyNow, userId) => {
  if (!buyNow || !buyNow.item) return buyNow;

  // Ensure product is populated if it's just an ObjectId (not an object with name, price, etc.)
  const product = buyNow.item.product;
  if (!product || typeof product === 'string' || (product._id && !product.name)) {
    await buyNow.populate({
      path: 'item.product',
      select: 'name slug price sale_price image mainImage in_stock quantity shippingFee tax variants weight shippingClass',
      populate: {
        path: 'image',
        select: 'original thumbnail',
      },
    });
  }

  // Store original populated product before calculation (calculateTotalsFromItems modifies it)
  const originalProduct = buyNow.item.product;
  
  // Ensure product is properly set (could be ObjectId or populated object)
  if (!originalProduct) {
    throw new Error("Product not found in buy-now item");
  }

  // Convert single item to array format for calculation
  // Ensure product ID is properly extracted (could be ObjectId string or Mongoose document)
  let productId;
  if (typeof originalProduct === 'string') {
    productId = originalProduct;
  } else if (originalProduct._id) {
    productId = originalProduct._id;
  } else {
    productId = originalProduct;
  }

  const itemForCalculation = {
    product: productId, // Pass product ID (calculateTotalsFromItems will fetch the full product)
    quantity: buyNow.item.quantity,
    variantId: buyNow.item.variantId || null,
  };
  
  const items = [itemForCalculation];

  const totals = await calculateTotalsFromItems(
    items,
    buyNow.coupon,
    buyNow.shippingMethod,
    buyNow.paymentMethod,
    userId
  );

  buyNow.total = totals.total;
  buyNow.discount = totals.discount;
  buyNow.shippingFee = totals.shippingFee;
  buyNow.codFee = totals.codFee;
  buyNow.finalTotal = totals.finalTotal;

  // IMPORTANT: Do NOT modify buyNow.item.product here
  // The product field must remain as an ObjectId reference for the schema to work
  // Deal pricing is calculated and used in responses, but not stored in the database
  // The product reference should remain unchanged (as ObjectId)
  
  // Ensure product is still an ObjectId reference (not a plain object)
  // calculateTotalsFromItems might have replaced item.product with a plain object
  // We need to restore it to just the ObjectId before saving
  if (items[0] && items[0].product) {
    // Get the product ID from the calculated item
    const calculatedProduct = items[0].product;
    const productId = calculatedProduct._id || originalProduct._id || originalProduct;
    
    // Restore product to ObjectId reference only (not the full object)
    if (typeof productId === 'object' && productId._id) {
      buyNow.item.product = productId._id;
    } else if (typeof productId === 'object' && productId.toString) {
      buyNow.item.product = productId.toString();
    } else {
      buyNow.item.product = productId;
    }
  } else {
    // Fallback: ensure product is ObjectId
    const productId = originalProduct._id || originalProduct;
    if (typeof productId === 'object' && productId._id) {
      buyNow.item.product = productId._id;
    } else if (typeof productId === 'object' && productId.toString) {
      buyNow.item.product = productId.toString();
    } else {
      buyNow.item.product = productId;
    }
  }

  if (!totals.validCoupon && buyNow.coupon) {
    buyNow.coupon = null;
  }

  await buyNow.save();
  return buyNow;
};

// Apply Coupon to Buy Now
exports.applyCoupon = catchAsync(async (req, res) => {
  const { code } = req.body;
  if (!code) return errorResponse(res, "Coupon code is required", 400);

  const coupon = await require("../models/coupon.model").findOne({
    code: code.toUpperCase(),
    isActive: true,
  });

  if (!coupon) return errorResponse(res, "Invalid coupon", 400);
  if (coupon.isExpired) return errorResponse(res, "Coupon expired", 400);
  if (coupon.startDate && coupon.startDate > new Date())
    return errorResponse(res, "Coupon not yet active", 400);

  let buyNow = await BuyNow.findOne({ user: req.user._id })
    .populate("item.product");
  if (!buyNow || !buyNow.item) return errorResponse(res, "Buy Now item not found", 404);

  // Calculate current subtotal
  const product = buyNow.item.product;
  let price = product.sale_price ?? product.price ?? 0;
  
  if (buyNow.item.variantId && product.variants && Array.isArray(product.variants)) {
    const variant = findVariantById(product.variants, buyNow.item.variantId);
    if (variant && variant.price !== undefined && variant.price !== null) {
      price = variant.price;
    }
  }
  
  const subtotal = price * buyNow.item.quantity;

  // Check eligibility
  if (subtotal < (coupon.minCartValue || 0))
    return errorResponse(
      res,
      `Buy Now total must be at least ${coupon.minCartValue}`,
      400
    );

  // Check usage limits
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    return errorResponse(res, "Coupon usage limit reached", 400);

  const userUsage = coupon.userUsage?.get(req.user._id.toString()) || 0;
  if (coupon.perUserLimit && userUsage >= coupon.perUserLimit)
    return errorResponse(res, "You have already used this coupon", 400);

  buyNow.coupon = coupon._id;
  buyNow = await calculateBuyNowTotals(buyNow, req.user._id);

  return successResponse(res, { buyNow }, "Coupon applied successfully");
});

// Remove Coupon from Buy Now
exports.removeCoupon = catchAsync(async (req, res) => {
  let buyNow = await BuyNow.findOne({ user: req.user._id });
  if (!buyNow) return errorResponse(res, "Buy Now item not found", 404);

  if (!buyNow.coupon)
    return errorResponse(res, "No coupon applied to this buy now item", 400);

  const Coupon = require("../models/coupon.model");
  const coupon = await Coupon.findById(buyNow.coupon);
  if (coupon) {
    if (coupon.usedCount > 0) coupon.usedCount -= 1;
    const userId = req.user._id.toString();
    const userUsageCount = coupon.userUsage.get(userId) || 0;
    if (userUsageCount > 0) {
      coupon.userUsage.set(userId, userUsageCount - 1);
    }
    await coupon.save();
  }

  buyNow.coupon = null;
  buyNow.discount = 0;
  buyNow = await calculateBuyNowTotals(buyNow, req.user._id);

  return successResponse(res, { buyNow }, "Coupon removed successfully");
});

// Set shipping method
exports.setShippingMethod = catchAsync(async (req, res) => {
  const { method } = req.body;
  if (!["standard", "express"].includes(method))
    return errorResponse(res, "Invalid shipping method", 400);

  let buyNow = await BuyNow.findOne({ user: req.user._id });
  if (!buyNow) return errorResponse(res, "Buy Now item not found", 404);

  buyNow.shippingMethod = method;
  buyNow = await calculateBuyNowTotals(buyNow, req.user._id);

  return successResponse(res, { buyNow }, `Shipping method updated to ${method}`);
});

// Set payment method
exports.setPaymentMethod = catchAsync(async (req, res) => {
  const { method } = req.body;
  if (!["stripe", "cod"].includes(method))
    return errorResponse(res, "Invalid payment method", 400);

  let buyNow = await BuyNow.findOne({ user: req.user._id });
  if (!buyNow) return errorResponse(res, "Buy Now item not found", 404);

  buyNow.paymentMethod = method;
  buyNow = await calculateBuyNowTotals(buyNow, req.user._id);

  return successResponse(
    res,
    {
      total: buyNow.total,
      discount: buyNow.discount,
      shippingFee: buyNow.shippingFee,
      codFee: buyNow.codFee,
      finalTotal: buyNow.finalTotal,
      paymentMethod: buyNow.paymentMethod,
    },
    `Payment method set to ${method}`
  );
});

