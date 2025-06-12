const nodemailer = require('nodemailer');
const { ApiError } = require('../middlewares/errorMiddleware');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a transporter for sending emails
// Using domain-specific SMTP settings (alternative option)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.orincore.com', // Domain-specific SMTP server
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER || 'contact@orincore.com',
    pass: process.env.EMAIL_PASSWORD || 'Prasenjeet@1'
  },
  // TLS configuration for secure connection
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates
  }
});

/**
 * Alternative service for handling email operations with domain-specific SMTP
 */
class DomainEmailService {
  /**
   * Send a verification email
   * 
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} verificationUrl - Verification URL
   * @return {Promise<Object>} Email sending result
   */
  static async sendVerificationEmail(email, name, verificationUrl) {
    try {
      const mailOptions = {
        from: `"Orincore AI Studio" <${process.env.EMAIL_FROM || 'contact@orincore.com'}>`,
        to: email,
        subject: 'Verify Your Email - Orincore AI Studio',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4b36df; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Orincore AI Studio</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
              <h2>Welcome to Orincore AI Studio, ${name}!</h2>
              <p>Thank you for signing up. Please verify your email address to activate your account.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #4b36df; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
              </div>
              <p>If you didn't create an account, you can safely ignore this email.</p>
              <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
              <p style="word-break: break-all; font-size: 14px;">${verificationUrl}</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
              <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Orincore AI Studio. All rights reserved.</p>
            </div>
          </div>
        `
      };

      // Log the email attempt
      console.log(`Attempting to send verification email to ${email} from ${mailOptions.from} using domain SMTP`);

      const info = await transporter.sendMail(mailOptions);
      console.log('Verification email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending verification email with domain SMTP:', error);
      throw new ApiError(`Failed to send verification email with domain SMTP: ${error.message}`, 500);
    }
  }

  /**
   * Verify email configuration
   * 
   * @return {Promise<Object>} Verification result
   */
  static async verifyConnection() {
    try {
      return await transporter.verify();
    } catch (error) {
      console.error('Domain email configuration error:', error);
      throw new ApiError(`Domain email configuration error: ${error.message}`, 500);
    }
  }
}

module.exports = DomainEmailService; 