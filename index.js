const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Resend
const resend = new Resend('re_c9oesu6d_EYu5CabvucSi1hfQGCmDJYe8');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Send job application email endpoint
app.post('/api/sendJobApplication', upload.single('resume'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, department } = req.body;
    const resume = req.file;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !department) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
    }

    if (!resume) {
      return res.status(400).json({ 
        success: false,
        error: 'Resume file is required' 
      });
    }

    // Prepare attachment for email
    const attachment = {
      filename: resume.originalname,
      content: resume.buffer,
    };

    // Email to HR/Company
    const hrEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #f97316, #f59e0b); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #f97316; }
            .label { font-weight: bold; color: #f97316; display: inline-block; width: 150px; }
            .value { color: #374151; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Job Application</h1>
              <p style="margin: 10px 0 0 0;">Patel Construction</p>
            </div>
            <div class="content">
              <p>A new job application has been submitted through the website.</p>
              <div class="info-row">
                <span class="label">Applicant Name:</span>
                <span class="value">${firstName} ${lastName}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${email}</span>
              </div>
              <div class="info-row">
                <span class="label">Phone Number:</span>
                <span class="value">${phone}</span>
              </div>
              <div class="info-row">
                <span class="label">Department:</span>
                <span class="value">${department}</span>
              </div>
              <div class="info-row">
                <span class="label">Resume:</span>
                <span class="value">${resume.originalname}</span>
              </div>
              <div class="footer">
                <p>This email was sent from the Patel Construction career application form.</p>
                <p>Please review the application and contact the candidate if interested.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Confirmation email to applicant
    const confirmationEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #f97316, #f59e0b); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .message { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Application Received!</h1>
              <p style="margin: 10px 0 0 0;">Patel Construction</p>
            </div>
            <div class="content">
              <p>Dear ${firstName},</p>
              <div class="message">
                <p>Thank you for your interest in joining Patel Construction!</p>
                <p>We have successfully received your job application. Our HR team will review your application carefully and get back to you within 5-7 business days.</p>
                <p>If your qualifications match our requirements, we will contact you to schedule an interview.</p>
                <p><strong>What's Next?</strong></p>
                <ul>
                  <li>Our team will review your application and resume</li>
                  <li>Qualified candidates will be contacted for an interview</li>
                  <li>We'll keep your information on file for future opportunities</li>
                </ul>
              </div>
              <p>If you have any questions, please feel free to contact us at <a href="mailto:patelconstruction13@gmail.com">patelconstruction13@gmail.com</a> or call us at +91 96017 51259.</p>
              <p>Best regards,<br><strong>HR Team</strong><br>Patel Construction</p>
              <div class="footer">
                <p>This is an automated confirmation email.</p>
                <p>B-59 TO 62 Signature Galleria, Mahavir Tarning Ankleshwar-393002</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send both emails
    const [hrEmail, confirmationEmail] = await Promise.all([
      resend.emails.send({
        from: 'Patel Construction <onboarding@resend.dev>',
        to: 'dhruvghadiali21@gmail.com',
        subject: `New Job Application - ${firstName} ${lastName} (${department})`,
        html: hrEmailHtml,
        reply_to: email,
        attachments: [attachment],
      }),
      resend.emails.send({
        from: 'Patel Construction <onboarding@resend.dev>',
        to: email,
        subject: 'Application Received - Patel Construction',
        html: confirmationEmailHtml,
      }),
    ]);

    console.log('Emails sent successfully:', {
      hrEmailId: hrEmail.data?.id,
      confirmationEmailId: confirmationEmail.data?.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Emails sent successfully',
      hrEmailId: hrEmail.data?.id,
      confirmationEmailId: confirmationEmail.data?.id,
    });

  } catch (error) {
    console.error('Error sending emails:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send emails',
    });
  }
});

// Contact us endpoint
app.post('/api/contactUs', async (req, res) => {
  try {
    const { firstName, lastName, companyName, companyEmail, contactNumber, preferredTime } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !companyName || !companyEmail || !contactNumber || !preferredTime) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
    }

    // Email to company about new inquiry
    const inquiryEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #f97316, #f59e0b); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #f97316; }
            .label { font-weight: bold; color: #f97316; display: inline-block; width: 180px; }
            .value { color: #374151; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Inquiry Received</h1>
              <p style="margin: 10px 0 0 0;">Patel Construction</p>
            </div>
            <div class="content">
              <p>A new contact inquiry has been submitted through the website.</p>
              <div class="info-row">
                <span class="label">Contact Name:</span>
                <span class="value">${firstName} ${lastName}</span>
              </div>
              <div class="info-row">
                <span class="label">Company Name:</span>
                <span class="value">${companyName}</span>
              </div>
              <div class="info-row">
                <span class="label">Company Email:</span>
                <span class="value">${companyEmail}</span>
              </div>
              <div class="info-row">
                <span class="label">Contact Number:</span>
                <span class="value">${contactNumber}</span>
              </div>
              <div class="info-row">
                <span class="label">Preferred Time to Contact:</span>
                <span class="value">${preferredTime}</span>
              </div>
              <div class="footer">
                <p>This email was sent from the Patel Construction contact form.</p>
                <p>Please reach out to the client at your earliest convenience.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Thank you email to the contact person
    const thankYouEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #f97316, #f59e0b); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .message { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Thank You for Contacting Us!</h1>
              <p style="margin: 10px 0 0 0;">Patel Construction</p>
            </div>
            <div class="content">
              <p>Dear ${firstName},</p>
              <div class="message">
                <p>Thank you for reaching out to Patel Construction!</p>
                <p>We have successfully received your inquiry and appreciate your interest in our services.</p>
                <p>Our team will review your request and get back to you during your preferred time: <strong>${preferredTime}</strong></p>
                <p><strong>What Happens Next?</strong></p>
                <ul>
                  <li>Our team will review your inquiry</li>
                  <li>We'll contact you at ${contactNumber} during your preferred time</li>
                  <li>We'll discuss how we can help with your construction needs</li>
                </ul>
              </div>
              <p>If you have any urgent questions, please feel free to contact us directly at <a href="mailto:patelconstruction13@gmail.com">patelconstruction13@gmail.com</a> or call us at +91 96017 51259.</p>
              <p>Best regards,<br><strong>Customer Service Team</strong><br>Patel Construction</p>
              <div class="footer">
                <p>This is an automated confirmation email.</p>
                <p>B-59 TO 62 Signature Galleria, Mahavir Tarning Ankleshwar-393002</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send both emails
    const [inquiryEmail, thankYouEmail] = await Promise.all([
      resend.emails.send({
        from: 'Patel Construction <onboarding@resend.dev>',
        to: 'dhruvghadiali21@gmail.com',
        subject: `New Inquiry - ${companyName} (${firstName} ${lastName})`,
        html: inquiryEmailHtml,
        reply_to: companyEmail,
      }),
      resend.emails.send({
        from: 'Patel Construction <onboarding@resend.dev>',
        to: companyEmail,
        subject: 'Thank You for Contacting Patel Construction',
        html: thankYouEmailHtml,
      }),
    ]);

    console.log('Contact emails sent successfully:', {
      inquiryEmailId: inquiryEmail.data?.id,
      thankYouEmailId: thankYouEmail.data?.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Contact inquiry sent successfully',
      inquiryEmailId: inquiryEmail.data?.id,
      thankYouEmailId: thankYouEmail.data?.id,
    });

  } catch (error) {
    console.error('Error sending contact emails:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send contact inquiry',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/sendJobApplication`);
});
