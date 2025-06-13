require('dotenv').config();

module.exports = {
  clientId: process.env.CASHFREE_CLIENT_ID,
  clientSecret: process.env.CASHFREE_CLIENT_SECRET,
  apiVersion: '2022-09-01',
  baseUrl: process.env.CASHFREE_BASE_URL || 'https://sandbox.cashfree.com/pg'
};
