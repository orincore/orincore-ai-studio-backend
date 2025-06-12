const { supabase, supabasePublic } = require('../config/supabaseClient');
const { createUserProfile } = require('./userService');
const { ApiError } = require('../middlewares/errorMiddleware');
const EmailService = require('./emailService');
const { generateOTP, validateOTP } = require('../utils/otpUtils');
const jwt = require('jsonwebtoken');

/**
 * Register a new user with email and password
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.full_name - User's full name
 * @param {string} ip - User's IP address for location detection
 * @returns {Promise<Object>} - Auth data with user details
 */
const registerUser = async ({ email, password, full_name }, ip = null) => {
  try {
    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification
      user_metadata: {
        full_name
      }
    });
    
    if (error) {
      throw new ApiError(`Registration failed: ${error.message}`, 400);
    }
    
    // Create user profile with additional data
    const profile = await createUserProfile(
      data.user,
      { full_name },
      ip
    );
    
    // Generate 6-digit OTP
    const otp = generateOTP();
    
    // Store OTP in user metadata
    await supabase.auth.admin.updateUserById(data.user.id, {
      user_metadata: {
        ...data.user.user_metadata,
        verification_otp: otp,
        verification_otp_created_at: new Date().toISOString()
      }
    });
    
    // Send verification email with OTP
    try {
      await EmailService.sendOtpEmail(email, otp);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Don't fail registration if email fails
    }
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile.full_name,
        role: profile.role
      },
      message: 'Registration successful. Please check your email for OTP verification code.'
    };
  } catch (error) {
    console.error('Error registering user:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Registration failed: ${error.message}`, 500);
  }
};

/**
 * Verify user email with OTP
 * @param {string} email - User email
 * @param {string} otp - Verification OTP
 * @returns {Promise<Object>} - Verification result
 */
const verifyEmail = async (email, otp) => {
  try {
    // Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (userError || !users || users.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    const user = users[0];
    
    // Check if user is already verified
    if (user.email_confirmed_at) {
      return {
        success: true,
        message: 'Email already verified'
      };
    }
    
    // Validate OTP
    const storedOTP = user.user_metadata?.verification_otp;
    const otpCreatedAt = user.user_metadata?.verification_otp_created_at;
    
    if (!storedOTP || !otpCreatedAt) {
      throw new ApiError('OTP not found or expired. Please request a new OTP', 400);
    }
    
    if (otp !== storedOTP) {
      throw new ApiError('Invalid OTP. Please try again', 400);
    }
    
    // Check if OTP is expired (10 minutes)
    const otpCreatedDate = new Date(otpCreatedAt);
    const currentDate = new Date();
    const diffMinutes = (currentDate - otpCreatedDate) / (1000 * 60);
    
    if (diffMinutes > 10) {
      throw new ApiError('OTP expired. Please request a new OTP', 400);
    }
    
    // Verify the user's email
    await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        verification_otp: null,
        verification_otp_created_at: null
      }
    });
    
    // Get the user's name from metadata
    const fullName = user.user_metadata?.full_name || 'User';
    
    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(email, fullName);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }
    
    return {
      success: true,
      message: 'Email verified successfully'
    };
  } catch (error) {
    console.error('Error verifying email:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Email verification failed: ${error.message}`, 500);
  }
};

/**
 * Resend verification OTP
 * @param {string} email - User email
 * @returns {Promise<Object>} - Resend result
 */
const resendVerificationOTP = async (email) => {
  try {
    // Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (userError || !users || users.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    const user = users[0];
    
    // Check if user is already verified
    if (user.email_confirmed_at) {
      return {
        success: true,
        message: 'Email already verified'
      };
    }
    
    // Generate new OTP
    const otp = generateOTP();
    
    // Store OTP in user metadata
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        verification_otp: otp,
        verification_otp_created_at: new Date().toISOString()
      }
    });
    
    // Send verification email with OTP
    await EmailService.sendOtpEmail(email, otp);
    
    return {
      success: true,
      message: 'Verification OTP sent successfully'
    };
  } catch (error) {
    console.error('Error resending verification OTP:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to resend verification OTP: ${error.message}`, 500);
  }
};

/**
 * Request password reset using OTP
 * @param {string} email - User email
 * @returns {Promise<Object>} - Request result
 */
const requestPasswordReset = async (email) => {
  try {
    // Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (userError || !users || users.length === 0) {
      // Don't reveal if user exists or not for security
      return {
        success: true,
        message: 'If your email is registered, you will receive a password reset OTP'
      };
    }
    
    const user = users[0];
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in user metadata
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        reset_password_otp: otp,
        reset_password_otp_created_at: new Date().toISOString()
      }
    });
    
    // Send reset password email with OTP
    await EmailService.sendOtpEmail(email, otp);
    
    return {
      success: true,
      message: 'If your email is registered, you will receive a password reset OTP'
    };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    // Don't reveal errors for security
    return {
      success: true,
      message: 'If your email is registered, you will receive a password reset OTP'
    };
  }
};

/**
 * Reset password using OTP
 * @param {string} email - User email
 * @param {string} otp - Reset password OTP
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Reset result
 */
