-- Add unique constraint to payment_transactions table to prevent duplicate entries
ALTER TABLE payment_transactions 
ADD CONSTRAINT unique_payment_transaction 
UNIQUE (order_id, payment_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id ON credit_transactions(reference_id); 