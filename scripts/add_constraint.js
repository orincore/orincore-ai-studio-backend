/**
 * Script to add unique constraint to payment_transactions table
 */
require('dotenv').config();
const { supabase } = require('../src/config/supabaseClient');

async function addConstraint() {
  try {
    console.log('Adding unique constraint to payment_transactions table...');
    
    // First check if constraint already exists
    const { data: constraints, error: checkError } = await supabase
      .from('payment_transactions')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking table:', checkError);
      return;
    }
    
    console.log('Table access successful, attempting to add constraint...');
    
    // Try to add the unique constraint using a direct query
    // This will likely fail with "function exec_sql not found" but we'll handle that
    const { error } = await supabase.rpc('exec_sql', { 
      sql: `
        ALTER TABLE payment_transactions 
        ADD CONSTRAINT IF NOT EXISTS unique_payment_transaction 
        UNIQUE (order_id, payment_id);
      `
    });
    
    if (error) {
      console.error('Error adding constraint:', error);
      console.log('Please run the following SQL manually in your database:');
      console.log(`
        ALTER TABLE payment_transactions 
        ADD CONSTRAINT IF NOT EXISTS unique_payment_transaction 
        UNIQUE (order_id, payment_id);
        
        CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
        CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
        CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id ON credit_transactions(reference_id);
      `);
    } else {
      console.log('✅ Constraint added successfully');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

addConstraint(); 