const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { protect } = require('../middlewares/authMiddleware');

// Subscribe to plan
router.post('/subscribe', protect, planController.subscribe);

module.exports = router;
