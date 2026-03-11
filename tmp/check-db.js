require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Calling add_commitment_amount...");
    const { data: rpcData, error: rpcError } = await supabase.rpc('add_commitment_amount', {
        test: 1
    });
    console.log("Error details:", rpcError);

    console.log("Fetching commitment_movements Schema...");
    const { data: mData, error: mError } = await supabase
        .from("commitment_movements")
        .select("*")
        .limit(1);
    console.log("Movements Error:", mError);
    if (mData && mData.length > 0) console.log("Cols:", Object.keys(mData[0]));

    console.log("Testing getById with number...");
    const { error: gError } = await supabase.from("commitments").select("*").eq("id", "2026NE000123");
    console.log("getById UUID error:", gError);
}

test();
