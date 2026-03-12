import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    // Check OF table columns
    const { data: ofsData, error: ofsError } = await supabase
        .from('ofs')
        .select('*')
        .limit(1);
        
    console.log("OFS Columns:", ofsData && ofsData.length > 0 ? Object.keys(ofsData[0]) : ofsError);

    // Check of_items table columns
    const { data: itemsData, error: itemsError } = await supabase
        .from('of_items')
        .select('*')
        .limit(1);
        
    console.log("OF_ITEMS Columns:", itemsData && itemsData.length > 0 ? Object.keys(itemsData[0]) : itemsError);

    // Check if there's a link table like of_commitments
    const { data: linkData, error: linkError } = await supabase
        .rpc('get_schema_info') || await supabase.from('of_commitments').select('*').limit(1);
        
    console.log("OF_COMMITMENTS Check:", linkData || linkError);
}

checkSchema();
