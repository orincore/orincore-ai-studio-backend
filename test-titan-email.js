const EmailService = require('./src/services/emailService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testTitanEmailConfig() {
  try {
    console.log('Testing Titan Email configuration...');
    
    // Verify SMTP connection
    console.log('Verifying SMTP connection...');
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
    console.log('Current Titan Email configuration:');
    console.log(`- Host: ${process.env.EMAIL_HOST || 'smtp.titan.email'}`);
    console.log(`- Port: ${process.env.EMAIL_PORT || '587'}`);
    console.log(`- User: ${process.env.EMAIL_USER || 'contact@orincore.com'}`);
    console.log(`- From: ${process.env.EMAIL_FROM || 'contact@orincore.com'}`);
  } catch (error) {
    console.error('Email test failed:');
    console.error(error);
    
    // Provide troubleshooting information
    console.log('\nTroubleshooting suggestions:');
    console.log('1. Verify that your email password is correct');
    console.log('2. Make sure port 587 is not blocked by your firewall');
    console.log('3. Contact BigRock support to confirm if your Titan Email is fully activated');
    console.log('4. Check if you need to generate an app-specific password for SMTP access');
  }
}

// Run the test
testTitanEmailConfig(); 