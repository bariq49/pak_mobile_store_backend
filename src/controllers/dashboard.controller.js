const Order = require("../models/order.model");
const User = require("../models/user.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const successResponse = require("../utils/successResponse");
const errorResponse = require("../utils/errorResponse");

/**
 * Get dashboard statistics overview
 * Returns: total revenue, total orders, total customers, total products
 */
exports.getDashboardStats = catchAsync(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Total Revenue (sum of all delivered orders - if delivered, payment should be paid)
  // Also include paid orders that might not be delivered yet (for accurate revenue tracking)
  const totalRevenue = await Order.aggregate([
    {
      $match: {
        $or: [
          { orderStatus: "delivered" }, // Delivered orders count as revenue
          { paymentStatus: "paid" } // Paid orders also count (might be processing/shipped)
        ]
      }
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  // Today's Revenue (orders created today that are delivered or paid)
  const todayRevenue = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfToday },
        $or: [
          { orderStatus: "delivered" },
          { paymentStatus: "paid" }
        ]
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  // Monthly Revenue (orders created this month that are delivered or paid)
  const monthlyRevenue = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth },
        $or: [
          { orderStatus: "delivered" },
          { paymentStatus: "paid" }
        ]
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  // Total Orders
  const totalOrders = await Order.countDocuments();
  const todayOrders = await Order.countDocuments({
    createdAt: { $gte: startOfToday },
  });
  const monthlyOrders = await Order.countDocuments({
    createdAt: { $gte: startOfMonth },
  });

  // Total Customers (users with role "user")
  const totalCustomers = await User.countDocuments({ role: "user" });
  const newCustomersToday = await User.countDocuments({
    role: "user",
    createdAt: { $gte: startOfToday },
  });
  const newCustomersThisMonth = await User.countDocuments({
    role: "user",
    createdAt: { $gte: startOfMonth },
  });

  // Total Products
  const totalProducts = await Product.countDocuments({ is_active: true });
  const outOfStockProducts = await Product.countDocuments({
    in_stock: false,
    is_active: true,
  });

  // Pending Orders
  const pendingOrders = await Order.countDocuments({
    orderStatus: { $in: ["pending", "processing"] },
  });

  // Paid Orders
  const paidOrders = await Order.countDocuments({ paymentStatus: "paid" });

  // Completed Orders (delivered)
  const completedOrders = await Order.countDocuments({
    orderStatus: "delivered",
  });

  const stats = {
    revenue: {
      total: totalRevenue[0]?.total || 0,
      today: todayRevenue[0]?.total || 0,
      monthly: monthlyRevenue[0]?.total || 0,
    },
    orders: {
      total: totalOrders,
      today: todayOrders,
      monthly: monthlyOrders,
      pending: pendingOrders,
      paid: paidOrders,
      completed: completedOrders,
    },
    customers: {
      total: totalCustomers,
      newToday: newCustomersToday,
      newThisMonth: newCustomersThisMonth,
    },
    products: {
      total: totalProducts,
      outOfStock: outOfStockProducts,
      inStock: totalProducts - outOfStockProducts,
    },
  };

  return successResponse(res, { stats }, "Dashboard statistics fetched successfully");
});

/**
 * Get revenue chart data
 * Returns: Revenue data grouped by date (last 30 days, last 12 months, or custom range)
 */
exports.getRevenueChart = catchAsync(async (req, res) => {
  const { period = "30days" } = req.query; // 30days, 12months, custom

  let startDate;
  const now = new Date();
  const endDate = new Date(now);

  if (period === "30days") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
  } else if (period === "12months") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 12);
  } else if (period === "custom" && req.query.startDate && req.query.endDate) {
    startDate = new Date(req.query.startDate);
    endDate = new Date(req.query.endDate);
  } else {
    // Default to last 30 days
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
  }

  // Group by date (include delivered orders OR paid orders)
  const revenueData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [
          { orderStatus: "delivered" }, // Delivered orders count as revenue
          { paymentStatus: "paid" } // Paid orders also count
        ]
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: "$_id",
        revenue: 1,
        orders: 1,
        _id: 0,
      },
    },
  ]);

  return successResponse(
    res,
    { revenueData, period, startDate, endDate },
    "Revenue chart data fetched successfully"
  );
});

