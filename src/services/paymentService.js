const axios = require('axios');
const { ApiError } = require('../middlewares/errorMiddleware');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Load Cashfree credentials from environment variables
const CASHFREE_APP_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_API_URL = process.env.CASHFREE_BASE_URL || 'https://sandbox.cashfree.com/pg/orders';  // Use production URL when live

const createCashfreeOrder = async (userId, email, amount) => {
  try {
    const orderId = uuidv4();  // Generate unique order ID

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': '2022-09-01',
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY
    };

    // Prepare request body
    const body = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,  // UUID from your Supabase
        customer_email: email
      },
      order_note: 'Credit Purchase',
      order_meta: {
        return_url: 'https://studio.orincore.com/payment-success', // ✅ Change if needed
        notify_url: 'https://studio.orincore.com/payment-webhook'  // ✅ Webhook URL if needed
      }
    };

    // Call Cashfree Order API
    const response = await axios.post(CASHFREE_API_URL, body, { headers });

    if (response.data && response.data.payment_session_id) {
      return {
        order_id: orderId,
        payment_session_id: response.data.payment_session_id
      };
    } else {
      throw new ApiError('Failed to create Cashfree order', 500);
    }
  } catch (err) {
    console.error('Error creating Cashfree order:', err.response?.data || err);
    throw new ApiError('Cashfree order creation failed', 500);
  }
};

module.exports = {
  createCashfreeOrder
};
