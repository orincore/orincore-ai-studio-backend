require('dotenv').config();

const SANDBOX_URL = 'https://sandbox.cashfree.com/pg';
const PRODUCTION_URL = 'https://api.cashfree.com/pg';

const environment = process.env.NODE_ENV === 'production' ? 'PROD' : 'TEST';
const baseUrl = process.env.NODE_ENV === 'production' ? PRODUCTION_URL : SANDBOX_URL;

// Validate environment variables
const clientId = process.env.CASHFREE_CLIENT_ID;
const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error('Cashfree credentials are not properly configured');
}

// // Validate that we're using the correct type of credentials for the environment
// if (environment === 'TEST' && clientSecret.startsWith('cfsk_ma_prod_')) {
//   throw new Error('Using production credentials in test environment. Please use TEST credentials for sandbox.');
// }

// if (environment === 'PROD' && clientSecret.startsWith('cfsk_ma_test_')) {
//   throw new Error('Using test credentials in production environment. Please use PROD credentials for production.');
// }

module.exports = {
  clientId,
  clientSecret,
  apiVersion: '2022-09-01',
  baseUrl,
  environment
};
