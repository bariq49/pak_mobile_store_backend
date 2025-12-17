const Deal = require("../models/deal.model");
const Product = require("../models/product.model");
const Category = require("../models/category.model");

/**
 * Check if a deal is currently active
 * @param {Object} deal - Deal document
 * @returns {boolean} - True if deal is active
 */
const isDealActive = (deal) => {
  if (!deal || !deal.isActive) return false;
  
  const now = new Date();
  const startDate = new Date(deal.startDate);
  const endDate = new Date(deal.endDate);
  
  return startDate <= now && now <= endDate;
};

/**
 * Get all currently active deals
 * @returns {Promise<Array>} - Array of active deal documents
 */
const getActiveDeals = async () => {
  const now = new Date();
  const deals = await Deal.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .populate({
      path: "products",
      select: "_id",
    })
    .populate("categories", "_id")
    .populate("subCategories", "_id")
    .lean();
  
  return deals;
};

/**
 * Resolve all product IDs that are affected by a deal
 * @param {Object} deal - Deal document (with populated refs)
 * @returns {Promise<Set<string>>} - Set of product ObjectId strings
 */
const resolveDealTargets = async (deal) => {
  const productIds = new Set();
  
  // If global deal, we'll handle it separately (don't pre-resolve all products)
  if (deal.isGlobal) {
    return null; // null means "all products"
  }
  
  // Direct product selection
  if (deal.products && deal.products.length > 0) {
    deal.products.forEach((product) => {
      if (!product) return;
      
      let productId;
      
      // Handle all possible formats - normalize to string
      // When populated with only _id, Mongoose returns { _id: ObjectId(...) }
      // When not populated, it's just ObjectId references
      if (product._id) {
        productId = String(product._id);
      } else if (product.id) {
        productId = String(product.id);
      } else {
        // Direct ObjectId or string - convert to string
        productId = String(product);
      }
      
      if (productId) {
        productIds.add(productId);
      }
    });
  }
  
  // Category-based selection
  if (deal.categories && deal.categories.length > 0) {
    const categoryIds = deal.categories.map((cat) =>
      typeof cat === "object" ? cat._id : cat
    );
    
    const productsInCategories = await Product.find({
      category: { $in: categoryIds },
      is_active: true,
      deletedAt: null,
    }).select("_id").lean();
    
    productsInCategories.forEach((product) => {
      productIds.add(product._id.toString());
    });
  }
  
  // Subcategory-based selection
  if (deal.subCategories && deal.subCategories.length > 0) {
    const subCategoryIds = deal.subCategories.map((subCat) =>
      typeof subCat === "object" ? subCat._id : subCat
    );
    
    const productsInSubCategories = await Product.find({
      subCategory: { $in: subCategoryIds },
      is_active: true,
      deletedAt: null,
    }).select("_id").lean();
    
    productsInSubCategories.forEach((product) => {
      productIds.add(product._id.toString());
    });
  }
  
  return productIds.size > 0 ? productIds : null;
};

/**
 * Check if a product is affected by a deal
 * @param {Object} product - Product document
 * @param {Object} deal - Deal document (with resolved targets)
 * @param {Set<string>|null} dealTargets - Resolved product IDs set (or null for global)
 * @returns {boolean} - True if product is affected
 */
const isProductAffectedByDeal = (product, deal, dealTargets) => {
  if (deal.isGlobal) {
    return true;
  }
  
  if (!dealTargets) {
    return false;
  }
  
  // Normalize product ID - handle both _id and id fields, and ObjectId instances
  let productId;
  if (product._id) {
    productId = String(product._id);
  } else if (product.id) {
    productId = String(product.id);
  } else {
    return false;
  }
  
  // Check if product ID is in the deal targets set
  const isAffected = dealTargets.has(productId);
  
  return isAffected;
};

/**
 * Calculate deal price for a product
 * @param {number} originalPrice - Original product price
 * @param {Object} deal - Deal document
 * @returns {number} - Calculated deal price
 */
const calculateDealPrice = (originalPrice, deal) => {
  if (!deal || !originalPrice) return originalPrice;
  
  let dealPrice = originalPrice;
  
  if (deal.discountType === "percentage") {
    const discountAmount = (originalPrice * deal.discountValue) / 100;
    dealPrice = originalPrice - discountAmount;
  } else if (deal.discountType === "fixed" || deal.discountType === "flat") {
    dealPrice = Math.max(0, originalPrice - deal.discountValue);
  }
  
  return Math.round(dealPrice * 100) / 100; // Round to 2 decimal places
};

/**
 * Find the best applicable deal for a product
 * Resolves conflicts by choosing the deal with highest discount
 * @param {Object} product - Product document
 * @param {Array} activeDeals - Array of active deal documents
 * @param {Map} dealTargetsCache - Cache of resolved deal targets (dealId -> Set of productIds or null)
 * @returns {Object|null} - Best deal or null
 */
