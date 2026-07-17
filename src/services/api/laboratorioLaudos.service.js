import { supabase } from '../../lib/supabase';

export const laboratorioLaudosService = {
    formatDateOnly: (dateString) => {
        if (!dateString) return '-';
        const datePart = dateString.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length !== 3) return dateString;
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    },

    buscarLaudos: async (filters = {}) => {
        try {
            let attendancesQuery = supabase.from('lab_attendances').select('id, protocol_number, patient_id, attendance_date, requesting_doctor, delivery_location, agreement, attendance_origin');
            
            if (filters.protocol) {
                attendancesQuery = attendancesQuery.ilike('protocol_number', `%${filters.protocol}%`);
            }
            if (filters.date) {
                attendancesQuery = attendancesQuery.gte('attendance_date', `${filters.date}T00:00:00Z`)
                                                   .lte('attendance_date', `${filters.date}T23:59:59Z`);
            }
            if (filters.attendance_origin) {
                attendancesQuery = attendancesQuery.eq('attendance_origin', filters.attendance_origin);
            }
            
            const { data: attendances, error: attError } = await attendancesQuery;
            if (attError) throw attError;
            if (!attendances || attendances.length === 0) return [];
            
            const { data: patients, error: patError } = await supabase.from('lab_patients').select('id, full_name, birth_date, sex, cns, cpf, rg');
            if (patError) throw patError;
            
            let filteredAttendances = attendances;
            if (filters.patient) {
                const searchName = filters.patient.toLowerCase();
                const matchedPatients = patients.filter(p => p.full_name && p.full_name.toLowerCase().includes(searchName));
                const matchedPatientIds = matchedPatients.map(p => p.id);
                filteredAttendances = attendances.filter(a => matchedPatientIds.includes(a.patient_id));
            }
            if (filteredAttendances.length === 0) return [];

            const attIds = filteredAttendances.map(a => a.id);

            const statusFilter = filters.status;
            
            let results = [];
            for (let i = 0; i < attIds.length; i += 100) {
                const chunk = attIds.slice(i, i + 100);
                let query = supabase
                    .from('lab_results')
                    .select('id, attendance_id, exam_id, status, created_at, general_observation, typed_at, checked_at, released_at')
                    .in('attendance_id', chunk);

                if (statusFilter === 'LIBERADO') {
                    query = query.eq('status', 'LIBERADO');
                } else {
                    query = query.in('status', ['DIGITADO', 'CONFERIDO', 'LIBERADO']);
                }

                const { data: resData, error: resError } = await query;
                if (resError) throw resError;
                if (resData) results = results.concat(resData);
            }
            
            if (results.length === 0) return [];

            const examIds = [...new Set(results.map(r => r.exam_id))];
            let exams = [];
            for (let i = 0; i < examIds.length; i += 100) {
                const chunk = examIds.slice(i, i + 100);
                const { data: exData, error: exError } = await supabase
                    .from('lab_exams')
                    .select('id, code, name, material, method, analyzer_name, requires_conference')
                    .in('id', chunk);
                if (exError) throw exError;
                if (exData) exams = exams.concat(exData);
            }

            if (filters.exam) {
                const searchExam = filters.exam.toLowerCase();
                exams = exams.filter(e => (e.code && e.code.toLowerCase().includes(searchExam)) || (e.name && e.name.toLowerCase().includes(searchExam)));
            }

            const validExamIds = exams.map(e => e.id);
            results = results.filter(r => {
                if (!validExamIds.includes(r.exam_id)) return false;
                
                const ex = exams.find(e => e.id === r.exam_id);
                if (!ex) return false;

                if (statusFilter === 'LIBERADO') {
                    return r.status === 'LIBERADO';
                }

                if (statusFilter === 'AGUARDANDO') {
                    if (r.status === 'CONFERIDO') return true;
                    if (r.status === 'DIGITADO' && ex.requires_conference === false) return true;
                    return false;
                }

                if (statusFilter === 'TODOS' || !statusFilter) {
                    if (r.status === 'LIBERADO') return true;
                    if (r.status === 'CONFERIDO') return true;
                    if (r.status === 'DIGITADO' && ex.requires_conference === false) return true;
                    return false;
                }

                return true;
            });

            if (results.length === 0) return [];

            const patientMap = {};
            patients.forEach(p => patientMap[p.id] = p);
            
            const attendanceMap = {};
            filteredAttendances.forEach(a => attendanceMap[a.id] = a);
            
            const examMap = {};
            exams.forEach(e => examMap[e.id] = e);

            const fila = results.map(r => {
                const att = attendanceMap[r.attendance_id];
                const pat = patientMap[att?.patient_id];
                const ex = examMap[r.exam_id];

                if (!att || !pat || !ex) return null;

                let idade = '';
                if (pat.birth_date) {
                    const diff_ms = Date.now() - new Date(pat.birth_date).getTime();
                    const age_dt = new Date(diff_ms);
                    idade = Math.abs(age_dt.getUTCFullYear() - 1970) + ' anos';
                }

                return {
                    id: r.id, 
                    protocolo: att.protocol_number,
                    pacienteNome: pat.full_name,
                    pacienteIdade: idade,
                    pacienteDataNascimento: laboratorioLaudosService.formatDateOnly(pat.birth_date),
                    pacienteSexo: pat.sex === 'F' ? 'Feminino' : pat.sex === 'M' ? 'Masculino' : pat.sex,
                    pacienteCns: pat.cns,
                    pacienteCpf: pat.cpf,
                    pacienteRg: pat.rg,
                    convenio: att.agreement,
                    local_entrega: att.delivery_location,
                    medico: att.requesting_doctor,
                    attendance_origin: att.attendance_origin,
                    exameId: ex.id,
                    exameCodigo: ex.code,
                    exameNome: ex.name,
                    exameMaterial: ex.material,
                    exameMetodo: ex.method,
                    exameAnalisador: ex.analyzer_name,
                    dataAtendimento: laboratorioLaudosService.formatDateOnly(att.attendance_date),
                    status: r.status,
                    observacaoGeral: r.general_observation,
                    typed_at: r.typed_at,
                    checked_at: r.checked_at,
                    released_at: r.released_at,
                    parametros: 0
                };
            }).filter(Boolean);

            const resultIds = fila.map(f => f.id);
            if(resultIds.length > 0) {
                 const { data: valData } = await supabase.from('lab_result_values').select('result_id').in('result_id', resultIds);
                 if(valData) {
                      const counts = {};
                      valData.forEach(v => { counts[v.result_id] = (counts[v.result_id] || 0) + 1; });
                      fila.forEach(f => { f.parametros = counts[f.id] || 0; });
                 }
            }

            return fila;
        } catch (error) {
            console.error('Erro ao buscar laudos:', error);
            throw error;
        }
    },

    carregarDetalhesLaudo: async (resultId) => {
        try {
            const { data: values, error } = await supabase
                .from('lab_result_values')
                .select('*')
                .eq('result_id', resultId)
                .order('display_order', { ascending: true });
                
            if (error) throw error;
            return values || [];
        } catch (error) {
            console.error('Erro ao carregar detalhes do laudo:', error);
            throw error;
        }
    },

    liberarLaudo: async (resultId) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id || null;

            const updateData = { 
                status: 'LIBERADO',
                released_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (userId) {
                updateData.released_by = userId;
            }

            const { data, error } = await supabase
                .from('lab_results')
                .update(updateData)
                .eq('id', resultId)
                .select()
                .single();

            if (error) throw error;
            
            // Verifica status de todos os exames do mesmo atendimento
            const { data: attendanceResults, error: attError } = await supabase
                .from('lab_results')
                .select('status')
                .eq('attendance_id', data.attendance_id);
                
            let allLiberated = false;
            if (!attError && attendanceResults) {
                allLiberated = attendanceResults.every(r => r.status === 'LIBERADO');
            }

            return { ...data, allLiberated };
        } catch (error) {
            console.error('Erro ao liberar laudo:', error);
            throw error;
        }
    }
};
