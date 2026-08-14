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
            // 1. Resolve Patient IDs if needed (evita buscar milhares de pacientes depois)
            let matchedPatientIds = null;
            if (filters.patient || filters.patientCode) {
                let patQuery = supabase.from('lab_patients').select('id');
                if (filters.patient) {
                    patQuery = patQuery.ilike('full_name', `%${filters.patient}%`);
                }
                if (filters.patientCode) {
                    patQuery = patQuery.ilike('code', `%${filters.patientCode}%`);
                }
                const { data: matched, error: patErr } = await patQuery;
                if (patErr) throw patErr;
                if (!matched || matched.length === 0) return [];
                matchedPatientIds = matched.map(p => p.id);
            }

            // ETAPA A: Descobrir até 50 attendance_id distintos que possuam resultados compatíveis
            const MAX_ATTENDANCES = 50;
            const FETCH_SIZE = 200;
            
            let attendanceIds = [];
            let allAttendancesData = [];
            
            let hasMore = true;
            let currentOffset = 0;
            const statusFilter = filters.status;
            
            while (hasMore && attendanceIds.length < MAX_ATTENDANCES) {
                let attendancesQuery = supabase.from('lab_attendances').select('id, protocol_number, patient_id, attendance_date, attendance_time, created_at, requesting_doctor, delivery_location, agreement, attendance_origin, lab_attendance_exams(exam_id, collection_date, collection_time)');
                
                if (matchedPatientIds) {
                    attendancesQuery = attendancesQuery.in('patient_id', matchedPatientIds);
                }
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
                
                attendancesQuery = attendancesQuery
                    .order('attendance_date', { ascending: false })
                    .order('created_at', { ascending: false })
                    .range(currentOffset, currentOffset + FETCH_SIZE - 1);
                    
                const { data: attendancesChunk, error: attError } = await attendancesQuery;
                if (attError) throw attError;
                
                if (!attendancesChunk || attendancesChunk.length === 0) {
                    hasMore = false;
                    break;
                }
                
                const chunkAttIds = attendancesChunk.map(a => a.id);
                
                let query = supabase.from('lab_results').select('id, attendance_id, exam_id, status').in('attendance_id', chunkAttIds);
                if (statusFilter === 'LIBERADO') {
                    query = query.eq('status', 'LIBERADO');
                } else {
                    query = query.in('status', ['DIGITADO', 'CONFERIDO', 'LIBERADO']);
                }

                const { data: resData, error: resError } = await query;
                if (resError) throw resError;
                
                if (resData && resData.length > 0) {
                    const examIdsChunk = [...new Set(resData.map(r => r.exam_id))];
                    const { data: exData, error: exError } = await supabase.from('lab_exams').select('id, code, name, requires_conference').in('id', examIdsChunk);
                    if (exError) throw exError;
                    
                    let validExams = exData || [];
                    if (filters.exam) {
                        const searchExam = filters.exam.toLowerCase();
                        validExams = validExams.filter(e => (e.code && e.code.toLowerCase().includes(searchExam)) || (e.name && e.name.toLowerCase().includes(searchExam)));
                    }
                    
                    const validExamIds = validExams.map(e => e.id);
                    const validResults = resData.filter(r => {
                        if (!validExamIds.includes(r.exam_id)) return false;
                        const ex = validExams.find(e => e.id === r.exam_id);
                        if (!ex) return false;
                        if (statusFilter === 'LIBERADO') return r.status === 'LIBERADO';
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
                    
                    const distinctValidAttIds = [...new Set(validResults.map(r => r.attendance_id))];
                    
                    for (const a of attendancesChunk) {
                        if (distinctValidAttIds.includes(a.id) && !attendanceIds.includes(a.id)) {
                            if (attendanceIds.length < MAX_ATTENDANCES) {
                                attendanceIds.push(a.id);
                                allAttendancesData.push(a);
                            } else {
                                break;
                            }
                        }
                    }
                }
                
                if (attendancesChunk.length < FETCH_SIZE) {
                    hasMore = false;
                } else {
                    currentOffset += FETCH_SIZE;
                }
            }
            
            if (attendanceIds.length === 0) return [];

            // ETAPA B: Carregar resultados dos 50 atendimentos descobertos e prosseguir normalmente
            const attIds = attendanceIds;
            let filteredAttendances = allAttendancesData;
            
            let results = [];
            for (let i = 0; i < attIds.length; i += 100) {
                const chunk = attIds.slice(i, i + 100);
                let query = supabase
                    .from('lab_results')
                    .select('id, attendance_id, exam_id, status, created_at, general_observation, typed_at, checked_at, released_at, responsible_name, responsible_crbm, responsible_signature_path')
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
                    .select('id, code, name, material, method, analyzer_name, requires_conference, print_order, prints_on_report')
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

            const attendancePatientIds = [...new Set(filteredAttendances.map(a => a.patient_id))];
            const { data: patients, error: patError } = await supabase
                .from('lab_patients')
                .select('id, code, full_name, birth_date, sex, cns, cpf, rg')
                .in('id', attendancePatientIds);
            if (patError) throw patError;

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

                const attExam = att.lab_attendance_exams?.find(ae => ae.exam_id === r.exam_id);

                let idade = '';
                if (pat.birth_date) {
                    const diff_ms = Date.now() - new Date(pat.birth_date).getTime();
                    const age_dt = new Date(diff_ms);
                    idade = Math.abs(age_dt.getUTCFullYear() - 1970) + ' anos';
                }

                return {
                    id: r.id, 
                    result_id: r.id,
                    resultId: r.id,
                    patient_id: pat.id,
                    protocolo: att.protocol_number,
                    pacienteCodigo: pat.code,
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
                    totalExams: att.lab_attendance_exams?.length || 0,
                    exameId: ex.id,
                    exameCodigo: ex.code,
                    exameNome: ex.name,
                    exameMaterial: ex.material,
                    exameMetodo: ex.method,
                    exameAnalisador: ex.analyzer_name,
                    // campos de ordenação e seleção de impressão
                    examePrintOrder: ex.print_order ?? 999,
                    printsOnReport: ex.prints_on_report !== false,
                    dataAtendimento: laboratorioLaudosService.formatDateOnly(att.attendance_date),
                    dataAtendimentoRaw: att.attendance_date,
                    attendance_date: att.attendance_date,
                    attendance_time: att.attendance_time,
                    attendance_created_at: att.created_at,
                    created_at: att.created_at,
                    collection_date: attExam?.collection_date || att.attendance_date || null,
                    collection_time: attExam?.collection_time || att.attendance_time || null,
                    status: r.status,
                    observacaoGeral: r.general_observation,
                    result_created_at: r.created_at,
                    typed_at: r.typed_at,
                    checked_at: r.checked_at,
                    released_at: r.released_at,
                    // snapshot do biomédico responsável pela Conferência
                    responsible_name: r.responsible_name || null,
                    responsible_crbm: r.responsible_crbm || null,
                    responsible_signature_path: r.responsible_signature_path || null,
                    parametros: 0
                };
            }).filter(Boolean);

            const resultIds = fila.map(f => f.id).filter(id => id && typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim()));
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
            if (!resultId || typeof resultId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resultId.trim())) {
                return [];
            }

            const { data: values, error } = await supabase
                .from('lab_result_values')
                .select('*')
                .eq('result_id', resultId.trim())
                .order('display_order', { ascending: true });
                
            if (error) throw error;
            return values || [];
        } catch (error) {
            console.error('Erro ao carregar detalhes do laudo:', error);
            throw error;
        }
    },

    carregarDetalhesLaudosLote: async (resultIds) => {
        try {
            if (!resultIds || !Array.isArray(resultIds)) return {};
            const validIds = [...new Set(resultIds.filter(id => id && typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())).map(id => id.trim()))];
            if (validIds.length === 0) return {};

            const { data: values, error } = await supabase
                .from('lab_result_values')
                .select('*')
                .in('result_id', validIds)
                .order('display_order', { ascending: true });
                
            if (error) throw error;
            
            const grouped = {};
            validIds.forEach(id => {
                grouped[id] = { details: [] };
            });
            
            if (values) {
                values.forEach(val => {
                    if (grouped[val.result_id]) {
                        grouped[val.result_id].details.push(val);
                    }
                });
            }
            
            return grouped;
        } catch (error) {
            console.error('Erro ao carregar detalhes dos laudos em lote:', error);
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
    },

    /**
     * Gera uma Signed URL temporária (900s) para a assinatura do biomédico
     * no bucket privado 'laboratorio-assinaturas'.
     * Retorna null em caso de erro para não derrubar a renderização do laudo.
     */
    getLaboratorioSignatureSignedUrl: async (signaturePath) => {
        if (!signaturePath) return null;
        try {
            const { data, error } = await supabase.storage
                .from('laboratorio-assinaturas')
                .createSignedUrl(signaturePath, 900);

            if (error) {
                console.error('[Laudos] Erro ao gerar signed URL da assinatura:', error);
                return null;
            }

            return data?.signedUrl || null;
        } catch (err) {
            console.error('[Laudos] Erro inesperado ao gerar signed URL:', err);
            return null;
        }
    },

    buscarHistoricoExame: async (examCode, patientId, currentResultId, currentTimestamp) => {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!examCode || !patientId || !currentResultId || !currentTimestamp) return [];
            if (typeof patientId !== 'string' || !uuidRegex.test(patientId.trim())) return [];
            if (typeof currentResultId !== 'string' || !uuidRegex.test(currentResultId.trim())) return [];
            
            const currTime = new Date(currentTimestamp).getTime();
            if (isNaN(currTime)) return [];

            // Find attendances for this patient in the same tenant
            const { data: attendances, error: attErr } = await supabase
                .from('lab_attendances')
                .select('id, attendance_date, lab_attendance_exams(exam_id, collection_date, collection_time)')
                .eq('patient_id', patientId.trim());
            
            if (attErr) throw attErr;
            if (!attendances || attendances.length === 0) return [];
            
            const attendanceIds = attendances.map(a => a.id).filter(id => id && typeof id === 'string' && uuidRegex.test(id.trim()));
            if (attendanceIds.length === 0) return [];
            
            // Find exam_id for specific examCode
            const { data: exams, error: examErr } = await supabase
                .from('lab_exams')
                .select('id')
                .eq('code', examCode);
            
            if (examErr) throw examErr;
            if (!exams || exams.length === 0) return [];
            const examId = exams[0].id;
            if (!examId || !uuidRegex.test(examId)) return [];
            
            // Find results
            const { data: results, error: resErr } = await supabase
                .from('lab_results')
                .select('id, attendance_id, status, checked_at, released_at, typed_at')
                .in('attendance_id', attendanceIds)
                .eq('exam_id', examId)
                .in('status', ['CONFERIDO', 'LIBERADO'])
                .neq('id', currentResultId.trim());
                
            if (resErr) throw resErr;
            if (!results || results.length === 0) return [];
            
            const resultIds = results.map(r => r.id).filter(id => id && typeof id === 'string' && uuidRegex.test(id.trim()));
            if (resultIds.length === 0) return [];
            
            // Fetch values
            const { data: values, error: valErr } = await supabase
                .from('lab_result_values')
                .select('result_id, value_numeric, value_text')
                .in('result_id', resultIds);
                
            if (valErr) throw valErr;
            
            // Consolidate data
            const historico = results.map(r => {
                const att = attendances.find(a => a.id === r.attendance_id);
                const attExam = att?.lab_attendance_exams?.find(ae => ae.exam_id === examId);
                
                const resultValues = values.filter(v => v.result_id === r.id);
                if (resultValues.length === 0) return null;
                
                // parse value procurando o primeiro valor numérico válido
                let numVal = null;
                for (const val of resultValues) {
                    let tempNum = val.value_numeric;
                    if (tempNum === null || tempNum === undefined) {
                        const parsed = parseFloat(String(val.value_text).replace(',', '.'));
                        if (!isNaN(parsed)) tempNum = parsed;
                    }
                    if (tempNum !== null && tempNum !== undefined) {
                        numVal = tempNum;
                        break;
                    }
                }
                
                if (numVal === null || numVal === undefined) return null;
                
                // build ISO timestamp
                let rawDate = null;
                if (attExam?.collection_date) {
                    rawDate = attExam.collection_date;
                    if (attExam.collection_time) {
                        rawDate = `${rawDate}T${attExam.collection_time}`;
                    } else {
                        rawDate = `${rawDate}T00:00:00`;
                    }
                } else {
                    rawDate = r.checked_at || r.released_at;
                    if (!rawDate && att?.attendance_date) {
                        rawDate = `${att.attendance_date}T00:00:00`;
                    }
                }

                if (!rawDate) return null;
                const histTime = new Date(rawDate).getTime();
                
                // CRITICAL RULE: only STRICTLY BEFORE current timestamp
                if (isNaN(histTime) || histTime >= currTime) return null;
                
                return {
                    id: r.id,
                    value: numVal,
                    rawDate: rawDate,
                    histTime: histTime
                };
            }).filter(Boolean);
            
            // Sort by date DESC and get max 3
            historico.sort((a, b) => b.histTime - a.histTime);
            return historico.slice(0, 3);
        } catch (error) {
            console.error('Erro ao buscar historico GLI:', error);
            return [];
        }
    }
};
