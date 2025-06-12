const EmailService = require('./src/services/emailService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testWelcomeEmail() {
  try {
    console.log('Testing welcome email functionality...');
    
    // Test recipient
    const testEmail = process.argv[2] || 'test@example.com';
    const testName = process.argv[3] || 'John Doe';
    
    console.log(`Sending welcome email to ${testEmail} for ${testName}...`);
    
    // Send welcome email
    const result = await EmailService.sendWelcomeEmail(testEmail, testName);
    
    console.log('Welcome email sent successfully:', result);
    console.log('Check your inbox to see the welcome email template.');
  } catch (error) {
    console.error('Error testing welcome email:', error);
  }
}

// Run the test
testWelcomeEmail(); 