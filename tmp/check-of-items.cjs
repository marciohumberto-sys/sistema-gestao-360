const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data } = await supabase.from('of_items').select('*').limit(1);
    console.log(data ? Object.keys(data[0] || {}) : "Empty");
}
check();
