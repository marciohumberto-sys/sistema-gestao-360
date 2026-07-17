import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key) env[key.trim()] = val.join('=').trim().replace(/"/g, '');
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: params, error: err1 } = await supabase.from('lab_parameters').select('*').limit(1);
    console.log('Parameters:', params);
    const { data: vals, error: err2 } = await supabase.from('lab_result_values').select('*').limit(1);
    console.log('Result Values:', vals);
    const { data: exams, error: err3 } = await supabase.from('lab_exams').select('*').limit(1);
    console.log('Exams:', exams);
}

test();
