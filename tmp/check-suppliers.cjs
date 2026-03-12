
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Environment variables missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSuppliers() {
    try {
        console.log('Checking suppliers table...');
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('Error or table not found:', error.message);
        } else {
            console.log('Suppliers columns:', data.length > 0 ? Object.keys(data[0]) : 'Table empty but exists');
        }
    } catch (e) {
        console.log('Catch error:', e.message);
    }
}

checkSuppliers();
