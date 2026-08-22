import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/marci/OneDrive/Documentos/Antigravity/GPI/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const exameId = 'some-exam-uuid-for-hiv'; // We need the real UUID for HIV
    
    // First let's get the UUID for HIV
    const { data: exames } = await supabase.from('lab_exams').select('*').ilike('code', '%HIV%');
    console.log("HIV Exams:", exames.length);
    if (exames.length === 0) return;
    const targetExame = exames[0].id;
    console.log("Target Exam ID:", targetExame);

    let query = supabase.from('lab_attendance_exams').select(`
        id,
        lab_exams!inner(code, name, print_order),
        lab_attendances!inner(
            id, attendance_date, attendance_origin,
            lab_patients!inner(id, full_name, code, birth_date),
            requesting_doctor
        )
    `).eq('exam_id', targetExame);

    query = query.gte('lab_attendances.attendance_date', '2026-08-01');
    query = query.lte('lab_attendances.attendance_date', '2026-08-22');

    const { data, error } = await query;
    console.log("Query Error:", error);
    console.log("Query Data:", data?.length);
}

test();
