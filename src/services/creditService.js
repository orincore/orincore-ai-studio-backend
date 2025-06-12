const { supabase } = require('../config/supabaseClient');
const { ApiError } = require('../middlewares/errorMiddleware');
const { v4: uuidv4 } = require('uuid');
const { getGenerationCostMultiplier } = require('../utils/imageUtils');

// Credit costs for different image types (fixed values as per requirements)
const CREDIT_COSTS = {
  // Basic image generation costs are handled by generation type
  NORMAL: 10,
  HD: 10,
  POSTER: 50,
  THUMBNAIL: 50,
  WIDE: 10,
  TALL: 10,
  // Aspect ratio options
  SQUARE: 10,
  LANDSCAPE: 10,
  PORTRAIT: 10,
  WIDESCREEN: 10
};

// Generation type fixed costs (overrides the multiplier-based costs)
const GENERATION_TYPE_COSTS = {
  GENERAL: 10,     // Text-to-Image Generator
  ANIME: 10,       // Anime Generator
  REALISTIC: 10,   // Realistic Generator
  LOGO: 25,        // Logo Maker
  POSTER: 50,      // Poster Creator
  THUMBNAIL: 50,   // Thumbnail Creator
  WALLPAPER: 50,   // Wallpaper Generator (new)
  IMAGE_TO_IMAGE: 10 // Image-to-Image Generator (new)
};

// Default free credits for new users
const DEFAULT_FREE_CREDITS = 10; // We'll use the free generation mechanism instead of giving free credits

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
 * Check if user has a free generation remaining
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>} - Whether the user has a free generation
 */
const hasUserUsedFreeGeneration = async (userId) => {
  try {
    // Check if user has any previous generations
    const { count, error } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error checking free generation:', error);
      return true; // Assume used on error
    }
    
    return count > 0;
  } catch (error) {
    console.error('Error checking free generation:', error);
    return true; // Assume used on error
  }
};

/**
 * Get the credit cost for a specific image generation
 * @param {string} generationType - The type of generation (e.g., 'GENERAL', 'ANIME', 'POSTER')
 * @param {string} resolution - The resolution to use (e.g., 'NORMAL', 'HD', 'POSTER')
 * @param {string} userId - The user ID for checking free generation
 * @returns {Promise<number>} - The credit cost
 */
const getCreditCost = async (generationType, resolution, userId) => {
  // Check if this is the user's first generation
  const hasUsedFree = await hasUserUsedFreeGeneration(userId);
  
  if (!hasUsedFree) {
    return 0; // First generation is free
  }
  
  // Use fixed cost by generation type if available
  if (GENERATION_TYPE_COSTS[generationType]) {
    return GENERATION_TYPE_COSTS[generationType];
  }
  
  // Fall back to resolution-based cost
  return CREDIT_COSTS[resolution.toUpperCase()] || CREDIT_COSTS.NORMAL;
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

/**
 * Check credit balance and deduct credits if sufficient
 * @param {string} userId - The user ID
 * @param {number} credits - The number of credits to deduct
 * @param {string} reason - The reason for deduction (e.g., 'poster_generation')
 * @param {string} referenceId - Optional reference ID (e.g., generation ID)
 * @returns {Promise<Object>} - Updated user data
 */
const checkAndDeductCredits = async (userId, credits, reason = 'generation', referenceId = null) => {
  try {
    // Check if this is the user's first generation
    const hasUsedFree = await hasUserUsedFreeGeneration(userId);
    
    if (!hasUsedFree) {
      return { creditBalance: await getUserCredits(userId), freeGeneration: true };
    }
    
    // Get the user's current balance
    const currentBalance = await getUserCredits(userId);
    
    // Check if the user has enough credits
    if (currentBalance < credits) {
      throw new ApiError('Insufficient credits', 402);
    }
    
    // Deduct the credits
    return await deductCredits(userId, credits, reason, referenceId);
  } catch (error) {
    console.error('Error checking and deducting credits:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError('Failed to check or deduct credits', 500);
  }
};

/**
 * Refund credits in case of a failed generation
 * @param {string} userId - The user ID
 * @param {number} credits - The number of credits to refund
 * @param {string} reason - The reason for refund (default: 'generation_failed')
 * @returns {Promise<Object>} - Updated user data
 */
const refundCredits = async (userId, credits, reason = 'generation_failed') => {
  try {
    return await addCredits(userId, credits, reason);
  } catch (error) {
    console.error('Error refunding credits:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError('Failed to refund credits', 500);
  }
};

module.exports = {
  getUserCredits,
  addCredits,
  deductCredits,
  getCreditCost,
  checkAndDeductCredits,
  refundCredits,
  initializeUserCredits,
  getCreditHistory,
  hasUserUsedFreeGeneration,
  CREDIT_COSTS,
  GENERATION_TYPE_COSTS,
  DEFAULT_FREE_CREDITS
}; 