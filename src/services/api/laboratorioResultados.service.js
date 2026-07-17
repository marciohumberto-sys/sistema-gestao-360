import { supabase } from '../../lib/supabase';

class LaboratorioResultadosService {
    
    // Filtro temporário para teste inicial da integração
    static TEST_PROTOCOL = 'TESTE-LAB-001';

    async buscarAtendimentos({ dataInicial, protocolo, paciente, status, attendance_origin } = {}) {
        try {
            console.debug('[LAB][RESULTADOS] Filtros recebidos', {
              dataInicial,
              dataInicialTipo: typeof dataInicial,
              protocolo,
              paciente,
              status,
              attendance_origin,
            });

            let patientIds = null;
            if (paciente) {
                const pacienteLimpo = paciente.trim();
                const { data: patients, error: errPat } = await supabase
                    .from('lab_patients')
                    .select('id')
                    .or(`name.ilike.%${pacienteLimpo}%,full_name.ilike.%${pacienteLimpo}%`);
                if (errPat) throw errPat;
                patientIds = patients?.map(p => p.id) || [];
                if (patientIds.length === 0) return []; // Ninguém encontrado
            }

            let query = supabase.from('lab_attendances').select('*');
            
            const dataInicialNormalizada = typeof dataInicial === 'string' ? dataInicial.trim() : '';
            if (dataInicialNormalizada) {
                const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
                if (!DATE_ONLY_REGEX.test(dataInicialNormalizada)) {
                    throw new Error('Data inicial inválida. Use o formato YYYY-MM-DD.');
                }
                query = query.eq('attendance_date', dataInicialNormalizada);
            }

            if (protocolo) {
                query = query.ilike('protocol_number', `%${protocolo.trim()}%`);
            }
            if (patientIds) query = query.in('patient_id', patientIds);
            
            if (attendance_origin) {
                query = query.eq('attendance_origin', attendance_origin);
            }

            // Ordenar por data mais recente e protocolo
            query = query.order('attendance_date', { ascending: false }).order('protocol_number', { ascending: false });

            const { data: attendances, error: errAtt } = await query;
            if (errAtt) throw errAtt;
            if (!attendances || attendances.length === 0) return [];

            const attendanceIds = attendances.map(a => a.id);
            const uniquePatientIds = [...new Set(attendances.map(a => a.patient_id))];

            const { data: patients } = await supabase
                .from('lab_patients')
                .select('*')
                .in('id', uniquePatientIds);
            const pacientesMap = Object.fromEntries((patients || []).map(p => [p.id, p]));

            const { data: results } = await supabase
                .from('lab_results')
                .select('id, attendance_id, status')
                .in('attendance_id', attendanceIds);

            return attendances.map(att => {
                const paciente = pacientesMap[att.patient_id] || {};
                const attResults = (results || []).filter(r => r.attendance_id === att.id);
                const total = attResults.length;
                const allStatuses = attResults.map(r => String(r.status || 'PENDENTE').toUpperCase());

                const pendentes = allStatuses.filter(s => s === 'PENDENTE').length;
                const digitados = allStatuses.filter(s => s === 'DIGITADO').length;
                const conferidos = allStatuses.filter(s => s === 'CONFERIDO').length;
                const liberados = allStatuses.filter(s => s === 'LIBERADO').length;
                
                // Filtro de status se houver
                if (status && status !== 'TODOS' && status !== '') {
                    if (status === 'PENDENTE' && pendentes === 0) return null;
                    if (status === 'DIGITADO' && digitados === 0) return null;
                }
                
                let statusGeral = 'Em andamento';

                if (total === 0) {
                    statusGeral = 'Sem exames';
                } else if (allStatuses.every(s => s === 'LIBERADO')) {
                    statusGeral = 'Laudo liberado';
                } else if (allStatuses.includes('PENDENTE')) {
                    statusGeral = 'Em digitação';
                } else if (allStatuses.includes('DIGITADO')) {
                    statusGeral = 'Aguardando conferência';
                } else if (allStatuses.includes('CONFERIDO')) {
                    statusGeral = 'Aguardando liberação';
                }

                return {
                    ...att,
                    pacienteNome: paciente.name || paciente.full_name || 'Paciente não encontrado',
                    pacienteIdade: paciente.birth_date ? this.calculateAge(paciente.birth_date) : 'Não inf.',
                    pacienteSexo: paciente.gender || paciente.sex || 'Não inf.',
                    pacienteCns: paciente.cns || null,
                    pacienteCpf: paciente.cpf || null,
                    convenio: att.agreement || 'Não inf.',
                    local_entrega: att.delivery_location || 'Central',
                    examesTotal: total,
                    examesPendentes: pendentes,
                    examesDigitados: digitados,
                    examesConferidos: conferidos,
                    examesLiberados: liberados,
                    statusGeral
                };
            }).filter(Boolean);
        } catch (error) {
            console.error('[DEBUG] erro ao buscarAtendimentos:', error);
            throw error;
        }
    }

