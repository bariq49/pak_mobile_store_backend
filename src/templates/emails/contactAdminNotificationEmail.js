module.exports = (contactData) => {
  const {
    contactId,
    name,
    email,
    phone,
    subject,
    message,
    inquiryType,
    orderNumber,
    priority,
    createdAt,
    adminDashboardUrl,
  } = contactData;

  const priorityColors = {
    low: "#28a745",
    medium: "#ffc107",
    high: "#dc3545",
  };

  const priorityColor = priorityColors[priority] || "#6c757d";
  const inquiryTypeLabel = inquiryType ? inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1) : "General";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
        <h2 style="color: #dc3545; margin-top: 0;">🔔 New Contact Form Submission</h2>
        
        <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${priorityColor};">
          <div style="margin-bottom: 15px;">
            <span style="background-color: ${priorityColor}; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; font-weight: bold;">
              ${priority.toUpperCase()} PRIORITY
            </span>
            <span style="background-color: #6c757d; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; margin-left: 10px;">
              ${inquiryTypeLabel}
            </span>
          </div>
          
          <p style="margin: 0;"><strong>Contact ID:</strong> ${contactId}</p>
          <p style="margin: 10px 0 0 0;"><strong>Submitted:</strong> ${new Date(createdAt).toLocaleString()}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">Contact Information</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          ${phone ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
          ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
          ${orderNumber ? `<p><strong>Order Number:</strong> ${orderNumber}</p>` : ''}
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">Message</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</div>
        </div>
        
        ${adminDashboardUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${adminDashboardUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View in Admin Dashboard
          </a>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            This is an automated notification from Pak Mobile Store Contact System.<br>
            Please respond to the customer within 24-48 hours.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

