const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware'); // <-- use your existing auth middleware

router.post('/create-order', protect, paymentController.createOrder);

module.exports = router;
