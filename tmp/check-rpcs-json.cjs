const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://jfctiocmxydedvlgxdhg.supabase.co';
const supabaseKey = 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPCs() {
    const { error: addError } = await supabase.rpc('add_of_item', { p_of_id: '123' });
    const { error: delError } = await supabase.rpc('delete_of_item', { p_item_id: '123' });
    const { error: recError } = await supabase.rpc('recalculate_of_total', { p_of_id: '123' });

    fs.writeFileSync('output.json', JSON.stringify({
        add: addError,
        del: delError,
        rec: recError
    }, null, 2));
}

checkRPCs();
