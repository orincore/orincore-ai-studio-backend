-- Function to atomically add credits to a user's account
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_source TEXT,
  p_reference_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the user row to prevent concurrent updates
  SELECT credit_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Default to 0 if null
  v_current_balance := COALESCE(v_current_balance, 0);
  
  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;
  
  -- Log the transaction first
  INSERT INTO credit_transactions (
    user_id,
    amount,
    type,
    source,
    reference_id,
    balance_after
  ) VALUES (
    p_user_id,
    p_amount,
    'credit',
    p_source,
    p_reference_id,
    v_new_balance
  );
  
  -- Update user's balance
  UPDATE profiles
  SET credit_balance = v_new_balance
  WHERE id = p_user_id;
  
  -- Return the result
  RETURN jsonb_build_object(
    'previous_balance', v_current_balance,
    'added_amount', p_amount,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql; 