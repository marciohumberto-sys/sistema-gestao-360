import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Helper interno: formata erros do Supabase em mensagem legível
// ─────────────────────────────────────────────────────────────────────────────
function formatarErroLaboratorio(error, contexto = '') {
    if (!error) return 'Erro desconhecido.';
    const parts = [];
    if (error.message) parts.push(error.message);
    if (error.details && error.details !== error.message) parts.push(`Detalhes: ${error.details}`);
    if (error.hint) parts.push(`Dica: ${error.hint}`);
    if (error.code) parts.push(`Código: ${error.code}`);
    const base = parts.length > 0 ? parts.join(' | ') : String(error);
    return contexto ? `[${contexto}] ${base}` : base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de classificação de mapa
// ─────────────────────────────────────────────────────────────────────────────
const MAP_STATUS = {
    SEM_MAPA: 'SEM_MAPA',
    MAPA_PENDENTE: 'MAPA_PENDENTE',
    MAPA_IMPRESSO: 'MAPA_IMPRESSO',
};

const CHUNK_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: particiona array em chunks seguros para IN queries
// ─────────────────────────────────────────────────────────────────────────────
function chunked(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: verifica se um parâmetro de resultado tem valor preenchido.
// Zero numérico é considerado preenchido.
// ─────────────────────────────────────────────────────────────────────────────
function isValueFilled(value_numeric, value_text, observation) {
    if (value_numeric !== null && value_numeric !== undefined && value_numeric !== '') {
        return true;
    }
    if (typeof value_text === 'string' && value_text.trim() !== '') {
        return true;
    }
    if (typeof observation === 'string' && observation.trim() !== '') {
        return true;
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: motivo amigável quando canCancel = false
// ─────────────────────────────────────────────────────────────────────────────
function resolveCancelBlockedReason({
    requestStatus,
    resultStatus,
    filledValueCount,
    generalObservation,
    typedBy,
    typedAt,
    mapStatus,
}) {
    if (resultStatus === 'LIBERADO') return 'Resultado já liberado.';
    if (resultStatus === 'CONFERIDO') return 'Resultado já conferido.';
    if (resultStatus === 'CANCELADO') return 'Resultado já cancelado.';
    if (requestStatus !== 'SOLICITADO') return 'Status da solicitação incompatível.';
    if (resultStatus !== 'PENDENTE') return 'Resultado já digitado.';
    if (filledValueCount > 0) return 'Existem valores preenchidos.';
    if (typeof generalObservation === 'string' && generalObservation.trim() !== '') {
        return 'Existe observação geral preenchida.';
    }
    if (typedBy || typedAt) return 'Resultado já foi iniciado por um digitador.';
    if (mapStatus === MAP_STATUS.MAPA_PENDENTE) return 'Exame incluído em mapa pendente de impressão.';
    return 'Status incompatível com cancelamento.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Classe principal
// ─────────────────────────────────────────────────────────────────────────────
class LaboratorioGerenciarExamesService {

    // ─────────────────────────────────────────────────────────────────────────
    // Passo 1: busca as solicitações do atendimento em lab_attendance_exams
    // ─────────────────────────────────────────────────────────────────────────
    async _buscarSolicitacoes(attendanceId, tenantId) {
        const { data, error } = await supabase
            .from('lab_attendance_exams')
            .select(`
                id,
                tenant_id,
                attendance_id,
                exam_id,
                sector_id,
                collection_date,
                collection_time,
                status,
                observations,
                created_by,
                updated_by,
                created_at,
                updated_at
            `)
            .eq('attendance_id', attendanceId)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(formatarErroLaboratorio(error, 'buscarSolicitacoes'));
        }

        return data || [];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Passo 2: busca resultados pelos attendance_exam_id em chunks
    // ─────────────────────────────────────────────────────────────────────────
    async _buscarResultados(attendanceExamIds, tenantId) {
        if (!attendanceExamIds || attendanceExamIds.length === 0) return [];

        const allResults = [];
        for (const chunk of chunked(attendanceExamIds, CHUNK_SIZE)) {
            const { data, error } = await supabase
                .from('lab_results')
                .select(`
                    id,
                    tenant_id,
                    attendance_id,
                    attendance_exam_id,
                    patient_id,
                    exam_id,
                    status,
                    general_observation,
                    typed_by,
                    typed_at,
                    checked_by,
                    checked_at,
                    released_by,
                    released_at,
                    cancelled_by,
                    cancelled_at,
                    cancellation_reason,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
                `)
                .in('attendance_exam_id', chunk)
                .eq('tenant_id', tenantId);

            if (error) {
                throw new Error(formatarErroLaboratorio(error, 'buscarResultados'));
            }
            if (data) allResults.push(...data);
        }
        return allResults;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Passo 3: busca valores e calcula contadores por result_id
    // ─────────────────────────────────────────────────────────────────────────
    async _buscarValores(resultIds) {
        if (!resultIds || resultIds.length === 0) return {};

        const allValues = [];
        for (const chunk of chunked(resultIds, CHUNK_SIZE)) {
            const { data, error } = await supabase
                .from('lab_result_values')
                .select('result_id, parameter_id, value_text, value_numeric, observation')
                .in('result_id', chunk);

            if (error) {
                throw new Error(formatarErroLaboratorio(error, 'buscarValores'));
            }
            if (data) allValues.push(...data);
        }

        const byResultId = {};
        for (const v of allValues) {
            if (!byResultId[v.result_id]) {
                byResultId[v.result_id] = { parameterCount: 0, filledValueCount: 0 };
            }
            byResultId[v.result_id].parameterCount += 1;
            if (isValueFilled(v.value_numeric, v.value_text, v.observation)) {
                byResultId[v.result_id].filledValueCount += 1;
            }
        }
        return byResultId;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Passo 4: busca dados dos exames e setores correspondentes
    // ─────────────────────────────────────────────────────────────────────────
    async _buscarExamesESetores(examIds, tenantId) {
        if (!examIds || examIds.length === 0) return { examesMap: {}, setoresMap: {} };

        const allExams = [];
        for (const chunk of chunked(examIds, CHUNK_SIZE)) {
            const { data, error } = await supabase
                .from('lab_exams')
                .select('id, tenant_id, code, name, sector_id, is_active')
                .in('id', chunk)
                .eq('tenant_id', tenantId);

            if (error) {
                throw new Error(formatarErroLaboratorio(error, 'buscarExames'));
            }
            if (data) allExams.push(...data);
        }

        const examesMap = Object.fromEntries(allExams.map(e => [e.id, e]));

        const sectorIds = [...new Set(allExams.map(e => e.sector_id).filter(Boolean))];
        const setoresMap = {};

        if (sectorIds.length > 0) {
            for (const chunk of chunked(sectorIds, CHUNK_SIZE)) {
                const { data: sectData, error: sectError } = await supabase
                    .from('lab_exam_sectors')
                    .select('id, tenant_id, code, name, is_active')
                    .in('id', chunk)
                    .eq('tenant_id', tenantId);

                if (sectError) {
                    throw new Error(formatarErroLaboratorio(sectError, 'buscarSetores'));
                }
                if (sectData) {
                    for (const s of sectData) {
                        setoresMap[s.id] = s;
                    }
                }
            }
        }

        return { examesMap, setoresMap };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Passo 5: busca vínculo com mapas via lab_map_batch_items
    // Vínculo ativo: released_at IS NULL e lote PENDING ou PRINTED.
    // Tabela confirmada no banco — qualquer erro é lançado normalmente.
    // Múltiplos vínculos ativos para o mesmo attendance_exam_id são
    // detectados como inconsistência — o banco possui proteção contra isso.
    // ─────────────────────────────────────────────────────────────────────────
    async _buscarVinculoMapas(attendanceExamIds, tenantId) {
        if (!attendanceExamIds || attendanceExamIds.length === 0) return {};

        const allItems = [];

        for (const chunk of chunked(attendanceExamIds, CHUNK_SIZE)) {
            const { data, error } = await supabase
                .from('lab_map_batch_items')
                .select('attendance_exam_id, batch_id, released_at')
                .in('attendance_exam_id', chunk)
                .is('released_at', null);

            if (error) {
                throw new Error(formatarErroLaboratorio(error, 'buscarVinculoMapas'));
            }
            if (data) allItems.push(...data);
        }

        if (allItems.length === 0) return {};

        const batchIds = [...new Set(allItems.map(i => i.batch_id).filter(Boolean))];
        const batchesMap = {};

        if (batchIds.length > 0) {
            for (const chunk of chunked(batchIds, CHUNK_SIZE)) {
                const { data: batchData, error: batchError } = await supabase
                    .from('lab_map_batches')
                    .select('id, tenant_id, status, reference_date, generated_at, printed_at')
                    .in('id', chunk)
                    .eq('tenant_id', tenantId);

                if (batchError) {
                    throw new Error(formatarErroLaboratorio(batchError, 'buscarLotes'));
                }
                if (batchData) {
                    for (const b of batchData) batchesMap[b.id] = b;
                }
            }
        }

        // Agrupa vínculos ativos por attendance_exam_id
        // Vínculo ativo = item com released_at IS NULL + lote PENDING ou PRINTED
        const activeByAEId = {};
        for (const item of allItems) {
            const aeId = item.attendance_exam_id;
            const batch = batchesMap[item.batch_id];

            // Lote cancelado ou não encontrado: não constitui vínculo ativo
            if (!batch || batch.status === 'CANCELED') continue;

            let mapStatus;
            if (batch.status === 'PENDING') mapStatus = MAP_STATUS.MAPA_PENDENTE;
            else if (batch.status === 'PRINTED') mapStatus = MAP_STATUS.MAPA_IMPRESSO;
            else continue; // status inesperado: ignorar

            if (!activeByAEId[aeId]) {
                activeByAEId[aeId] = [];
            }
            activeByAEId[aeId].push({ mapStatus, mapBatchId: batch.id, mapPrintedAt: batch.printed_at || null });
        }

        const result = {};
        for (const [aeId, vinculos] of Object.entries(activeByAEId)) {
            if (vinculos.length > 1) {
                // Múltiplos vínculos ativos: situação inesperada — banco possui constraint contra isso.
                // Sinalizar como inconsistência para que _classificarPar coloque o registro em legacyIssues.
                result[aeId] = {
                    mapStatus: null,
                    mapBatchId: null,
                    mapPrintedAt: null,
                    multipleActiveBatches: true,
                    multipleActiveBatchIds: vinculos.map(v => v.mapBatchId),
                };
            } else {
                result[aeId] = { ...vinculos[0], multipleActiveBatches: false, multipleActiveBatchIds: [] };
            }
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Passo 6: busca histórico de status em lab_result_status_history
    // Tabela confirmada no banco — qualquer erro é lançado normalmente.
    // ─────────────────────────────────────────────────────────────────────────
    async _buscarHistorico(resultIds) {
        if (!resultIds || resultIds.length === 0) return {};

        const allHistory = [];

        for (const chunk of chunked(resultIds, CHUNK_SIZE)) {
            const { data, error } = await supabase
                .from('lab_result_status_history')
                .select('result_id, previous_status, new_status, action, notes, created_by, created_at')
                .in('result_id', chunk)
                .order('created_at', { ascending: true });

            if (error) {
                throw new Error(formatarErroLaboratorio(error, 'buscarHistorico'));
            }
            if (data) allHistory.push(...data);
        }

        const byResultId = {};
        for (const h of allHistory) {
            if (!byResultId[h.result_id]) {
                byResultId[h.result_id] = { entries: [], hasCancelamentoExame: false };
            }
            byResultId[h.result_id].entries.push(h);
            if (String(h.action || '').toUpperCase() === 'CANCELAMENTO_EXAME') {
                byResultId[h.result_id].hasCancelamentoExame = true;
            }
        }

        return byResultId;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Classificação de um par (solicitação, resultado)
    // ─────────────────────────────────────────────────────────────────────────
    _classificarPar({ solicitacao, resultado, valoresInfo, mapaInfo, historicoInfo, exame, setor }) {
        const requestStatus = String(solicitacao.status || '').toUpperCase();
        const resultStatus = resultado ? String(resultado.status || '').toUpperCase() : null;

        const parameterCount = valoresInfo?.parameterCount || 0;
        const filledValueCount = valoresInfo?.filledValueCount || 0;
        const hasFilledValues = filledValueCount > 0;

        // Detecta múltiplos vínculos ativos — situação inesperada que vai para legacyIssues
        const multipleActiveBatches = mapaInfo?.multipleActiveBatches || false;
        const mapStatus = multipleActiveBatches ? null : (mapaInfo?.mapStatus || MAP_STATUS.SEM_MAPA);
        const mapBatchId = mapaInfo?.mapBatchId || null;
        const mapPrintedAt = mapaInfo?.mapPrintedAt || null;

        const hasCancelamentoExame = historicoInfo?.hasCancelamentoExame || false;
        const historicoEntries = historicoInfo?.entries || [];

        const base = {
            attendanceExamId: solicitacao.id,
            examId: solicitacao.exam_id,
            resultId: resultado?.id || null,
            requestStatus,
            sectorId: solicitacao.sector_id || null,
            collectionDate: solicitacao.collection_date || null,
            collectionTime: solicitacao.collection_time || null,
            requestObservations: solicitacao.observations || null,
            requestCreatedAt: solicitacao.created_at || null,
            examCode: exame?.code || null,
            examName: exame?.name || null,
            examIsActive: exame?.is_active ?? null,
            sectorCode: setor?.code || null,
            sectorName: setor?.name || null,
            resultStatus,
            generalObservation: resultado?.general_observation || null,
            typedBy: resultado?.typed_by || null,
            typedAt: resultado?.typed_at || null,
            checkedBy: resultado?.checked_by || null,
            checkedAt: resultado?.checked_at || null,
            releasedBy: resultado?.released_by || null,
            releasedAt: resultado?.released_at || null,
            cancelledBy: resultado?.cancelled_by || null,
            cancelledAt: resultado?.cancelled_at || null,
            cancellationReason: resultado?.cancellation_reason || null,
            parameterCount,
            filledValueCount,
            hasFilledValues,
            mapStatus,
            mapBatchId,
            mapPrintedAt,
            multipleActiveBatches,
            multipleActiveBatchIds: mapaInfo?.multipleActiveBatchIds || [],
            hasCancelamentoExame,
            historico: historicoEntries,
        };

        // ── Múltiplos vínculos ativos de mapa: sempre legacyIssues ──
        if (multipleActiveBatches) {
            const issueReason = 'Múltiplos vínculos ativos de mapa para o mesmo exame. Exige revisão manual.';
            return {
                tipo: 'legadoInconsistente',
                ...base,
                issueReason,
                canCancel: false,
                canRestore: false,
                cancelBlockedReason: issueReason,
                restoreBlockedReason: 'Registro exige revisão manual.',
            };
        }

        // ── Cancelamento CONSISTENTE ──
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
            // canRestore = true somente quando não há mapa pendente
            const podeRestaurar = mapStatus !== MAP_STATUS.MAPA_PENDENTE;
            const restoreBlockedReason = podeRestaurar ? null : 'Exame em mapa pendente.';

            return {
                tipo: 'cancelado',
                ...base,
                canCancel: false,
                cancelBlockedReason: 'Exame cancelado.',
                canRestore: podeRestaurar,
                restoreBlockedReason,
                issueReason: null,
            };
        }

        // ── Registro LEGADO INCONSISTENTE ──
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
            let issueReason = 'Registro inconsistente.';
            if (!resultado) {
                issueReason = 'Solicitação sem resultado vinculado.';
            } else if (resultStatus === 'CANCELADO' && requestStatus !== 'CANCELADO') {
                issueReason = 'Resultado cancelado, mas solicitação permanece ativa.';
            } else if (requestStatus === 'CANCELADO' && resultStatus !== 'CANCELADO') {
                issueReason = 'Solicitação cancelada, mas resultado não está cancelado.';
            } else if (requestStatus === 'CANCELADO' && resultStatus === 'CANCELADO') {
                if (!resultado?.cancelled_by) {
                    issueReason = 'Cancelamento sem cancelled_by registrado.';
                } else if (!resultado?.cancelled_at) {
                    issueReason = 'Cancelamento sem cancelled_at registrado.';
                } else if (!resultado?.cancellation_reason || resultado.cancellation_reason.trim() === '') {
                    issueReason = 'Cancelamento sem motivo (cancellation_reason) registrado.';
                } else if (!hasCancelamentoExame) {
                    issueReason = 'Cancelamento sem histórico CANCELAMENTO_EXAME registrado.';
                }
            }

            return {
                tipo: 'legadoInconsistente',
                ...base,
                issueReason,
                canCancel: false,
                canRestore: false,
                cancelBlockedReason: issueReason,
                restoreBlockedReason: 'Registro exige revisão manual.',
            };
        }

        // ── Exame ATIVO ──
        const podeSerCancelado = (
            requestStatus === 'SOLICITADO' &&
            resultStatus === 'PENDENTE' &&
            filledValueCount === 0 &&
            (!resultado?.general_observation || String(resultado.general_observation).trim() === '') &&
            !resultado?.typed_by &&
            !resultado?.typed_at &&
            mapStatus !== MAP_STATUS.MAPA_PENDENTE
        );

        const cancelBlockedReason = podeSerCancelado
            ? null
            : resolveCancelBlockedReason({
                requestStatus,
                resultStatus,
                filledValueCount,
                generalObservation: resultado?.general_observation,
                typedBy: resultado?.typed_by,
                typedAt: resultado?.typed_at,
                mapStatus,
            });

        return {
            tipo: 'ativo',
            ...base,
            canCancel: podeSerCancelado,
            cancelBlockedReason,
            canRestore: false,
            restoreBlockedReason: null,
            issueReason: null,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Função pública principal
    // Retorna activeExams, cancelledExams, legacyIssues, counts
    // ─────────────────────────────────────────────────────────────────────────
    async listarExamesDoAtendimento(attendanceId, tenantId) {
        if (!attendanceId) {
            throw new Error('[LaboratorioGerenciarExamesService] attendanceId é obrigatório.');
        }
        if (!tenantId) {
            throw new Error('[LaboratorioGerenciarExamesService] tenantId é obrigatório.');
        }

        console.debug('[LaboratorioGerenciarExamesService] listarExamesDoAtendimento', { attendanceId, tenantId });

        const solicitacoes = await this._buscarSolicitacoes(attendanceId, tenantId);

        if (solicitacoes.length === 0) {
            return {
                activeExams: [],
                cancelledExams: [],
                legacyIssues: [],
                counts: { active: 0, cancelled: 0, legacyIssues: 0 },
            };
        }

        const attendanceExamIds = solicitacoes.map(s => s.id);
        const examIds = [...new Set(solicitacoes.map(s => s.exam_id).filter(Boolean))];

        const resultados = await this._buscarResultados(attendanceExamIds, tenantId);
        const resultadosByAEId = Object.fromEntries(resultados.map(r => [r.attendance_exam_id, r]));
        const resultIds = resultados.map(r => r.id).filter(Boolean);

        const valoresByResultId = await this._buscarValores(resultIds);
        const { examesMap, setoresMap } = await this._buscarExamesESetores(examIds, tenantId);
        const mapaByAEId = await this._buscarVinculoMapas(attendanceExamIds, tenantId);
        const historicoByResultId = await this._buscarHistorico(resultIds);

        const activeExams = [];
        const cancelledExams = [];
        const legacyIssues = [];

        for (const sol of solicitacoes) {
            const resultado = resultadosByAEId[sol.id] || null;
            const resultId = resultado?.id || null;
            const exame = examesMap[sol.exam_id] || null;
            const sectorId = exame?.sector_id || sol.sector_id || null;
            const setor = sectorId ? (setoresMap[sectorId] || null) : null;
            const valoresInfo = resultId ? (valoresByResultId[resultId] || null) : null;
            const mapaInfo = mapaByAEId[sol.id] || { mapStatus: MAP_STATUS.SEM_MAPA, mapBatchId: null, mapPrintedAt: null };
            const historicoInfo = resultId ? (historicoByResultId[resultId] || null) : null;

            const classificado = this._classificarPar({
                solicitacao: sol,
                resultado,
                valoresInfo,
                mapaInfo,
                historicoInfo,
                exame,
                setor,
            });

            if (classificado.tipo === 'cancelado') {
                cancelledExams.push(classificado);
            } else if (classificado.tipo === 'legadoInconsistente') {
                legacyIssues.push(classificado);
            } else {
                activeExams.push(classificado);
            }
        }

        return {
            activeExams,
            cancelledExams,
            legacyIssues,
            counts: {
                active: activeExams.length,
                cancelled: cancelledExams.length,
                legacyIssues: legacyIssues.length,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Função pública: exames disponíveis para inclusão
    // Não cruza com os exames do atendimento — isso fica no modal
    // ─────────────────────────────────────────────────────────────────────────
    async listarExamesDisponiveis(tenantId) {
        if (!tenantId) {
            throw new Error('[LaboratorioGerenciarExamesService] tenantId é obrigatório.');
        }

        const { data, error } = await supabase
            .from('lab_exams')
            .select(`
                id,
                code,
                name,
                sector_id,
                lab_exam_sectors ( id, code, name, is_active )
            `)
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            throw new Error(formatarErroLaboratorio(error, 'listarExamesDisponiveis'));
        }

        return (data || []).map(ex => ({
            id: ex.id,
            code: ex.code,
            name: ex.name,
            sectorId: ex.sector_id || null,
            sectorCode: ex.lab_exam_sectors?.code || null,
            sectorName: ex.lab_exam_sectors?.name || null,
        }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Função pública: adiciona exames ao atendimento via RPC transacional
    // ─────────────────────────────────────────────────────────────────────────
    async adicionarExamesAoAtendimento(attendanceId, examIds) {
        if (!attendanceId) {
            throw new Error('[LaboratorioGerenciarExamesService] attendanceId é obrigatório.');
        }
        if (!Array.isArray(examIds) || examIds.length === 0) {
            throw new Error('[LaboratorioGerenciarExamesService] examIds deve ser um array não vazio.');
        }

        // Sanitização: remove IDs nulos/vazios e duplicidades
        const sanitizedExamIds = [...new Set(examIds.filter(id => id && typeof id === 'string' && id.trim() !== ''))];

        if (sanitizedExamIds.length === 0) {
            throw new Error('[LaboratorioGerenciarExamesService] Nenhum exame válido informado para inclusão.');
        }

        console.debug('[LaboratorioGerenciarExamesService] adicionarExamesAoAtendimento', {
            attendanceId,
            examIdsCount: sanitizedExamIds.length
        });

        const { data, error } = await supabase.rpc('rpc_lab_add_exams_to_attendance', {
            p_attendance_id: attendanceId,
            p_exam_ids: sanitizedExamIds
        });

        if (error) {
            throw new Error(formatarErroLaboratorio(error, 'adicionarExamesAoAtendimento'));
        }

        return data;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Função pública: cancela exame do atendimento via RPC segura
    // ─────────────────────────────────────────────────────────────────────────
    async cancelarExameDoAtendimento(attendanceExamId, reason) {
        if (!attendanceExamId || typeof attendanceExamId !== 'string' || attendanceExamId.trim() === '') {
            throw new Error('[LaboratorioGerenciarExamesService] attendanceExamId é obrigatório.');
        }

        const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
        if (!trimmedReason) {
            throw new Error('O motivo do cancelamento é obrigatório.');
        }
        if (trimmedReason.length < 5) {
            throw new Error('O motivo do cancelamento deve conter no mínimo 5 caracteres.');
        }
        if (trimmedReason.length > 500) {
            throw new Error('O motivo do cancelamento não pode exceder 500 caracteres.');
        }

        console.debug('[LaboratorioGerenciarExamesService] cancelarExameDoAtendimento', {
            attendanceExamId,
            reasonLength: trimmedReason.length
        });

        const { data, error } = await supabase.rpc('rpc_lab_cancel_attendance_exam', {
            p_attendance_exam_id: attendanceExamId.trim(),
            p_reason: trimmedReason
        });

        if (error) {
            const err = new Error(formatarErroLaboratorio(error, 'cancelarExameDoAtendimento'));
            err.hint = error.hint;
            err.details = error.details;
            err.code = error.code;
            throw err;
        }

        return data;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Função pública: restaura exame cancelado do atendimento via RPC segura
    // ─────────────────────────────────────────────────────────────────────────
    async restaurarExameDoAtendimento(attendanceExamId) {
        if (!attendanceExamId || typeof attendanceExamId !== 'string' || attendanceExamId.trim() === '') {
            throw new Error('[LaboratorioGerenciarExamesService] attendanceExamId é obrigatório.');
        }

        console.debug('[LaboratorioGerenciarExamesService] restaurarExameDoAtendimento', {
            attendanceExamId: attendanceExamId.trim()
        });

        const { data, error } = await supabase.rpc('rpc_lab_restore_attendance_exam', {
            p_attendance_exam_id: attendanceExamId.trim()
        });

        if (error) {
            const err = new Error(formatarErroLaboratorio(error, 'restaurarExameDoAtendimento'));
            err.hint = error.hint;
            err.details = error.details;
            err.code = error.code;
            throw err;
        }

        return data;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportações
// ─────────────────────────────────────────────────────────────────────────────
export const laboratorioGerenciarExamesService = new LaboratorioGerenciarExamesService();

export { formatarErroLaboratorio, MAP_STATUS };
