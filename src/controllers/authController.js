const asyncHandler = require('express-async-handler');
const { 
  registerUser, 
  loginUser, 
  refreshToken, 
  signOutUser, 
  verifyEmail,
  resendVerificationOTP,
  requestPasswordReset,
  resetPasswordWithOTP,
  signInWithProvider 
} = require('../services/authService');
const { ApiError } = require('../middlewares/errorMiddleware');
const { isValidPhoneNumber, getPhoneValidationErrorMessage } = require('../utils/validationUtils');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, full_name, phone } = req.body;
  
  // Basic validation
  if (!email || !password || !full_name) {
    throw new ApiError('Please provide email, password, and full name', 400);
  }

  // Phone number validation
  if (!phone) {
    throw new ApiError('Phone number is required', 400);
  }
  
  if (!isValidPhoneNumber(phone)) {
    throw new ApiError(getPhoneValidationErrorMessage(), 400);
  }
  
  // Get client IP for location detection
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Register the user
  const result = await registerUser({ email, password, full_name, phone }, ip);
  
  res.status(201).json(result);
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Basic validation
  if (!email || !password) {
    throw new ApiError('Please provide email and password', 400);
  }
  
  // Login the user
  const result = await loginUser({ email, password });
  
  res.status(200).json(result);
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    throw new ApiError('Refresh token is required', 400);
  }
  
  const result = await refreshToken(refresh_token);
  
  res.status(200).json(result);
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const result = await signOutUser();
  
  res.status(200).json(result);
});

/**
 * @desc    Verify email with OTP
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyUserEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  
  // Basic validation
  if (!email || !otp) {
    throw new ApiError('Please provide email and OTP', 400);
  }
  
  // Verify email with OTP
  const result = await verifyEmail(email, otp);
  
  res.status(200).json(result);
});

/**
 * @desc    Resend verification OTP
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  // Basic validation
  if (!email) {
    throw new ApiError('Please provide email', 400);
  }
  
  // Resend verification OTP
  const result = await resendVerificationOTP(email);
  
  res.status(200).json(result);
});

/**
 * @desc    Request password reset (send OTP)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  // Basic validation
  if (!email) {
    throw new ApiError('Please provide email', 400);
  }
  
  // Request password reset
  const result = await requestPasswordReset(email);
  
  res.status(200).json(result);
});

/**
 * @desc    Reset password with OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPasswordWithCode = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;
  
  // Basic validation
  if (!email || !otp || !password) {
    throw new ApiError('Please provide email, OTP and new password', 400);
  }
  
  // Reset password with OTP
  const result = await resetPasswordWithOTP(email, otp, password);
  
  res.status(200).json(result);
});

/**
 * @desc    Get OAuth URL for social login
 * @route   GET /api/auth/oauth/:provider
 * @access  Public
 */
const getOAuthUrl = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  
  const result = await signInWithProvider(provider);
  
  res.status(200).json(result);
});

/**
 * @desc    Handle OAuth callback
 * @route   GET /api/auth/oauth/callback
 * @access  Public
 */
const oauthCallback = asyncHandler(async (req, res) => {
  // This is a frontend redirect endpoint, we don't need to do anything here
  // Supabase handles the token exchange and user creation automatically
  res.status(200).json({
    message: 'Authentication successful, please close this window and return to the app.'
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyUserEmail,
  resendOTP,
  forgotPassword,
  resetPasswordWithCode,
  getOAuthUrl,
  oauthCallback
}; 