const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const reviewController = require("../controllers/review.controller");
const uploadProduct = require("../utils/uploadProduct");
const { productImageFields, handleMulterError } = require("../utils/uploadProduct");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// Public routes
router.get("/", productController.getAllProducts);
router.get("/category", productController.getProductsByCategory);
router.get("/categories", productController.getProductsByCategorySubCategories);
router.get("/best-seller", productController.getBestSellerProducts);
router.get("/new-arrival", productController.getNewSellerProducts);
router.get("/on-sale", productController.getSaleProducts);
router.get("/top-sales", productController.getTopSalesProducts);
// Review routes (must come before /:slug to avoid route conflicts)
router.get("/:id/reviews", reviewController.getProductReviews);
router.post("/:id/reviews", protect, reviewController.createReview);
// Related products (must come before /:slug)
router.get("/:slug/related", productController.getRelatedProducts);
// Single product by slug (must be last to avoid conflicts)
router.get("/:slug", productController.getProduct);
router.patch("/reviews/:reviewId", protect, reviewController.updateReview);
router.delete("/reviews/:reviewId", protect, reviewController.deleteReview);
router.patch(
  "/reviews/:reviewId/helpful",
  protect,
  reviewController.markReviewHelpful
);
router.patch(
  "/reviews/:reviewId/not-helpful",
  protect,
  reviewController.markReviewNotHelpful
);

// Admin-only routes
router.use(protect, restrictTo("admin"));

// Create product with image uploads (supports mainImage, gallery, variant images)
router.post(
  "/",
  uploadProduct.fields(productImageFields),
  handleMulterError,
  productController.createProduct
);

// Update product with image uploads
router.patch(
  "/:id",
  uploadProduct.fields(productImageFields),
  handleMulterError,
  productController.updateProduct
);

router.delete("/:id", productController.deleteProduct);

// Admin review management
router.get("/reviews/all", reviewController.getAllReviews);
router.patch("/reviews/:reviewId/moderate", reviewController.moderateReview);

module.exports = router;
