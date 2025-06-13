const express = require('express');
const router = express.Router();
const { handleCashfreeWebhook } = require('../controllers/webhookController');

// POST /api/webhooks/cashfree
router.post('/cashfree', handleCashfreeWebhook);

module.exports = router;
