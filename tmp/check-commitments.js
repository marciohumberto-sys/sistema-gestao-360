import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing getMovements...");
    const { data: mData, error: mError } = await supabase
        .from("commitment_movements")
        .select("*")
        .limit(1);
    
    if (mError) {
        console.error("getMovements Error:", mError);
    } else {
        console.log("getMovements Success. Columns:", mData.length > 0 ? Object.keys(mData[0]) : "No data");
    }

    console.log("\nTesting getById...");
    const { data: cData, error: cError } = await supabase
        .from("commitments")
        .select(`
            *,
            contracts (id, title, number, supplier_name),
            secretariats (id, name)
        `)
        .limit(1);
    
    if (cError) {
        console.error("getById Error:", cError);
    } else {
        console.log("getById Success.");
    }

    // Try to get RPC params
    const { data: rpcData, error: rpcError } = await supabase.rpc('add_commitment_amount', {
        p_tenant_id: "00000000-0000-0000-0000-000000000000",
        p_commitment_id: "00000000-0000-0000-0000-000000000000",
        p_amount: 10,
        p_description: "test"
    });
    console.log("\nrpc call:", rpcData, rpcError);
}

test();
