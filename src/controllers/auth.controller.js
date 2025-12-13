const crypto = require("crypto");
const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");
const welcomeEmail = require("../templates/emails/welcomeEmail");
const resetPasswordEmail = require("../templates/emails/resetPasswordEmail");
const { createSendToken } = require("../utils/token");
const successResponse = require("../utils/successResponse");

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, role } = req.body;
  if (!name || !email || !password || !passwordConfirm) {
    return next(new AppError("All required fields must be provided", 400));
  }
  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }
  // 🔒 SECURITY: Force role to "user" - prevent admin creation from e-commerce site
  // Ignore any role sent from frontend - e-commerce site can only create regular users
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role: "user", // Always "user" - never allow admin creation from this endpoint
  });

  // Send welcome email (non-blocking - don't fail signup if email fails)
  try {
    await sendEmail({
      email: newUser.email,
      subject: "Welcome to Pak Mobile Store!",
      message: `Welcome ${newUser.name}! We're glad to have you.`,
      html: welcomeEmail(newUser.name),
    });
  } catch (emailError) {
    // Log error but don't fail signup
    console.error("Welcome email failed to send:", emailError.message);
  }

  createSendToken(newUser, 201, res, "User registered successfully", "user_token");
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Provide email & password", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 🔒 SECURITY: Regular login endpoint only allows users with role "user"
  // Admins must use /auth/admin/login endpoint
  if (user.role === "admin") {
    return next(
      new AppError("Access denied. Please use admin login for administrator accounts.", 403)
    );
  }

  createSendToken(user, 200, res, "login successfully", "user_token");
});

exports.logout = (req, res) => {
  res.cookie("user_token", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    path: "/",
  });

  return successResponse(res, {}, "Logged out successfully", 200);
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message: `Reset your password using this link: ${resetURL}`,
      html: resetPasswordEmail(resetURL),
    });

    return successResponse(res, {}, "Token sent to email!", 200);
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res, "Password reset successful", "user_token");
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();

  createSendToken(user, 200, res, "Password updated successfully", "user_token");
});

// ============================================
// ADMIN AUTHENTICATION
// ============================================

/**
 * Admin Signup
 * Requires ADMIN_SECRET_KEY for security
 * Only creates users with role: "admin"
 */
exports.adminSignup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, adminSecretKey } = req.body;

  // Validate required fields
  if (!name || !email || !password || !passwordConfirm) {
    return next(new AppError("All required fields must be provided", 400));
  }

  // Verify admin secret key (add ADMIN_SECRET_KEY to your .env file)
  const validAdminKey = process.env.ADMIN_SECRET_KEY || "pak-mobile-admin-2025";
  if (!adminSecretKey || adminSecretKey !== validAdminKey) {
    return next(new AppError("Invalid admin secret key. Access denied.", 403));
  }

  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("Email already registered", 400));
  }

  // Create admin user
  const newAdmin = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role: "admin", // Force admin role
  });

  // Send welcome email (non-blocking)
  try {
    await sendEmail({
      email: newAdmin.email,
      subject: "Welcome Admin - Pak Mobile Store!",
      message: `Welcome ${newAdmin.name}! You have been registered as an administrator.`,
      html: welcomeEmail(newAdmin.name),
    });
  } catch (emailError) {
    console.error("Admin welcome email failed:", emailError.message);
  }

  createSendToken(newAdmin, 201, res, "Admin registered successfully", "admin_token");
});

/**
 * Admin Login
 * Only allows users with role: "admin" to login
 */
exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // Find user and include password
  const user = await User.findOne({ email }).select("+password");

  // Check if user exists and password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // Check if user is an admin
  if (user.role !== "admin") {
    return next(
      new AppError("Access denied. This login is for administrators only.", 403)
    );
  }

  createSendToken(user, 200, res, "Admin login successful", "admin_token");
});

/**
 * Admin Logout
 */
exports.adminLogout = (req, res) => {
  res.cookie("admin_token", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    path: "/",
  });

  return successResponse(res, {}, "Admin logged out successfully", 200);
};

/**
 * Admin Forgot Password
 */
exports.adminForgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email, role: "admin" });
  
  if (!user) {
    return next(new AppError("No admin found with that email address.", 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/admin/reset-password?token=${resetToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Admin Password Reset (valid for 10 min)",
      message: `Reset your admin password using this link: ${resetURL}`,
      html: resetPasswordEmail(resetURL),
    });

    return successResponse(res, {}, "Password reset token sent to email!", 200);
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("Error sending email. Try again later!", 500)
    );
  }
});

/**
 * Admin Reset Password
 */
exports.adminResetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
    role: "admin",
  });

  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res, "Admin password reset successful", "admin_token");
});

/**
 * Admin Update Password (when logged in)
 */
exports.adminUpdatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!user || user.role !== "admin") {
    return next(new AppError("Access denied. Admin only.", 403));
  }

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();

  createSendToken(user, 200, res, "Admin password updated successfully", "admin_token");
});