const findBestDealForProduct = (product, activeDeals, dealTargetsCache) => {
  if (!activeDeals || activeDeals.length === 0) return null;
  
  const originalPrice = product.sale_price ?? product.price ?? 0;
  if (originalPrice <= 0) return null;
  
  let bestDeal = null;
  let bestDealPrice = originalPrice;
  
  for (const deal of activeDeals) {
    // Get resolved targets for this deal (from cache)
    const dealId = deal._id ? String(deal._id) : String(deal);
    const dealTargets = dealTargetsCache.get(dealId);
    
    // Check if product is affected
    if (!isProductAffectedByDeal(product, deal, dealTargets)) {
      continue;
    }
    
    // Calculate deal price
    const dealPrice = calculateDealPrice(originalPrice, deal);
    
    // Choose deal with lowest price (highest discount)
    if (dealPrice < bestDealPrice) {
      bestDealPrice = dealPrice;
      bestDeal = deal;
    }
  }
  
  return bestDeal;
};

/**
 * Calculate pricing with deals for a single product
 * Handles both simple products and products with variants
 * @param {Object} product - Product document
 * @param {Array} activeDeals - Array of active deal documents
 * @param {Map} dealTargetsCache - Cache of resolved deal targets
 * @returns {Object} - Pricing object with originalPrice, dealPrice, appliedDealId, appliedDealVariant
 */
const calculateProductPricing = (product, activeDeals, dealTargetsCache) => {
  // Use sale_price if available, otherwise use regular price
  const originalPrice = product.sale_price ?? product.price ?? 0;
  
  // If no active deals, return null pricing
  if (!activeDeals || activeDeals.length === 0) {
    return {
      originalPrice,
      dealPrice: null,
      appliedDealId: null,
      appliedDealVariant: null,
    };
  }
  
  const bestDeal = findBestDealForProduct(product, activeDeals, dealTargetsCache);
  
  if (!bestDeal) {
    return {
      originalPrice,
      dealPrice: null,
      appliedDealId: null,
      appliedDealVariant: null,
    };
  }
  
  const dealPrice = calculateDealPrice(originalPrice, bestDeal);
  
  return {
    originalPrice,
    dealPrice,
    appliedDealId: bestDeal._id ? String(bestDeal._id) : null,
    appliedDealVariant: bestDeal.dealVariant || "MAIN",
  };
};

/**
 * Batch resolve deal targets for multiple deals (efficient)
 * @param {Array} deals - Array of deal documents
 * @returns {Promise<Map>} - Map of dealId -> Set of productIds (or null for global)
 */
const batchResolveDealTargets = async (deals) => {
  const targetsCache = new Map();
  
  // Process deals in parallel
  const resolutionPromises = deals.map(async (deal) => {
    const dealId = deal._id.toString();
    const targets = await resolveDealTargets(deal);
    targetsCache.set(dealId, targets);
  });
  
  await Promise.all(resolutionPromises);
  
  return targetsCache;
};

/**
 * Apply deals to multiple products (batch processing)
 * @param {Array} products - Array of product documents
 * @returns {Promise<Array>} - Array of products with pricing fields added
 */
const applyDealsToProducts = async (products) => {
  // Always ensure pricing fields are added, even if products array is empty
  if (!products || products.length === 0) {
    return [];
  }
  
  // Get active deals
  const activeDeals = await getActiveDeals();
  
  // Batch resolve all deal targets (efficient - avoids N+1)
  let dealTargetsCache = new Map();
  if (activeDeals.length > 0) {
    dealTargetsCache = await batchResolveDealTargets(activeDeals);
  }
  
  // Calculate pricing for each product - ALWAYS add pricing fields
  const productsWithPricing = products.map((product) => {
    // Always set originalPrice first
    const originalPrice = product.sale_price ?? product.price ?? 0;
    
    // If no active deals, return product with null deal fields
    if (activeDeals.length === 0) {
      return {
        ...product,
        originalPrice,
        dealPrice: null,
        appliedDealId: null,
        appliedDealVariant: null,
      };
    }
    
    // Calculate deal pricing
    const pricing = calculateProductPricing(product, activeDeals, dealTargetsCache);
    
    // Ensure all fields are present
    return {
      ...product,
      originalPrice: pricing.originalPrice ?? originalPrice,
      dealPrice: pricing.dealPrice ?? null,
      appliedDealId: pricing.appliedDealId ?? null,
      appliedDealVariant: pricing.appliedDealVariant ?? null,
    };
  });
  
  return productsWithPricing;
};

module.exports = {
  isDealActive,
  getActiveDeals,
  resolveDealTargets,
  isProductAffectedByDeal,
  calculateDealPrice,
  findBestDealForProduct,
  calculateProductPricing,
  batchResolveDealTargets,
  applyDealsToProducts,
};

