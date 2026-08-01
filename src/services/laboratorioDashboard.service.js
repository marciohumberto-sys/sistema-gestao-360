import { supabase } from '../lib/supabase';

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

            const resultData = {
                cards: {
                    pacientesHoje: 0,
                    examesHoje: 0,
                    aguardandoConferencia: 0,
                    examesLiberadosHoje: 0,
                    taxaLiberacaoHoje: 0
                },
                producaoPorSetor: [],
                statusExames: []
            };

            // 2. Atendimentos do Dia
            const { data: attendances, error: attError } = await supabase
                .from('lab_attendances')
                .select('id, patient_id, attendance_date')
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

            if (attendanceIds.length > 0) {
                // 3. Exames Solicitados Hoje
                const { data: attExams, error: attExamsError } = await supabase
                    .from('lab_attendance_exams')
                    .select('id, attendance_id, exam_id, sector_id, status, collection_date, collection_time')
                    .eq('tenant_id', tenantId)
                    .in('attendance_id', attendanceIds);

                if (attExamsError) throw attExamsError;

                const examesSolicitados = attExams || [];
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

            return resultData;
        } catch (error) {
            console.error('[LaboratorioDashboardService] Erro ao buscar dados:', error);
            throw error;
        }
    }
}

export const laboratorioDashboardService = new LaboratorioDashboardService();
