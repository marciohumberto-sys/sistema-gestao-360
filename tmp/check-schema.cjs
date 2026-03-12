require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log("Checking ofs...");
    const { data: ofs, error: e1 } = await supabase.from('ofs').select('*').limit(1);
    console.log(e1 ? e1 : Object.keys(ofs[0] || {}));

    console.log("Checking of_items...");
    const { data: ofi, error: e2 } = await supabase.from('of_items').select('*').limit(1);
    console.log(e2 ? e2 : Object.keys(ofi[0] || {}));

    console.log("Checking contracts...");
    const { data: ctr, error: e3 } = await supabase.from('contracts').select('*').limit(1);
    console.log(e3 ? e3 : Object.keys(ctr[0] || {}));

    console.log("Checking contract_items...");
    const { data: ctri, error: e4 } = await supabase.from('contract_items').select('*').limit(1);
    console.log(e4 ? e4 : Object.keys(ctri[0] || {}));

    console.log("Checking contract_item_allocations...");
    const { data: ctria, error: e5 } = await supabase.from('contract_item_allocations').select('*').limit(1);
    console.log(e5 ? e5 : Object.keys(ctria[0] || {}));
    
    console.log("Checking commitments...");
    const { data: ctm, error: e6 } = await supabase.from('commitments').select('*').limit(1);
    console.log(e6 ? e6 : Object.keys(ctm[0] || {}));

  } catch (err) {
    console.error(err);
  }
}

checkSchema();
