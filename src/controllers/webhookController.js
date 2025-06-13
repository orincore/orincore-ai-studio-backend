const asyncHandler = require('express-async-handler');
const { supabase } = require('../config/supabaseClient');
const { ApiError } = require('../middlewares/errorMiddleware');
const crypto = require('crypto');

const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

const handleCashfreeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-cf-signature'];
  const rawBody = req.body;

  // Verify signature
  const isValid = verifyCashfreeSignature(rawBody, signature);
  if (!isValid) {
    console.error('❌ Invalid Cashfree webhook signature');
    throw new ApiError('Invalid Cashfree webhook signature', 401);
  }

  const payload = JSON.parse(rawBody.toString('utf8'));
  const event = payload.event;

  if (event !== 'PAYMENT_SUCCESS') {
    console.log(`⚠️ Ignoring non-payment-success event: ${event}`);
    return res.status(200).json({ received: true });
  }

  const paymentData = payload.data.payment;
  const orderId = paymentData.order_id;
  const amountPaid = parseFloat(paymentData.amount);
  const currency = paymentData.currency;
  const paymentId = paymentData.payment_id;
  const email = paymentData.customer_details.email;
  const userId = paymentData.customer_details.customer_id;

  console.log(`✅ Payment received: User ${userId}, Amount ₹${amountPaid}`);

  // Check if user exists
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    console.error(`❌ User not found for ID: ${userId}`);
    throw new ApiError('User does not exist', 400);
  }

  // Insert payment transaction
  const { error: insertError } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: userId,
      amount: amountPaid,
      currency: currency,
      email: email,
      payment_id: paymentId,
      order_id: orderId,
      status: 'SUCCESS'
    });

  if (insertError) {
    console.error('❌ Failed to insert into payment_transactions:', insertError);
    throw new ApiError('Failed to insert payment transaction', 500);
  }

  console.log(`✅ Transaction recorded for user ${userId}`);

  // Update credits
  const { error: updateError } = await supabase
    .rpc('add_credits', {
      user_id: userId,
      credits_to_add: amountPaid
    });

  if (updateError) {
    console.error('❌ Failed to update credit balance:', updateError);
    throw new ApiError('Failed to update credits', 500);
  }

  console.log(`✅ Successfully added ₹${amountPaid} credits to user ${userId}`);
  res.status(200).json({ received: true });
});

function verifyCashfreeSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', CASHFREE_CLIENT_SECRET)
    .update(payload)
    .digest('base64');

  return signature === expectedSignature;
}

module.exports = {
  handleCashfreeWebhook
};
