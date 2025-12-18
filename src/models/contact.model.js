const mongoose = require("mongoose");
const validator = require("validator");

const CONTACT_PREFIX = process.env.CONTACT_PREFIX || "CT";

const contactSchema = new mongoose.Schema(
  {
    contactId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(v),
        message: "Please provide a valid phone number",
      },
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Please provide a message"],
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    inquiryType: {
      type: String,
      enum: ["general", "support", "sales", "complaint", "feedback", "partnership"],
      default: "general",
    },
    orderNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved", "closed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ inquiryType: 1 });
contactSchema.index({ contactId: 1 });

// Auto-generate contactId before saving
contactSchema.pre("validate", async function (next) {
  if (!this.contactId) {
    const year = new Date().getFullYear();
    const lastContact = await mongoose
      .model("Contact")
      .findOne()
      .sort({ createdAt: -1 });

    let nextSeq = 1;
    if (lastContact && lastContact.contactId) {
      const regex = new RegExp(`^${CONTACT_PREFIX}-${year}-(\\d+)$`);
      const match = lastContact.contactId.match(regex);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    this.contactId = `${CONTACT_PREFIX}-${year}-${String(nextSeq).padStart(6, "0")}`;
  }
  next();
});

// Update resolvedAt when status changes to resolved
contactSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "resolved" && !this.resolvedAt) {
    this.resolvedAt = new Date();
  } else if (this.isModified("status") && this.status !== "resolved" && this.resolvedAt) {
    this.resolvedAt = null;
  }
  next();
});

module.exports = mongoose.model("Contact", contactSchema);

