const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://jfctiocmxydedvlgxdhg.supabase.co';
const supabaseKey = 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPCs() {
    const { error: addError } = await supabase.rpc('add_of_item', {
        p_tenant_id: '123',
        p_of_id: '123',
        p_item_number: '1',
        p_description: 'test',
        p_unit: 'UN',
        p_quantity: 1,
        p_unit_price: 10
    });
    
    console.log(addError);
}

checkRPCs();
