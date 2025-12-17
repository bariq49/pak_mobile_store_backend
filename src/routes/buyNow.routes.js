const express = require("express");
const router = express.Router();
const buyNowController = require("../controllers/buyNow.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", buyNowController.getBuyNowItem);
router.post("/", buyNowController.setBuyNowItem);
router.delete("/", buyNowController.clearBuyNowItem);

// Coupon routes
router.post("/apply-coupon", buyNowController.applyCoupon);
router.delete("/remove-coupon", buyNowController.removeCoupon);

// Shipping and payment methods
router.patch("/set-shipping-method", buyNowController.setShippingMethod);
router.patch("/set-payment-method", buyNowController.setPaymentMethod);

module.exports = router;


