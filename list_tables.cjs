const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jfctiocmxydedvlgxdhg.supabase.co', 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_');

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // this might not exist
  // or query pg_class through a trick, or we can just try to insert/select common names
  // Actually, we can fetch from a known table and look at foreign keys if possible, but JS client doesn't expose that easily.
  // Let's try `sectors`, `departments`, `materials`, `methods`, `profiles`, `auth.users`
  const tables = ['sectors', 'departments', 'materials', 'methods', 'profiles', 'users'];
  for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) console.log(`Table ${table} error:`, error.message);
      else console.log(`Table ${table} columns:`, Object.keys(data[0] || {}));
  }
}
check();
