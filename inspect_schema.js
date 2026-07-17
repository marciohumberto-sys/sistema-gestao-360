import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:\\Users\\marci\\OneDrive\\Documentos\\Antigravity\\GPI\\.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL.trim();
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('lab_result_values').select('*').limit(1);
    if(error) {
        console.error("Error:", error);
    } else {
        console.log("Schema / Data:", JSON.stringify(data, null, 2));
    }
}
run();