/**
 * Get customer statistics
 * Returns: Customer growth, active customers, customer segments
 */
exports.getCustomerStats = catchAsync(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Total customers
  const totalCustomers = await User.countDocuments({ role: "user" });

  // New customers by period
  const newToday = await User.countDocuments({
    role: "user",
    createdAt: { $gte: startOfToday },
  });
  const newThisWeek = await User.countDocuments({
    role: "user",
    createdAt: { $gte: startOfWeek },
  });
  const newThisMonth = await User.countDocuments({
    role: "user",
    createdAt: { $gte: startOfMonth },
  });
  const newThisYear = await User.countDocuments({
    role: "user",
    createdAt: { $gte: startOfYear },
  });

  // Active customers (customers who have placed at least one order)
  const activeCustomers = await Order.distinct("user").then((userIds) => userIds.length);

  // Customers with orders count
  const customersWithOrders = await Order.aggregate([
    {
      $group: {
        _id: "$user",
        orderCount: { $sum: 1 },
        totalSpent: { $sum: "$totalAmount" },
      },
    },
    {
      $group: {
        _id: null,
        oneOrder: { $sum: { $cond: [{ $eq: ["$orderCount", 1] }, 1, 0] } },
        multipleOrders: { $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] } },
      },
    },
  ]);

  // Customer growth over time (last 12 months)
  const growthData = await User.aggregate([
    {
      $match: {
        role: "user",
        createdAt: { $gte: new Date(now.getFullYear() - 1, 0, 1) },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        month: "$_id",
        count: 1,
        _id: 0,
      },
    },
  ]);

  const stats = {
    total: totalCustomers,
    new: {
      today: newToday,
      thisWeek: newThisWeek,
      thisMonth: newThisMonth,
      thisYear: newThisYear,
    },
    active: activeCustomers,
    segments: {
      oneOrder: customersWithOrders[0]?.oneOrder || 0,
      multipleOrders: customersWithOrders[0]?.multipleOrders || 0,
      noOrders: totalCustomers - activeCustomers,
    },
    growth: growthData,
  };

  return successResponse(res, { stats }, "Customer statistics fetched successfully");
});

/**
 * Get transactions data
 * Returns: Recent transactions with pagination
 */
exports.getTransactions = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, paymentMethod } = req.query;

  const filter = {};
  if (status) filter.paymentStatus = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;

  const total = await Order.countDocuments(filter);

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const transactions = await Order.find(filter)
    .populate("user", "name email")
    .select("orderNumber totalAmount paymentStatus paymentMethod createdAt orderStatus")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const formattedTransactions = transactions.map((order) => ({
    id: order._id,
    orderNumber: order.orderNumber,
    customer: {
      name: order.user?.name || "N/A",
      email: order.user?.email || "N/A",
    },
    amount: order.totalAmount,
    status: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    orderStatus: order.orderStatus,
    date: order.createdAt,
  }));

  return successResponse(
    res,
    {
      transactions: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
    "Transactions fetched successfully"
  );
});

/**
 * Get dashboard orders
 * Returns: Recent orders with pagination and filters
 */
exports.getDashboardOrders = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, paymentStatus } = req.query;

  const filter = {};
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const total = await Order.countDocuments(filter);

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .populate("items.product", "name slug mainImage")
    .select(
      "orderNumber trackingNumber items totalAmount orderStatus paymentStatus paymentMethod createdAt shippingAddress"
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const formattedOrders = orders.map((order) => ({
    id: order._id,
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber,
    customer: {
      name: order.user?.name || "N/A",
      email: order.user?.email || "N/A",
    },
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      product: item.product ? {
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.mainImage || null,
      } : null,
    })),
    totalAmount: order.totalAmount,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt,
  }));

  return successResponse(
    res,
    {
      orders: formattedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
    "Dashboard orders fetched successfully"
  );
});

