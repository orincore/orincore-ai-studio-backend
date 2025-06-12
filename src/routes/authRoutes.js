const express = require('express');
const { 
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
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refresh);

// Email verification with OTP
router.post('/verify-email', verifyUserEmail);
router.post('/resend-verification', resendOTP);

// Password reset with OTP
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithCode);

// OAuth routes
router.get('/oauth/:provider', getOAuthUrl);
router.get('/oauth/:provider/callback', oauthCallback);

// Protected routes
router.post('/logout', protect, logout);

module.exports = router; 