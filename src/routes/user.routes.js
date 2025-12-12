const express = require("express");
const userController = require("../controllers/user.controller");
const uploadAvatar = require("../utils/uploadAvatar");
const { protect, restrictTo } = require("../middleware/auth.middleware");

const router = express.Router();

// ============================================
// USER-ONLY ROUTES (E-commerce site)
// ============================================
// All routes under /me/* are restricted to users with role "user"
// Admins cannot access these routes - they must use admin endpoints
router.use(protect, restrictTo("user"));

// User Profile
router
  .route("/me")
  .get(userController.getMe)
  .patch(uploadAvatar.single("avatar"), userController.updateMe);

// Address Book
router
  .route("/me/addresses")
  .get(userController.getAddresses)
  .post(userController.addAddress);

router.get("/me/addresses/default", userController.getDefaultAddress);

router
  .route("/me/addresses/:addressId")
  .patch(userController.updateAddress)
  .delete(userController.deleteAddress);

router.patch(
  "/me/addresses/:addressId/default",
  userController.setDefaultAddress
);

// ============================================
// ADMIN-ONLY ROUTES (Dashboard)
// ============================================
// Reset middleware - now require admin role
router.use(protect, restrictTo("admin"));

router.route("/").get(userController.getAllUsers); 
router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
