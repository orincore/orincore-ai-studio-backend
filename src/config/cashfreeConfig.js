// Load .env variables
require('dotenv').config();

// Extract environment variables
const clientId = process.env.CASHFREE_CLIENT_ID;
const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
const environment = process.env.CASHFREE_ENV || 'sandbox';  // default to sandbox if not provided

// Determine Base URL based on environment
let baseUrl;
if (environment === 'production') {
  baseUrl = 'https://api.cashfree.com/pg/orders';
} else {
  baseUrl = 'https://sandbox.cashfree.com/pg/orders';
}

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
