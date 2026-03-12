const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Usually we need service_role for this, but let's see if we can query the REST API directly
// We can't query information_schema easily, so we just run a query with an intentional error on a column to get the hint, or we just select it.
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
   const { data, error } = await supabase.from('contracts').select('executed_value, consumed_value').limit(1);
   console.log("contracts check:", error ? error.message : "Exists!");

   const { data: d2, error: e2 } = await supabase.from('contract_items').select('consumed_quantity, executed_quantity').limit(1);
   console.log("contract_items check:", e2 ? e2.message : "Exists!");

   const { data: d3, error: e3 } = await supabase.from('contract_item_allocations').select('consumed_quantity, executed_quantity').limit(1);
   console.log("contract_item_allocations check:", e3 ? e3.message : "Exists!");
}
checkCols();
