const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: d1 } = await supabase.from('contracts').select('*').limit(1);
    console.log("contracts:", d1 && d1.length > 0 ? Object.keys(d1[0]) : "Empty");
    const { data: d2 } = await supabase.from('contract_items').select('*').limit(1);
    console.log("contract_items:", d2 && d2.length > 0 ? Object.keys(d2[0]) : "Empty");
    const { data: d3 } = await supabase.from('contract_item_allocations').select('*').limit(1);
    console.log("contract_item_allocations:", d3 && d3.length > 0 ? Object.keys(d3[0]) : "Empty");
}
check();
