const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const contactController = require("../controllers/contact.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// Rate limiting for contact form submissions (5 requests per hour per IP)
const contactFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    status: "error",
    message: "Too many contact form submissions from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Public routes (no authentication required)
router.post("/", contactFormLimiter, contactController.submitContact);
router.get("/status/:contactId", contactController.getContactStatus);

// Admin routes (authentication and admin role required)
router.use(protect);
router.use(restrictTo("admin"));

router.get("/", contactController.getAllContacts);
router.get("/:id", contactController.getContact);
router.put("/:id", contactController.updateContact);
router.delete("/:id", contactController.deleteContact);
router.post("/:id/reply", contactController.replyToContact);

module.exports = router;

