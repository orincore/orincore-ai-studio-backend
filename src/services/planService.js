const { supabase } = require('../config/supabaseClient');
const { deductCredits } = require('./creditService');
const { ApiError } = require('../middlewares/errorMiddleware');

const PLAN_PRICES = {
  free: 0,
  creator: 2000,      // credits required
  professional: 5000,
  enterprise: 10000,
  rs2000: 2000        // RS2000 special plan
};

const PLAN_DURATIONS = {
  free: 30,
  creator: 30,
  professional: 30,
  enterprise: 30,
  rs2000: 30          // 30 days duration for RS2000 plan
};

// Daily image generation limits by plan
const PLAN_DAILY_LIMITS = {
  free: 5,
  creator: 15,
  professional: 50,
  enterprise: 100,
  rs2000: 30          // 30 images per day for RS2000 plan
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

  // For RS2000 plan, set the user as a professional user
  if (planKey === 'rs2000') {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        current_plan: 'professional', // Set as professional plan
        plan_expiry: expiryDate.toISOString(),
        role: 'professional'  // Update user role to professional
      })
      .eq('id', userId)
      .single();

    if (error) {
      throw new ApiError('Failed to update user plan', 500);
    }

    return {
      message: `Subscribed to RS2000 plan with professional privileges`,
      plan: 'professional',
      expiry: expiryDate
    };
  }

  // Regular plan subscription
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

/**
 * Check if a user has reached their daily image generation limit
 * @param {string} userId - The user ID
 * @returns {Promise<{hasReachedLimit: boolean, limit: number, count: number}>} - Limit check result
 */
const checkDailyImageLimit = async (userId) => {
  try {
    // Get user's current plan
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('current_plan')
      .eq('id', userId)
      .single();
    
    if (userError) {
      throw new ApiError(`Failed to get user plan: ${userError.message}`, 500);
    }
    
    const userPlan = userData.current_plan || 'free';
    const dailyLimit = PLAN_DAILY_LIMITS[userPlan] || PLAN_DAILY_LIMITS.free;
    
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Count images generated today
    const { count, error: countError } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());
    
    if (countError) {
      throw new ApiError(`Failed to check daily limit: ${countError.message}`, 500);
    }
    
    return {
      hasReachedLimit: count >= dailyLimit,
      limit: dailyLimit,
      count: count
    };
  } catch (error) {
    console.error('Error checking daily image limit:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to check daily limit: ${error.message}`, 500);
  }
};

module.exports = {
  PLAN_PRICES,
  PLAN_DURATIONS,
  PLAN_DAILY_LIMITS,
  subscribeToPlan,
  checkDailyImageLimit
};
