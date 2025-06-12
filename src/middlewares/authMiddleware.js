const { supabase } = require('../config/supabaseClient');
const { ApiError } = require('./errorMiddleware');
const asyncHandler = require('express-async-handler');

/**
 * Middleware to protect routes and verify JWT token from Supabase
 * Attaches the authenticated user data to the request object
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      if (!token) {
        throw new ApiError('Not authorized, no token provided', 401);
      }
      
      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        throw new ApiError('Not authorized, token invalid or expired', 401);
      }
      
      // Get additional user data from the database
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user profile:', userError);
      }
      
      // Set user data on request object
      req.user = {
        id: user.id,
        email: user.email,
        role: userData?.role || 'user',
        ...userData
      };
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      next(new ApiError(error.message || 'Not authorized', 401));
    }
  } else {
    next(new ApiError('Not authorized, no token provided', 401));
  }
});

/**
 * Middleware to restrict routes to admin users only
 * Must be used after the protect middleware
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    next(new ApiError('Not authorized as an admin', 403));
  }
};

module.exports = {
  protect,
  admin
}; 