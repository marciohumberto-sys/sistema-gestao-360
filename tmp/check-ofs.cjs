const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    let output = '';
    const tables = ['ofs', 'of_items', 'contracts', 'contract_items', 'contract_item_allocations', 'commitments'];
    for(const table of tables) {
        const { data } = await supabase.from(table).select('*').limit(1);
        if (data && data.length > 0) {
            output += `\nTable ${table} columns:\n`;
            output += Object.keys(data[0]).join(', ') + '\n';
        } else {
            output += `\nTable ${table} is empty or not found.\n`;
        }
    }
    fs.writeFileSync('tmp/schema-dump-utf8.txt', output, 'utf8');
}
checkSchema();
