const asyncHandler = require('express-async-handler');
const paymentService = require('../services/paymentService');
const { ApiError } = require('../middlewares/errorMiddleware');

const createOrder = asyncHandler(async (req, res) => {
  const { amount, email, phone } = req.body;
  const userId = req.user?.id; // make sure your auth middleware attaches user info

  if (!userId || !amount || !email || !phone) {
    throw new ApiError('Missing required fields', 400);
  }

  const order = await paymentService.createCashfreeOrder(userId, email, phone, amount);
  res.json(order);
});

module.exports = {
  createOrder
};
