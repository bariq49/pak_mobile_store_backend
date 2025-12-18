module.exports = (contactData) => {
  const { name, contactId, inquiryType, subject, message, estimatedResponseTime } = contactData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact Form Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
        <h2 style="color: #4CAF50; margin-top: 0;">Thank You for Contacting Us! 🎉</h2>
        
        <p>Hi ${name},</p>
        
        <p>We've received your message and wanted to confirm that it's been successfully submitted to our support team.</p>
        
        <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <p style="margin: 0;"><strong>Reference ID:</strong> ${contactId}</p>
          ${subject ? `<p style="margin: 10px 0 0 0;"><strong>Subject:</strong> ${subject}</p>` : ''}
          ${inquiryType ? `<p style="margin: 10px 0 0 0;"><strong>Inquiry Type:</strong> ${inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1)}</p>` : ''}
        </div>
        
        <p><strong>Expected Response Time:</strong> ${estimatedResponseTime || "24-48 hours"}</p>
        
        <p>Our team will review your inquiry and get back to you as soon as possible. Please keep your reference ID (${contactId}) handy for future correspondence.</p>
        
        <p>If you have any urgent concerns, feel free to reach out to us directly.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            Best regards,<br>
            <strong>Pak Mobile Store Support Team</strong>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

