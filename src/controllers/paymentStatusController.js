const { ApiError } = require('../middlewares/errorMiddleware');
const { supabase } = require('../config/supabaseClient');

const handlePaymentSuccess = async (req, res) => {
  try {
    const { order_id } = req.query;

    if (!order_id) {
      throw new ApiError('Order ID is required', 400);
    }

    // Get transaction status from database
    const { data: transaction, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (error) {
      console.error('Error fetching transaction:', error);
      throw new ApiError('Failed to fetch transaction status', 500);
    }

    // Return transaction status
    res.status(200).json({
      success: true,
      data: {
        order_id: transaction.order_id,
        status: transaction.status,
        amount: transaction.amount,
        payment_time: transaction.payment_time
      }
    });

  } catch (err) {
    console.error('❌ Error handling payment success:', err);
    throw new ApiError(err.message || 'Failed to handle payment success', err.status || 500);
  }
};

module.exports = {
  handlePaymentSuccess
};
