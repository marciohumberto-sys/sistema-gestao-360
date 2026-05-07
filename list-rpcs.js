import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(envUrl, envKey);

async function run() {
  try {
    // Let's try querying pg_catalog via the REST API if exposed, or check what tables are available
    console.log("Checking if we can read pg_proc or pg_policies directly via select...");
    const { data, error } = await supabase.from('pg_policies').select('*').limit(5);
    console.log("pg_policies directly:", data, error);
  } catch (err) {
    console.error("Direct query failed:", err);
  }
}

run();
