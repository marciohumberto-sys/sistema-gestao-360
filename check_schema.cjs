const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jfctiocmxydedvlgxdhg.supabase.co', 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_');
async function check() {
  const { data, error } = await supabase.from('lab_results').select('*').limit(1);
  if (error) console.error(error);
  else console.log('Columns lab_results:', Object.keys(data[0] || {}));
}
check();
