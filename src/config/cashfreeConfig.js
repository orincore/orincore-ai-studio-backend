// Load .env variables
require('dotenv').config();

// Extract environment variables
const clientId = process.env.CASHFREE_CLIENT_ID;
const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
const environment = 'production';  

// Determine Base URL based on environment
const baseUrl = 'https://api.cashfree.com';


// Validate required credentials
if (!clientId || !clientSecret) {
  console.error('❌ Missing Cashfree Client ID or Secret Key in environment variables');
  throw new Error('Cashfree credentials are not properly configured');
}

module.exports = {
  clientId,
  clientSecret,
  apiVersion: '2022-09-01',
  baseUrl,
  environment
};
