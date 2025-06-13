const { ApiError } = require('../middlewares/errorMiddleware');
const paymentService = require('../services/paymentService');

const createCashfreeOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, phone, return_url, notify_url, plan } = req.body;

    if (!amount || amount <= 0) {
      throw new ApiError('Invalid amount specified', 400);
    }
    if (!phone || !/^\+?[1-9]\d{9,14}$/.test(phone)) {
      throw new ApiError('Valid phone number is required', 400);
    }
    if (!return_url) {
      throw new ApiError('Return URL is required', 400);
    }
    if (!notify_url) {
      throw new ApiError('Notify URL is required', 400);
    }

    // Check if this is an RS2000 plan purchase
    const isRS2000Plan = plan === 'rs2000' && amount === 2000;
    
    // Log the plan information
    if (plan) {
      console.log(`Creating order for plan: ${plan}, amount: ${amount}`);
    }

    const orderDetails = await paymentService.createCashfreeOrder(
      userId,
      req.user.email,
      amount,
      phone,
      return_url,
      notify_url,
      plan // Pass the plan parameter
    );

    res.status(200).json({
      success: true,
      data: orderDetails
    });
  } catch (err) {
    console.error('❌ Cashfree API error occurred:', err);
    return next(err);
  }
};

module.exports = {
  createCashfreeOrder
};
