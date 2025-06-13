-- Check if constraint already exists and add it if it doesn't
DO $$
BEGIN
  -- Check if constraint exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'unique_payment_transaction'
  ) THEN
    -- Add unique constraint to payment_transactions table
    ALTER TABLE payment_transactions 
    ADD CONSTRAINT unique_payment_transaction 
    UNIQUE (order_id, payment_id);
  END IF;
END $$;

-- Add indexes (these support IF NOT EXISTS in all versions)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id ON credit_transactions(reference_id); 