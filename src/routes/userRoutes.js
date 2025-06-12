const express = require('express');
const { 
  getCurrentUser,
  updateProfile,
  getCredits,
  getCreditTransactionHistory,
  getUsers,
  getUserByIdAdmin,
  updateUserRole,
  getUserFullProfile,
  updateAccountSettings
} = require('../controllers/userController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

// User routes (protected)
router.get('/me', protect, getCurrentUser);
router.put('/me', protect, updateProfile);
router.get('/me/credits', protect, getCredits);
router.get('/me/credits/history', protect, getCreditTransactionHistory);
router.get('/me/full-profile', protect, getUserFullProfile);
router.patch('/me/account-settings', protect, updateAccountSettings);

// Admin routes (protected + admin)
router.get('/', protect, admin, getUsers);
router.get('/:id', protect, admin, getUserByIdAdmin);
router.patch('/:id/role', protect, admin, updateUserRole);

module.exports = router; 