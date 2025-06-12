const EmailService = require('../services/emailService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Set default email if not provided as command line argument
const testEmail = process.argv[2] || 'test@example.com';

// Test sending verification email
async function testVerificationEmail() {
  try {
    console.log(`Sending verification email to ${testEmail}...`);
    const result = await EmailService.sendVerificationEmail(
      testEmail,
      'Test User',
      'https://example.com/verify?token=test-token'
    );
    console.log('Verification email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }
}

// Test sending password reset email
async function testPasswordResetEmail() {
  try {
    console.log(`Sending password reset email to ${testEmail}...`);
    const result = await EmailService.sendPasswordResetEmail(
      testEmail,
      'https://example.com/reset-password?token=test-token'
    );
    console.log('Password reset email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
}

// Test sending OTP email
async function testOtpEmail() {
  try {
    console.log(`Sending OTP email to ${testEmail}...`);
    const result = await EmailService.sendOtpEmail(
      testEmail,
      '123456'
    );
    console.log('OTP email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send OTP email:', error);
  }
}

// Run all tests
async function runTests() {
  console.log('TESTING EMAIL FUNCTIONALITY');
  console.log('==========================');
  console.log('Using email configuration:');
  console.log(`- Host: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}`);
  console.log(`- Port: ${process.env.EMAIL_PORT || '587'}`);
  console.log(`- User: ${process.env.EMAIL_USER || 'contact@orincore.com'}`);
  console.log('==========================');
  
  await testVerificationEmail();
  await testPasswordResetEmail();
  await testOtpEmail();
  
  console.log('==========================');
  console.log('All tests completed');
}

// Execute the tests
runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
}); 