const express = require('express');
const router = express.Router();
const { handlePaymentSuccess } = require('../controllers/paymentStatusController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/success', protect, handlePaymentSuccess);

module.exports = router;
