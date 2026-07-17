import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const termoLimpo = 'Maria';
    const termoBusca = `%${termoLimpo}%`;
    const TENANT_ID = '6e9e8e54-c9ec-42cf-a2a2-6f5e0ae8d832';
    
    console.log('Test 3: exact code from service');
    const { data, error } = await supabase
        .from('lab_patients')
        .select(`
            id,
            tenant_id,
            code,
            full_name,
            birth_date,
            sex,
            cpf,
            cns,
            phone,
            mobile,
            mother_name,
            father_name,
            notes,
            is_active
        `)
        .eq('tenant_id', TENANT_ID)
        .or(`full_name.ilike.${termoBusca},code.ilike.${termoBusca},cpf.ilike.${termoBusca},cns.ilike.${termoBusca},phone.ilike.${termoBusca},mobile.ilike.${termoBusca}`)
        .order('full_name', { ascending: true })
        .limit(30);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Result length:', data.length);
        console.log('Data:', data);
    }
}
run();
