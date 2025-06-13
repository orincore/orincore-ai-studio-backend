const asyncHandler = require('express-async-handler');
const { supabase } = require('../config/supabaseClient');
const { ApiError } = require('../middlewares/errorMiddleware');
const crypto = require('crypto');
const cashfreeConfig = require('../config/cashfreeConfig');

const CASHFREE_CLIENT_SECRET = cashfreeConfig.clientSecret;

const handleCashfreeWebhook = asyncHandler(async (req, res) => {
  try {
    const signature = req.headers['x-cf-signature'];
    const rawBody = req.body;

    // Verify signature
    const isValid = verifyCashfreeSignature(rawBody, signature);
    if (!isValid) {
      console.error('❌ Invalid Cashfree webhook signature');
      throw new ApiError('Invalid Cashfree webhook signature', 401);
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    console.log('📝 Received webhook payload:', JSON.stringify(payload, null, 2));

    // Extract payment details
    const orderId = payload.data.order.order_id;
    const orderAmount = parseFloat(payload.data.order.order_amount);
    const paymentStatus = payload.data.payment.payment_status;
    const paymentId = payload.data.payment.cf_payment_id;
    const userId = payload.data.customer.customer_id;
    const email = payload.data.customer.customer_email;
    const paymentTime = new Date(payload.data.payment.payment_completion_time);

    console.log(`💰 Processing payment: Order ${orderId}, Amount ₹${orderAmount}, Status ${paymentStatus}`);

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

    // Record the transaction first
    const { error: insertError } = await supabase
      .from('payment_transactions')
      .insert({
        order_id: orderId,
        user_id: userId,
        amount: orderAmount,
        currency: 'INR',
        email: email,
        payment_id: paymentId,
        status: paymentStatus,
        payment_time: paymentTime.toISOString(),
        payment_data: payload.data
      });

    if (insertError) {
      console.error('❌ Failed to insert payment transaction:', insertError);
      throw new ApiError('Failed to record payment transaction', 500);
    }

    console.log(`✅ Transaction recorded for order ${orderId}`);

    // Handle payment status
    if (paymentStatus === 'SUCCESS') {
      // Add credits to user's account
      const { error: creditError } = await supabase
        .rpc('add_credits', {
          user_id: userId,
          credits_to_add: orderAmount
        });

      if (creditError) {
        console.error('❌ Failed to add credits:', creditError);
        throw new ApiError('Failed to add credits to user account', 500);
      }

      console.log(`✅ Added ₹${orderAmount} credits to user ${userId}`);
    } else {
      console.log(`ℹ️ Payment status ${paymentStatus} for order ${orderId} - no credits added`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    throw new ApiError(error.message || 'Failed to process webhook', error.status || 500);
  }
});

function verifyCashfreeSignature(payload, signature) {
  if (!CASHFREE_CLIENT_SECRET) {
    console.error('❌ CASHFREE_CLIENT_SECRET is not configured');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', CASHFREE_CLIENT_SECRET)
      .update(payload)
      .digest('base64');

    return signature === expectedSignature;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
}

module.exports = {
  handleCashfreeWebhook
};


module.exports = {
  handleCashfreeWebhook
};
