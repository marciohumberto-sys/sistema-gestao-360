const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://jfctiocmxydedvlgxdhg.supabase.co';
const supabaseKey = 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPCs() {
    const { error: addError } = await supabase.rpc('add_of_item', { p_tenant_id: '123' });
    fs.writeFileSync('output2.json', JSON.stringify({ add: addError }, null, 2));
}

checkRPCs();
