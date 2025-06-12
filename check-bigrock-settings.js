const dns = require('dns');
const nodemailer = require('nodemailer');
const net = require('net');

const domain = 'orincore.com';
const email = 'contact@orincore.com';
const password = 'Prasenjeet@1'; // For testing only

// Check MX records
async function checkMXRecords() {
  console.log(`\n--- Checking MX records for ${domain} ---`);
  try {
    const records = await new Promise((resolve, reject) => {
      dns.resolveMx(domain, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    
    console.log('MX records found:');
    records.forEach(record => {
      console.log(`- Priority: ${record.priority}, Exchange: ${record.exchange}`);
    });
    
    return records;
  } catch (error) {
    console.error('Error checking MX records:', error.message);
    return [];
  }
}

// Test SMTP connection to different servers
async function testSMTPConnection(host, port = 587) {
  console.log(`\n--- Testing SMTP connection to ${host}:${port} ---`);
  
  try {
    // First test raw TCP connection
    await new Promise((resolve, reject) => {
      const socket = net.createConnection(port, host);
      
      socket.on('connect', () => {
        console.log(`TCP connection to ${host}:${port} successful`);
        socket.end();
        resolve();
      });
      
      socket.on('error', (err) => {
        console.error(`TCP connection to ${host}:${port} failed:`, err.message);
        reject(err);
      });
      
      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
    });
    
    // Then try SMTP authentication
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: {
        user: email,
        pass: password
      },
      debug: true,
      logger: true,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    const verify = await transporter.verify();
    console.log(`SMTP verification for ${host}:${port}:`, verify);
    return true;
  } catch (error) {
    console.error(`SMTP connection to ${host}:${port} failed:`, error.message);
    return false;
  }
}

// Try to determine correct settings
async function determineCorrectSettings() {
  console.log('\n=== BIGROCK EMAIL SETTINGS CHECKER ===');
  
  // Step 1: Check MX records
  const mxRecords = await checkMXRecords();
  
  // Step 2: Test potential SMTP servers
  const servers = [
    { host: 'us2.smtp.mailhostbox.com', port: 587 },
    { host: 'smtp.mailhostbox.com', port: 587 },
    { host: `smtp.${domain}`, port: 587 },
    { host: `mail.${domain}`, port: 587 }
  ];
  
  // Add MX servers to the list
  for (const record of mxRecords) {
    if (!servers.some(s => s.host === record.exchange)) {
      servers.push({ host: record.exchange, port: 587 });
    }
  }
  
  console.log('\nTesting potential SMTP servers:');
  
  let successfulServer = null;
  for (const server of servers) {
    const success = await testSMTPConnection(server.host, server.port);
    if (success) {
      successfulServer = server;
      break;
    }
  }
  
  console.log('\n=== RESULTS ===');
  if (successfulServer) {
    console.log('✅ Found working SMTP server:');
    console.log(`Host: ${successfulServer.host}`);
    console.log(`Port: ${successfulServer.port}`);
    console.log('\nUpdate your .env file with:');
    console.log(`EMAIL_HOST=${successfulServer.host}`);
    console.log(`EMAIL_PORT=${successfulServer.port}`);
    console.log(`EMAIL_USER=${email}`);
    console.log('EMAIL_PASSWORD=your-password');
  } else {
    console.log('❌ No working SMTP server found.');
    console.log('\nPossible issues:');
    console.log('1. The email credentials might be incorrect');
    console.log('2. The BigRock email service might not be fully set up');
    console.log('3. There might be restrictions on the SMTP server');
    console.log('\nRecommendations:');
    console.log('1. Contact BigRock support to confirm your email settings');
    console.log('2. Check if there are any additional steps needed to activate the email service');
    console.log('3. Consider using a third-party email service like SendGrid or Mailgun instead');
  }
}

// Run the checks
determineCorrectSettings(); 