const axios = require('axios');
const cashfreeConfig = require('../config/cashfreeConfig');

async function createCashfreeOrder(userId, email, phone, amount) {
  const orderId = `order_${Date.now()}_${userId}`;

  const payload = {
    order_id: orderId,
    order_amount: amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: userId,
      customer_email: email,
      customer_phone: phone
    }
  };

  try {
    const response = await axios.post(
      `${cashfreeConfig.baseUrl}/orders`,
      payload,
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-version': cashfreeConfig.apiVersion,
          'x-client-id': cashfreeConfig.clientId,
          'x-client-secret': cashfreeConfig.clientSecret
        }
      }
    );

    return {
      success: true,
      orderId,
      paymentSessionId: response.data.payment_session_id,
      paymentLink: `https://payments.cashfree.com/pg/checkout?payment_session_id=${response.data.payment_session_id}`
    };
  } catch (err) {
    console.error('Cashfree Create Order Error:', err?.response?.data || err.message);
    throw new Error('Failed to create payment order');
  }
}

module.exports = {
  createCashfreeOrder
};
