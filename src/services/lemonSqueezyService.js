const axios = require('axios');
const crypto = require('crypto');
const { ApiError } = require('../middlewares/errorMiddleware');

// LemonSqueezy API configuration
const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

/**
 * Validate a webhook signature from LemonSqueezy
 * @param {string} signature - The signature from the request headers
 * @param {Object|string} payload - The request body (either parsed object or raw string)
 * @returns {boolean} - Whether the signature is valid
 */
const validateWebhookSignature = (signature, payload) => {
  if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
    console.error('LemonSqueezy webhook secret is not configured');
    return false;
  }

  try {
    // Convert payload to string if it's an object
    const rawPayload = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    // Calculate the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');
    
    // Constant time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
};

/**
 * Get customer details from LemonSqueezy
 * @param {string} customerId - The LemonSqueezy customer ID
 * @returns {Promise<Object>} - Customer data
 */
const getCustomer = async (customerId) => {
  if (!LEMONSQUEEZY_API_KEY) {
    throw new ApiError('LemonSqueezy API key is not configured', 500);
  }

  try {
    const response = await axios({
      method: 'get',
      url: `${LEMONSQUEEZY_API_URL}/customers/${customerId}`,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('LemonSqueezy API error:', error.response?.data || error.message);
    throw new ApiError(
      `Failed to get customer: ${error.response?.data?.message || error.message}`,
      error.response?.status || 500
    );
  }
};

/**
 * Get subscription details from LemonSqueezy
 * @param {string} subscriptionId - The LemonSqueezy subscription ID
 * @returns {Promise<Object>} - Subscription data
 */
const getSubscription = async (subscriptionId) => {
  if (!LEMONSQUEEZY_API_KEY) {
    throw new ApiError('LemonSqueezy API key is not configured', 500);
  }

  try {
    const response = await axios({
      method: 'get',
      url: `${LEMONSQUEEZY_API_URL}/subscriptions/${subscriptionId}`,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('LemonSqueezy API error:', error.response?.data || error.message);
    throw new ApiError(
      `Failed to get subscription: ${error.response?.data?.message || error.message}`,
      error.response?.status || 500
    );
  }
};

/**
 * Get order details from LemonSqueezy
 * @param {string} orderId - The LemonSqueezy order ID
 * @returns {Promise<Object>} - Order data
 */
const getOrder = async (orderId) => {
  if (!LEMONSQUEEZY_API_KEY) {
    throw new ApiError('LemonSqueezy API key is not configured', 500);
  }

  try {
    const response = await axios({
      method: 'get',
      url: `${LEMONSQUEEZY_API_URL}/orders/${orderId}`,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('LemonSqueezy API error:', error.response?.data || error.message);
    throw new ApiError(
      `Failed to get order: ${error.response?.data?.message || error.message}`,
      error.response?.status || 500
    );
  }
};

/**
 * Create a checkout for a product
 * @param {Object} options - Checkout options
 * @param {string} options.productId - The LemonSqueezy product ID
 * @param {string} options.variantId - The LemonSqueezy variant ID
 * @param {string} options.customerEmail - The customer's email address
 * @param {Object} options.customData - Custom data to include with the checkout
 * @returns {Promise<Object>} - Checkout data including the URL
 */
const createCheckout = async ({ productId, variantId, customerEmail, customData = {} }) => {
  if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID) {
    throw new ApiError('LemonSqueezy API key or store ID is not configured', 500);
  }

  try {
    const response = await axios({
      method: 'post',
      url: `${LEMONSQUEEZY_API_URL}/checkouts`,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
      },
      data: {
        data: {
          type: 'checkouts',
          attributes: {
            store_id: parseInt(LEMONSQUEEZY_STORE_ID),
            variant_id: parseInt(variantId),
            product_options: {
              enabled_variants: [parseInt(variantId)]
            },
            checkout_data: {
              email: customerEmail,
              custom: customData
            },
            preview: false
          }
        }
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('LemonSqueezy API error:', error.response?.data || error.message);
    throw new ApiError(
      `Failed to create checkout: ${error.response?.data?.message || error.message}`,
      error.response?.status || 500
    );
  }
};

module.exports = {
  validateWebhookSignature,
  getCustomer,
  getSubscription,
  getOrder,
  createCheckout
}; 