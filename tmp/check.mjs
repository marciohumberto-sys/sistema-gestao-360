import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data: c } = await supabase.from('commitments').select('*').limit(1);
    console.log('commitments:', c ? Object.keys(c[0] || {}) : 'no data');
    const { data: cm } = await supabase.from('commitment_movements').select('*').limit(1);
    console.log('commitment_movements:', cm ? Object.keys(cm[0] || {}) : 'no data');
}
run();
