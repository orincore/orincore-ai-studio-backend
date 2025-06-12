const { supabase, supabasePublic } = require('../config/supabaseClient');
const { ApiError } = require('../middlewares/errorMiddleware');
const { initializeUserCredits } = require('./creditService');
const axios = require('axios');

/**
 * Get country and currency information based on IP address
 * @param {string} ip - The IP address
 * @returns {Promise<Object>} - Country and currency information
 */
const getLocationInfo = async (ip) => {
  try {
    // Use a free IP geolocation service
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    
    return {
      country: response.data.country_name,
      country_code: response.data.country_code,
      currency: response.data.currency,
      currency_name: response.data.currency_name,
      timezone: response.data.timezone
    };
  } catch (error) {
    console.error('Error getting location info:', error);
    return {
      country: 'Unknown',
      country_code: 'US',
      currency: 'USD',
      currency_name: 'US Dollar',
      timezone: 'UTC'
    };
  }
};

/**
 * Get user profile by ID
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - User profile data
 */
const getUserById = async (userId) => {
  try {
    // Get user auth data
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authData.user) {
      throw new ApiError(`User not found: ${authError?.message || 'Unknown error'}`, 404);
    }
    
    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      throw new ApiError(`Failed to get user profile: ${profileError.message}`, 500);
    }
    
    // Combine auth and profile data
    return {
      id: authData.user.id,
      email: authData.user.email,
      email_confirmed: authData.user.email_confirmed_at ? true : false,
      last_sign_in: authData.user.last_sign_in_at,
      created_at: authData.user.created_at,
      ...profileData
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to get user: ${error.message}`, 500);
  }
};

/**
 * Create a new user profile
 * @param {Object} userData - User auth data from Supabase Auth
 * @param {Object} profileData - Additional profile data
 * @param {string} ip - User's IP address for location detection
 * @returns {Promise<Object>} - Created user profile
 */
const createUserProfile = async (userData, profileData = {}, ip = null) => {
  try {
    // Get location info if IP is provided
    let locationInfo = {
      country: 'United States',
      country_code: 'US',
      currency: 'USD',
      timezone: 'America/New_York'
    };
    
    if (ip) {
      locationInfo = await getLocationInfo(ip);
    }
    
    // Prepare profile data
    const newProfile = {
      id: userData.id,
      email: userData.email,
      full_name: profileData.full_name || userData.user_metadata?.full_name || '',
      avatar_url: profileData.avatar_url || userData.user_metadata?.avatar_url || '',
      country: profileData.country || locationInfo.country || 'United States',
      country_code: profileData.country_code || locationInfo.country_code || 'US',
      currency: profileData.currency || locationInfo.currency || 'USD',
      timezone: profileData.timezone || locationInfo.timezone || 'UTC',
      language: profileData.language || 'en',
      role: 'user',
      credit_balance: 0,
      lemonsqueezy_customer_id: profileData.lemonsqueezy_customer_id || null
    };
    
    // Create profile in database
    const { data, error } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();
    
    if (error) {
      throw new ApiError(`Failed to create user profile: ${error.message}`, 500);
    }
    
    // Initialize user with free credits
    await initializeUserCredits(userData.id);
    
    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to create user profile: ${error.message}`, 500);
  }
};

/**
 * Update a user profile
 * @param {string} userId - The user ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object>} - Updated user profile
 */
const updateUserProfile = async (userId, updateData) => {
  try {
    // Remove any fields that shouldn't be updated directly
    const safeUpdateData = { ...updateData };
    
    // Fields that shouldn't be updated directly
    const protectedFields = ['id', 'email', 'role', 'credit_balance', 'created_at', 'updated_at'];
    
    protectedFields.forEach(field => {
      delete safeUpdateData[field];
    });
    
    // Update the profile
    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      throw new ApiError(`Failed to update user profile: ${error.message}`, 500);
    }
    
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to update user profile: ${error.message}`, 500);
  }
};

/**
 * Get all users (admin only)
 * @param {Object} options - Options for pagination and filtering
 * @param {number} options.page - The page number (default: 1)
 * @param {number} options.limit - The number of results per page (default: 50)
 * @param {string} options.search - Search term for email or name
 * @returns {Promise<Object>} - Users data with pagination
 */
const getAllUsers = async ({ page = 1, limit = 50, search = null } = {}) => {
  try {
    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Build the query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });
    
    // Add search filter if provided
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    
    // Add pagination
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      throw new ApiError(`Failed to get users: ${error.message}`, 500);
    }
    
    return {
      users: data,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to get users: ${error.message}`, 500);
  }
};

/**
 * Set a user's role (admin only)
 * @param {string} userId - The user ID
 * @param {string} role - The new role ('user' or 'admin')
 * @returns {Promise<Object>} - Updated user data
 */
const setUserRole = async (userId, role) => {
  try {
    // Validate role
    if (!['user', 'admin'].includes(role)) {
      throw new ApiError('Invalid role. Must be "user" or "admin"', 400);
    }
    
    // Update the user's role
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      throw new ApiError(`Failed to update user role: ${error.message}`, 500);
    }
    
    return data;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to set user role: ${error.message}`, 500);
  }
};

module.exports = {
  getUserById,
  createUserProfile,
  updateUserProfile,
  getAllUsers,
  setUserRole,
  getLocationInfo
}; 