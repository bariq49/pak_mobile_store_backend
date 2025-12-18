const nodemailer = require("nodemailer");

// Helper function to strip HTML tags for plain text version
const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, "") // Remove style tags
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
    .replace(/<[^>]+>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
    .replace(/&amp;/g, "&") // Replace &amp; with &
    .replace(/&lt;/g, "<") // Replace &lt; with <
    .replace(/&gt;/g, ">") // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .trim();
};

const sendEmail = async (options) => {
  // Check if email configuration exists
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
    console.warn("⚠️  Email configuration missing. Email not sent.");
    console.warn("Required env vars: EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD");
    return null; // Silently fail if email is not configured
  }

  // 1) Create a transporter
  const emailPort = parseInt(process.env.EMAIL_PORT || "587", 10);
  const isSecure = emailPort === 465; // SSL for port 465, TLS/STARTTLS for port 587
  
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: emailPort,
    secure: isSecure, // true for SSL (port 465), false for TLS/STARTTLS (port 587)
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Add connection timeout and retry options (increased for Hostinger)
    connectionTimeout: 30000, // 30 seconds (increased from 10s)
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 30000, // 30 seconds
    // Add keepalive to maintain connection
    keepalive: true,
    // For TLS/STARTTLS (port 587), require TLS
    ...(emailPort === 587 && {
      requireTLS: true,
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates if needed
      },
    }),
    // For SSL (port 465)
    ...(emailPort === 465 && {
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates if needed
      },
    }),
  });

  // 2) Define email options with proper headers for better deliverability
  const fromAddress = process.env.EMAIL_FROM || `"Pak Mobile Store" <${process.env.EMAIL_USERNAME}>`;
  
  const mailOptions = {
    from: fromAddress,
    to: options.email,
    subject: options.subject,
    text: options.message || (options.html ? stripHtml(options.html) : ""), // Plain text version
    html: options.html || options.message || "", // HTML version
    // Add headers for better deliverability
    headers: {
      "X-Mailer": "Pak Mobile Store",
      "X-Priority": "3",
      "Importance": "normal",
      "List-Unsubscribe": `<mailto:${process.env.EMAIL_USERNAME}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    // Add reply-to if provided
    replyTo: options.replyTo || process.env.EMAIL_REPLY_TO || process.env.EMAIL_USERNAME,
  };

  // 3) Send the email (non-blocking - don't fail the main operation)
  try {
    // Log email details for debugging
    console.log(`📧 Sending email to ${options.email} from ${fromAddress}`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${options.email}:`, info.messageId);
    console.log(`   From: ${fromAddress}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   ⚠️  If email not received, check: 1) Spam folder 2) DNS records (SPF/DKIM) 3) Wait 5-10 minutes`);
    return info;
  } catch (error) {
    // Provide helpful error messages for common issues
    if (error.code === "EAUTH") {
      console.error("❌ Email authentication failed:");
      if (process.env.EMAIL_HOST?.includes("gmail")) {
        console.error("   For Gmail, you need to use an App Password, not your regular password.");
        console.error("   Steps: Google Account → Security → 2-Step Verification → App Passwords");
        console.error("   Generate an app password and use it as EMAIL_PASSWORD");
      } else if (process.env.EMAIL_HOST?.includes("hostinger")) {
        console.error("   For Hostinger email:");
        console.error("   - Use your full email address as EMAIL_USERNAME (e.g., noreply@yourdomain.com)");
        console.error("   - Use your Hostinger email account password as EMAIL_PASSWORD");
        console.error("   - Port 465 (SSL) or 587 (TLS) should be set in EMAIL_PORT");
        console.error("   - Verify credentials in Hostinger hPanel → Email → Email Accounts");
      } else {
        console.error("   Check your EMAIL_USERNAME and EMAIL_PASSWORD in .env file");
        console.error("   Make sure EMAIL_PORT matches your email provider's requirements");
      }
    } else {
      console.error("❌ Email sending failed:", error.message);
      if (error.code === "ECONNREFUSED") {
        console.error("   Connection refused - check EMAIL_HOST and EMAIL_PORT settings");
        console.error("   For Hostinger: EMAIL_HOST=smtp.hostinger.com, EMAIL_PORT=465 or 587");
      } else if (error.code === "ETIMEDOUT" || error.message?.includes("Timeout")) {
        console.error("   Connection timeout - possible causes:");
        console.error("   1. Firewall blocking SMTP port (465 or 587)");
        console.error("   2. Wrong EMAIL_HOST or EMAIL_PORT");
        console.error("   3. Network connectivity issues");
        console.error("   4. Hostinger SMTP server may be temporarily unavailable");
        console.error("   Try: EMAIL_PORT=587 (TLS) instead of 465 (SSL)");
      } else if (error.code === "ESOCKETTIMEDOUT") {
        console.error("   Socket timeout - server not responding");
        console.error("   Check if SMTP port is accessible from your server");
      }
    }
    // Don't throw - email failure shouldn't break the main operation
    return null;
  }
};

module.exports = sendEmail;
