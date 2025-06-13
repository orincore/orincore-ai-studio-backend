const axios = require('axios');
const { ApiError } = require('../middlewares/errorMiddleware');
const { v4: uuidv4 } = require('uuid');
const cashfreeConfig = require('../config/cashfreeConfig');

// Load Cashfree credentials from config
const CASHFREE_APP_ID = cashfreeConfig.clientId;
const CASHFREE_SECRET_KEY = cashfreeConfig.clientSecret;
const CASHFREE_API_URL = 'https://api.cashfree.com/pg/orders';

const createCashfreeOrder = async (userId, email, amount, phone, returnUrl, notifyUrl) => {
  try {
    const orderId = uuidv4();

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': cashfreeConfig.apiVersion,
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY
    };

    // Prepare request body, injecting the dynamic URLs
    const body = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_email: email,
        customer_phone: phone
      },
      order_note: 'Credit Purchase',
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl
      }
    };

    console.log('Creating order with body:', JSON.stringify(body));

    // Call Cashfree Order API
    const response = await axios.post(CASHFREE_API_URL, body, { headers });

    if (response.data?.payment_session_id) {
      console.log('Order created successfully:', JSON.stringify(response.data));
      return {
        order_id: orderId,
        cf_order_id: response.data.cf_order_id,
        order_status: response.data.order_status,
        payment_session_id: response.data.payment_session_id
      };
    } else {
      console.error('Invalid response from Cashfree:', JSON.stringify(response.data));
      throw new ApiError('Failed to create Cashfree order: Invalid response format', 500);
    }
  } catch (err) {
    if (err.isAxiosError) {
      console.error('Cashfree API Error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      const errorMessage = err.response?.data?.message || err.message;
      throw new ApiError(`Cashfree order creation failed: ${errorMessage}`, err.response?.status || 500);
    }
    console.error('Unexpected error creating Cashfree order:', err);
    throw new ApiError(`Cashfree order creation failed: ${err.message}`, 500);
  }
};

module.exports = {
  createCashfreeOrder
};
