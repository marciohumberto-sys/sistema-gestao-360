const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jfctiocmxydedvlgxdhg.supabase.co', 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_');

async function check() {
  const { data: exams, error: err1 } = await supabase.from('lab_exams').select('*').limit(3);
  console.log('--- EXAMS SAMPLE ---');
  if (err1) console.log(err1);
  else console.log(JSON.stringify(exams, null, 2));

  const { data: params, error: err2 } = await supabase.from('lab_exam_parameters').select('*').limit(3);
  console.log('--- PARAMS SAMPLE ---');
  if (err2) console.log(err2);
  else console.log(JSON.stringify(params, null, 2));
}
check();
