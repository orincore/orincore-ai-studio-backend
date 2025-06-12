const asyncHandler = require('express-async-handler');
const { 
  getUserById, 
  updateUserProfile, 
  getAllUsers, 
  setUserRole,
  getUserFullProfileData
} = require('../services/userService');
const { 
  getUserCredits,
  getCreditHistory 
} = require('../services/creditService');
const { ApiError } = require('../middlewares/errorMiddleware');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Private
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  
  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/me
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  // Sanitize input - only allow specific fields to be updated
  const allowedFields = [
    'full_name', 
    'avatar_url', 
    'country', 
    'country_code', 
    'currency', 
    'timezone', 
    'language',
    'bio',
    'website',
    'phone_number'
  ];
  
  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });
  
  if (Object.keys(updateData).length === 0) {
    throw new ApiError('No valid fields to update', 400);
  }
  
  const updatedUser = await updateUserProfile(req.user.id, updateData);
  
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedUser
  });
});

/**
 * @desc    Get user credit balance
 * @route   GET /api/users/me/credits
 * @access  Private
 */
const getCredits = asyncHandler(async (req, res) => {
  const credits = await getUserCredits(req.user.id);
  
  res.status(200).json({ credits });
});

/**
 * @desc    Get user credit history
 * @route   GET /api/users/me/credits/history
 * @access  Private
 */
const getCreditTransactionHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const type = req.query.type; // 'credit' or 'debit'
  
  const history = await getCreditHistory(req.user.id, { page, limit, type });
  
  res.status(200).json(history);
});

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search;
  
  const users = await getAllUsers({ page, limit, search });
  
  res.status(200).json(users);
});

/**
 * @desc    Get user by ID (admin only)
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
const getUserByIdAdmin = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  
  res.status(200).json(user);
});

/**
 * @desc    Update user role (admin only)
 * @route   PATCH /api/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  
  if (!role) {
    throw new ApiError('Role is required', 400);
  }
  
  const updatedUser = await setUserRole(req.params.id, role);
  
  res.status(200).json(updatedUser);
});

/**
 * @desc    Get user's full profile with detailed information
 * @route   GET /api/users/me/full-profile
 * @access  Private
 */
const getUserFullProfile = asyncHandler(async (req, res) => {
  const userProfile = await getUserFullProfileData(req.user.id);
  
  res.status(200).json({
    success: true,
    data: userProfile
  });
});

/**
 * @desc    Update user account settings
 * @route   PATCH /api/users/me/account-settings
 * @access  Private
 */
const updateAccountSettings = asyncHandler(async (req, res) => {
  const { email_notifications, marketing_emails, app_notifications } = req.body;
  
  const updateData = {};
  
  // Only update fields that are provided
  if (email_notifications !== undefined) {
    updateData.email_notifications = Boolean(email_notifications);
  }
  
  if (marketing_emails !== undefined) {
    updateData.marketing_emails = Boolean(marketing_emails);
  }
  
  if (app_notifications !== undefined) {
    updateData.app_notifications = Boolean(app_notifications);
  }
  
  if (Object.keys(updateData).length === 0) {
    throw new ApiError('No valid settings to update', 400);
  }
  
  const updatedUser = await updateUserProfile(req.user.id, updateData);
  
  res.status(200).json({
    success: true,
    message: 'Account settings updated successfully',
    data: {
      email_notifications: updatedUser.email_notifications,
      marketing_emails: updatedUser.marketing_emails,
      app_notifications: updatedUser.app_notifications
    }
  });
});

module.exports = {
  getCurrentUser,
  updateProfile,
  getCredits,
  getCreditTransactionHistory,
  getUsers,
  getUserByIdAdmin,
  updateUserRole,
  getUserFullProfile,
  updateAccountSettings
}; 