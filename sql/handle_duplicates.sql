-- Start a transaction
BEGIN;

-- First, identify duplicate payment transactions
WITH duplicates AS (
  SELECT 
    order_id, 
    payment_id,
    COUNT(*) as count,
    array_agg(id) as ids
  FROM payment_transactions
  GROUP BY order_id, payment_id
  HAVING COUNT(*) > 1
)
SELECT * FROM duplicates;

-- Keep only one record for each duplicate set (keeping the one with the highest ID)
WITH duplicates AS (
  SELECT 
    id,
    order_id, 
    payment_id,
    ROW_NUMBER() OVER (PARTITION BY order_id, payment_id ORDER BY id DESC) as rn
  FROM payment_transactions
)
DELETE FROM payment_transactions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now try to add the unique constraint
ALTER TABLE payment_transactions 
ADD CONSTRAINT IF NOT EXISTS unique_payment_transaction 
UNIQUE (order_id, payment_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id ON credit_transactions(reference_id);

-- Commit the transaction
COMMIT; 