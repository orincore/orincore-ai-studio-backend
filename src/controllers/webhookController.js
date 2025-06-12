const asyncHandler = require('express-async-handler');
const { validateWebhookSignature } = require('../services/lemonSqueezyService');
const { addCredits } = require('../services/creditService');
const { supabase } = require('../config/supabaseClient');
const { ApiError } = require('../middlewares/errorMiddleware');

/**
 * @desc    Handle LemonSqueezy webhooks
 * @route   POST /api/webhooks/lemonsqueezy
 * @access  Public
 */
const handleLemonSqueezyWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-signature'];
  const rawBody = req.rawBody; // This is set in a middleware
  
  // Verify webhook signature
  if (!signature) {
    throw new ApiError('No signature provided', 400);
  }
  
  const isValid = validateWebhookSignature(signature, rawBody);
  
  if (!isValid) {
    throw new ApiError('Invalid webhook signature', 401);
  }
  
  // Process the webhook
  const { meta, data } = req.body;
  const eventName = meta.event_name;
  
  console.log(`Received LemonSqueezy webhook: ${eventName}`);
  
  switch (eventName) {
    case 'order_created':
      await handleOrderCreated(data);
      break;
    case 'subscription_created':
      await handleSubscriptionCreated(data);
      break;
    case 'subscription_updated':
      await handleSubscriptionUpdated(data);
      break;
    case 'subscription_cancelled':
      await handleSubscriptionCancelled(data);
      break;
    case 'subscription_resumed':
      await handleSubscriptionResumed(data);
      break;
    case 'subscription_expired':
      await handleSubscriptionExpired(data);
      break;
    default:
      console.log(`Unhandled webhook event: ${eventName}`);
  }
  
  res.status(200).json({ received: true });
});

/**
 * Handle order created event
 * @param {Object} data - Webhook data
 */
const handleOrderCreated = async (data) => {
  try {
    const orderId = data.id;
    const customerId = data.attributes.customer_id;
    const orderItems = data.attributes.order_items;
    
    // Find the user with this LemonSqueezy customer ID
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('lemonsqueezy_customer_id', customerId);
    
    if (error || !users.length) {
      console.error('User not found for LemonSqueezy customer ID:', customerId);
      return;
    }
    
    const userId = users[0].id;
    
    // Process each order item
    for (const item of orderItems) {
      const productId = item.product_id;
      const variantId = item.variant_id;
      
      // Get credit amount from product metadata or default
      // This is a simplified example, you'd need to configure credit amounts per product
      let creditAmount = 0;
      
      // Example mapping logic - replace with your actual product/credit mapping
      if (productId === '123456') {
        creditAmount = 10; // Basic package
      } else if (productId === '234567') {
        creditAmount = 50; // Premium package
      } else if (productId === '345678') {
        creditAmount = 100; // Pro package
      } else {
        creditAmount = 5; // Default fallback
      }
      
      // Add credits to the user's account
      await addCredits(
        userId,
        creditAmount,
        'purchase',
        `order_${orderId}_item_${item.id}`
      );
      
      console.log(`Added ${creditAmount} credits to user ${userId} for order item ${item.id}`);
    }
  } catch (error) {
    console.error('Error handling order created webhook:', error);
  }
};

/**
 * Handle subscription created event
 * @param {Object} data - Webhook data
 */
