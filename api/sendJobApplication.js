import { Resend } from 'resend';

const resend = new Resend('re_c9oesu6d_EYu5CabvucSi1hfQGCmDJYe8');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { firstName, lastName, email, phone, department, resumeName } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !department) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
                <span class="value">${resumeName || 'Attached'}</span>
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
        to: 'patelconstruction13@gmail.com',
        subject: `New Job Application - ${firstName} ${lastName} (${department})`,
        html: hrEmailHtml,
        reply_to: email,
      }),
      resend.emails.send({
        from: 'Patel Construction <onboarding@resend.dev>',
        to: email,
        subject: 'Application Received - Patel Construction',
        html: confirmationEmailHtml,
      }),
    ]);

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
}
