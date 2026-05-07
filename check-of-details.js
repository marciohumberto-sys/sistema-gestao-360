import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(envUrl, envKey);

async function run() {
  try {
    const { data: ofs, error } = await supabase
      .from('ofs')
      .select('*')
      .eq('number', 'OF-2026-0218')
      .maybeSingle();

    console.log("OF-2026-0218 DATA:", ofs, error);
  } catch (err) {
    console.error("Error checking OF details:", err);
  }
}

run();
