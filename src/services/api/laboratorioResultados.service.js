import { supabase } from '../../lib/supabase';

class LaboratorioResultadosService {
    
    // Filtro temporário para teste inicial da integração
    static TEST_PROTOCOL = 'TESTE-LAB-001';

    async buscarAtendimentosProgressivos({ filtros = {}, cursor = 0, limit = 20 } = {}) {
        try {
            const { dataInicial, paciente, patient_code, status, attendance_origin } = filtros || {};

            const targetLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
            let currentOffset = Math.max(0, parseInt(cursor?.offset ?? cursor, 10) || 0);

            console.debug('[LAB][RESULTADOS] Busca progressiva iniciada', {
                dataInicial,
                paciente,
                patient_code,
                status,
                attendance_origin,
                currentOffset,
                targetLimit
            });

            let patientIds = null;
            if (paciente || patient_code) {
                let patientQuery = supabase.from('lab_patients').select('id');
                if (paciente) {
                    patientQuery = patientQuery.ilike('full_name', `%${paciente.trim()}%`);
                }
                if (patient_code) {
                    patientQuery = patientQuery.eq('code', patient_code.trim());
                }
                const { data: patients, error: errPat } = await patientQuery;
                if (errPat) throw errPat;
                patientIds = patients?.map(p => p.id) || [];
                if (patientIds.length === 0) {
                    return {
                        items: [],
                        nextCursor: currentOffset,
                        hasMore: false,
                        exhausted: true,
                        scannedCount: 0
                    };
                }
            }

            const dataInicialNormalizada = typeof dataInicial === 'string' ? dataInicial.trim() : '';
            if (dataInicialNormalizada) {
                const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
                if (!DATE_ONLY_REGEX.test(dataInicialNormalizada)) {
                    throw new Error('Data inicial inválida. Use o formato YYYY-MM-DD.');
                }
            }

            const CANDIDATE_CHUNK_SIZE = 30;
            const MAX_ITERATIONS = 12; // Segurança para escanear até ~360 candidatos por requisição se necessário
            let iteration = 0;

            const accumulatedItems = [];
            let hasMoreCandidates = true;
            let totalScanned = 0;

            while (accumulatedItems.length < targetLimit && hasMoreCandidates && iteration < MAX_ITERATIONS) {
                iteration++;
                const from = currentOffset;
                const to = from + CANDIDATE_CHUNK_SIZE - 1;

                let query = supabase.from('lab_attendances').select('*');
                if (dataInicialNormalizada) {
                    query = query.eq('attendance_date', dataInicialNormalizada);
                }
                if (patientIds) {
                    query = query.in('patient_id', patientIds);
                }
                if (attendance_origin) {
                    query = query.eq('attendance_origin', attendance_origin);
                }

                // Ordenação determinística com desempate por protocol_number e id
                query = query
                    .order('attendance_date', { ascending: false })
                    .order('attendance_time', { ascending: false })
                    .order('protocol_number', { ascending: false })
                    .order('id', { ascending: false })
                    .range(from, to);

                const { data: candidateBatch, error: errAtt } = await query;
                if (errAtt) throw errAtt;

                const candidates = candidateBatch || [];
                totalScanned += candidates.length;

                if (candidates.length === 0) {
                    hasMoreCandidates = false;
                    break;
                }

                if (candidates.length < CANDIDATE_CHUNK_SIZE) {
                    hasMoreCandidates = false;
                }

                // Processa e classifica os candidatos deste lote
                const processedCandidates = await this._processarLoteCandidatos(candidates, status);

                // Itera candidato a candidato consumido para avançar o cursor com precisão
                let consumedInBatch = 0;
                for (let k = 0; k < candidates.length; k++) {
                    const item = processedCandidates[k];
                    consumedInBatch = k + 1;
                    if (item) {
                        accumulatedItems.push(item);
                        if (accumulatedItems.length === targetLimit) {
                            break;
                        }
                    }
                }

                currentOffset += consumedInBatch;

                // Se não consumimos todo o lote porque atingimos targetLimit, ainda há candidatos no lote
                if (consumedInBatch < candidates.length) {
                    hasMoreCandidates = true;
                    break;
                }
            }

            const exhausted = !hasMoreCandidates && accumulatedItems.length < targetLimit;
            const hasMore = hasMoreCandidates;

            return {
                items: accumulatedItems,
                nextCursor: currentOffset,
                hasMore,
                exhausted,
                scannedCount: totalScanned
            };
        } catch (error) {
            console.error('[LAB][RESULTADOS] Erro em buscarAtendimentosProgressivos:', error);
            throw error;
        }
    }

