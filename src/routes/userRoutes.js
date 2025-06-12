const express = require('express');
const { 
  getCurrentUser,
  updateProfile,
  getCredits,
  getCreditTransactionHistory,
  getUsers,
  getUserByIdAdmin,
  updateUserRole
} = require('../controllers/userController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

// User routes (protected)
router.get('/me', protect, getCurrentUser);
router.put('/me', protect, updateProfile);
router.get('/me/credits', protect, getCredits);
router.get('/me/credits/history', protect, getCreditTransactionHistory);

// Admin routes (protected + admin)
router.get('/', protect, admin, getUsers);
router.get('/:id', protect, admin, getUserByIdAdmin);
router.patch('/:id/role', protect, admin, updateUserRole);

module.exports = router; 