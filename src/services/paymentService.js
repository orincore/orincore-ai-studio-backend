const axios = require('axios');
const { ApiError } = require('../middlewares/errorMiddleware');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const cashfreeConfig = require('../config/cashfreeConfig');

// Load Cashfree credentials from config
const CASHFREE_APP_ID = cashfreeConfig.clientId;
const CASHFREE_SECRET_KEY = cashfreeConfig.clientSecret;
const CASHFREE_API_URL = 'https://sandbox.cashfree.com/pg/orders';  // Orders endpoint

const createCashfreeOrder = async (userId, email, amount, phone) => {
  try {
    const orderId = uuidv4();  // Generate unique order ID

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': cashfreeConfig.apiVersion,
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
        customer_email: email,
        customer_phone: phone  // Added phone number
      },
      order_note: 'Credit Purchase',
      order_meta: {
        return_url: 'https://studio.orincore.com/payment-success',
        notify_url: 'https://studio.orincore.com/payment-webhook'
      }
    };

    console.log('Creating order with body:', JSON.stringify(body));

    // Call Cashfree Order API
    const response = await axios.post(CASHFREE_API_URL, body, { headers });

    if (response.data && response.data.payment_session_id) {
      console.log('Order created successfully:', JSON.stringify(response.data));
      return {
        order_id: orderId,
        cf_order_id: response.data.cf_order_id,
        order_status: response.data.order_status,
        payment_session_id: response.data.payment_session_id,
        payment_link: response.data.payment_link,
        session_url: `https://sandbox.cashfree.com/pg/view/${response.data.payment_session_id}`
      };
    } else {
      console.error('Invalid response from Cashfree:', JSON.stringify(response.data));
      throw new ApiError('Failed to create Cashfree order: Invalid response format', 500);
    }
  } catch (err) {
    // Handle axios errors specifically
    if (err.isAxiosError) {
      console.error('Cashfree API Error:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url,
        method: err.config?.method,
        headers: err.config?.headers,
        requestData: err.config?.data
      });
      
      // Create a more descriptive error message
      const errorMessage = err.response?.data?.message || err.message;
      const statusCode = err.response?.status || 500;
      throw new ApiError(`Cashfree order creation failed: ${errorMessage}`, statusCode);
    }
    
    // Handle other types of errors
    console.error('Unexpected error creating Cashfree order:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    throw new ApiError(`Cashfree order creation failed: ${err.message}`, 500);
  }
};

module.exports = {
  createCashfreeOrder
};
