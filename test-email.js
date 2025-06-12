const EmailService = require('./src/services/emailService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testEmailConfiguration() {
  try {
    console.log('Testing email configuration...');
    
    // Verify SMTP connection
    const verification = await EmailService.verifyConnection();
    console.log('SMTP Connection verified:', verification);
    
    // Test sending a verification email
    const testEmail = process.argv[2] || 'test@example.com';
    console.log(`Sending test email to: ${testEmail}`);
    
    const result = await EmailService.sendVerificationEmail(
      testEmail, 
      'Test User', 
      'https://orincore.com/verify?token=test-token'
    );
    
    console.log('Email sent successfully:', result);
    console.log('Current email configuration:');
    console.log(`- Host: ${process.env.EMAIL_HOST || 'mail.orincore.com'}`);
    console.log(`- Port: ${process.env.EMAIL_PORT || '587'}`);
    console.log(`- User: ${process.env.EMAIL_USER || 'contact@orincore.com'}`);
    console.log(`- From: ${process.env.EMAIL_FROM || 'contact@orincore.com'}`);
  } catch (error) {
    console.error('Email test failed:', error);
  }
}

// Run the test
testEmailConfiguration(); 