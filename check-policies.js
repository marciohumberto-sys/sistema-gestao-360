import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(envUrl, envKey);

async function run() {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('planning_action_updates', 'planning_action_issues', 'planning_actions');"
    });
    console.log("POLICIES FOUND:", data, error);
  } catch (err) {
    console.error("RPC Error:", err);
  }
}

run();
