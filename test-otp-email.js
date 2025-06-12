const EmailService = require('./src/services/emailService');
const { generateOTP } = require('./src/utils/otpUtils');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testOTPEmail() {
  try {
    console.log('Testing 6-digit OTP email functionality...');
    
    // Generate test OTP
    const otp = generateOTP();
    console.log(`Generated 6-digit OTP: ${otp}`);
    
    // Test recipient
    const testEmail = process.argv[2] || 'test@example.com';
    
    // Test verification OTP email
    console.log(`\nSending verification OTP email to ${testEmail}...`);
    const verificationResult = await EmailService.sendOtpEmail(testEmail, otp, 'verification');
    console.log('Verification OTP email sent:', verificationResult);
    
    // Test password reset OTP email
    console.log(`\nSending password reset OTP email to ${testEmail}...`);
    const resetResult = await EmailService.sendOtpEmail(testEmail, otp, 'reset');
    console.log('Password reset OTP email sent:', resetResult);
    
    console.log('\nBoth OTP emails sent successfully!');
    console.log('Check your inbox to see the OTP email templates.');
  } catch (error) {
    console.error('Error testing OTP emails:', error);
  }
}

// Run the test
testOTPEmail(); 