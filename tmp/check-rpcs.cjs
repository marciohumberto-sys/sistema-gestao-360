const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jfctiocmxydedvlgxdhg.supabase.co';
const supabaseKey = 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPCs() {
    // We send an empty object, aiming to trigger a helpful pg_rest error detailing the expected arguments
    const { error: addError } = await supabase.rpc('add_of_item', {});
    
    if (addError) {
        console.log("add_of_item error:", addError.message, addError.hint, addError.details);
    }
    
    const { error: delError } = await supabase.rpc('delete_of_item', {});
    if (delError) {
        console.log("delete_of_item error:", delError.message, delError.hint, delError.details);
    }

    const { error: recError } = await supabase.rpc('recalculate_of_total', {});
    if (recError) {
        console.log("recalculate_of_total error:", recError.message, recError.hint, recError.details);
    }
}

checkRPCs();
