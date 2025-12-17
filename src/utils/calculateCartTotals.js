const Product = require("../models/product.model");
const Coupon = require("../models/coupon.model");
const ShippingZone = require("../models/shippingZone.model");
const SiteSetting = require("../models/siteSetting.model");
const { applyDealsToProducts } = require("../services/dealEvaluationService");

const {
  EXPRESS_MULTIPLIER,
  DEFAULT_BASE_RATE,
  DEFAULT_REGION_MULTIPLIER,
  DEFAULT_FREE_SHIPPING_THRESHOLD,
  SHIPPING_CLASS_SURCHARGES,
} = require("../../config/constants");
const siteSettingModel = require("../models/siteSetting.model");

// Helper function to calculate totals from items array (reusable for cart and buy-now)
const calculateTotalsFromItems = async (
  items,
  coupon,
  shippingMethod,
  paymentMethod,
  userId,
  userAddress = {}
) => {
  // Fetch products with all fields including tax
  const productIds = items.map((it) =>
    typeof it.product === "object" ? it.product._id : it.product
  );
  // Use lean() to get plain objects with all fields including tax
  const products = await Product.find({ _id: { $in: productIds } }).lean();

  // Apply deals to products to get deal prices
  const productsWithDeals = await applyDealsToProducts(products);

  // Calculate subtotal + tax + total weight
  let subtotal = 0;
  let taxTotal = 0;
  let totalWeight = 0;

  for (const item of items) {
    // Preserve tax from originally populated product before replacing
    const originalTax = typeof item.product === "object" && item.product.tax !== undefined 
      ? item.product.tax 
      : undefined;
    
    const product = productsWithDeals.find(
      (p) =>
        p._id.toString() ===
        (typeof item.product === "object"
          ? item.product._id.toString()
          : item.product.toString())
    );
    if (!product) continue;

    // Use deal price if available, otherwise use originalPrice (which equals sale_price or price)
    // originalPrice is always set by applyDealsToProducts
    let basePrice = product.dealPrice !== null && product.dealPrice !== undefined 
      ? product.dealPrice 
      : (product.originalPrice ?? product.sale_price ?? product.price ?? 0);

    // Use variant price if variantId is present, otherwise use the base price (deal or original)
    let price = basePrice;
    
    // Check if this item has a variant and use variant price
    // Note: Variants don't have deals applied to them individually, so we use variant price directly
    // If variant price exists, use it; otherwise use the deal price (or original price)
    if (item.variantId && product.variants && Array.isArray(product.variants)) {
      // Helper to find variant by ID, handling different formats
      const variantIdStr = String(item.variantId).trim();
      let variant = product.variants.find(
        (v) => v._id && v._id.toString() === variantIdStr
      );
      
      // If not found, try extracting ObjectId part (handles "ObjectId.1" format)
      if (!variant && variantIdStr.includes('.')) {
        const objectIdPart = variantIdStr.split('.')[0];
        variant = product.variants.find(
          (v) => v._id && v._id.toString() === objectIdPart
        );
      }
      if (variant && variant.price !== undefined && variant.price !== null) {
        // For variants, apply deal discount to variant price if deal exists
        if (product.dealPrice !== null && product.dealPrice !== undefined && product.originalPrice) {
          // Calculate discount percentage from deal
          const discountPercent = ((product.originalPrice - product.dealPrice) / product.originalPrice) * 100;
          // Apply same discount to variant price
          price = variant.price - (variant.price * discountPercent / 100);
        } else {
          price = variant.price;
        }
      }
    }
    
    // Base line total (without tax)
    const lineBaseTotal = price * item.quantity;
    subtotal += lineBaseTotal;

    // ---- TAX CALCULATION ----
    // Treat tax as a percentage (e.g. 10 = 10%)
    const rawTaxValue =
      product.tax !== undefined && product.tax !== null
        ? product.tax
        : originalTax ?? 0;

    const taxRate =
      typeof rawTaxValue === "number" && isFinite(rawTaxValue) && rawTaxValue > 0
        ? rawTaxValue
        : 0;

    if (taxRate > 0) {
      const lineTax = (lineBaseTotal * taxRate) / 100;
      taxTotal += lineTax;
    }

    const weight = product.weight ?? 0;
    totalWeight += weight * item.quantity;

    // Replace product with fetched product (lean() already gives us plain object)
    // Get tax value - use product.tax if it exists (even if 0), otherwise use originalTax, otherwise null
    const taxValue = product.tax !== undefined 
      ? product.tax 
      : (originalTax !== undefined ? originalTax : null);
    
    // Ensure tax and deal pricing fields are explicitly set on the product object
    item.product = {
      ...product,
      tax: taxValue,
      // Include deal pricing information for frontend display
      originalPrice: product.originalPrice ?? (product.sale_price ?? product.price ?? 0),
      dealPrice: product.dealPrice ?? null,
      appliedDealId: product.appliedDealId ?? null,
      appliedDealVariant: product.appliedDealVariant ?? null,
    };
  }

  // Coupon logic
  let discount = 0;
  let validCoupon = null;

  if (coupon) {
    const couponDoc = typeof coupon === "object" && coupon._id 
      ? coupon 
      : await Coupon.findById(coupon);
    if (
      couponDoc &&
      couponDoc.isActive &&
      (!couponDoc.expiryDate || couponDoc.expiryDate > new Date())
    ) {
      const eligible =
        subtotal >= (couponDoc.minCartValue || 0) &&
        (!couponDoc.startDate || couponDoc.startDate <= new Date());

      if (eligible) {
        validCoupon = couponDoc;
        if (couponDoc.discountType === "percentage") {
          discount = (subtotal * couponDoc.discountValue) / 100;
          if (couponDoc.maxDiscount)
            discount = Math.min(discount, couponDoc.maxDiscount);
        } else if (couponDoc.discountType === "fixed") {
          discount = couponDoc.discountValue;
        }
      }
    }
  }

  discount = Math.min(discount, subtotal);

  // Shipping zone + weight rates
  const pincode = userAddress.pincode || "";
  const pfx = pincode ? pincode.substring(0, 2) : null;
  let zone = null;

  if (pfx) {
    zone = await ShippingZone.findOne({
      pinCodePrefix: { $regex: `^${pfx}` },
      isActive: true,
    });
  }

  const baseRate = zone?.baseRate ?? DEFAULT_BASE_RATE;
  const regionMultiplier = zone?.regionMultiplier ?? DEFAULT_REGION_MULTIPLIER;
  const expressMultiplier =
    shippingMethod === "express"
      ? zone?.expressMultiplier ?? EXPRESS_MULTIPLIER
      : 1.0;
  const freeShippingThreshold =
    zone?.freeShippingThreshold ?? DEFAULT_FREE_SHIPPING_THRESHOLD;
  const weightRates = Array.isArray(zone?.weightRates) ? zone.weightRates : [];

  // Handling fee
  let baseHandling = 0;
  for (const item of items) {
    // item.product should have been replaced with plain object in the previous loop
    // But check if it exists and is an object
    if (item.product && typeof item.product === 'object' && item.product !== null) {
      baseHandling += (item.product.shippingFee ?? 0) * item.quantity;
    } else {
      // If product wasn't found/replaced, skip this item (shouldn't happen, but safety check)
      console.warn('Item product not found for shipping fee calculation:', item);
    }
  }

  // Weight rate calc
  let weightCharge = 0;
  if (weightRates.length > 0) {
    const tier = weightRates.find(
      (t) => totalWeight >= t.minWeight && totalWeight <= t.maxWeight
    );
    if (tier) weightCharge = tier.rate;
    else {
      const sorted = weightRates.sort((a, b) => a.minWeight - b.minWeight);
      const highest = sorted[sorted.length - 1];
      weightCharge = highest ? highest.rate : 0;
    }
  } else {
    const PER_KG_RATE = 30;
    weightCharge = Math.ceil(totalWeight * PER_KG_RATE);
  }

  // Class multiplier
  let classMultiplier = 1.0;
  if (SHIPPING_CLASS_SURCHARGES) {
    const multipliers = items.map((it) => {
      const c = it.product?.shippingClass ?? "standard";
      return SHIPPING_CLASS_SURCHARGES[c] ?? 1.0;
    });
    classMultiplier = multipliers.length ? Math.max(...multipliers) : 1.0;
  }

  // Calculate shipping fee
  let shippingFee = Math.round(
    (baseRate + baseHandling + weightCharge) *
      regionMultiplier *
      classMultiplier *
      expressMultiplier
  );

  // Check for global free shipping
  let ENABLE_GLOBAL_FREE_SHIPPING = false;
  try {
    const freeShipSetting = await SiteSetting.findOne({
      key: "ENABLE_GLOBAL_FREE_SHIPPING",
    });
    ENABLE_GLOBAL_FREE_SHIPPING =
      freeShipSetting?.value === true || freeShipSetting?.value === "true";
  } catch (err) {
    ENABLE_GLOBAL_FREE_SHIPPING = false;
  }

  if (ENABLE_GLOBAL_FREE_SHIPPING) {
    shippingFee = 0;
  } else {
    if (subtotal >= freeShippingThreshold) shippingFee = 0;
    if (validCoupon?.discountType === "free_shipping") shippingFee = 0;
  }

  // COD fee logic (Dynamic from Site Settings)
  let codFee = 0;

  if (paymentMethod === "cod") {
    try {
      const codFeeSetting = await siteSettingModel.findOne({ key: "COD_FEE" });
      codFee = codFeeSetting ? Number(codFeeSetting.value) || 0 : 0;
    } catch (err) {
      console.error("Error fetching COD_FEE from SiteSetting:", err);
      codFee = 0; // fallback
    }
  } else {
    codFee = 0;
  }

  // Return calculated totals
  return {
    total: subtotal,
    taxTotal,
    discount,
    shippingFee,
    codFee,
    finalTotal: Math.max(subtotal + taxTotal - discount + shippingFee + codFee, 0),
    validCoupon,
    _computed: { totalWeight },
  };
};

// Main function for cart (backward compatible)
const calculateCartTotals = async (cart, userId, userAddress = {}) => {
  const totals = await calculateTotalsFromItems(
    cart.items,
    cart.coupon,
    cart.shippingMethod,
    cart.paymentMethod,
    userId,
    userAddress
  );

  // Update cart with calculated totals
  cart.total = totals.total;
  // Optional: expose total tax on cart document (not required by schema)
  cart.taxTotal = totals.taxTotal;
  cart.discount = totals.discount;
  cart.shippingFee = totals.shippingFee;
  cart.codFee = totals.codFee;
  cart.finalTotal = totals.finalTotal;
  cart._computed = totals._computed;

  // Update coupon if it became invalid
  if (!totals.validCoupon && cart.coupon) {
    cart.coupon = null;
  }

  return cart;
};

module.exports = calculateCartTotals;
module.exports.calculateTotalsFromItems = calculateTotalsFromItems;
