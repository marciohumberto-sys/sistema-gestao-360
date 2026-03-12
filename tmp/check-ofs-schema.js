require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Fetching ofs Schema...");
    const { data: ofsData, error: ofsError } = await supabase
        .from('ofs')
        .select('*')
        .limit(1);

    if (ofsError) {
        console.error("Error fetching ofs:", ofsError);
    } else {
        console.log("ofs columns (from row):", ofsData.length > 0 ? Object.keys(ofsData[0]) : "No rows found, cannot infer cols");
    }

    console.log("Fetching of_items Schema...");
    const { data: itemsData, error: itemsError } = await supabase
        .from('of_items')
        .select('*')
        .limit(1);

    if (itemsError) {
        console.error("Error fetching of_items:", itemsError);
    } else {
        console.log("of_items columns (from row):", itemsData.length > 0 ? Object.keys(itemsData[0]) : "No rows found, cannot infer cols");
    }
}

checkSchema();
