import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const envUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!envUrl || !envKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(envUrl, envKey);

async function run() {
  console.log("Checking schemas or available RPCs...");
  // Let's see if we can check schemas or if there are custom functions
  const { data: issues, error: errIssues } = await supabase.from('planning_action_issues').select('*').limit(1);
  console.log("planning_action_issues schema fields:", issues ? Object.keys(issues[0] || {}) : errIssues);
}

run();