    async _processarLoteCandidatos(attendances, statusFilter) {
        if (!attendances || attendances.length === 0) return [];

        const attendanceIds = attendances.map(a => a.id);
        const uniquePatientIds = [...new Set(attendances.map(a => a.patient_id).filter(Boolean))];

        const CHUNK_SIZE = 25;
        const PAGE_SIZE = 1000;

        // 1. Busca de pacientes em lote
        const allPatients = [];
        for (let i = 0; i < uniquePatientIds.length; i += CHUNK_SIZE) {
            const chunk = uniquePatientIds.slice(i, i + CHUNK_SIZE);
            const { data: patChunk, error: errPatChunk } = await supabase
                .from('lab_patients')
                .select('*')
                .in('id', chunk);
            if (errPatChunk) throw errPatChunk;
            if (patChunk) allPatients.push(...patChunk);
        }
        const pacientesMap = Object.fromEntries(allPatients.map(p => [p.id, p]));

        // 2. Busca de solicitações de exames em lote
        const seenSolicitacaoIds = new Set();
        const allSolicitacoes = [];
        for (let i = 0; i < attendanceIds.length; i += CHUNK_SIZE) {
            const chunk = attendanceIds.slice(i, i + CHUNK_SIZE);
            let p = 0;
            let continuar = true;
            while (continuar) {
                const pageFrom = p * PAGE_SIZE;
                const pageTo = pageFrom + PAGE_SIZE - 1;
                const { data: pageData, error: errPage } = await supabase
                    .from('lab_attendance_exams')
                    .select('id, attendance_id, exam_id, status')
                    .in('attendance_id', chunk)
                    .order('id', { ascending: true })
                    .range(pageFrom, pageTo);
                if (errPage) throw errPage;
                const rows = pageData || [];
                for (const row of rows) {
                    if (!seenSolicitacaoIds.has(row.id)) {
                        seenSolicitacaoIds.add(row.id);
                        allSolicitacoes.push(row);
                    }
                }
                continuar = rows.length === PAGE_SIZE;
                p++;
            }
        }

        // 3. Busca de resultados em lote
        const seenResultIds = new Set();
        const allResults = [];
        for (let i = 0; i < attendanceIds.length; i += CHUNK_SIZE) {
            const chunk = attendanceIds.slice(i, i + CHUNK_SIZE);
            let p = 0;
            let continuar = true;
            while (continuar) {
                const pageFrom = p * PAGE_SIZE;
                const pageTo = pageFrom + PAGE_SIZE - 1;
                const { data: pageData, error: errPage } = await supabase
                    .from('lab_results')
                    .select('id, attendance_id, attendance_exam_id, exam_id, status, cancelled_by, cancelled_at, cancellation_reason')
                    .in('attendance_id', chunk)
                    .order('id', { ascending: true })
                    .range(pageFrom, pageTo);
                if (errPage) throw errPage;
                const rows = pageData || [];
                for (const row of rows) {
                    if (!seenResultIds.has(row.id)) {
                        seenResultIds.add(row.id);
                        allResults.push(row);
                    }
                }
                continuar = rows.length === PAGE_SIZE;
                p++;
            }
        }

        // 4. Mapeamento de resultados por attendance_exam_id
        const resultadosByAEId = {};
        for (const r of allResults) {
            if (r.attendance_exam_id) {
                resultadosByAEId[r.attendance_exam_id] = r;
            }
        }

        // 5. Histórico de cancelamento apenas para resultados candidatos
        const candidateResultIds = [];
        for (const r of allResults) {
            if (String(r.status || '').toUpperCase() === 'CANCELADO') {
                candidateResultIds.push(r.id);
            }
        }
        for (const s of allSolicitacoes) {
            if (String(s.status || '').toUpperCase() === 'CANCELADO') {
                const r = resultadosByAEId[s.id];
                if (r && r.id) {
                    candidateResultIds.push(r.id);
                }
            }
        }

        const cancelActionHistorySet = new Set();
        if (candidateResultIds.length > 0) {
            const uniqueCandidateResultIds = [...new Set(candidateResultIds)];
            for (let i = 0; i < uniqueCandidateResultIds.length; i += CHUNK_SIZE) {
                const chunk = uniqueCandidateResultIds.slice(i, i + CHUNK_SIZE);
                const { data: histData, error: errHist } = await supabase
                    .from('lab_result_status_history')
                    .select('result_id, action')
                    .in('result_id', chunk)
                    .eq('action', 'CANCELAMENTO_EXAME');
                if (errHist) throw errHist;
                if (histData) {
                    for (const h of histData) {
                        cancelActionHistorySet.add(h.result_id);
                    }
                }
            }
        }

        // 6. Mapeamento e classificação dos atendimentos preservando índice 1-a-1 com `attendances`
        return attendances.map(att => {
            const paciente = pacientesMap[att.patient_id] || {};
            const attSolicitacoes = allSolicitacoes.filter(s => s.attendance_id === att.id);
            const attResults = allResults.filter(r => r.attendance_id === att.id);

            let pendentes = 0;
            let digitados = 0;
            let conferidos = 0;
            let liberados = 0;
            let cancelados = 0;
            let revisao = 0;

            const processedResultIds = new Set();

            for (const sol of attSolicitacoes) {
                const resultado = resultadosByAEId[sol.id] || null;
                if (resultado) {
                    processedResultIds.add(resultado.id);
                }

                const requestStatus = String(sol.status || '').toUpperCase();
                const resultStatus = resultado ? String(resultado.status || '').toUpperCase() : null;
                const hasCancelamentoExame = resultado ? cancelActionHistorySet.has(resultado.id) : false;

                // 1. Cancelamento consistente
                const ehCancelamentoConsistente = (
                    requestStatus === 'CANCELADO' &&
                    resultStatus === 'CANCELADO' &&
                    !!resultado?.cancelled_by &&
                    !!resultado?.cancelled_at &&
                    typeof resultado?.cancellation_reason === 'string' &&
                    resultado.cancellation_reason.trim() !== '' &&
                    hasCancelamentoExame
                );

                if (ehCancelamentoConsistente) {
                    cancelados++;
                    continue;
                }

                // 2. Registro legado / inconsistente para revisão
                const ehInconsistente = (
                    resultado === null ||
                    resultado === undefined ||
                    (resultStatus === 'CANCELADO' && requestStatus !== 'CANCELADO') ||
                    (requestStatus === 'CANCELADO' && resultStatus !== 'CANCELADO') ||
                    (
                        requestStatus === 'CANCELADO' &&
                        resultStatus === 'CANCELADO' &&
                        (
                            !resultado?.cancelled_by ||
                            !resultado?.cancelled_at ||
                            !resultado?.cancellation_reason ||
                            String(resultado?.cancellation_reason || '').trim() === '' ||
                            !hasCancelamentoExame
                        )
                    )
                );

                if (ehInconsistente) {
                    revisao++;
                    continue;
                }

                // 3. Exames ativos
                const effectiveStatus = resultStatus || requestStatus || 'PENDENTE';
                if (effectiveStatus === 'LIBERADO') liberados++;
                else if (effectiveStatus === 'CONFERIDO') conferidos++;
                else if (effectiveStatus === 'DIGITADO') digitados++;
                else pendentes++;
            }

            for (const r of attResults) {
                if (!processedResultIds.has(r.id)) {
                    revisao++;
                }
            }

            const total = attSolicitacoes.length + attResults.filter(r => !processedResultIds.has(r.id)).length;
            
            let statusGeral = 'Em andamento';
            if (total === 0) {
                statusGeral = 'Sem exames';
            } else if (cancelados === total) {
                statusGeral = 'Cancelado';
            } else {
                const activeCount = pendentes + digitados + conferidos + liberados;
                if (activeCount === 0) {
                    statusGeral = cancelados > 0 ? 'Cancelado' : 'Em andamento';
                } else if (liberados === activeCount) {
                    statusGeral = 'Liberados';
                } else if (pendentes > 0) {
                    statusGeral = 'Em digitação';
                } else if (digitados > 0) {
                    statusGeral = 'Aguardando conferência';
                } else if (conferidos > 0) {
                    statusGeral = 'Conferidos';
                } else {
                    statusGeral = 'Outros';
                }
            }

            // Filtragem por STATUS se especificado
            if (statusFilter && statusFilter !== 'Todos') {
                const matches = (statusGeral === statusFilter) || (statusFilter === 'Cancelados' && statusGeral === 'Cancelado');
                if (!matches) return null;
            }

            return {
                ...att,
                pacienteNome: paciente.name || paciente.full_name || 'Paciente não encontrado',
                pacienteIdade: paciente.birth_date ? this.calculateAge(paciente.birth_date) : 'Não inf.',
                pacienteSexo: paciente.gender || paciente.sex || 'Não inf.',
                pacienteCns: paciente.cns || null,
                pacienteCpf: paciente.cpf || null,
                pacienteCodigo: paciente.code || null,
                convenio: att.agreement || 'Não inf.',
                local_entrega: att.delivery_location || 'Central',
                examesTotal: total,
                examesPendentes: pendentes,
                examesDigitados: digitados,
                examesConferidos: conferidos,
                examesLiberados: liberados,
                examesCancelados: cancelados,
                examesRevisao: revisao,
                statusGeral
            };
        });
    }

