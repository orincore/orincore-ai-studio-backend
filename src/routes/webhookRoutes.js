const express = require('express');
const crypto = require('crypto');
const { ApiError } = require('../middlewares/errorMiddleware');
const supabase = require('../config/supabaseClient');

const router = express.Router();
const CASHFREE_SECRET = process.env.CASHFREE_SECRET_KEY;

// POST /api/webhooks/cashfree
router.post('/cashfree', async (req, res, next) => {
  try {
    const rawBody = req.body;
    const signature = req.headers['x-cf-webhook-signature'] || '';

    const expected = crypto
      .createHmac('sha256', CASHFREE_SECRET)
      .update(rawBody)
      .digest('base64');

    if (expected !== signature) {
      throw new ApiError('Invalid Cashfree webhook signature', 400);
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    if (event.order_status === 'PAID') {
      const orderId = event.order_id;

      // Find payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (paymentError || !payment) {
        console.warn(`Order ID ${orderId} not found in payments`);
        return res.status(200).send({ status: 'OK' });
      }

      // Check if already updated (safety)
      if (payment.status === 'SUCCESS') {
        console.log(`Order ${orderId} already processed.`);
        return res.status(200).send({ status: 'Already processed' });
      }

      // 1️⃣ Update payment status to SUCCESS (in case)
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({ status: 'SUCCESS' })
        .eq('order_id', orderId);

      if (updatePaymentError) {
        console.error('Failed updating payment status', updatePaymentError);
      }

      // 2️⃣ Add credits to user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', payment.user_id)
        .single();

      if (userError || !user) {
        console.error(`User ${payment.user_id} not found`);
        return res.status(200).send({ status: 'User not found' });
      }

      const creditsToAdd = 50;  // Set your credit logic here

      const { error: updateCreditsError } = await supabase
        .from('users')
        .update({ credits: (user.credits || 0) + creditsToAdd })
        .eq('id', payment.user_id);

      if (updateCreditsError) {
        console.error('Failed updating user credits', updateCreditsError);
      }

      console.log(`Credits updated successfully for user: ${payment.user_id}`);
    }

    res.status(200).send({ status: 'OK' });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    next(err);
  }
});

module.exports = router;
