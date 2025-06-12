const EmailService = require('./src/services/emailService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testBrevoEmailConfig() {
  try {
    console.log('Testing Brevo SMTP configuration...');
    console.log('----------------------------------');
    
    // Display current configuration
    console.log('Current email configuration:');
    console.log(`- SMTP Host: ${process.env.SMTP_HOST || 'smtp-relay.brevo.com'}`);
    console.log(`- SMTP Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`- SMTP User: ${process.env.SMTP_USER || 'your-brevo-smtp-username'}`);
    console.log(`- From Address: ${process.env.EMAIL_FROM || 'no-reply@orincore.com'}`);
    console.log('----------------------------------');
    
    // Verify SMTP connection
    console.log('Verifying SMTP connection...');
    const verification = await EmailService.verifyConnection();
    console.log('SMTP Connection verified:', verification);
    console.log('----------------------------------');
    
    // Test sending a verification email
    const testEmail = process.argv[2] || 'test@example.com';
    console.log(`Sending test email to: ${testEmail}`);
    
    const result = await EmailService.sendVerificationEmail(
      testEmail, 
      'Test User', 
      'https://orincore.com/verify?token=test-token'
    );
    
    console.log('Email sent successfully:', result);
    console.log('----------------------------------');
    console.log('✅ Brevo SMTP is properly configured!');
    console.log('You can now use professional email delivery for Orincore AI Studio.');
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error(error);
    
    // Provide troubleshooting information
    console.log('\nTroubleshooting suggestions:');
    console.log('1. Check if you have signed up for Brevo and verified your domain');
    console.log('2. Verify that your SMTP credentials are correct');
    console.log('3. Make sure all DNS records (SPF, DKIM, DMARC) are properly set up');
    console.log('4. Check the Brevo dashboard for any sending limitations or issues');
    console.log('\nRefer to email-setup-guide.md for detailed setup instructions.');
  }
}

// Run the test
testBrevoEmailConfig(); 