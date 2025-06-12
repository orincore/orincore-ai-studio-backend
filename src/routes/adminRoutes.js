const express = require('express');
const { 
  adjustUserCredits,
  getImageStats,
  getCreditStats,
  getUserStats
} = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes are protected and admin-only
router.use(protect, admin);

// User management
router.post('/users/:id/credits', adjustUserCredits);

// Stats routes
router.get('/stats/images', getImageStats);
router.get('/stats/credits', getCreditStats);
router.get('/stats/users', getUserStats);

module.exports = router; 