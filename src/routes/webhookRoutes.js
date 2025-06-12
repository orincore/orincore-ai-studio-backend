const express = require('express');
const { handleLemonSqueezyWebhook } = require('../controllers/webhookController');
const rawBodyMiddleware = require('../middlewares/rawBodyMiddleware');

const router = express.Router();

// Use raw body middleware for webhook verification
router.use(rawBodyMiddleware);

// Webhook routes
router.post('/lemonsqueezy', handleLemonSqueezyWebhook);

module.exports = router; 