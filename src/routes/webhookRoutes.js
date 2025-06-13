const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Cashfree webhook endpoint
router.post('/cashfree', webhookController.handleCashfreeWebhook);

module.exports = router;