const handleSubscriptionCreated = async (data) => {
  try {
    const subscriptionId = data.id;
    const customerId = data.attributes.customer_id;
    const variantId = data.attributes.variant_id;
    const status = data.attributes.status;
    
    // Only process active subscriptions
    if (status !== 'active') {
      return;
    }
    
    // Find the user with this LemonSqueezy customer ID
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('lemonsqueezy_customer_id', customerId);
    
    if (error || !users.length) {
      console.error('User not found for LemonSqueezy customer ID:', customerId);
      return;
    }
    
    const userId = users[0].id;
    
    // Add subscription credits - again, customize based on your products
    let creditAmount = 0;
    
    // Example mapping logic - replace with your actual subscription/credit mapping
    if (variantId === '123456') {
      creditAmount = 20; // Basic subscription
    } else if (variantId === '234567') {
      creditAmount = 100; // Premium subscription
    } else if (variantId === '345678') {
      creditAmount = 200; // Pro subscription
    } else {
      creditAmount = 10; // Default fallback
    }
    
    // Add credits to the user's account
    await addCredits(
      userId,
      creditAmount,
      'subscription',
      `subscription_${subscriptionId}_initial`
    );
    
    // Store subscription info in the database
    await supabase
      .from('subscriptions')
      .insert({
        id: subscriptionId,
        user_id: userId,
        lemonsqueezy_customer_id: customerId,
        lemonsqueezy_variant_id: variantId,
        status,
        credits_per_cycle: creditAmount,
        renewed_count: 0,
        metadata: data.attributes
      });
    
    console.log(`Added ${creditAmount} credits to user ${userId} for new subscription ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling subscription created webhook:', error);
  }
};

/**
 * Handle subscription updated event
 * @param {Object} data - Webhook data
 */
const handleSubscriptionUpdated = async (data) => {
  try {
    const subscriptionId = data.id;
    const status = data.attributes.status;
    const renewedCount = data.attributes.renew_count;
    
    // Get the subscription from our database
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('user_id, credits_per_cycle, renewed_count')
      .eq('id', subscriptionId)
      .single();
    
    if (error || !subscriptions) {
      console.error('Subscription not found:', subscriptionId);
      return;
    }
    
    const { user_id, credits_per_cycle, renewed_count } = subscriptions;
    
    // If this is a renewal (renew_count increased)
    if (status === 'active' && renewedCount > renewed_count) {
      // Add subscription credits for the renewal
      await addCredits(
        user_id,
        credits_per_cycle,
        'subscription_renewal',
        `subscription_${subscriptionId}_renewal_${renewedCount}`
      );
      
      // Update the renewed count in our database
      await supabase
        .from('subscriptions')
        .update({
          renewed_count: renewedCount,
          status,
          metadata: data.attributes
        })
        .eq('id', subscriptionId);
      
      console.log(`Added ${credits_per_cycle} credits to user ${user_id} for subscription renewal ${subscriptionId}`);
    } else {
      // Just update the status
      await supabase
        .from('subscriptions')
        .update({
          status,
          metadata: data.attributes
        })
        .eq('id', subscriptionId);
    }
  } catch (error) {
    console.error('Error handling subscription updated webhook:', error);
  }
};

/**
 * Handle subscription cancelled event
 * @param {Object} data - Webhook data
 */
const handleSubscriptionCancelled = async (data) => {
  try {
    const subscriptionId = data.id;
    
    // Update the subscription status in our database
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        metadata: data.attributes
      })
      .eq('id', subscriptionId);
    
    console.log(`Subscription ${subscriptionId} marked as cancelled`);
  } catch (error) {
    console.error('Error handling subscription cancelled webhook:', error);
  }
};

/**
 * Handle subscription resumed event
 * @param {Object} data - Webhook data
 */
const handleSubscriptionResumed = async (data) => {
  try {
    const subscriptionId = data.id;
    
    // Update the subscription status in our database
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        metadata: data.attributes
      })
      .eq('id', subscriptionId);
    
    console.log(`Subscription ${subscriptionId} resumed`);
  } catch (error) {
    console.error('Error handling subscription resumed webhook:', error);
  }
};

/**
 * Handle subscription expired event
 * @param {Object} data - Webhook data
 */
const handleSubscriptionExpired = async (data) => {
  try {
    const subscriptionId = data.id;
    
    // Update the subscription status in our database
    await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        metadata: data.attributes
      })
      .eq('id', subscriptionId);
    
    console.log(`Subscription ${subscriptionId} marked as expired`);
  } catch (error) {
    console.error('Error handling subscription expired webhook:', error);
  }
};

module.exports = {
  handleLemonSqueezyWebhook
}; 