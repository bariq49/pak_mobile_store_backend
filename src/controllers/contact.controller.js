const Contact = require("../models/contact.model");
const catchAsync = require("../utils/catchAsync");
const successResponse = require("../utils/successResponse");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");
const contactConfirmationEmail = require("../templates/emails/contactConfirmationEmail");
const contactAdminNotificationEmail = require("../templates/emails/contactAdminNotificationEmail");

// Submit contact form (Public endpoint)
exports.submitContact = catchAsync(async (req, res, next) => {
  const { name, email, phone, subject, message, inquiryType, orderNumber } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return next(new AppError("Name, email, and message are required fields", 400));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError("Please provide a valid email address", 400));
  }

  // Validate name length
  if (name.length < 2 || name.length > 100) {
    return next(new AppError("Name must be between 2 and 100 characters", 400));
  }

  // Validate message length
  if (message.length > 5000) {
    return next(new AppError("Message cannot exceed 5000 characters", 400));
  }

  // Validate subject length if provided
  if (subject && subject.length > 200) {
    return next(new AppError("Subject cannot exceed 200 characters", 400));
  }

  // Validate inquiryType if provided
  const validInquiryTypes = ["general", "support", "sales", "complaint", "feedback", "partnership"];
  const finalInquiryType = inquiryType && validInquiryTypes.includes(inquiryType.toLowerCase()) 
    ? inquiryType.toLowerCase() 
    : "general";

  // Determine priority based on inquiry type
  let priority = "medium";
  if (finalInquiryType === "complaint" || finalInquiryType === "support") {
    priority = "high";
  } else if (finalInquiryType === "feedback" || finalInquiryType === "general") {
    priority = "low";
  }

  // Get IP address and user agent for spam detection
  const ipAddress = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  // Rate limiting check: Max 5 submissions per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSubmissions = await Contact.countDocuments({
    email: email.toLowerCase(),
    createdAt: { $gte: oneHourAgo },
  });

  if (recentSubmissions >= 5) {
    return next(
      new AppError(
        "Too many submissions. Please wait before submitting another message.",
        429
      )
    );
  }

  // Basic spam detection - check for common spam patterns in message
  const spamPatterns = [
    /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|net|org|io|xyz)[^\s]*/gi,
    /buy now|click here|limited time|act now|urgent|make money/i,
  ];
  const messageLower = message.toLowerCase();
  const spamScore = spamPatterns.reduce((score, pattern) => {
    return score + (messageLower.match(pattern) || []).length;
  }, 0);

  // Create contact record
  const contact = await Contact.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone ? phone.trim() : undefined,
    subject: subject ? subject.trim() : undefined,
    message: message.trim(),
    inquiryType: finalInquiryType,
    orderNumber: orderNumber ? orderNumber.trim() : undefined,
    priority,
    ipAddress,
    userAgent,
  });

  // Send confirmation email to user (non-blocking)
  try {
    await sendEmail({
      email: contact.email,
      subject: "Thank You for Contacting Us - Pak Mobile Store",
      html: contactConfirmationEmail({
        name: contact.name,
        contactId: contact.contactId,
        inquiryType: contact.inquiryType,
        subject: contact.subject,
        message: contact.message,
        estimatedResponseTime: "24-48 hours",
      }),
    });
  } catch (emailError) {
    console.error("Contact confirmation email failed:", emailError.message);
    // Don't fail the submission if email fails
  }

  // Send notification email to admin/support team (non-blocking)
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USERNAME;
    if (adminEmail) {
      const adminDashboardUrl = process.env.ADMIN_DASHBOARD_URL || `${process.env.CLIENT_URL}/admin/contacts`;
      
      await sendEmail({
        email: adminEmail,
        subject: `New Contact Form Submission - ${contact.contactId} [${priority.toUpperCase()}]`,
        html: contactAdminNotificationEmail({
          contactId: contact.contactId,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          subject: contact.subject,
          message: contact.message,
          inquiryType: contact.inquiryType,
          orderNumber: contact.orderNumber,
          priority: contact.priority,
          createdAt: contact.createdAt,
          adminDashboardUrl,
        }),
      });
    }
  } catch (emailError) {
    console.error("Admin notification email failed:", emailError.message);
    // Don't fail the submission if email fails
  }

  return successResponse(
    res,
    {
      contactId: contact.contactId,
      submittedAt: contact.createdAt,
      estimatedResponseTime: "24-48 hours",
    },
    "Your message has been received. We'll get back to you soon.",
    201
  );
});

