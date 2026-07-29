import { supabase } from '../../lib/supabase';

export const laboratorioConferenciaService = {
    formatDateOnly: (dateString) => {
        if (!dateString) return '-';
        const datePart = dateString.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length !== 3) return dateString;
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    },

    buscarExamesParaConferencia: async (filters = {}) => {
        try {
            // Passo 1: Filtrar atendimentos
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
            
            // Pacientes
            const { data: patients, error: patError } = await supabase.from('lab_patients').select('id, code, full_name, birth_date, sex, cns, cpf');
            if (patError) throw patError;
            
            let filteredAttendances = attendances;
            if (filters.patient) {
                const searchName = filters.patient.toLowerCase();
                const matchedPatients = patients.filter(p => p.full_name && p.full_name.toLowerCase().includes(searchName));
                const matchedPatientIds = matchedPatients.map(p => p.id);
                filteredAttendances = attendances.filter(a => matchedPatientIds.includes(a.patient_id));
            }
            if (filters.patientCode) {
                const searchCode = String(filters.patientCode).trim();
                const matchedPatients = patients.filter(p => p.code && String(p.code) === searchCode);
                const matchedPatientIds = matchedPatients.map(p => p.id);
                filteredAttendances = filteredAttendances.filter(a => matchedPatientIds.includes(a.patient_id));
            }
            if (filteredAttendances.length === 0) return [];

            const attIds = filteredAttendances.map(a => a.id);

            // Passo 2: Buscar resultados (exames) com status filtrado
            const statusFilter = filters.status;
            
            let results = [];
            for (let i = 0; i < attIds.length; i += 100) {
                const chunk = attIds.slice(i, i + 100);
                let query = supabase
                    .from('lab_results')
                    .select('id, attendance_id, exam_id, status, created_at')
                    .in('attendance_id', chunk);

                // Apenas DIGITADOS na Conferência
                query = query.eq('status', 'DIGITADO');

                const { data: resData, error: resError } = await query;
                if (resError) throw resError;
                if (resData) results = results.concat(resData);
            }
            
            if (results.length === 0) return [];

            // Passo 3: Buscar exames correspondentes
            const examIds = [...new Set(results.map(r => r.exam_id))];
            let exams = [];
            for (let i = 0; i < examIds.length; i += 100) {
                const chunk = examIds.slice(i, i + 100);
                const { data: exData, error: exError } = await supabase
                    .from('lab_exams')
                    .select('id, code, name, material, method, requires_conference')
                    .in('id', chunk);
                if (exError) throw exError;
                if (exData) exams = exams.concat(exData);
            }

            // Exige conferência
            exams = exams.filter(e => e.requires_conference === true);

            const validExamIds = exams.map(e => e.id);
            results = results.filter(r => validExamIds.includes(r.exam_id));

            if (results.length === 0) return [];

            // Passo 4: Mapeamento final da fila de exames
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
                    pacienteCode: pat.code,
                    pacienteNome: pat.full_name,
                    pacienteIdade: idade,
                    pacienteSexo: pat.sex === 'F' ? 'Feminino' : pat.sex === 'M' ? 'Masculino' : pat.sex,
                    pacienteCns: pat.cns || null,
                    pacienteCpf: pat.cpf || null,
                    convenio: att.agreement,
                    local_entrega: att.delivery_location,
                    medico: att.requesting_doctor,
                    attendance_origin: att.attendance_origin,
                    exameId: ex.id,
                    exameCodigo: ex.code,
                    exameNome: ex.name,
                    exameMaterial: ex.material,
                    exameMetodo: ex.method,
                    dataAtendimento: laboratorioConferenciaService.formatDateOnly(att.attendance_date),
                    status: r.status,
                    parametros: 0
                };
            }).filter(Boolean);

            // Fetch parameter counts
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
            console.error('Erro ao buscar exames para conferência:', error);
            throw error;
        }
    },

    carregarDetalhesResultado: async (resultId) => {
        try {
            const { data: values, error } = await supabase
                .from('lab_result_values')
                .select('*')
                .eq('result_id', resultId)
                .order('display_order', { ascending: true });
                
            if (error) throw error;
            return values || [];
        } catch (error) {
            console.error('Erro ao carregar detalhes do resultado:', error);
            throw error;
        }
    },

    confirmarConferencia: async (resultId) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData?.session;

            if (!session || !session.user) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            const userId = session.user.id;

            // Nome completo real do usuário autenticado (gravado via manage-user em user_metadata.name)
            const meta = session.user.user_metadata || {};
            const professionalName = (meta.full_name || meta.name || '').trim();

            if (!professionalName) {
                throw new Error('Não foi possível confirmar o exame. O nome completo do biomédico não foi localizado.');
            }

            // Buscar tenant_id do lab_result para garantir o vínculo correto
            const { data: resultRow, error: resultErr } = await supabase
                .from('lab_results')
                .select('id, tenant_id')
                .eq('id', resultId)
                .single();

            if (resultErr || !resultRow) {
                throw new Error('Resultado não encontrado.');
            }

            const tenantId = resultRow.tenant_id;

            // Buscar vínculo profissional no mesmo tenant do resultado
            const { data: link, error: linkErr } = await supabase
                .from('user_tenants')
                .select('role, crbm, signature_path')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .eq('is_active', true)
                .maybeSingle();

            if (linkErr || !link) {
                throw new Error('Somente um biomédico cadastrado pode confirmar resultados laboratoriais.');
            }

            if (link.role !== 'BIOMEDICO') {
                throw new Error('Somente um biomédico cadastrado pode confirmar resultados laboratoriais.');
            }

            if (!link.crbm || link.crbm.trim() === '') {
                throw new Error('Não foi possível confirmar o exame. O CRBM do biomédico não está cadastrado.');
            }

            if (!link.signature_path) {
                throw new Error('Não foi possível confirmar o exame. A assinatura do biomédico não está cadastrada.');
            }

            // Update único e atômico — status + snapshot profissional e liberação direta
            const now = new Date().toISOString();
            const updateData = {
                status: 'LIBERADO',
                checked_by: userId,
                checked_at: now,
                released_by: userId,
                released_at: now,
                responsible_name: professionalName,
                responsible_crbm: link.crbm.trim(),
                responsible_signature_path: link.signature_path,
                updated_at: now
            };

            const { data, error } = await supabase
                .from('lab_results')
                .update(updateData)
                .eq('id', resultId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao confirmar conferência:', error);
            throw error;
        }
    },
    
    devolverExame: async (resultId, motivo) => {
        try {
            const { data: curr, error: errCurr } = await supabase
                .from('lab_results')
                .select('general_observation')
                .eq('id', resultId)
                .single();
                
            if (errCurr) throw errCurr;
            
            let obs = curr.general_observation || '';
            if (motivo) {
                const prefix = obs ? obs + '\n\n' : '';
                obs = prefix + '[Devolvido para correção]: ' + motivo;
            }

            const { data, error } = await supabase
                .from('lab_results')
                .update({ 
                    status: 'PENDENTE',
                    general_observation: obs,
                    updated_at: new Date().toISOString()
                })
                .eq('id', resultId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao devolver exame:', error);
            throw error;
        }
    },
    
    cancelarExame: async (resultId) => {
        try {
            const { data, error } = await supabase
                .from('lab_results')
                .update({ 
                    status: 'CANCELADO',
                    updated_at: new Date().toISOString()
                })
                .eq('id', resultId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao cancelar exame:', error);
            throw error;
        }
    }
};
