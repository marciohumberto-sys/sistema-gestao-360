
import { supabase } from './src/lib/supabase.js';
async function run() {
    const { data, error } = await supabase.from('lab_attendance_exams').select(
        'id, lab_exams!inner(code, name, print_order), lab_attendances!inner(id, attendance_date, attendance_origin, lab_patients!inner(id, full_name, code, birth_date), requesting_physician)'
    ).eq('lab_exams.code', 'HIV').limit(1);
    console.log('Error:', error);
    console.log('Data:', data);
    process.exit();
}
run();

