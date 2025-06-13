const axios = require('axios');
const { ApiError } = require('../middlewares/errorMiddleware');
const { v4: uuidv4 } = require('uuid');
const cashfreeConfig = require('../config/cashfreeConfig');
const { supabase } = require('../config/supabaseClient');

// Load Cashfree credentials from config
const CASHFREE_APP_ID = cashfreeConfig.clientId;
const CASHFREE_SECRET_KEY = cashfreeConfig.clientSecret;
const CASHFREE_API_URL = 'https://api.cashfree.com/pg/orders';

/**
 * Create a new Cashfree payment order
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {number} amount - Payment amount
 * @param {string} phone - User phone number
 * @param {string} returnUrl - URL to redirect after payment
 * @param {string} notifyUrl - Webhook notification URL
 * @param {string} plan - Optional plan type (e.g., 'rs2000')
 * @returns {Promise<Object>} - Order details
 */
const createCashfreeOrder = async (userId, email, amount, phone, returnUrl, notifyUrl, plan = null) => {
  try {
    const orderId = uuidv4();

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': cashfreeConfig.apiVersion,
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY
    };

    // Determine order note and tags based on plan
    let orderNote = 'Credit Purchase';
    let orderTags = {};
    
    if (plan) {
      if (plan.toLowerCase() === 'rs2000') {
        orderNote = 'RS2000 Plan Purchase';
        orderTags = { plan_type: 'RS2000', purchase_type: 'plan' };
      } else {
        orderNote = `${plan.toUpperCase()} Plan Purchase`;
        orderTags = { plan_type: plan.toUpperCase(), purchase_type: 'plan' };
      }
    } else {
      // For credit purchases
      orderTags = { purchase_type: 'credits' };
    }

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
      order_note: orderNote,
      order_tags: orderTags,
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
        plan: plan
      }
    };

    console.log('Creating order with body:', JSON.stringify(body));

    // Call Cashfree Order API
    const response = await axios.post(CASHFREE_API_URL, body, { headers });

    if (response.data?.payment_session_id) {
      console.log('Order created successfully:', JSON.stringify(response.data));
      
      // Record the payment order in the database
      await recordPaymentOrder(orderId, userId, amount, 'INR', orderNote, { plan, tags: orderTags });
      
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

/**
 * Record a payment order in the database
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID
 * @param {number} amount - Payment amount
 * @param {string} currency - Currency code
 * @param {string} notes - Order notes
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Recorded payment data
 */
const recordPaymentOrder = async (orderId, userId, amount, currency = 'INR', notes = '', metadata = {}) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: userId,
        amount,
        currency,
        status: 'PENDING',
        notes,
        metadata
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error recording payment order:', error);
      // Don't throw here, just log the error
      // This shouldn't block the payment flow
    } else {
      console.log(`Payment order recorded: ${orderId}`);
    }
    
    return data;
  } catch (err) {
    console.error('Error recording payment order:', err);
    // Don't throw here, just log the error
  }
};

module.exports = {
  createCashfreeOrder,
  recordPaymentOrder
};
