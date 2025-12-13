const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const path = require("path");
const app = express();

const AppError = require("./utils/appError");
const errorHandler = require("./middleware/error");

const authRoutes = require("./routes/auth.routes");
const userRoute = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const dealRoutes = require("./routes/deal.routes");
const cartRoutes = require("./routes/cart.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const orderRoutes = require("./routes/order.routes");
const couponRoutes = require("./routes/coupon.routes");
const shippingZoneRoutes = require("./routes/shippingZone.routes");
const siteSettingRoutes = require("./routes/siteSetting.routes");
const stripeWebhook = require("./routes/stripeWebhook.route");

app.use("/api/stripe", stripeWebhook);

// CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "https://pakmobilestore.es",
    "https://pak-mobile-admin-dashboard.vercel.app/auth/login",
    process.env.CLIENT_URL, // From .env file
  ].filter(Boolean), // Remove undefined values
  credentials: true, // Allow cookies to be sent
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Security
app.use(helmet());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Body parser - Increased limits to handle large product payloads
// Note: For multipart/form-data (file uploads), multer handles the parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ limit: "50mb", type: "text/plain" })); // Handle text/plain as JSON
app.use(express.urlencoded({ extended: true, limit: "50mb", parameterLimit: 50000 }));
app.use(cookieParser());

// Middleware to parse text/plain as JSON if it looks like JSON
app.use((req, res, next) => {
  if (req.is("text/plain") && typeof req.body === "string" && req.body.trim().startsWith("{")) {
    try {
      req.body = JSON.parse(req.body);
    } catch (err) {
      // If parsing fails, keep as string
    }
  }
  next();
});

// Sanitization
app.use(mongoSanitize());
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

// Compression
app.use(compression());
app.get("/", (req, res) => {
  res.send("Hello world");
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/admin/dashboard", dashboardRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/deals", dealRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/coupon", couponRoutes);
app.use("/api/v1/shipping-zones", shippingZoneRoutes);
app.use("/api/v1/admin/settings", siteSettingRoutes);

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(errorHandler);

module.exports = app;
