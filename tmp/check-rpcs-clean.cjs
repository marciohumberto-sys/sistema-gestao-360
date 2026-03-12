const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jfctiocmxydedvlgxdhg.supabase.co';
const supabaseKey = 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPCs() {
    const { error: addError } = await supabase.rpc('add_of_item', { p_of_id: 'x' }); // passing dummy to get hint
    console.log("ADD:", addError ? addError.message : "Success");
    
    const { error: delError } = await supabase.rpc('delete_of_item', { p_item_id: 'x' });
    console.log("DEL:", delError ? delError.message : "Success");

    const { error: recError } = await supabase.rpc('recalculate_of_total', { p_of_id: 'x' });
    console.log("REC:", recError ? recError.message : "Success");
}

checkRPCs();
