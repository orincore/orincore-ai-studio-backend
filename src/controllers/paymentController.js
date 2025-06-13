const { ApiError } = require('../middlewares/errorMiddleware');
const paymentService = require('../services/paymentService');

const createCashfreeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, phone } = req.body;
    
    if (!amount || amount <= 0) {
      throw new ApiError('Invalid amount specified', 400);
    }

    if (!phone || !/^\+?[1-9]\d{9,14}$/.test(phone)) {
      throw new ApiError('Valid phone number is required', 400);
    }

    // Create order through payment service
    const orderDetails = await paymentService.createCashfreeOrder(userId, req.user.email, amount, phone);

    res.status(200).json({
      success: true,
      data: orderDetails
    });

  } catch (err) {
    console.error('❌ Cashfree API error occurred:');
    if (err.response) {
      console.error('Response Data:', err.response.data);
      console.error('Response Status:', err.response.status);
      console.error('Response Headers:', err.response.headers);
    } else if (err.request) {
      console.error('Request was made but no response received:', err.request);
    } else {
      console.error('Error Message:', err.message);
    }
    throw new ApiError('Cashfree order creation failed', 500);
  }
};

module.exports = {
  createCashfreeOrder
};
