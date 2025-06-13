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

// Daily free image generation limits (without using credits)
const FREE_DAILY_GENERATIONS = 5;

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
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error(`Failed to get user plan: ${userError.message}`);
      // Default to free plan limit if there's an error
      return {
        hasReachedLimit: false,
        limit: PLAN_DAILY_LIMITS.free,
        count: 0
      };
    }
    
    // Check if current_plan column exists, default to 'free' if not
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
      console.error(`Failed to check daily limit: ${countError.message}`);
      return {
        hasReachedLimit: false,
        limit: dailyLimit,
        count: 0
      };
    }
    
    return {
      hasReachedLimit: count >= dailyLimit,
      limit: dailyLimit,
      count: count
    };
  } catch (error) {
    console.error('Error checking daily image limit:', error);
    // Default to free plan limit on error
    return {
      hasReachedLimit: false,
      limit: PLAN_DAILY_LIMITS.free,
      count: 0
    };
  }
};

/**
 * Check if a user is on a free plan
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>} - Whether the user is on a free plan
 */
const isUserOnFreePlan = async (userId) => {
  try {
    // Get user's current plan
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error(`Failed to get user plan: ${userError.message}`);
      return true; // Default to free plan on error
    }
    
    // Check if current_plan column exists
    if (!userData.hasOwnProperty('current_plan')) {
      console.log('Current plan column not found in profiles table, defaulting to free plan');
      return true;
    }
    
    // Check if plan is free or expired
    const userPlan = userData.current_plan || 'free';
    
    // If the plan is explicitly 'free', the user is on a free plan
    if (userPlan === 'free') {
      return true;
    }
    
    // Check if the plan has expired
    if (userData.plan_expiry) {
      const expiryDate = new Date(userData.plan_expiry);
      const now = new Date();
      
      // If the plan has expired, treat as free plan
      if (expiryDate < now) {
        return true;
      }
    }
    
    // User is on a paid plan
    return false;
  } catch (error) {
    console.error('Error checking user plan:', error);
    return true; // Default to free plan on error
  }
};

/**
 * Check if a user has free daily generations remaining
 * @param {string} userId - The user ID
 * @returns {Promise<{hasRemaining: boolean, used: number, limit: number}>} - Free generation check result
 */
const checkFreeDailyGenerations = async (userId) => {
  try {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Try to count free images generated today
    try {
      const { count, error: countError } = await supabase
        .from('images')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_free_generation', true)
        .gte('created_at', today.toISOString());
      
      if (countError) {
        // If error is about the column not existing, allow free generations
        if (countError.message && countError.message.includes('column "is_free_generation" does not exist')) {
          console.log('is_free_generation column does not exist, allowing free generations');
          return { 
            hasRemaining: true, 
            used: 0, 
            limit: FREE_DAILY_GENERATIONS 
          };
        }
        
        console.error('Error checking free daily generations:', countError);
        // On error, allow the user to generate images
        return { 
          hasRemaining: true, 
          used: 0, 
          limit: FREE_DAILY_GENERATIONS 
        };
      }
      
      return {
        hasRemaining: count < FREE_DAILY_GENERATIONS,
        used: count,
        limit: FREE_DAILY_GENERATIONS
      };
    } catch (innerError) {
      console.error('Error in query execution:', innerError);
      // On error, allow the user to generate images
      return { 
        hasRemaining: true, 
        used: 0, 
        limit: FREE_DAILY_GENERATIONS 
      };
    }
  } catch (error) {
    console.error('Error checking free daily generations:', error);
    // On error, allow the user to generate images
    return { 
      hasRemaining: true, 
      used: 0, 
      limit: FREE_DAILY_GENERATIONS 
    };
  }
};

module.exports = {
  PLAN_PRICES,
  PLAN_DURATIONS,
  PLAN_DAILY_LIMITS,
  FREE_DAILY_GENERATIONS,
  subscribeToPlan,
  checkDailyImageLimit,
  isUserOnFreePlan,
  checkFreeDailyGenerations
};
