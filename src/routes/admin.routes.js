const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const cartController = require("../controllers/cart.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// ============================================
// ADMIN-ONLY ROUTES (Dashboard)
// ============================================
// All routes require authentication and admin role
router.use(protect, restrictTo("admin"));

// Admin Profile
// Get logged-in admin's profile
router.get("/me", userController.getMe);

// Admin Cart Routes
// Get any user's cart by user ID
router.get("/cart/:userId", cartController.getUserCart);

module.exports = router;

