const { ApiError } = require('../middlewares/errorMiddleware');
const { supabase } = require('../config/supabaseClient');

const handlePaymentSuccess = async (req, res) => {
  try {
    const { order_id, payment_id, txTime } = req.query;

    console.log('Payment success callback received:', {
      order_id,
      payment_id,
      txTime
    });

    if (!order_id) {
      console.error('❌ No order_id in success callback');
      // Redirect to frontend with error
      return res.redirect('https://studio.orincore.com/payment?status=error&message=invalid_order');
    }

    // Get transaction status from database
    const { data: transaction, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (error) {
      console.error('Error fetching transaction:', error);
      return res.redirect('https://studio.orincore.com/payment?status=error&message=transaction_not_found');
    }

    // Redirect back to frontend with status
    const redirectUrl = new URL('https://studio.orincore.com/payment');
    redirectUrl.searchParams.append('status', transaction.status.toLowerCase());
    redirectUrl.searchParams.append('order_id', order_id);
    redirectUrl.searchParams.append('amount', transaction.amount);

    res.redirect(redirectUrl.toString());

  } catch (err) {
    console.error('❌ Error handling payment success:', err);
    return res.redirect('https://studio.orincore.com/payment?status=error&message=server_error');
  }
};

module.exports = {
  handlePaymentSuccess
};

module.exports = {
  handlePaymentSuccess
};
