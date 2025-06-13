const { supabase } = require('../config/supabaseClient');
const { deductCredits } = require('./creditService');
const { ApiError } = require('../middlewares/errorMiddleware');

const PLAN_PRICES = {
  free: 0,
  creator: 2000,      // credits required
  professional: 5000,
  enterprise: 10000
};

const PLAN_DURATIONS = {
  free: 30,
  creator: 30,
  professional: 30,
  enterprise: 30
};

const subscribeToPlan = async (userId, plan) => {
  const planKey = plan.toLowerCase();

  if (!PLAN_PRICES.hasOwnProperty(planKey)) {
    throw new ApiError('Invalid plan selected', 400);
  }

  const creditsRequired = PLAN_PRICES[planKey];

  if (creditsRequired > 0) {
    await deductCredits(userId, creditsRequired, 'plan_subscription');
  }

  const now = new Date();
  const expiryDate = new Date(now);
  expiryDate.setDate(now.getDate() + PLAN_DURATIONS[planKey]);

  const { data, error } = await supabase
    .from('profiles')
    .update({
      current_plan: planKey,
      plan_expiry: expiryDate.toISOString()
    })
    .eq('id', userId)
    .single();

  if (error) {
    throw new ApiError('Failed to update user plan', 500);
  }

  return {
    message: `Subscribed to ${planKey} plan`,
    plan: planKey,
    expiry: expiryDate
  };
};

module.exports = {
  subscribeToPlan
};
