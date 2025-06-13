/**
 * Script to fix duplicate payment transactions
 */
require('dotenv').config();
const { supabase } = require('../src/config/supabaseClient');

// Define the duplicate sets
const duplicateSets = [
  {
    order_id: "3aa79aff-1cb8-4315-aca2-2736dd1aa7d3",
    payment_id: "3994679093"
  },
  {
    order_id: "939e3aa2-21a3-4868-84d6-ac52c173298c",
    payment_id: "3994683668"
  },
  {
    order_id: "fd874b08-23ca-444b-ae00-e8c475e49614",
    payment_id: "3994680588"
  }
];

async function fixDuplicateSet(orderID, paymentID) {
  console.log(`Processing duplicate set: order_id=${orderID}, payment_id=${paymentID}`);
  
  // Get all IDs for this order_id/payment_id pair
  const { data: records, error: recordsError } = await supabase
    .from('payment_transactions')
    .select('id')
    .eq('order_id', orderID)
    .eq('payment_id', paymentID)
    .order('id', { ascending: false });
  
  if (recordsError) {
    console.error(`Error getting record IDs for ${orderID}/${paymentID}:`, recordsError);
    return false;
  }
  
  if (records.length <= 1) {
    console.log(`No duplicates found for ${orderID}/${paymentID}`);
    return true;
  }
  
  // Keep the first record (highest ID) and delete the rest
  const keepId = records[0].id;
  const deleteIds = records.slice(1).map(r => r.id);
  
  console.log(`Keeping ID ${keepId} and deleting ${deleteIds.length} duplicates for ${orderID}/${paymentID}`);
  
  // Delete the duplicates
  const { error: deleteError } = await supabase
    .from('payment_transactions')
    .delete()
    .in('id', deleteIds);
  
  if (deleteError) {
    console.error(`Error deleting duplicates for ${orderID}/${paymentID}:`, deleteError);
    return false;
  }
  
  console.log(`Successfully deleted ${deleteIds.length} duplicates for ${orderID}/${paymentID}`);
  return true;
}

async function fixDuplicates() {
  try {
    console.log('Starting to fix duplicate payment transactions...');
    
    // Process each duplicate set
    for (const set of duplicateSets) {
      await fixDuplicateSet(set.order_id, set.payment_id);
    }
    
    console.log('Finished fixing duplicate payment transactions');
  } catch (error) {
    console.error('Error fixing duplicates:', error);
  }
}

fixDuplicates(); 