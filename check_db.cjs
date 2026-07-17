const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jfctiocmxydedvlgxdhg.supabase.co', 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_');
async function check() {
  const { data, error } = await supabase.from('lab_attendances').select('status').limit(100);
  if (error) console.error(error);
  else console.log('Statuses:', [...new Set(data.map(d => d.status))]);
}
check();
