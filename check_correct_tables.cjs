const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jfctiocmxydedvlgxdhg.supabase.co', 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_');

async function check() {
  const tables = ['lab_exam_sectors', 'lab_exam_materials', 'lab_exam_methods'];
  for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) console.log(`Table ${table} error:`, error.message);
      else console.log(`Table ${table} columns:`, Object.keys(data[0] || {}));
  }
}
check();
