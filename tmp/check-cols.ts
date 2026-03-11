import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: mData, error: mError } = await supabase
        .from("commitment_movements")
        .select("*")
        .limit(1);
    
    if (mError) {
        console.error("getMovements Error:", mError.message || mError);
    } else {
        console.log("getMovements row:", mData && mData.length > 0 ? mData[0] : "No data");
    }
}

test();