    async getResultadosPendentes(protocol = LaboratorioResultadosService.TEST_PROTOCOL) {
        // Abordagem defensiva: consultas separadas para evitar falha por joins de FKs imprevistas

        console.log('[DEBUG] Protocolo pesquisado:', protocol);
        // 1. Buscar os atendimentos
        const { data: attendances, error: errAtt } = await supabase
            .from('lab_attendances')
            .select('*')
            .eq('protocol_number', protocol);

        if (errAtt) throw errAtt;
        console.log('[DEBUG] Atendimentos encontrados:', attendances);
        if (!attendances || attendances.length === 0) return [];

        const attendanceIds = attendances.map(a => a.id);
        const patientIds = [...new Set(attendances.map(a => a.patient_id))];

        // 2. Buscar pacientes
        const { data: patients, error: errPat } = await supabase
            .from('lab_patients')
            .select('*')
            .in('id', patientIds);
            
        if (errPat) throw errPat;

        // 3. Buscar resultados
        const { data: results, error: errRes } = await supabase
            .from('lab_results')
            .select('*')
            .in('attendance_id', attendanceIds);
            
        if (errRes) throw errRes;
        console.log('[DEBUG] Resultados encontrados:', results);
        
        const resultIds = results.map(r => r.id);
        const examIds = [...new Set(results.map(r => r.exam_id))];

        // 4. Buscar exames
        const { data: exams, error: errExams } = await supabase
            .from('lab_exams')
            .select('*')
            .in('id', examIds);
            
        if (errExams) throw errExams;

        // 5. Buscar parâmetros dos exames
        const { data: parameters, error: errParams } = await supabase
            .from('lab_exam_parameters')
            .select('*')
            .in('exam_id', examIds);

        if (errParams) throw errParams;

        // 6. Buscar valores dos resultados
        let values = [];
        if (resultIds.length > 0) {
            const { data: resultValues, error: errVal } = await supabase
                .from('lab_result_values')
                .select('*')
                .in('result_id', resultIds);
            
            if (errVal) throw errVal;
            values = resultValues || [];
        }

        // Montar estrutura agregada
        const pacientesMap = Object.fromEntries((patients || []).map(p => [p.id, p]));
        const examesMap = Object.fromEntries((exams || []).map(e => [e.id, e]));
        const parametrosMap = Object.fromEntries((parameters || []).map(p => [p.id, p]));
        const valoresByResultId = values.reduce((acc, val) => {
            if (!acc[val.result_id]) acc[val.result_id] = [];
            acc[val.result_id].push(val);
            return acc;
        }, {});

        const combinedData = attendances.map(att => {
            const paciente = pacientesMap[att.patient_id] || {};
            const attendanceResults = results.filter(r => r.attendance_id === att.id).map(r => {
                const exame = examesMap[r.exam_id] || {};
                
                // Juntar os valores preenchidos com a estrutura do parâmetro base
                let exameParams = parameters.filter(p => p.exam_id === r.exam_id);
                // Ordenar por display_order (garantindo que se mantenha a ordem estrutural)
                exameParams.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

                const resultValores = valoresByResultId[r.id] || [];
                const resultValoresMap = Object.fromEntries(resultValores.map(v => [v.parameter_id, v]));

                const structuredValues = exameParams.map(param => {
                    const savedValue = resultValoresMap[param.id] || {};
                    return {
                        ...param, // name, result_type, reference_text, display_order, etc
                        value_id: savedValue.id || null,
                        result_id: r.id,
                        parameter_id: param.id,
                        value_numeric: savedValue.value_numeric ?? null,
                        value_text: savedValue.value_text || '',
                        observation: savedValue.observation || ''
                    };
                });

                return {
                    ...r,
                    exameNome: exame.name || exame.code,
                    exameCodigo: exame.code,
                    examePrintOrder: exame.print_order || 999,
                    requires_conference: exame.requires_conference || false,
                    structuredValues
                };
            });

            attendanceResults.sort((a, b) => a.examePrintOrder - b.examePrintOrder);

            return {
                ...att,
                pacienteNome: paciente.name || paciente.full_name || 'Paciente não encontrado',
                pacienteIdade: paciente.birth_date ? this.calculateAge(paciente.birth_date) : 'Não inf.',
                pacienteSexo: paciente.gender || paciente.sex || 'Não inf.',
                resultados: attendanceResults
            };
        });

        console.log('[DEBUG] Exames montados para tela:', combinedData);
        return combinedData;
    }

    calculateAge(birthDateStr) {
        if (!birthDateStr) return '';
        const today = new Date();
        const birthDate = new Date(birthDateStr);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age} anos`;
    }

    async salvarResultados(resultId, updatedValues) {
        // updatedValues = array de objetos formatados no componente UI
        if (!resultId || !updatedValues || updatedValues.length === 0) return;

        let hasError = false;

        const promises = updatedValues.map(async v => {
            if (!v.value_id) {
                console.log('[DEBUG] param sem value_id, impossivel atualizar', v);
                hasError = true;
                return;
            }
            
            const payload = {
                updated_at: new Date().toISOString()
            };
            
            if (v.result_type === 'NUMERICO') {
                payload.value_numeric = v.value_numeric !== '' && v.value_numeric !== null ? parseFloat(v.value_numeric) : null;
                payload.value_text = null;
            } else {
                payload.value_text = v.value_text;
                payload.value_numeric = null;
            }
            
            payload.observation = v.observation;

            console.log(`[DEBUG] payload de update para lab_result_values (id: ${v.value_id}):`, payload);

            const { data, error } = await supabase
                .from('lab_result_values')
                .update(payload)
                .eq('id', v.value_id)
                .select();
                
            console.log('[DEBUG] retorno Supabase lab_result_values:', { data, error });
            if (error) {
                hasError = true;
            }
        });

        await Promise.all(promises);

        if (hasError) {
            throw new Error("Falha ao salvar valores de lab_result_values. Status não atualizado.");
        }

        // 2. Atualiza lab_results para DIGITADO
        const { data: resData, error: errUpdateResult } = await supabase
            .from('lab_results')
            .update({ 
                status: 'DIGITADO',
                typed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', resultId)
            .select();
            
        if (errUpdateResult) throw errUpdateResult;
        
        return true;
    }

    }

export const laboratorioResultadosService = new LaboratorioResultadosService();
