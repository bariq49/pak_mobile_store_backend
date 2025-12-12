const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// ============================================
// ADMIN-ONLY ROUTES (Dashboard)
// ============================================
// All routes require authentication and admin role
router.use(protect, restrictTo("admin"));

// Admin Profile
// Get logged-in admin's profile
router.get("/me", userController.getMe);

module.exports = router;

