const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jfctiocmxydedvlgxdhg.supabase.co';
const supabaseKey = 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPCs() {
    // Just run a dummy to see if it fails finding it
    const addResult = await supabase.rpc('add_of_item', { p_of_id: 'dummy', p_description: 'test' });
    console.log("add_of_item:", addResult);
    
    // Check if we can get of_items with its schema
    const { data: itemsData, error: itemsError } = await supabase
        .from('of_items')
        .select('*')
        .limit(1);
    
    console.log("of_items schema:", itemsData && itemsData.length > 0 ? Object.keys(itemsData[0]) : "Empty");
    
    // Check if there are RPCs, maybe we can fetch from pg_proc
    // Actually we don't have direct access via API to pg_proc, but we can guess the RPC parameters based on the columns
    // of_items: id, tenant_id, of_id, item_number, description, unit, quantity, unit_price, total_price
    
    // try fetching an OF to see if we can join commitment
    const { data: ofData, error: ofError } = await supabase
        .from('ofs')
        .select('*, commitment:commitments(id, number, current_balance, initial_amount, consumed_amount)')
        .limit(1);
        
    console.log("ofs + commitments:", ofData ? "Success - can join commitments" : ofError);
}

checkRPCs();
