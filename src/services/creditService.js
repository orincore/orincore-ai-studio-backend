const { supabase } = require('../config/supabaseClient');
const { ApiError } = require('../middlewares/errorMiddleware');
const { v4: uuidv4 } = require('uuid');
const { getGenerationCostMultiplier } = require('../utils/imageUtils');

// Credit costs for different image types from environment variables
const CREDIT_COSTS = {
  NORMAL: parseInt(process.env.NORMAL_IMAGE_CREDIT_COST) || 1,
  HD: parseInt(process.env.HD_IMAGE_CREDIT_COST) || 2,
  POSTER: parseInt(process.env.POSTER_IMAGE_CREDIT_COST) || 4,
  THUMBNAIL: parseInt(process.env.THUMBNAIL_IMAGE_CREDIT_COST) || 1,
  WIDE: parseInt(process.env.NORMAL_IMAGE_CREDIT_COST) || 1,
  TALL: parseInt(process.env.NORMAL_IMAGE_CREDIT_COST) || 1
};

// Default free credits for new users
const DEFAULT_FREE_CREDITS = parseInt(process.env.DEFAULT_FREE_CREDITS) || 10;

/**
 * Get a user's current credit balance
 * @param {string} userId - The user ID
 * @returns {Promise<number>} - The user's credit balance
 */
const getUserCredits = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw new ApiError(`Failed to get user credits: ${error.message}`, 500);
    }
    
    return data.credit_balance || 0;
  } catch (error) {
    console.error('Error getting user credits:', error);
    throw new ApiError(`Failed to get user credits: ${error.message}`, 500);
  }
};

/**
 * Add credits to a user's account
 * @param {string} userId - The user ID
 * @param {number} credits - The number of credits to add
 * @param {string} source - The source of the credits (e.g., 'purchase', 'admin', 'free')
 * @param {string} referenceId - Optional reference ID (e.g., order ID)
 * @returns {Promise<Object>} - Updated user data
 */
const addCredits = async (userId, credits, source, referenceId = null) => {
  try {
    // Start a transaction
    const { data: currentData, error: fetchError } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      throw new ApiError(`Failed to get user profile: ${fetchError.message}`, 500);
    }
    
    const currentBalance = currentData.credit_balance || 0;
    const newBalance = currentBalance + credits;
    
    // Update the user's credit balance
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ credit_balance: newBalance })
      .eq('id', userId)
      .select()
      .single();
    
    if (updateError) {
      throw new ApiError(`Failed to update credit balance: ${updateError.message}`, 500);
    }
    
    // Log the credit transaction
    const { error: logError } = await supabase
      .from('credit_transactions')
      .insert({
        id: uuidv4(),
        user_id: userId,
        amount: credits,
        type: 'credit',
        source,
        reference_id: referenceId,
        balance_after: newBalance
      });
    
    if (logError) {
      console.error('Error logging credit transaction:', logError);
    }
    
    return updatedUser;
  } catch (error) {
    console.error('Error adding credits:', error);
    throw new ApiError(`Failed to add credits: ${error.message}`, 500);
  }
};

/**
 * Deduct credits from a user's account
 * @param {string} userId - The user ID
 * @param {number} credits - The number of credits to deduct
 * @param {string} reason - The reason for deduction (e.g., 'image_generation')
 * @param {string} referenceId - Optional reference ID (e.g., generation ID)
 * @returns {Promise<Object>} - Updated user data
 */
const deductCredits = async (userId, credits, reason, referenceId = null) => {
  try {
    // Get the user's current balance
    const { data: currentData, error: fetchError } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      throw new ApiError(`Failed to get user profile: ${fetchError.message}`, 500);
    }
    
    const currentBalance = currentData.credit_balance || 0;
    
    // Check if the user has enough credits
    if (currentBalance < credits) {
      throw new ApiError('Insufficient credits', 402);
    }
    
    const newBalance = currentBalance - credits;
    
    // Update the user's credit balance
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ credit_balance: newBalance })
      .eq('id', userId)
      .select()
      .single();
    
    if (updateError) {
      throw new ApiError(`Failed to update credit balance: ${updateError.message}`, 500);
    }
    
    // Log the debit transaction
    const { error: logError } = await supabase
      .from('credit_transactions')
      .insert({
        id: uuidv4(),
        user_id: userId,
        amount: credits,
        type: 'debit',
        source: reason,
        reference_id: referenceId,
        balance_after: newBalance
      });
    
    if (logError) {
      console.error('Error logging credit transaction:', logError);
    }
    
    return updatedUser;
  } catch (error) {
    console.error('Error deducting credits:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to deduct credits: ${error.message}`, 500);
  }
};

/**
 * Get the credit cost for a specific image generation
 * @param {string} generationType - The type of generation (e.g., 'GENERAL', 'ANIME', 'POSTER')
 * @param {string} resolution - The resolution to use (e.g., 'NORMAL', 'HD', 'POSTER')
 * @returns {number} - The credit cost
 */
const getCreditCost = (generationType, resolution) => {
  const baseCost = CREDIT_COSTS[resolution.toUpperCase()] || CREDIT_COSTS.NORMAL;
  const multiplier = getGenerationCostMultiplier(generationType, resolution);
  return Math.ceil(baseCost * multiplier);
};

/**
 * Initialize a new user with default credits
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Updated user data
 */
const initializeUserCredits = async (userId) => {
  return await addCredits(userId, DEFAULT_FREE_CREDITS, 'initial_signup');
};

/**
 * Get credit transaction history for a user
 * @param {string} userId - The user ID
 * @param {Object} options - Options for pagination and filtering
 * @param {number} options.page - The page number (default: 1)
 * @param {number} options.limit - The number of results per page (default: 20)
 * @param {string} options.type - Filter by transaction type ('credit' or 'debit')
 * @returns {Promise<Object>} - Transaction history data
 */
const getCreditHistory = async (userId, { page = 1, limit = 20, type = null } = {}) => {
  try {
    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Build the query
    let query = supabase
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    // Add type filter if provided
    if (type) {
      query = query.eq('type', type);
    }
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      throw new ApiError(`Failed to get credit history: ${error.message}`, 500);
    }
    
    return {
      transactions: data,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting credit history:', error);
    throw new ApiError(`Failed to get credit history: ${error.message}`, 500);
  }
};

module.exports = {
  getUserCredits,
  addCredits,
  deductCredits,
  getCreditCost,
  initializeUserCredits,
  getCreditHistory,
  CREDIT_COSTS,
  DEFAULT_FREE_CREDITS
}; 