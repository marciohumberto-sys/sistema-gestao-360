const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: d1, error } = await supabase.from('commitment_movements').select('*').limit(1);
    console.log("commitment_movements:", d1 ? Object.keys(d1[0] || {}) : error);
}
check();
