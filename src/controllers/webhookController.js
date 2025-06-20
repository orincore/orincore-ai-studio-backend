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
  
  if (!body) {
    console.error('❌ No body provided for signature verification');
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
      console.error('  Body string (first 100 chars):', bodyStr.substring(0, 100));
    } else {
      console.log('✅ Signature verification successful');
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
      } else if (payload.data.customer_details) {
        console.log('✅ Payload has customer_details data');
        console.log('  - Customer ID:', payload.data.customer_details.customer_id);
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
    console.log('📝 Webhook received at:', new Date().toISOString());
    
    const signature = req.headers['x-cf-signature'];
    // The raw body is now a Buffer stored by our middleware
    const rawBody = req.rawBody;
    
    // Log headers for debugging
    console.log('📝 Webhook headers:', JSON.stringify(req.headers, null, 2));
    
    if (!rawBody) {
      console.error('❌ No raw body available for signature verification');
      return res.status(200).json({ 
        received: true, 
        error: 'No raw body available',
        success: false
      });
    }
    
    console.log('📝 Raw body available:', Buffer.isBuffer(rawBody), 'length:', rawBody.length);
    
    // Verify signature
    const isValid = verifyCashfreeSignature(rawBody, signature);
    if (!isValid && !DEVELOPMENT_MODE) {
      console.error('❌ Invalid Cashfree webhook signature');
      // Still return 200 but with error message
      return res.status(200).json({ 
        received: true, 
        error: 'Invalid signature',
        success: false
      });
    }

    // The body is already parsed by the JSON middleware
    const payload = req.body;
    
    console.log('📝 Received webhook payload:', JSON.stringify(payload, null, 2));
    
    // Log detailed webhook payload structure
    logWebhookPayloadDetails(payload);
  
    // Extract payment details with flexible structure handling
    let orderId, orderAmount, paymentStatus, paymentId, userId, email, paymentTime, orderNote, orderTags;

    // Handle different payload structures
    if (payload.data) {
      // Standard webhook format
      orderId = payload.data.order?.order_id;
      orderAmount = parseFloat(payload.data.order?.order_amount || 0);
      paymentStatus = payload.data.payment?.payment_status;
      paymentId = payload.data.payment?.cf_payment_id;
      // Check both customer and customer_details fields
      userId = payload.data.customer?.customer_id || payload.data.customer_details?.customer_id;
      email = payload.data.customer?.customer_email || payload.data.customer_details?.customer_email;
      paymentTime = payload.data.payment?.payment_completion_time ? 
        new Date(payload.data.payment.payment_completion_time) : new Date();
      orderNote = payload.data.order?.order_note || '';
      orderTags = payload.data.order?.order_tags || {};
    } else if (payload.order_id) {
      // Test webhook or alternative format
      orderId = payload.order_id;
      orderAmount = parseFloat(payload.order_amount || 0);
      paymentStatus = payload.payment_status || 'TEST';
      paymentId = payload.payment_id || `test_${Date.now()}`;
      userId = payload.customer_id;
      email = payload.customer_email;
      paymentTime = new Date();
      orderNote = payload.order_note || '';
      orderTags = payload.order_tags || {};
    } else {
      // Unknown format
      console.error('❌ Unknown webhook payload format');
      return res.status(200).json({ 
        received: true, 
        error: 'Unknown payload format',
        success: false
      });
    }

    // Validate required fields
    if (!orderId) {
      console.error('❌ Missing order ID in webhook payload');
      return res.status(200).json({ 
        received: true, 
        error: 'Missing order ID',
        success: false
      });
    }

    console.log(`💰 Processing payment: Order ${orderId}, Amount ₹${orderAmount}, Status ${paymentStatus}`);

    // If this is a test webhook with no user ID, use a test user ID
    if (!userId && (paymentStatus === 'TEST' || DEVELOPMENT_MODE)) {
      console.log('⚠️ Using test user ID for webhook');
      userId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000';
    }

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

    // Check if this payment has already been processed
    const { data: existingPayment, error: paymentCheckError } = await supabase
      .from('payment_transactions')
      .select('id, status')
      .eq('payment_id', paymentId)
      .eq('order_id', orderId)
      .single();

    if (!paymentCheckError && existingPayment) {
      console.log(`⚠️ Payment ${paymentId} for order ${orderId} already processed with status ${existingPayment.status}`);
      
      // If the payment was already successfully processed, return success
      if (existingPayment.status === 'SUCCESS') {
        return res.status(200).json({ 
          received: true, 
          message: 'Payment already processed',
          success: true
        });
      }
      
      // If status changed, update the existing record instead of creating a new one
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: paymentStatus,
          payment_data: payload.data,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.id);
      
      if (updateError) {
        console.error('❌ Failed to update existing payment transaction:', updateError);
      } else {
        console.log(`✅ Updated payment status to ${paymentStatus} for existing transaction`);
      }
    } else {
      // Record the transaction
      try {
        // Try to insert the transaction
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
          // Check if this is a duplicate key error
          if (insertError.code === '23505') {
            console.log(`⚠️ Duplicate payment transaction detected for ${orderId}/${paymentId}, updating instead`);
            
            // Update the existing record instead
            const { error: updateError } = await supabase
              .from('payment_transactions')
              .update({
                status: paymentStatus,
                payment_data: payload.data,
                updated_at: new Date().toISOString()
              })
              .eq('order_id', orderId)
              .eq('payment_id', paymentId);
            
            if (updateError) {
              console.error('❌ Failed to update payment transaction:', updateError);
              // Don't throw here, continue processing
            } else {
              console.log(`✅ Updated existing transaction for order ${orderId}`);
            }
          } else {
            console.error('❌ Failed to insert payment transaction:', insertError);
            throw new ApiError('Failed to record payment transaction', 500);
          }
        } else {
          console.log(`✅ Transaction recorded for order ${orderId}`);
        }
      } catch (transactionError) {
        // Log the error but continue processing the webhook
        console.error('❌ Error recording transaction:', transactionError);
      }
    }
    
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
      // Only process payment if it's new or status was updated to SUCCESS
      const isNewSuccessfulPayment = !existingPayment || existingPayment.status !== 'SUCCESS';
      
      if (isNewSuccessfulPayment) {
        console.log(`✅ Processing new successful payment for order ${orderId}`);
        
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
          try {
            console.log(`💰 Starting atomic credit addition for user ${userId}, amount: ${orderAmount}`);
            
            // Use a transaction to avoid race conditions
            const { data: result, error: transactionError } = await supabase.rpc('add_credits', {
              p_user_id: userId,
              p_amount: orderAmount,
              p_source: 'payment',
              p_reference_id: orderId
            });
            
            if (transactionError) {
              console.error('❌ Failed to add credits:', transactionError);
              throw new ApiError('Failed to add credits to user account', 500);
            }
            
            if (result.status === 'already_processed') {
              console.log(`⚠️ Payment ${orderId} already processed, skipping credit addition. Current balance: ${result.new_balance}`);
            } else {
              console.log(`✅ Added ₹${orderAmount} credits to user ${userId}, previous balance: ${result.previous_balance}, new balance: ${result.new_balance}`);
            }
          } catch (error) {
            console.error('❌ Error processing credit addition:', error);
            // Don't throw here, we still want to return 200 to Cashfree
          }
        }
      } else {
        console.log(`ℹ️ Payment ${paymentId} already processed successfully, skipping processing`);
      }
    } else if (paymentStatus === 'TEST') {
      // Handle test webhooks from Cashfree
      console.log(`🧪 Test webhook received with status: ${paymentStatus}`);
      // Return success without processing further
    } else {
      console.log(`ℹ️ Payment status ${paymentStatus} for order ${orderId} - no credits added`);
    }

    res.status(200).json({ received: true, success: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Always return 200 OK to Cashfree to prevent retries
    // but include error message in the response
    return res.status(200).json({ 
      received: true, 
      error: error.message || 'Error processing webhook',
      success: false
    });
  }
});

module.exports = {
  handleCashfreeWebhook,
  verifyCashfreeSignature
};
