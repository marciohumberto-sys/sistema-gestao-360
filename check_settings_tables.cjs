const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jfctiocmxydedvlgxdhg.supabase.co', 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_');
async function check() {
  const { data, error } = await supabase.from('lab_exams').select('*').limit(1);
  if (error) console.log('lab_exams error:', error.message);
  else console.log('lab_exams columns:', Object.keys(data[0] || {}));
  
  const tables = ['lab_sectors', 'lab_materials', 'lab_methods', 'lab_reference_values', 'lab_exam_parameters', 'lab_users'];
  for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) console.log(`Table ${table} error:`, error.message);
      else console.log(`Table ${table} columns:`, Object.keys(data[0] || {}));
  }
}
check();
