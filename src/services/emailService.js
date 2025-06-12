const nodemailer = require('nodemailer');
const { ApiError } = require('../middlewares/errorMiddleware');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a transporter for sending emails
// Using Brevo (formerly SendinBlue) as the SMTP provider for better deliverability
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.SMTP_USER || '8f72fc001@smtp-brevo.com', // Brevo SMTP username
    pass: process.env.SMTP_PASSWORD || '8VWZOyYjp605sXwT' // Brevo SMTP password/API key
  }
});

/**
 * Service for handling email operations
 */
class EmailService {
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
        from: `"Orincore AI Studio" <${process.env.EMAIL_FROM || 'no-reply@orincore.com'}>`,
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
      console.log(`Attempting to send verification email to ${email} from ${mailOptions.from}`);

      const info = await transporter.sendMail(mailOptions);
      console.log('Verification email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new ApiError(`Failed to send verification email: ${error.message}`, 500);
    }
  }

  /**
   * Send a password reset email
   * 
   * @param {string} email - Recipient email
   * @param {string} resetUrl - Password reset URL
   * @return {Promise<Object>} Email sending result
   */
  static async sendPasswordResetEmail(email, resetUrl) {
    try {
      const mailOptions = {
        from: `"Orincore AI Studio" <${process.env.EMAIL_FROM || 'no-reply@orincore.com'}>`,
        to: email,
        subject: 'Reset Your Password - Orincore AI Studio',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4b36df; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Orincore AI Studio</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
              <h2>Password Reset Request</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #4b36df; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
              </div>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
              <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
              <p style="word-break: break-all; font-size: 14px;">${resetUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
              <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Orincore AI Studio. All rights reserved.</p>
            </div>
          </div>
        `
      };

      // Log the email attempt
      console.log(`Attempting to send password reset email to ${email} from ${mailOptions.from}`);

      const info = await transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new ApiError(`Failed to send password reset email: ${error.message}`, 500);
    }
  }

  /**
   * Send an OTP email
   * 
   * @param {string} email - Recipient email
   * @param {string} otp - One-time password (6-digit code)
   * @param {string} purpose - Purpose of the OTP (verification or reset)
   * @return {Promise<Object>} Email sending result
   */
  static async sendOtpEmail(email, otp, purpose = 'verification') {
    try {
      // Determine subject and content based on purpose
      let subject, heading, description;
      
      if (purpose === 'reset') {
        subject = 'Password Reset Code - Orincore AI Studio';
        heading = 'Password Reset Code';
        description = 'You requested to reset your password for Orincore AI Studio. Use the 6-digit code below to complete the password reset process:';
      } else {
        subject = 'Email Verification Code - Orincore AI Studio';
        heading = 'Email Verification Code';
        description = 'Thank you for signing up with Orincore AI Studio. Please use the 6-digit code below to verify your email address:';
      }
      
      const mailOptions = {
        from: `"Orincore AI Studio" <${process.env.EMAIL_FROM || 'no-reply@orincore.com'}>`,
        to: email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4b36df; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Orincore AI Studio</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
              <h2>${heading}</h2>
              <p>${description}</p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; background-color: #f5f5f5; padding: 15px; border-radius: 4px; display: inline-block; min-width: 240px;">${otp}</div>
              </div>
              <p style="font-weight: bold;">This code will expire in 10 minutes.</p>
              <p>If you didn't request this code, you can safely ignore this email.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
              <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Orincore AI Studio. All rights reserved.</p>
              <p style="font-size: 12px; color: #666;">Please do not reply to this email. This mailbox is not monitored.</p>
            </div>
          </div>
        `
      };

      // Log the email attempt
      console.log(`Attempting to send OTP email to ${email} from ${mailOptions.from}`);

      const info = await transporter.sendMail(mailOptions);
      console.log('OTP email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw new ApiError(`Failed to send OTP email: ${error.message}`, 500);
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
      console.error('Email configuration error:', error);
      throw new ApiError(`Email configuration error: ${error.message}`, 500);
    }
  }

  /**
   * Send a welcome email after successful verification
   * 
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @return {Promise<Object>} Email sending result
   */
  static async sendWelcomeEmail(email, name) {
    try {
      const mailOptions = {
        from: `"Orincore AI Studio" <${process.env.EMAIL_FROM || 'no-reply@orincore.com'}>`,
        to: email,
        subject: 'Welcome to Orincore AI Studio! 🎉',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px; overflow: hidden;">
            <!-- Header with logo -->
            <div style="background-color: #4b36df; background-image: linear-gradient(135deg, #4b36df 0%, #7e5fdb 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 1px;">Orincore AI Studio</h1>
              <p style="color: white; opacity: 0.9; margin-top: 5px; font-size: 16px;">Advanced AI Image Generation</p>
            </div>
            
            <!-- Welcome message -->
            <div style="padding: 30px 25px; background-color: white;">
              <h2 style="color: #333; font-size: 22px; margin-top: 0;">Welcome, ${name}! 🎉</h2>
              <p style="color: #555; line-height: 1.6; font-size: 16px;">Thank you for joining Orincore AI Studio. We're excited to have you on board! Your account has been successfully verified and is now ready to use.</p>
              
              <!-- Features section -->
              <div style="margin: 30px 0; border-left: 4px solid #4b36df; padding-left: 20px;">
                <h3 style="color: #4b36df; margin-bottom: 10px; font-size: 18px;">Here's what you can do with our AI-powered tools:</h3>
                <ul style="color: #555; padding-left: 20px; line-height: 1.7;">
                  <li><strong>Create YouTube Thumbnails</strong> - Generate eye-catching thumbnails for your videos</li>
                  <li><strong>Design Professional Posters</strong> - Create posters for business, events, or promotions</li>
                  <li><strong>Generate Custom Images</strong> - Turn your ideas into stunning visuals</li>
                </ul>
              </div>
              
              <!-- CTA button -->
              <div style="text-align: center; margin: 35px 0 25px;">
                <a href="${process.env.FRONTEND_URL || 'https://orincore.com'}" style="background-color: #4b36df; color: white; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">Get Started Now</a>
              </div>
              
              <p style="color: #555; line-height: 1.6; font-size: 16px;">If you have any questions or need assistance, feel free to reach out to our support team.</p>
              
              <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 0;">Best regards,<br/>The Orincore AI Studio Team</p>
            </div>
            
            <!-- Footer -->
            <div style="padding: 20px; text-align: center; background-color: #f1f1f1; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #777; font-size: 14px;">© ${new Date().getFullYear()} Orincore AI Studio. All rights reserved.</p>
              <div style="margin-top: 10px; font-size: 13px;">
                <a href="${process.env.FRONTEND_URL || 'https://orincore.com'}/terms" style="color: #555; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                <a href="${process.env.FRONTEND_URL || 'https://orincore.com'}/privacy" style="color: #555; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
                <a href="${process.env.FRONTEND_URL || 'https://orincore.com'}/contact" style="color: #555; text-decoration: none; margin: 0 10px;">Contact Us</a>
              </div>
              <p style="margin-top: 15px; color: #999; font-size: 12px;">Please do not reply to this email. This mailbox is not monitored.</p>
            </div>
          </div>
        `
      };

      // Log the email attempt
      console.log(`Attempting to send welcome email to ${email} from ${mailOptions.from}`);

      const info = await transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw new ApiError(`Failed to send welcome email: ${error.message}`, 500);
    }
  }
}

module.exports = EmailService; 