// Get contact status (Public endpoint - requires contactId and email verification)
exports.getContactStatus = catchAsync(async (req, res, next) => {
  const { contactId } = req.params;
  const { email } = req.query;

  if (!email) {
    return next(new AppError("Email is required to check status", 400));
  }

  const contact = await Contact.findOne({
    contactId,
    email: email.toLowerCase().trim(),
  });

  if (!contact) {
    return next(new AppError("Contact not found or email does not match", 404));
  }

  // Return limited information (no sensitive data)
  return successResponse(
    res,
    {
      contactId: contact.contactId,
      status: contact.status,
      submittedAt: contact.createdAt,
      resolvedAt: contact.resolvedAt,
    },
    "Contact status retrieved successfully",
    200
  );
});

// Get all contacts (Admin only)
exports.getAllContacts = catchAsync(async (req, res, next) => {
  // Build filter object
  const filter = {};

  // Filter by status if provided
  if (req.query.status) {
    filter.status = req.query.status;
  }

  // Filter by inquiryType if provided
  if (req.query.inquiryType) {
    filter.inquiryType = req.query.inquiryType;
  }

  // Filter by priority if provided
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }

  // Search by name, email, contactId, or orderNumber
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { contactId: searchRegex },
      { orderNumber: searchRegex },
    ];
  }

  // Count total with filters
  const total = await Contact.countDocuments(filter);

  // Build query with filters
  let query = Contact.find(filter).sort({ createdAt: -1 });

  // Apply pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const contacts = await query.skip(skip).limit(limit);

  const pagination = {
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  };

  return successResponse(
    res,
    { contacts, pagination },
    "Contacts fetched successfully",
    200
  );
});

// Get single contact (Admin only)
exports.getContact = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const contact = await Contact.findById(id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  return successResponse(res, { contact }, "Contact fetched successfully", 200);
});

// Update contact (Admin only)
exports.updateContact = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status, priority, assignedTo, adminNotes } = req.body;

  const allowedUpdates = {};
  if (status) allowedUpdates.status = status;
  if (priority) allowedUpdates.priority = priority;
  if (assignedTo !== undefined) allowedUpdates.assignedTo = assignedTo;
  if (adminNotes !== undefined) allowedUpdates.adminNotes = adminNotes;

  const contact = await Contact.findByIdAndUpdate(id, allowedUpdates, {
    new: true,
    runValidators: true,
  });

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  return successResponse(res, { contact }, "Contact updated successfully", 200);
});

// Delete contact (Admin only - soft delete recommended, but implementing hard delete as per spec)
exports.deleteContact = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const contact = await Contact.findByIdAndDelete(id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  return successResponse(res, null, "Contact deleted successfully", 200);
});

// Send reply to user (Admin only)
exports.replyToContact = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { replyMessage } = req.body;

  if (!replyMessage || replyMessage.trim().length === 0) {
    return next(new AppError("Reply message is required", 400));
  }

  const contact = await Contact.findById(id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  // Send reply email to user
  try {
    await sendEmail({
      email: contact.email,
      subject: `Re: ${contact.subject || "Your Inquiry"} - ${contact.contactId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h2 style="color: #4CAF50; margin-top: 0;">Response to Your Inquiry</h2>
            
            <p>Hi ${contact.name},</p>
            
            <p>Thank you for contacting Pak Mobile Store. We've received your inquiry (Reference ID: ${contact.contactId}) and would like to respond:</p>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
              <div style="white-space: pre-wrap;">${replyMessage}</div>
            </div>
            
            <p>If you have any further questions or concerns, please don't hesitate to reach out to us again.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                Best regards,<br>
                <strong>Pak Mobile Store Support Team</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      replyTo: process.env.EMAIL_USERNAME || process.env.ADMIN_EMAIL,
    });
  } catch (emailError) {
    console.error("Reply email failed:", emailError.message);
    return next(new AppError("Failed to send reply email", 500));
  }

  // Update contact status to in_progress if it was pending
  if (contact.status === "pending") {
    contact.status = "in_progress";
    await contact.save();
  }

  return successResponse(res, null, "Reply sent successfully", 200);
});

