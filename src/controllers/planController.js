const asyncHandler = require('express-async-handler');
const { subscribeToPlan } = require('../services/planService');
const { ApiError } = require('../middlewares/errorMiddleware');

/**
 * @desc Subscribe to a plan using credits
 * @route POST /api/plans/subscribe
 * @access Private
 */
const subscribe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { plan } = req.body;

  if (!plan) {
    throw new ApiError('Plan is required', 400);
  }

  const result = await subscribeToPlan(userId, plan);
  res.status(200).json(result);
});

module.exports = {
  subscribe
};
