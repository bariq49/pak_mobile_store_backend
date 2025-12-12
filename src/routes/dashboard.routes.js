const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// ============================================
// ADMIN DASHBOARD ROUTES
// ============================================
// All dashboard routes require authentication and admin role
router.use(protect, restrictTo("admin"));

// Dashboard Statistics
router.get("/stats", dashboardController.getDashboardStats);

// Revenue Chart Data
router.get("/revenue", dashboardController.getRevenueChart);

// Customer Statistics
router.get("/customers", dashboardController.getCustomerStats);

// Transactions
router.get("/transactions", dashboardController.getTransactions);

// Dashboard Orders
router.get("/orders", dashboardController.getDashboardOrders);

// Top Products
router.get("/top-products", dashboardController.getTopProducts);

// Top Customers
router.get("/top-customers", dashboardController.getTopCustomers);

// Visitors Chart
router.get("/visitors", dashboardController.getVisitorsChart);

module.exports = router;

