const nodemailer = require('nodemailer');
const { ApiError } = require('../middlewares/errorMiddleware');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a SendGrid-based transporter for sending emails
// This is a more reliable alternative to using domain email
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey', // SendGrid requires 'apikey' as the username
    pass: process.env.SENDGRID_API_KEY || 'SG.your_sendgrid_api_key_here' // Replace with your SendGrid API Key
  }
});

/**
 * Service for handling email operations via SendGrid
 */
class SendGridEmailService {
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
        from: process.env.SENDGRID_FROM_EMAIL || 'contact@orincore.com',
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
      console.log(`Attempting to send verification email to ${email} from ${mailOptions.from} using SendGrid`);

      const info = await transporter.sendMail(mailOptions);
      console.log('SendGrid verification email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending verification email via SendGrid:', error);
      throw new ApiError(`Failed to send verification email via SendGrid: ${error.message}`, 500);
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
        from: process.env.SENDGRID_FROM_EMAIL || 'contact@orincore.com',
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
      console.log(`Attempting to send password reset email to ${email} from ${mailOptions.from} using SendGrid`);

      const info = await transporter.sendMail(mailOptions);
      console.log('SendGrid password reset email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending password reset email via SendGrid:', error);
      throw new ApiError(`Failed to send password reset email via SendGrid: ${error.message}`, 500);
    }
  }

  /**
   * Send an OTP email
   * 
   * @param {string} email - Recipient email
   * @param {string} otp - One-time password
   * @return {Promise<Object>} Email sending result
   */
  static async sendOtpEmail(email, otp) {
    try {
      const mailOptions = {
        from: process.env.SENDGRID_FROM_EMAIL || 'contact@orincore.com',
        to: email,
        subject: 'Your OTP Code - Orincore AI Studio',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4b36df; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Orincore AI Studio</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
              <h2>Your One-Time Password</h2>
              <p>You requested a one-time password (OTP) for Orincore AI Studio. Use the code below to complete your action:</p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="font-size: 32px; letter-spacing: 5px; font-weight: bold; background-color: #f5f5f5; padding: 15px; border-radius: 4px;">${otp}</div>
              </div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
              <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Orincore AI Studio. All rights reserved.</p>
            </div>
          </div>
        `
      };

      // Log the email attempt
      console.log(`Attempting to send OTP email to ${email} from ${mailOptions.from} using SendGrid`);

      const info = await transporter.sendMail(mailOptions);
      console.log('SendGrid OTP email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending OTP email via SendGrid:', error);
      throw new ApiError(`Failed to send OTP email via SendGrid: ${error.message}`, 500);
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
      console.error('SendGrid email configuration error:', error);
      throw new ApiError(`SendGrid email configuration error: ${error.message}`, 500);
    }
  }
}

module.exports = SendGridEmailService; 