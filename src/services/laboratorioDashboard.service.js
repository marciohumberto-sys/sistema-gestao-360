import { supabase } from '../lib/supabase';

// Helper de parsing seguro de data/hora em America/Recife (UTC-3)
function parseRecifeDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const cleanTime = String(timeStr).trim();
    const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
    const isoWithOffset = `${dateStr}T${formattedTime}-03:00`;
    const timestamp = new Date(isoWithOffset).getTime();
    if (isNaN(timestamp)) return null;
    return timestamp;
}

// Helper para formatar durações em minutos para apresentação (ex: 4 min, 1h 05min)
export function formatDurationMinutes(minutes) {
    if (minutes === null || minutes === undefined || isNaN(minutes) || minutes < 0) {
        return '—';
    }
    const roundedMinutes = Math.round(minutes);
    if (roundedMinutes < 60) {
        return `${roundedMinutes} min`;
    }
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}min`;
}

// Helper para formatar tempo relativo (ex: Há 8 minutos, Há 1 hora, Agora)
export function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const now = Date.now();
    const eventTime = new Date(isoString).getTime();
    if (isNaN(eventTime)) return '';
    
    const diffMs = now - eventTime;
    if (diffMs < 0) return 'Agora';
    
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return 'Agora';
    if (diffMin === 1) return 'Há 1 minuto';
    if (diffMin < 60) return `Há ${diffMin} minutos`;
    
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours === 1) return 'Há 1 hora';
    if (diffHours < 24) return `Há ${diffHours} horas`;
    
    return 'Ontem';
}

class LaboratorioDashboardService {
    // Definimos o mesmo TENANT_ID usado no laboratório
    static TENANT_ID = '6e9e8e54-c9ec-42cf-a2a2-6f5e0ae8d832';

    async fetchLaboratorioDashboardData() {
        try {
            const tenantId = LaboratorioDashboardService.TENANT_ID;

            // 1. Data Local (America/Recife)
            const options = { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' };
            const formatter = new Intl.DateTimeFormat('pt-BR', options);
            const parts = formatter.formatToParts(new Date());
            const localDateStr = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;

            const startOfDayIso = new Date(`${localDateStr}T00:00:00.000-03:00`).toISOString();
            const endOfDayIso = new Date(`${localDateStr}T23:59:59.999-03:00`).toISOString();
            const since24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const resultData = {
                cards: {
                    pacientesHoje: 0,
                    examesHoje: 0,
                    aguardandoConferencia: 0,
                    examesLiberadosHoje: 0,
                    taxaLiberacaoHoje: 0
                },
                producaoPorSetor: [],
                statusExames: [],
                indicadoresOperacionais: {
                    tempoMedioColeta: null,
                    tempoMedioColetaFormatted: '—',
                    tempoMedioLiberacao: null,
                    tempoMedioLiberacaoFormatted: '—',
                    examesUrgentesPendentes: 0,
                    tempoMedioConferencia: null,
                    tempoMedioConferenciaFormatted: '—'
                },
                atividadesRecentes: [],
                atividadesError: false
            };

            // 2. Atendimentos do Dia (com attendance_time e attendance_origin para indicadores)
            const { data: attendances, error: attError } = await supabase
                .from('lab_attendances')
                .select('id, patient_id, attendance_date, attendance_time, attendance_origin')
                .eq('tenant_id', tenantId)
                .eq('attendance_date', localDateStr);

            if (attError) throw attError;

            const attData = attendances || [];
            const attendanceIds = attData.map(a => a.id);
            const patientIds = [...new Set(attData.map(a => a.patient_id))];

            resultData.cards.pacientesHoje = patientIds.length;

            let examesHoje = 0;
            let examesLiberadosHoje = 0;
            const sectorCounts = {};
            let examesSolicitados = [];

            if (attendanceIds.length > 0) {
                // 3. Exames Solicitados Hoje
                const { data: attExams, error: attExamsError } = await supabase
                    .from('lab_attendance_exams')
                    .select('id, attendance_id, exam_id, sector_id, status, collection_date, collection_time')
                    .eq('tenant_id', tenantId)
                    .in('attendance_id', attendanceIds);

                if (attExamsError) throw attExamsError;

                examesSolicitados = attExams || [];
                examesHoje = examesSolicitados.length;
                resultData.cards.examesHoje = examesHoje;

                // Agrupamento por setor
                examesSolicitados.forEach(ex => {
                    const sId = ex.sector_id || 'unidentified';
                    sectorCounts[sId] = (sectorCounts[sId] || 0) + 1;
                });

                // 4. Resultados para verificar laudos liberados e status dos atendimentos de hoje
                const { data: resultsToday, error: resultsTodayError } = await supabase
                    .from('lab_results')
                    .select('id, attendance_id, exam_id, status, created_at, typed_at, checked_at, released_at')
                    .eq('tenant_id', tenantId)
                    .in('attendance_id', attendanceIds);

                if (resultsTodayError) throw resultsTodayError;

                // Tratar duplicidade de resultados
                const resultsMap = {};
                (resultsToday || []).forEach(r => {
                    const key = `${r.attendance_id}::${r.exam_id}`;
                    if (!resultsMap[key]) {
                        resultsMap[key] = r;
                    } else {
                        console.warn(`[LaboratorioDashboardService] Duplicidade de resultado: ${key}. status: ${r.status}`);
                        const current = resultsMap[key];
                        const dateC = current.released_at || current.checked_at || current.typed_at || current.created_at || '';
                        const dateR = r.released_at || r.checked_at || r.typed_at || r.created_at || '';
                        if (dateR > dateC) {
                            resultsMap[key] = r;
                        }
                    }
                });

                examesLiberadosHoje = Object.values(resultsMap).filter(r => r.status === 'LIBERADO').length;
                resultData.cards.examesLiberadosHoje = examesLiberadosHoje;

                // 4.1 Exames para requirements de conferência de hoje
                const allTodayExamIds = [...new Set([
                    ...examesSolicitados.map(e => e.exam_id),
                    ...(resultsToday || []).map(r => r.exam_id)
                ].filter(Boolean))];

                let todayExamsMap = {};
                if (allTodayExamIds.length > 0) {
                    const { data: examsData, error: examsError } = await supabase
                        .from('lab_exams')
                        .select('id, requires_conference')
                        .in('id', allTodayExamIds);
                    if (examsError) throw examsError;
                    todayExamsMap = Object.fromEntries((examsData || []).map(e => [e.id, e]));
                }

                // 4.2 Classificação de Status
                let contagemStatus = {
                    aguardando_coleta: 0,
                    aguardando_digitacao: 0,
                    resultado_digitado: 0,
                    aguardando_conferencia: 0,
                    conferido: 0,
                    liberado: 0,
                    cancelado: 0,
                    nao_classificado: 0
                };

                examesSolicitados.forEach(attExam => {
                    const key = `${attExam.attendance_id}::${attExam.exam_id}`;
                    const r = resultsMap[key];
                    const e = todayExamsMap[attExam.exam_id] || {};
                    const hasColeta = attExam.collection_date || attExam.collection_time;

                    if (r && r.status === 'CANCELADO') {
                        contagemStatus.cancelado++;
                    } else if (r && r.status === 'LIBERADO') {
                        contagemStatus.liberado++;
                    } else if (r && r.status === 'CONFERIDO') {
                        contagemStatus.conferido++;
                    } else if (r && r.status === 'DIGITADO' && e.requires_conference === true) {
                        contagemStatus.aguardando_conferencia++;
                    } else if (r && r.status === 'DIGITADO' && e.requires_conference === false) {
                        contagemStatus.resultado_digitado++;
                    } else if ((!r || r.status === 'PENDENTE') && hasColeta) {
                        contagemStatus.aguardando_digitacao++;
                    } else if ((!r || r.status === 'PENDENTE') && !hasColeta) {
                        contagemStatus.aguardando_coleta++;
                    } else {
                        console.warn(`[LaboratorioDashboardService] Exame não classificado: ${key}. status: ${r?.status}`);
                        contagemStatus.nao_classificado++;
                    }
                });

                const rawStatusList = [
                    { key: 'aguardando_coleta', label: 'Aguardando coleta', quantidade: contagemStatus.aguardando_coleta, color: '#f59e0b' },
                    { key: 'aguardando_digitacao', label: 'Aguardando digitação', quantidade: contagemStatus.aguardando_digitacao, color: '#3b82f6' },
                    { key: 'resultado_digitado', label: 'Resultado digitado', quantidade: contagemStatus.resultado_digitado, color: '#8b5cf6' },
                    { key: 'aguardando_conferencia', label: 'Aguardando conferência', quantidade: contagemStatus.aguardando_conferencia, color: '#ef4444', alert: true },
                    { key: 'conferido', label: 'Conferido', quantidade: contagemStatus.conferido, color: '#0ea5e9' },
                    { key: 'liberado', label: 'Liberado', quantidade: contagemStatus.liberado, color: '#10b981' },
                    { key: 'cancelado', label: 'Cancelado', quantidade: contagemStatus.cancelado, color: '#64748b' }
                ];
                if (contagemStatus.nao_classificado > 0) {
                    rawStatusList.push({ key: 'nao_classificado', label: 'Não classificado', quantidade: contagemStatus.nao_classificado, color: '#94a3b8' });
                }

                resultData.statusExames = rawStatusList.map(item => ({
                    ...item,
                    percentual: examesHoje > 0 ? Math.round((item.quantidade / examesHoje) * 100) : 0
                }));
                
                const totalStatus = resultData.statusExames.reduce((total, item) => total + item.quantidade, 0);
                if (totalStatus !== examesHoje) {
                    console.warn(`[LaboratorioDashboardService] Soma dos status (${totalStatus}) difere de examesHoje (${examesHoje}). Diferença atribuída a não classificado.`);
                    const diff = examesHoje - totalStatus;
                    const ncIndex = resultData.statusExames.findIndex(x => x.key === 'nao_classificado');
                    if (ncIndex >= 0) {
                        resultData.statusExames[ncIndex].quantidade += diff;
                        resultData.statusExames[ncIndex].percentual = Math.round((resultData.statusExames[ncIndex].quantidade / examesHoje) * 100);
                    } else {
                        resultData.statusExames.push({
                            key: 'nao_classificado', label: 'Não classificado', quantidade: diff, color: '#94a3b8',
                            percentual: Math.round((diff / examesHoje) * 100)
                        });
                    }
                }
            }

            // 5. Taxa de liberação
            resultData.cards.taxaLiberacaoHoje = examesHoje > 0 
                ? Math.round((examesLiberadosHoje / examesHoje) * 100) 
                : 0;

            // 6. Aguardando Conferência (Estoque Operacional)
            const { data: digitados, error: digError } = await supabase
                .from('lab_results')
                .select('id, exam_id')
                .eq('tenant_id', tenantId)
                .eq('status', 'DIGITADO');

            if (digError) throw digError;

            const resDigitados = digitados || [];
            if (resDigitados.length > 0) {
                const uniqueExamIds = [...new Set(resDigitados.map(r => r.exam_id))];
                
                const { data: examsConf, error: examsConfError } = await supabase
                    .from('lab_exams')
                    .select('id, requires_conference')
                    .in('id', uniqueExamIds)
                    .eq('requires_conference', true);
                    
                if (examsConfError) throw examsConfError;
                
                const examsReqConfIds = (examsConf || []).map(e => e.id);
                resultData.cards.aguardandoConferencia = resDigitados.filter(r => examsReqConfIds.includes(r.exam_id)).length;
            } else {
                resultData.cards.aguardandoConferencia = 0;
            }

            // 7. Produção por Setor
            if (Object.keys(sectorCounts).length > 0) {
                const sectorIds = Object.keys(sectorCounts).filter(id => id !== 'unidentified');
                
                let sectorsDb = [];
                if (sectorIds.length > 0) {
                    const { data: sectData, error: sectError } = await supabase
                        .from('lab_exam_sectors')
                        .select('id, name')
                        .in('id', sectorIds);
                    if (sectError) throw sectError;
                    sectorsDb = sectData || [];
                }

                const sectorsMap = Object.fromEntries(sectorsDb.map(s => [s.id, s.name]));

                const producao = Object.keys(sectorCounts).map(sId => {
                    const quantidade = sectorCounts[sId];
                    const percentual = examesHoje > 0 ? Math.round((quantidade / examesHoje) * 100) : 0;
                    const nome = sId === 'unidentified' ? 'Setor não identificado' : (sectorsMap[sId] || 'Setor não identificado');
                    return {
                        id: sId,
                        nome,
                        quantidade,
                        percentual
                    };
                });

                // Ordenar: 1. Qtd DESC, 2. Nome ASC
                producao.sort((a, b) => {
                    if (b.quantidade !== a.quantidade) {
                        return b.quantidade - a.quantidade;
                    }
                    return a.nome.localeCompare(b.nome, 'pt-BR');
                });

                resultData.producaoPorSetor = producao;
            }

            // =========================================================
            // 8. INDICADORES OPERACIONAIS
            // =========================================================

            // 8.1 Tempo médio até coleta
            // Universo: atendimentos do dia local com attendance_date e attendance_time válidos.
            // Para cada atendimento, encontrar a coleta mais antiga válida entre seus exames.
            // Média por atendimento (soma / total atendimentos com coleta).
            let totalColetaDiffMinutes = 0;
            let atendimentosComColetaValida = 0;

            const examsByAttendance = {};
            examesSolicitados.forEach(ex => {
                if (!examsByAttendance[ex.attendance_id]) {
                    examsByAttendance[ex.attendance_id] = [];
                }
                examsByAttendance[ex.attendance_id].push(ex);
            });

            attData.forEach(att => {
                const openingMs = parseRecifeDateTime(att.attendance_date, att.attendance_time);
                if (!openingMs) return;

                const attExamsList = examsByAttendance[att.id] || [];
                let earliestCollectionMs = null;

                attExamsList.forEach(ex => {
                    const colMs = parseRecifeDateTime(ex.collection_date, ex.collection_time);
                    if (colMs) {
                        if (earliestCollectionMs === null || colMs < earliestCollectionMs) {
                            earliestCollectionMs = colMs;
                        }
                    }
                });

                if (earliestCollectionMs !== null && earliestCollectionMs >= openingMs) {
                    const diffMin = (earliestCollectionMs - openingMs) / (1000 * 60);
                    totalColetaDiffMinutes += diffMin;
                    atendimentosComColetaValida++;
                }
            });

            if (atendimentosComColetaValida > 0) {
                const avgColetaMin = totalColetaDiffMinutes / atendimentosComColetaValida;
                resultData.indicadoresOperacionais.tempoMedioColeta = avgColetaMin;
                resultData.indicadoresOperacionais.tempoMedioColetaFormatted = formatDurationMinutes(avgColetaMin);
            }

            // 8.2 Tempo médio até liberação
            // Universo: resultados liberados no dia local (released_at no dia local).
            // Regra: released_at - (collection_date + collection_time)
            // Relacionamento por attendance_id + exam_id.
            try {
                const { data: releasedTodayResults, error: relError } = await supabase
                    .from('lab_results')
                    .select('id, attendance_id, exam_id, released_at')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'LIBERADO')
                    .gte('released_at', startOfDayIso)
                    .lte('released_at', endOfDayIso);

                if (relError) throw relError;

                const relResults = releasedTodayResults || [];
                if (relResults.length > 0) {
                    // Mapear os exames de atendimento necessários para obter a coleta
                    const neededAttIds = [...new Set(relResults.map(r => r.attendance_id))];
                    
                    // Reutilizar examesSolicitados se possível, ou buscar em lote
                    let allRelAttExams = examesSolicitados;
                    const missingAttIds = neededAttIds.filter(id => !attendanceIds.includes(id));
                    
                    if (missingAttIds.length > 0) {
                        const { data: extraExams, error: extraExError } = await supabase
                            .from('lab_attendance_exams')
                            .select('attendance_id, exam_id, collection_date, collection_time')
                            .eq('tenant_id', tenantId)
                            .in('attendance_id', missingAttIds);
                        if (!extraExError && extraExams) {
                            allRelAttExams = [...allRelAttExams, ...extraExams];
                        }
                    }

                    const examColetaMap = {};
                    allRelAttExams.forEach(ex => {
                        const key = `${ex.attendance_id}::${ex.exam_id}`;
                        examColetaMap[key] = ex;
                    });

                    let totalLiberacaoDiffMinutes = 0;
                    let liberadosComColetaValida = 0;

                    relResults.forEach(r => {
                        const key = `${r.attendance_id}::${r.exam_id}`;
                        const ex = examColetaMap[key];
                        if (!ex || !ex.collection_date || !ex.collection_time) return;

                        const colMs = parseRecifeDateTime(ex.collection_date, ex.collection_time);
                        const relMs = new Date(r.released_at).getTime();

                        if (colMs && relMs && relMs >= colMs) {
                            const diffMin = (relMs - colMs) / (1000 * 60);
                            totalLiberacaoDiffMinutes += diffMin;
                            liberadosComColetaValida++;
                        }
                    });

                    if (liberadosComColetaValida > 0) {
                        const avgLiberacaoMin = totalLiberacaoDiffMinutes / liberadosComColetaValida;
                        resultData.indicadoresOperacionais.tempoMedioLiberacao = avgLiberacaoMin;
                        resultData.indicadoresOperacionais.tempoMedioLiberacaoFormatted = formatDurationMinutes(avgLiberacaoMin);
                    }
                }
            } catch (errLiberacao) {
                console.error('[LaboratorioDashboardService] Erro ao calcular tempo médio até liberação:', errLiberacao);
            }

            // 8.3 Exames urgentes pendentes
            // Universo: atendimentos com origem normalizada === 'URGENCIA'.
            // Exames vinculados que não estejam concluídos (não possuem resultado, ou resultado PENDENTE, DIGITADO ou CONFERIDO).
            try {
                const { data: urgentAttendances, error: urgAttError } = await supabase
                    .from('lab_attendances')
                    .select('id, attendance_origin')
                    .eq('tenant_id', tenantId)
                    .ilike('attendance_origin', '%urg%');

                if (urgAttError) throw urgAttError;

                const filteredUrgentAtts = (urgentAttendances || []).filter(att => {
                    const norm = (att.attendance_origin || '')
                        .trim()
                        .toUpperCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '');
                    return norm === 'URGENCIA';
                });

                const urgentAttIds = filteredUrgentAtts.map(a => a.id);

                if (urgentAttIds.length > 0) {
                    const [urgExamsRes, urgResultsRes] = await Promise.all([
                        supabase
                            .from('lab_attendance_exams')
                            .select('attendance_id, exam_id')
                            .eq('tenant_id', tenantId)
                            .in('attendance_id', urgentAttIds),
                        supabase
                            .from('lab_results')
                            .select('attendance_id, exam_id, status')
                            .eq('tenant_id', tenantId)
                            .in('attendance_id', urgentAttIds)
                    ]);

                    if (urgExamsRes.error) throw urgExamsRes.error;
                    if (urgResultsRes.error) throw urgResultsRes.error;

                    const urgResultsMap = {};
                    (urgResultsRes.data || []).forEach(r => {
                        const key = `${r.attendance_id}::${r.exam_id}`;
                        urgResultsMap[key] = r;
                    });

                    // Deduplicar exames por attendance_id + exam_id
                    const seenUrgentKeys = new Set();
                    let pendingUrgentCount = 0;

                    (urgExamsRes.data || []).forEach(ex => {
                        const key = `${ex.attendance_id}::${ex.exam_id}`;
                        if (seenUrgentKeys.has(key)) return;
                        seenUrgentKeys.add(key);

                        const r = urgResultsMap[key];
                        // Considerado pendente se: sem resultado, PENDENTE, DIGITADO ou CONFERIDO
                        if (!r || r.status === 'PENDENTE' || r.status === 'DIGITADO' || r.status === 'CONFERIDO') {
                            pendingUrgentCount++;
                        }
                    });

                    resultData.indicadoresOperacionais.examesUrgentesPendentes = pendingUrgentCount;
                } else {
                    resultData.indicadoresOperacionais.examesUrgentesPendentes = 0;
                }
            } catch (errUrg) {
                console.error('[LaboratorioDashboardService] Erro ao buscar exames urgentes pendentes:', errUrg);
            }

            // 8.4 Tempo médio de conferência
            // Universo: resultados conferidos no dia local (checked_at no dia local).
            // Regra: checked_at - typed_at
            try {
                const { data: checkedTodayResults, error: checkError } = await supabase
                    .from('lab_results')
                    .select('id, typed_at, checked_at')
                    .eq('tenant_id', tenantId)
                    .not('checked_at', 'is', null)
                    .not('typed_at', 'is', null)
                    .gte('checked_at', startOfDayIso)
                    .lte('checked_at', endOfDayIso);

                if (checkError) throw checkError;

                const confResults = checkedTodayResults || [];
                let totalConferenciaDiffMinutes = 0;
                let conferidosValidos = 0;

                confResults.forEach(r => {
                    const checkMs = new Date(r.checked_at).getTime();
                    const typeMs = new Date(r.typed_at).getTime();

                    if (checkMs && typeMs && checkMs >= typeMs) {
                        const diffMin = (checkMs - typeMs) / (1000 * 60);
                        totalConferenciaDiffMinutes += diffMin;
                        conferidosValidos++;
                    }
                });

                if (conferidosValidos > 0) {
                    const avgConfMin = totalConferenciaDiffMinutes / conferidosValidos;
                    resultData.indicadoresOperacionais.tempoMedioConferencia = avgConfMin;
                    resultData.indicadoresOperacionais.tempoMedioConferenciaFormatted = formatDurationMinutes(avgConfMin);
                }
            } catch (errConf) {
                console.error('[LaboratorioDashboardService] Erro ao calcular tempo médio de conferência:', errConf);
            }

            // =========================================================
            // 9. ATIVIDADES RECENTES (Últimas 24 horas, máx 8 eventos)
            // =========================================================
            try {
                const [typedRes, checkedRes, releasedRes] = await Promise.all([
                    supabase
                        .from('lab_results')
                        .select('id, attendance_id, exam_id, typed_at')
                        .eq('tenant_id', tenantId)
                        .not('typed_at', 'is', null)
                        .gte('typed_at', since24hIso)
                        .order('typed_at', { ascending: false })
                        .limit(8),
                    supabase
                        .from('lab_results')
                        .select('id, attendance_id, exam_id, checked_at')
                        .eq('tenant_id', tenantId)
                        .not('checked_at', 'is', null)
                        .gte('checked_at', since24hIso)
                        .order('checked_at', { ascending: false })
                        .limit(8),
                    supabase
                        .from('lab_results')
                        .select('id, attendance_id, exam_id, released_at')
                        .eq('tenant_id', tenantId)
                        .not('released_at', 'is', null)
                        .gte('released_at', since24hIso)
                        .order('released_at', { ascending: false })
                        .limit(8)
                ]);

                const rawEvents = [];

                (typedRes.data || []).forEach(r => {
                    if (r.typed_at) {
                        rawEvents.push({
                            id: `typed_${r.id}_${r.typed_at}`,
                            type: 'DIGITADO',
                            title: 'Resultado digitado',
                            timestamp: r.typed_at,
                            attendance_id: r.attendance_id,
                            exam_id: r.exam_id
                        });
                    }
                });

                (checkedRes.data || []).forEach(r => {
                    if (r.checked_at) {
                        rawEvents.push({
                            id: `checked_${r.id}_${r.checked_at}`,
                            type: 'CONFERIDO',
                            title: 'Resultado conferido',
                            timestamp: r.checked_at,
                            attendance_id: r.attendance_id,
                            exam_id: r.exam_id
                        });
                    }
                });

                (releasedRes.data || []).forEach(r => {
                    if (r.released_at) {
                        rawEvents.push({
                            id: `released_${r.id}_${r.released_at}`,
                            type: 'LIBERADO',
                            title: 'Exame liberado',
                            timestamp: r.released_at,
                            attendance_id: r.attendance_id,
                            exam_id: r.exam_id
                        });
                    }
                });

                // Ordenar decrescente por timestamp e pegar top 8
                rawEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const top8Events = rawEvents.slice(0, 8);

                if (top8Events.length > 0) {
                    const eventAttIds = [...new Set(top8Events.map(e => e.attendance_id).filter(Boolean))];
                    const eventExamIds = [...new Set(top8Events.map(e => e.exam_id).filter(Boolean))];

                    const [eventsAttsRes, eventsExamsRes] = await Promise.all([
                        eventAttIds.length > 0
                            ? supabase.from('lab_attendances').select('id, patient_id').in('id', eventAttIds)
                            : Promise.resolve({ data: [] }),
                        eventExamIds.length > 0
                            ? supabase.from('lab_exams').select('id, code, name').in('id', eventExamIds)
                            : Promise.resolve({ data: [] })
                    ]);

                    const eventAtts = eventsAttsRes.data || [];
                    const eventExams = eventsExamsRes.data || [];

                    const eventPatientIds = [...new Set(eventAtts.map(a => a.patient_id).filter(Boolean))];
                    const eventPatientsRes = eventPatientIds.length > 0
                        ? await supabase.from('lab_patients').select('id, code, full_name').in('id', eventPatientIds)
                        : { data: [] };

                    const eventPatients = eventPatientsRes.data || [];

                    const attMap = Object.fromEntries(eventAtts.map(a => [a.id, a]));
                    const examMap = Object.fromEntries(eventExams.map(e => [e.id, e]));
                    const patMap = Object.fromEntries(eventPatients.map(p => [p.id, p]));

                    const formattedActivities = top8Events.map(ev => {
                        const examObj = examMap[ev.exam_id];
                        const examCode = examObj?.code || 'EXAME';
                        const examName = examObj?.name || 'Exame';
                        const examLabel = `${examCode} — ${examName}`;

                        const attObj = attMap[ev.attendance_id];
                        const patientObj = attObj ? patMap[attObj.patient_id] : null;

                        let patientLabel = '';
                        if (patientObj?.full_name) {
                            patientLabel = patientObj.full_name;
                        } else if (patientObj?.code) {
                            patientLabel = `Cód. paciente ${patientObj.code}`;
                        } else {
                            patientLabel = 'Paciente';
                        }

                        const description = `${examLabel} · ${patientLabel}`;
                        const relativeTime = formatRelativeTime(ev.timestamp);

                        return {
                            id: ev.id,
                            type: ev.type,
                            title: ev.title,
                            description,
                            timestamp: ev.timestamp,
                            relativeTime
                        };
                    });

                    resultData.atividadesRecentes = formattedActivities;
                } else {
                    resultData.atividadesRecentes = [];
                }
            } catch (errAtiv) {
                console.error('[LaboratorioDashboardService] Erro ao buscar atividades recentes:', errAtiv);
                resultData.atividadesError = true;
            }

            return resultData;
        } catch (error) {
            console.error('[LaboratorioDashboardService] Erro ao buscar dados:', error);
            throw error;
        }
    }
}

export const laboratorioDashboardService = new LaboratorioDashboardService();
