const asyncHandler = require('express-async-handler');
const { addCredits, deductCredits } = require('../services/creditService');
const { supabase } = require('../config/supabaseClient');
const { ApiError } = require('../middlewares/errorMiddleware');

/**
 * @desc    Adjust a user's credits (add or remove)
 * @route   POST /api/admin/users/:id/credits
 * @access  Private/Admin
 */
const adjustUserCredits = asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;
  const userId = req.params.id;
  
  if (amount === undefined || !reason) {
    throw new ApiError('Amount and reason are required', 400);
  }
  
  // Validate that the user exists
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (error || !user) {
    throw new ApiError('User not found', 404);
  }
  
  let result;
  
  if (amount > 0) {
    // Add credits
    result = await addCredits(
      userId,
      amount,
      'admin_adjustment',
      reason
    );
  } else if (amount < 0) {
    // Remove credits (use positive number for deduction)
    result = await deductCredits(
      userId,
      Math.abs(amount),
      'admin_adjustment',
      reason
    );
  } else {
    // Amount is 0, no change needed
    throw new ApiError('Amount must be non-zero', 400);
  }
  
  res.status(200).json({ 
    success: true, 
    message: `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} credits`,
    new_balance: result.credit_balance
  });
});

/**
 * @desc    Get all image generation stats
 * @route   GET /api/admin/stats/images
 * @access  Private/Admin
 */
const getImageStats = asyncHandler(async (req, res) => {
  // Get total images generated
  const { count: totalImages, error: countError } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw new ApiError(`Failed to get image stats: ${countError.message}`, 500);
  }
  
  // Get images by resolution
  const { data: imagesByResolution, error: resError } = await supabase
    .from('images')
    .select('resolution, count')
    .select('resolution')
    .eq('count(*)', 'resolution')
    .group('resolution');
  
  if (resError) {
    throw new ApiError(`Failed to get resolution stats: ${resError.message}`, 500);
  }
  
  // Get images by model
  const { data: imagesByModel, error: modelError } = await supabase
    .from('images')
    .select('model_id, count')
    .select('model_id')
    .eq('count(*)', 'model_id')
    .group('model_id');
  
  if (modelError) {
    throw new ApiError(`Failed to get model stats: ${modelError.message}`, 500);
  }
  
  // Get total credits spent on images
  const { data: creditData, error: creditError } = await supabase
    .from('images')
    .select('credit_cost')
    .eq('sum(credit_cost)', 'total_credits');
  
  if (creditError) {
    throw new ApiError(`Failed to get credit stats: ${creditError.message}`, 500);
  }
  
  const totalCreditsSpent = creditData.length > 0 ? creditData[0].total_credits : 0;
  
  // Get daily generation counts for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: dailyGeneration, error: dailyError } = await supabase
    .from('images')
    .select('created_at, count')
    .select('created_at::date as date')
    .eq('count(*)', 'date')
    .group('date')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('date', { ascending: true });
  
  if (dailyError) {
    throw new ApiError(`Failed to get daily stats: ${dailyError.message}`, 500);
  }
  
  res.status(200).json({
    total_images: totalImages,
    total_credits_spent: totalCreditsSpent,
    by_resolution: imagesByResolution,
    by_model: imagesByModel,
    daily_generation: dailyGeneration
  });
});

/**
 * @desc    Get all credit transaction stats
 * @route   GET /api/admin/stats/credits
 * @access  Private/Admin
 */
const getCreditStats = asyncHandler(async (req, res) => {
  // Get total credits added
  const { data: creditAdded, error: addError } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('type', 'credit')
    .eq('sum(amount)', 'total_added');
  
  if (addError) {
    throw new ApiError(`Failed to get credit stats: ${addError.message}`, 500);
  }
  
  const totalCreditsAdded = creditAdded.length > 0 ? creditAdded[0].total_added : 0;
  
  // Get total credits spent
  const { data: creditSpent, error: spentError } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('type', 'debit')
    .eq('sum(amount)', 'total_spent');
  
  if (spentError) {
    throw new ApiError(`Failed to get credit stats: ${spentError.message}`, 500);
  }
  
  const totalCreditsSpent = creditSpent.length > 0 ? creditSpent[0].total_spent : 0;
  
  // Get credits by source
  const { data: creditsBySource, error: sourceError } = await supabase
    .from('credit_transactions')
    .select('source, type, sum(amount) as total')
    .group('source, type')
    .order('total', { ascending: false });
  
  if (sourceError) {
    throw new ApiError(`Failed to get source stats: ${sourceError.message}`, 500);
  }
  
  // Get daily credit transactions for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: dailyCredits, error: dailyError } = await supabase
    .from('credit_transactions')
    .select('created_at, type, sum(amount) as total')
    .select('created_at::date as date')
    .group('date, type')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('date', { ascending: true });
  
  if (dailyError) {
    throw new ApiError(`Failed to get daily stats: ${dailyError.message}`, 500);
  }
  
  res.status(200).json({
    total_credits_added: totalCreditsAdded,
    total_credits_spent: totalCreditsSpent,
    net_credits: totalCreditsAdded - totalCreditsSpent,
    by_source: creditsBySource,
    daily_transactions: dailyCredits
  });
});

/**
 * @desc    Get all user stats
 * @route   GET /api/admin/stats/users
 * @access  Private/Admin
 */
const getUserStats = asyncHandler(async (req, res) => {
  // Get total users
  const { count: totalUsers, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw new ApiError(`Failed to get user stats: ${countError.message}`, 500);
  }
  
  // Get users by country
  const { data: usersByCountry, error: countryError } = await supabase
    .from('profiles')
    .select('country, count')
    .select('country')
    .eq('count(*)', 'country')
    .group('country')
    .order('count', { ascending: false });
  
  if (countryError) {
    throw new ApiError(`Failed to get country stats: ${countryError.message}`, 500);
  }
  
  // Get top users by credit spend
  const { data: topUsers, error: topError } = await supabase
    .from('credit_transactions')
    .select('user_id, sum(amount) as total_spent')
    .eq('type', 'debit')
    .group('user_id')
    .order('total_spent', { ascending: false })
    .limit(10);
  
  if (topError) {
    throw new ApiError(`Failed to get top user stats: ${topError.message}`, 500);
  }
  
  // Get new users for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: newUsers, error: newError } = await supabase
    .from('profiles')
    .select('created_at, count')
    .select('created_at::date as date')
    .eq('count(*)', 'date')
    .group('date')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('date', { ascending: true });
  
  if (newError) {
    throw new ApiError(`Failed to get new user stats: ${newError.message}`, 500);
  }
  
  // If needed, fetch user details for the top users
  let topUserDetails = [];
  if (topUsers.length > 0) {
    const userIds = topUsers.map(u => u.user_id);
    const { data: userDetails, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);
    
    if (!userError && userDetails) {
      topUserDetails = topUsers.map(user => {
        const details = userDetails.find(u => u.id === user.user_id) || {};
        return {
          ...user,
          email: details.email,
          full_name: details.full_name
        };
      });
    }
  }
  
  res.status(200).json({
    total_users: totalUsers,
    by_country: usersByCountry,
    top_users: topUserDetails.length > 0 ? topUserDetails : topUsers,
    new_users: newUsers
  });
});

module.exports = {
  adjustUserCredits,
  getImageStats,
  getCreditStats,
  getUserStats
}; 