/**
 * Get top products
 * Returns: Best selling products by sales count or revenue
 */
exports.getTopProducts = catchAsync(async (req, res) => {
  const { limit = 10, sortBy = "salesCount" } = req.query; // salesCount or revenue

  let topProducts;

  if (sortBy === "revenue") {
    // Top products by revenue (sum of order items)
    const revenueData = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          totalSold: { $sum: "$items.quantity" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: parseInt(limit) },
    ]);

    const productIds = revenueData.map((item) => item._id);

    const products = await Product.find({ _id: { $in: productIds } })
      .select("name slug price salePrice mainImage salesCount category")
      .populate("category", "name slug")
      .lean();

    // Merge revenue data with product data
    topProducts = revenueData.map((item) => {
      const product = products.find((p) => p._id.toString() === item._id.toString());
      return {
        product: product || null,
        revenue: item.revenue,
        totalSold: item.totalSold,
        orderCount: item.orderCount,
      };
    });
  } else {
    // Top products by salesCount (default)
    topProducts = await Product.find({ is_active: true, salesCount: { $gt: 0 } })
      .select("name slug price salePrice mainImage salesCount category")
      .populate("category", "name slug")
      .sort({ salesCount: -1 })
      .limit(parseInt(limit))
      .lean();

    topProducts = topProducts.map((product) => ({
      product,
      salesCount: product.salesCount,
      revenue: 0, // Would need to calculate from orders
      totalSold: product.salesCount,
      orderCount: 0,
    }));
  }

  return successResponse(res, { topProducts }, "Top products fetched successfully");
});

/**
 * Get top customers
 * Returns: Customers who have spent the most or placed most orders
 */
exports.getTopCustomers = catchAsync(async (req, res) => {
  const { limit = 10, sortBy = "revenue" } = req.query; // revenue or orders

  let topCustomers;

  if (sortBy === "orders") {
    // Top customers by order count
    topCustomers = await Order.aggregate([
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
          lastOrderDate: { $max: "$createdAt" },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: parseInt(limit) },
    ]);
  } else {
    // Top customers by revenue (default)
    topCustomers = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
          lastOrderDate: { $max: "$createdAt" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: parseInt(limit) },
    ]);
  }

  // Populate user details
  const userIds = topCustomers.map((item) => item._id);
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email phoneNumber createdAt")
    .lean();

  const formattedCustomers = topCustomers.map((item) => {
    const user = users.find((u) => u._id.toString() === item._id.toString());
    return {
      user: user || null,
      totalSpent: item.totalSpent || 0,
      orderCount: item.orderCount || 0,
      lastOrderDate: item.lastOrderDate || null,
    };
  });

  return successResponse(
    res,
    { topCustomers: formattedCustomers },
    "Top customers fetched successfully"
  );
});

/**
 * Get visitors chart data
 * Note: This is a placeholder - implement actual visitor tracking if needed
 * Returns: Mock visitor data or empty data structure
 */
exports.getVisitorsChart = catchAsync(async (req, res) => {
  const { period = "30days" } = req.query;

  let startDate;
  const now = new Date();

  if (period === "30days") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
  } else if (period === "12months") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 12);
  } else {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
  }

  // TODO: Implement actual visitor tracking
  // For now, return empty structure or mock data
  // You can track visitors by:
  // 1. Creating a Visitor model
  // 2. Logging visits in middleware
  // 3. Aggregating visitor data

  const visitorData = []; // Empty for now - implement tracking system

  return successResponse(
    res,
    {
      visitorData,
      period,
      startDate,
      endDate: now,
      note: "Visitor tracking not implemented. Please add visitor tracking system.",
    },
    "Visitors chart data fetched successfully"
  );
});

