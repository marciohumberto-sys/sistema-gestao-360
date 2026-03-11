import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing getMovements...");
    const { data: mData, error: mError } = await supabase
        .from("commitment_movements")
        .select("*")
        .limit(1);
    
    if (mError) {
        console.error("getMovements Error:", mError.message || mError);
    } else {
        console.log("getMovements Success. Columns:", mData && mData.length > 0 ? Object.keys(mData[0]) : "No data");
    }

    console.log("\nTesting RPC add_commitment_amount...");
    const { data: rpcData, error: rpcError } = await supabase.rpc('add_commitment_amount', {
        p_tenant_id: "00000000-0000-0000-0000-000000000000",
        p_commitment_id: "00000000-0000-0000-0000-000000000000",
        p_amount: 10,
        p_description: "test"
    });
    console.log("rpc call error:", rpcError?.message || rpcError);

    console.log("\nTesting RPC annul_commitment_amount...");
    const { data: rpcData2, error: rpcError2 } = await supabase.rpc('annul_commitment_amount', {
        p_tenant_id: "00000000-0000-0000-0000-000000000000",
        p_commitment_id: "00000000-0000-0000-0000-000000000000",
        p_amount: 10,
        p_description: "test"
    });
    console.log("rpc call 2 error:", rpcError2?.message || rpcError2);
}

test();
