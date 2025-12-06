const express = require("express");
const authController = require("../controllers/auth.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

const router = express.Router();

// ============================================
// USER AUTHENTICATION ROUTES
// ============================================
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.post("/forgot-password", authController.forgotPassword);
router.patch("/update-password", protect, authController.updatePassword);
router.patch("/reset-password/:token", authController.resetPassword);

// ============================================
// ADMIN AUTHENTICATION ROUTES
// ============================================
router.post("/admin/signup", authController.adminSignup);
router.post("/admin/login", authController.adminLogin);
router.get("/admin/logout", authController.adminLogout);

router.post("/admin/forgot-password", authController.adminForgotPassword);
router.patch("/admin/reset-password/:token", authController.adminResetPassword);
router.patch(
  "/admin/update-password",
  protect,
  restrictTo("admin"),
  authController.adminUpdatePassword
);

module.exports = router;