    async buscarAtendimentos(filtros = {}, options = {}) {
        return this.buscarAtendimentosProgressivos({
            filtros,
            cursor: typeof options === 'object' && options !== null ? (options.cursor || 0) : 0,
            limit: typeof options === 'object' && options !== null ? (options.pageSize || 20) : (typeof options === 'number' ? options : 20)
        });
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
            .select('*, lab_exam_sectors(name)')
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
            // Carregar todos os exames do atendimento para visualização lateral completa
            const attendanceResults = results
                .filter(r => r.attendance_id === att.id)
                .map(r => {
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
                    exameSetor: exame.lab_exam_sectors?.name || 'OUTROS',
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
                pacienteNascimento: paciente.birth_date || null,
                pacienteCodigo: paciente.code || null,
                resultados: attendanceResults
            };
        });

        console.log('[DEBUG] Exames montados para tela:', combinedData);
        return combinedData;
    }

    calculateAge(birthDateStr) {
        if (!birthDateStr) return '';
        const dateStr = String(birthDateStr).slice(0, 10);
        const parts = dateStr.split('-');
        if (parts.length < 3) return '';
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        if (
            year > currentYear ||
            (year === currentYear && month > currentMonth) ||
            (year === currentYear && month === currentMonth && day > currentDay)
        ) {
            return '';
        }

        let years = currentYear - year;
        let months = currentMonth - month;
        let days = currentDay - day;

        if (days < 0) {
            months--;
        }

        if (months < 0) {
            years--;
            months += 12;
        }

        if (years < 0) return '';

        if (years >= 1) {
            return years === 1 ? '1 ano' : `${years} anos`;
        }

        if (months <= 0) {
            return '0 meses';
        }
        if (months === 1) {
            return '1 mês';
        }
        return `${months} meses`;
    }

    async salvarResultados(resultId, updatedValues, generalObservation = undefined) {
        // updatedValues = array de objetos formatados no componente UI
        if (!resultId || !updatedValues || updatedValues.length === 0) return;

        // Proteção contra alteração acidental de exames já conferidos/liberados.
        // A reabertura deve acontecer antes, pela RPC específica.
        const { data: currentResult, error: currentResultError } = await supabase
            .from('lab_results')
            .select('status')
            .eq('id', resultId)
            .single();

        if (currentResultError) throw currentResultError;

        const currentStatus = String(currentResult?.status || '').trim().toUpperCase();
        if (!['PENDENTE', 'DIGITADO'].includes(currentStatus)) {
            throw new Error('Este exame precisa ser reaberto para correção antes de ser salvo.');
        }

        for (let i = 0; i < updatedValues.length; i++) {
            const v = updatedValues[i];
            
            const operation = v.value_id ? 'UPDATE' : 'INSERT';
            const normalizedValue = v.result_type === 'NUMERICO' && v.value_numeric !== '' && v.value_numeric !== null ? parseFloat(v.value_numeric) : v.value_text;

            console.debug('[TESTANDO PARÂMETRO]', {
                code: v.parameter_code || v.code,
                resultType: v.result_type,
                rawValue: v.value_numeric !== null && v.value_numeric !== undefined ? v.value_numeric : v.value_text,
                normalizedValue: normalizedValue,
                parameterId: v.parameter_id,
                resultValueId: v.value_id,
                attendanceExamId: resultId,
                examId: v.exam_id,
                operation
            });

            try {
                const payload = {
                    updated_at: new Date().toISOString()
                };

                const isPCR = v._isPCRExam === true;

                if (v.result_type === 'NUMERICO' && !isPCR) {
                    payload.value_numeric = v.value_numeric !== '' && v.value_numeric !== null ? parseFloat(v.value_numeric) : null;
                    payload.value_text = null;
                } else {
                    payload.value_text = v.value_text;
                    payload.value_numeric = null;
                }
                
                payload.observation = v.observation;

                if (operation === 'INSERT') {
                    if (!v.parameter_id) {
                        throw new Error(`[ERRO ESTRUTURAL] parameter_id ausente para insert no parâmetro ${v.name}`);
                    }
                    
                    const insertPayload = {
                        ...payload,
                        result_id: resultId,
                        parameter_id: v.parameter_id,
                        created_at: new Date().toISOString()
                    };
                    
                    const { error } = await supabase
                        .from('lab_result_values')
                        .insert([insertPayload]);
                    
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('lab_result_values')
                        .update(payload)
                        .eq('id', v.value_id);
                    
                    if (error) throw error;
                }
            } catch (error) {
                console.error('[PARÂMETRO QUE FALHOU]', {
                    code: v.parameter_code || v.code,
                    value: v.value_numeric !== null && v.value_numeric !== undefined ? v.value_numeric : v.value_text,
                    resultValueId: v.value_id,
                    operation,
                    error
                });
                throw error;
            }
        }


        // 2. Atualiza lab_results para DIGITADO
        const updatePayload = { 
            status: 'DIGITADO',
            typed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        if (generalObservation !== undefined) {
            updatePayload.general_observation = generalObservation;
        }

        const { data: resData, error: errUpdateResult } = await supabase
            .from('lab_results')
            .update(updatePayload)
            .eq('id', resultId)
            .select();
            
        if (errUpdateResult) throw errUpdateResult;
        
        return true;
    }

    async reabrirResultadoParaCorrecao(resultId) {
        if (!resultId) {
            throw new Error('Resultado não informado.');
        }

        const { data, error } = await supabase.rpc('reopen_lab_result_for_correction', {
            p_result_id: resultId
        });

        if (error) {
            const message = String(error.message || '').toLowerCase();

            if (error.code === '42501' || message.includes('permiss')) {
                throw new Error('Você não possui permissão para reabrir este resultado.');
            }

            if (message.includes('não está liberado') || message.includes('nao esta liberado')) {
                throw new Error('Este exame não está mais liberado. Atualize a tela e tente novamente.');
            }

            throw new Error('Não foi possível reabrir o exame para correção.');
        }

        return Array.isArray(data) ? data[0] : data;
    }

    async updateAttendanceOrigin(attendanceId, newOrigin) {
        if (!attendanceId) throw new Error('Atendimento não informado.');
        if (!newOrigin) throw new Error('Nova origem não informada.');

        const { data, error } = await supabase.rpc('rpc_lab_update_attendance_origin', {
            p_attendance_id: attendanceId,
            p_new_origin: newOrigin
        });

        if (error) {
            throw error;
        }

        return data;
    }

    }

export const laboratorioResultadosService = new LaboratorioResultadosService();
