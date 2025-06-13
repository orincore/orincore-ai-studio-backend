const asyncHandler = require('express-async-handler');
const { supabase } = require('../config/supabaseClient');
const { ApiError } = require('../middlewares/errorMiddleware');
const crypto = require('crypto');
const cashfreeConfig = require('../config/cashfreeConfig');

const CASHFREE_CLIENT_SECRET = cashfreeConfig.clientSecret;
// Set to true for development/testing to bypass signature verification
const DEVELOPMENT_MODE = process.env.NODE_ENV !== 'production';

/**
 * Verify Cashfree webhook signature
 * @param {Buffer|string} body - Raw request body
 * @param {string} signature - Signature from headers
 * @returns {boolean} - Whether signature is valid
 */
const verifyCashfreeSignature = (body, signature) => {
  // In development mode, bypass signature verification
  if (DEVELOPMENT_MODE) {
    console.log('⚠️ Development mode: Bypassing signature verification');
    return true;
  }
  
  if (!signature) {
    console.error('❌ No signature provided in webhook headers');
    return false;
  }
  
  try {
    // Convert body to string if it's a Buffer
    let bodyStr;
    if (Buffer.isBuffer(body)) {
      bodyStr = body.toString('utf8');
    } else if (typeof body === 'string') {
      bodyStr = body;
    } else if (typeof body === 'object') {
      // If it's already parsed as JSON, stringify it again
      bodyStr = JSON.stringify(body);
    } else {
      console.error('❌ Unsupported body type for signature verification:', typeof body);
      return false;
    }
    
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', CASHFREE_CLIENT_SECRET)
      .update(bodyStr)
      .digest('base64');
    
    const isValid = expectedSignature === signature;
    
    if (!isValid) {
      console.error('❌ Signature verification failed:');
      console.error('  Expected:', expectedSignature);
      console.error('  Received:', signature);
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
};

/**
 * Log webhook payload details for debugging
 * @param {Object} payload - The webhook payload
 */
const logWebhookPayloadDetails = (payload) => {
  try {
    console.log('📝 Webhook payload structure:');
    
    // Check if payload has the expected structure
    if (payload.data) {
      console.log('✅ Payload has data property');
      
      if (payload.data.order) {
        console.log('✅ Payload has order data');
        console.log('  - Order ID:', payload.data.order.order_id);
        console.log('  - Order Amount:', payload.data.order.order_amount);
        console.log('  - Order Tags:', JSON.stringify(payload.data.order.order_tags));
      } else {
        console.log('❌ Missing order data in payload');
      }
      
      if (payload.data.payment) {
        console.log('✅ Payload has payment data');
        console.log('  - Payment ID:', payload.data.payment.cf_payment_id);
        console.log('  - Payment Status:', payload.data.payment.payment_status);
      } else {
        console.log('❌ Missing payment data in payload');
      }
      
      if (payload.data.customer) {
        console.log('✅ Payload has customer data');
        console.log('  - Customer ID:', payload.data.customer.customer_id);
      } else {
        console.log('❌ Missing customer data in payload');
      }
    } else {
      console.log('❌ Payload does not have expected structure');
      console.log('Payload keys:', Object.keys(payload));
    }
  } catch (error) {
    console.error('Error logging webhook payload:', error);
  }
};

const handleCashfreeWebhook = asyncHandler(async (req, res) => {
  try {
    const signature = req.headers['x-cf-signature'];
    // Use rawBody if available, otherwise fall back to body
    const rawBody = req.rawBody || req.body;
    
    // Log headers for debugging
    console.log('📝 Webhook headers:', JSON.stringify(req.headers, null, 2));
    
    // Verify signature
    const isValid = verifyCashfreeSignature(rawBody, signature);
    if (!isValid && !DEVELOPMENT_MODE) {
      console.error('❌ Invalid Cashfree webhook signature');
      throw new ApiError('Invalid Cashfree webhook signature', 401);
    }

    // Parse the payload
    let payload;
    try {
      if (typeof rawBody === 'string') {
        payload = JSON.parse(rawBody);
      } else {
        payload = rawBody; // Already parsed
      }
    } catch (parseError) {
      console.error('❌ Failed to parse webhook payload:', parseError);
      throw new ApiError('Invalid webhook payload format', 400);
    }
    
    console.log('📝 Received webhook payload:', JSON.stringify(payload, null, 2));
    
    // Log detailed webhook payload structure
    logWebhookPayloadDetails(payload);

    // Extract payment details
    const orderId = payload.data.order.order_id;
    const orderAmount = parseFloat(payload.data.order.order_amount);
    const paymentStatus = payload.data.payment.payment_status;
    const paymentId = payload.data.payment.cf_payment_id;
    const userId = payload.data.customer.customer_id;
    const email = payload.data.customer.customer_email;
    const paymentTime = new Date(payload.data.payment.payment_completion_time);
    const orderNote = payload.data.order.order_note || '';
    const orderTags = payload.data.order.order_tags || {};

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
    
    // Update payment order status if it exists
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({ 
        status: paymentStatus,
        payment_method: payload.data.payment.payment_method,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);
      
    if (updatePaymentError) {
      console.error(`❌ Failed to update payment order status: ${updatePaymentError.message}`);
    } else {
      console.log(`✅ Payment order status updated to ${paymentStatus}`);
    }

    // Handle payment status
    if (paymentStatus === 'SUCCESS') {
      // Check if this is an RS2000 plan purchase
      const isRS2000Plan = orderNote.includes('RS2000') || 
                          (orderAmount === 2000 && (orderNote.includes('plan') || orderTags.purchase_type === 'plan')) || 
                          orderTags.plan_type === 'RS2000';
      
      if (isRS2000Plan) {
        console.log(`✅ RS2000 plan purchase detected for user ${userId}`);
        
        // Update user to professional role and plan
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(now.getDate() + 30); // 30 days plan duration
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            current_plan: 'professional',
            plan_expiry: expiryDate.toISOString(),
            role: 'professional'
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('❌ Failed to update user to professional:', updateError);
        } else {
          console.log(`✅ User ${userId} upgraded to professional with RS2000 plan`);
        }
      } else {
        // Regular payment - Add credits to user's account
        // Get user's current credit balance
        const { data: userData, error: userDataError } = await supabase
          .from('profiles')
          .select('credit_balance')
          .eq('id', userId)
          .single();
          
        if (userDataError) {
          console.error('❌ Failed to get user data:', userDataError);
          throw new ApiError('Failed to get user data', 500);
        }
        
        const currentCredits = userData.credit_balance || 0;
        const newCredits = currentCredits + orderAmount;
        
        // Update user's credit balance
        const { error: creditError } = await supabase
          .from('profiles')
          .update({ credit_balance: newCredits })
          .eq('id', userId);

        if (creditError) {
          console.error('❌ Failed to add credits:', creditError);
          throw new ApiError('Failed to add credits to user account', 500);
        }

        // Log the credit transaction
        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: userId,
            amount: orderAmount,
            type: 'credit',
            source: 'payment',
            reference_id: orderId,
            balance_after: newCredits
          });

        if (transactionError) {
          console.error('❌ Failed to log credit transaction:', transactionError);
        }

        console.log(`✅ Added ₹${orderAmount} credits to user ${userId}, new balance: ${newCredits}`);
      }
    } else {
      console.log(`ℹ️ Payment status ${paymentStatus} for order ${orderId} - no credits added`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    throw new ApiError(error.message || 'Failed to process webhook', error.status || 500);
  }
});

module.exports = {
  handleCashfreeWebhook,
  verifyCashfreeSignature
};