const resetPasswordWithOTP = async (email, otp, newPassword) => {
  try {
    // Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (userError || !users || users.length === 0) {
      throw new ApiError('Invalid or expired reset request', 400);
    }
    
    const user = users[0];
    
    // Validate OTP
    const storedOTP = user.user_metadata?.reset_password_otp;
    const otpCreatedAt = user.user_metadata?.reset_password_otp_created_at;
    
    if (!storedOTP || !otpCreatedAt) {
      throw new ApiError('Invalid or expired reset request', 400);
    }
    
    if (otp !== storedOTP) {
      throw new ApiError('Invalid OTP. Please try again', 400);
    }
    
    // Check if OTP is expired (10 minutes)
    const otpCreatedDate = new Date(otpCreatedAt);
    const currentDate = new Date();
    const diffMinutes = (currentDate - otpCreatedDate) / (1000 * 60);
    
    if (diffMinutes > 10) {
      throw new ApiError('OTP expired. Please request a new password reset', 400);
    }
    
    // Update password
    await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      user_metadata: {
        ...user.user_metadata,
        reset_password_otp: null,
        reset_password_otp_created_at: null
      }
    });
    
    return {
      success: true,
      message: 'Password reset successfully'
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Password reset failed: ${error.message}`, 500);
  }
};

/**
 * Login user with email and password
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} - Auth data with user details and token
 */
const loginUser = async ({ email, password }) => {
  try {
    // First check if the user exists and is verified
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (userError || !users || users.length === 0) {
      throw new ApiError('Invalid login credentials', 401);
    }
    
    const user = users[0];
    
    // Check if email is verified
    if (!user.email_confirmed_at) {
      throw new ApiError('Email not verified. Please verify your email before logging in', 403);
    }
    
    // Sign in user with Supabase Auth
    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw new ApiError(`Login failed: ${error.message}`, 401);
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || data.user.user_metadata?.full_name,
        role: profile?.role || 'user'
      },
      tokens: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    };
  } catch (error) {
    console.error('Error logging in user:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Login failed: ${error.message}`, 500);
  }
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} - New access token
 */
const refreshToken = async (refreshToken) => {
  try {
    // Refresh token with Supabase Auth
    const { data, error } = await supabasePublic.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error) {
      throw new ApiError(`Token refresh failed: ${error.message}`, 401);
    }
    
    return {
      token: data.session.access_token,
      refresh_token: data.session.refresh_token
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Token refresh failed: ${error.message}`, 500);
  }
};

/**
 * Sign out user
 * @returns {Promise<Object>} - Success message
 */
const signOutUser = async () => {
  try {
    // Sign out user with Supabase Auth
    const { error } = await supabasePublic.auth.signOut();
    
    if (error) {
      throw new ApiError(`Sign out failed: ${error.message}`, 500);
    }
    
    return {
      message: 'Signed out successfully'
    };
  } catch (error) {
    console.error('Error signing out user:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Sign out failed: ${error.message}`, 500);
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<Object>} - Success message
 */
const sendPasswordResetEmail = async (email) => {
  try {
    // Generate reset token with Supabase
    const { data, error } = await supabasePublic.auth.resetPasswordForEmail(email);
    
    if (error) {
      throw new ApiError(`Failed to send password reset email: ${error.message}`, 400);
    }
    
    // Generate reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${data?.token || 'PLACEHOLDER_TOKEN'}`;
    
    // Send custom reset email
    try {
      await EmailService.sendPasswordResetEmail(email, resetUrl);
    } catch (emailError) {
      console.error('Error sending custom password reset email:', emailError);
      // Fall back to Supabase's default email
    }
    
    return {
      message: 'Password reset email sent'
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to send password reset email: ${error.message}`, 500);
  }
};

/**
 * Reset password with token
 * @param {string} password - New password
 * @param {string} token - Reset token
 * @returns {Promise<Object>} - Success message
 */
const resetPassword = async (password, token) => {
  try {
    // Update password with Supabase Auth
    const { error } = await supabasePublic.auth.updateUser({
      password
    });
    
    if (error) {
      throw new ApiError(`Password reset failed: ${error.message}`, 400);
    }
    
    return {
      message: 'Password reset successful'
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Password reset failed: ${error.message}`, 500);
  }
};

/**
 * Sign in with a social provider
 * @param {string} provider - The provider ('google', 'apple', 'facebook')
 * @returns {Promise<Object>} - URL to redirect to
 */
const signInWithProvider = async (provider) => {
  try {
    // Validate provider
    const validProviders = ['google', 'apple', 'facebook'];
    if (!validProviders.includes(provider)) {
      throw new ApiError(`Invalid provider: ${provider}`, 400);
    }
    
    // Get sign in URL from Supabase Auth
    const { data, error } = await supabasePublic.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: process.env.OAUTH_REDIRECT_URL
      }
    });
    
    if (error) {
      throw new ApiError(`Failed to sign in with ${provider}: ${error.message}`, 400);
    }
    
    return {
      url: data.url
    };
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to sign in with ${provider}: ${error.message}`, 500);
  }
};

module.exports = {
  registerUser,
  verifyEmail,
  resendVerificationOTP,
  requestPasswordReset,
  resetPasswordWithOTP,
  loginUser,
  refreshToken,
  signOutUser,
  sendPasswordResetEmail,
  resetPassword,
  signInWithProvider
}; 