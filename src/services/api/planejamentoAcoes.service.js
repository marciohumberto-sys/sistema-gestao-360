import { supabase } from '../../lib/supabase';

// module_id fixo do módulo PLANEJAMENTO_ESTRATEGICO
const MODULE_ID = '2d53a6f6-5638-45bc-a87e-1ab5d88d6134';

// ── Vínculos de Secretarias Participantes ───────────────────────────────────────
export const fetchActionSecretariats = async (actionId) => {
    if (!actionId) return [];
    try {
        const { data, error } = await supabase
            .from('planning_action_secretariats')
            .select('secretariat_id, is_primary')
            .eq('action_id', actionId);
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[planejamentoAcoes] Erro ao buscar secretarias da ação:', err);
        return [];
    }
};

export const syncActionSecretariats = async (tenantId, actionId, primarySecId, secondarySecIds = []) => {
    if (!tenantId || !actionId || !primarySecId) return;
    try {
        const { data: existing } = await supabase
            .from('planning_action_secretariats')
            .select('id, secretariat_id, is_primary')
            .eq('tenant_id', tenantId)
            .eq('action_id', actionId);
            
        const existingList = existing || [];
        
        // Garantir que a principal não esteja duplicada nas secundárias e remover lixo
        const validSecondary = [...new Set(secondarySecIds)].filter(id => id !== primarySecId && id);
        
        const desiredMap = new Map();
        desiredMap.set(primarySecId, true);
        validSecondary.forEach(id => desiredMap.set(id, false));
        
        const upserts = Array.from(desiredMap.entries()).map(([secId, isPrimary]) => ({
            tenant_id: tenantId,
            action_id: actionId,
            secretariat_id: secId,
            is_primary: isPrimary
        }));

        if (upserts.length > 0) {
            const { error: errUpsert } = await supabase
                .from('planning_action_secretariats')
                .upsert(upserts, { onConflict: 'tenant_id, action_id, secretariat_id' });
                
            if (errUpsert) {
                console.error('[planejamentoAcoes] Erro no upsert de vínculos:', errUpsert);
            }
        }
        
        const toDeleteIds = existingList
            .filter(ex => !desiredMap.has(ex.secretariat_id))
            .map(ex => ex.id);
            
        if (toDeleteIds.length > 0) {
            const { error: errDelete } = await supabase
                .from('planning_action_secretariats')
                .delete()
                .in('id', toDeleteIds);
                
            if (errDelete) {
                console.error('[planejamentoAcoes] Erro ao deletar vínculos antigos:', errDelete);
            }
        }
    } catch (err) {
        console.error('[planejamentoAcoes] Falha fatal em syncActionSecretariats:', err);
    }
};

// ── Eixos Estratégicos ────────────────────────────────────────────────────────
export const fetchAxes = async (tenantId) => {
    try {
        const { data, error } = await supabase
            .from('planning_axes')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .eq('is_active', true);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[planejamentoAcoes] Erro ao buscar eixos:', err);
        return [];
    }
};

// ── Primeiro objetivo ativo de um eixo (fallback para objective_id) ───────────
export const fetchFirstObjectiveByAxis = async (tenantId, axisId) => {
    if (!axisId) return null;

    console.log("[Planejamento] Buscando objetivos com:", { tenantId, axisId });

    try {
        const { data, error } = await supabase
            .from('planning_objectives')
            .select('id, title, is_active')
            .eq('tenant_id', tenantId)
            .eq('axis_id', axisId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[Planejamento][fetchFirstObjectiveByAxis] Erro Supabase:', error);
            return null;
        }

        if (!data) {
            console.warn('[Planejamento][fetchFirstObjectiveByAxis] Nenhum objetivo ativo encontrado para os filtros acima.');
        } else {
            console.log('[Planejamento][fetchFirstObjectiveByAxis] Objetivo encontrado:', data);
        }

        return data?.id || null;
    } catch (err) {
        console.error('[Planejamento][fetchFirstObjectiveByAxis] Erro inesperado:', err);
        return null;
    }
};

// Função para buscar múltiplos objetivos (útil para diagnóstico e UX)
export const fetchObjectivesByAxis = async (tenantId, axisId) => {
    if (!axisId) return [];
    
    console.log('[OBJ_SERVICE] tenantId recebido:', tenantId);
    console.log('[OBJ_SERVICE] axisId recebido:', axisId);

    const { data, error } = await supabase
        .from('planning_objectives')
        .select('id, title, axis_id, tenant_id, display_order, is_active')
        .eq('tenant_id', tenantId)
        .eq('axis_id', axisId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    console.log('[OBJ_SERVICE] data:', data);
    console.log('[OBJ_SERVICE] error:', error);

    return data || [];
};

// ── Secretarias ────────────────────────────────────────────────────────────────
export const fetchSecretariats = async (tenantId) => {
    try {
        const { data, error } = await supabase
            .from('secretariats')
            .select('id, name')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[planejamentoAcoes] Erro ao buscar secretarias:', err);
        return [];
    }
};

// ── ID do módulo PLANEJAMENTO_ESTRATEGICO ─────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const fetchModuleId = async () => {
    const { data, error } = await supabase
        .from('system_modules')
        .select('id')
        .eq('key', 'PLANEJAMENTO_ESTRATEGICO')
        .maybeSingle();

    if (error || !data) {
        console.error('[planejamentoAcoes] Módulo PLANEJAMENTO_ESTRATEGICO não encontrado:', error);
        return null;
    }
    return data.id;
};

// ── Listagem de ações com query mínima e segura ──────────────────────────────
export const fetchAcoes = async (tenantId) => {
    console.log('[planejamentoAcoes] --- INICIANDO FETCH ACOES ---');
    console.log('[planejamentoAcoes] Filtros: tenant_id=', tenantId, '| module_id=', MODULE_ID);

    // 1. Query mínima: apenas dados da ação
    const { data: actions, error: errActions } = await supabase
        .from('planning_actions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('module_id', MODULE_ID)
        .order('created_at', { ascending: false });

    if (errActions) {
        console.error('[planejamentoAcoes] Erro na query mínima:', errActions);
        return [];
    }

    const total = actions?.length || 0;
    console.log('[planejamentoAcoes] QUANTIDADE DE AÇÕES RETORNADAS:', total);

    if (total === 0) return [];

    // 3. Buscar secretarias em consulta separada (opcional/enriquecimento)
    let secretariatsMap = new Map();
    try {
        // Precisamos de todas as secretarias para mapear principais e secundárias
        const { data: secs } = await supabase.from('secretariats').select('id, name');
        if (secs) {
            secs.forEach(s => secretariatsMap.set(s.id, s.name));
        }
    } catch (secErr) {
        console.warn('[planejamentoAcoes] Falha ao enriquecer secretarias:', secErr);
    }

    // 4. Buscar eixos em consulta separada
    let axesMap = new Map();
    try {
        const { data: axes } = await supabase
            .from('planning_axes')
            .select('id, name')
            .eq('tenant_id', tenantId);
        if (axes) {
            axes.forEach(ax => axesMap.set(ax.id, ax.name));
        }
    } catch (axErr) {
        console.warn('[planejamentoAcoes] Falha ao buscar eixos:', axErr);
    }

    // 4.5 Buscar objetivos em consulta separada
    let objectivesMap = new Map();
    try {
        const { data: objs } = await supabase
            .from('planning_objectives')
            .select('id, title')
            .eq('tenant_id', tenantId);
        if (objs) {
            objs.forEach(o => objectivesMap.set(o.id, o.title));
        }
    } catch (objErr) {
        console.warn('[planejamentoAcoes] Falha ao buscar objetivos:', objErr);
    }

    // 5. Buscar secretarias participantes (is_primary = false)
    let participantsMap = new Map();
    try {
        const actionIds = actions.map(a => a.id);
        if (actionIds.length > 0) {
            const { data: links } = await supabase
                .from('planning_action_secretariats')
                .select('action_id, secretariat_id')
                .eq('is_primary', false)
                .in('action_id', actionIds);
                
            if (links) {
                links.forEach(l => {
                    const secName = secretariatsMap.get(l.secretariat_id) || 'Desconhecida';
                    if (!participantsMap.has(l.action_id)) participantsMap.set(l.action_id, []);
                    participantsMap.get(l.action_id).push(secName);
                });
            }
        }
    } catch (errLinks) {
        console.warn('[planejamentoAcoes] Falha ao buscar participantes:', errLinks);
    }

    // 5.5 Buscar a data da última atualização manual e contagem de atualizações de cada ação
    let latestUpdateMap = new Map();
    let updatesCountMap = new Map();
    try {
        const { data: updates } = await supabase
            .from('planning_action_updates')
            .select('action_id, created_at')
            .eq('tenant_id', tenantId);
        
        if (updates) {
            updates.forEach(u => {
                const currentStr = latestUpdateMap.get(u.action_id);
                if (!currentStr || new Date(u.created_at) > new Date(currentStr)) {
                    latestUpdateMap.set(u.action_id, u.created_at);
                }
                const count = updatesCountMap.get(u.action_id) || 0;
                updatesCountMap.set(u.action_id, count + 1);
            });
        }
    } catch (errUpdates) {
        console.warn('[planejamentoAcoes] Falha ao buscar atualizações manuais:', errUpdates);
    }

    // 6. Mapeamento final
    return actions.map(a => ({
        id: a.id,
        nome: a.title,
        descricao: a.description || '',
        local: a.neighborhood || '',
        observacoes: a.notes || '',
        secretaria: secretariatsMap.get(a.secretariat_id) || 'Não informada',
        secretariaId: a.secretariat_id,
        secretariaFull: secretariatsMap.get(a.secretariat_id) || '',
        participantes: participantsMap.get(a.id) || [],
        eixo: axesMap.get(a.axis_id) || '',
        eixoId: a.axis_id,
        objective_id: a.objective_id,
        objective_title: objectivesMap.get(a.objective_id) || null,
        status: a.status || 'NAO_INICIADA',
        progresso: a.progress_percent ?? 0,
        prazo: a.due_date || '',
        data_inicio: a.start_date || '',
        responsavel: a.responsible_name || '',
        action_type: a.action_type,
        address_street: a.address_street || '',
        address_number: a.address_number || '',
        address_complement: a.address_complement || '',
        address_district: a.address_district || '',
        address_city: a.address_city || '',
        address_state: a.address_state || '',
        address_zipcode: a.address_zipcode || '',
        address_reference: a.address_reference || '',
        custom_stages: a.custom_stages || null,
        current_stage_index: a.current_stage_index ?? null,
        current_stage_observation: a.current_stage_observation || '',
        latitude: a.latitude || null,
        longitude: a.longitude || null,
        completion_date: a.completion_date || null,
        last_manual_update_at: latestUpdateMap.get(a.id) || null,
        update_count: updatesCountMap.get(a.id) || 0,
        updated_at: a.updated_at,
        created_at: a.created_at
    }));
};

// ── Criar nova ação ───────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
export const createAcao = async (tenantId, formData, axes) => {
    // 1. Validações básicas
    if (!formData.nome?.trim()) throw new Error('O nome da ação é obrigatório.');
    if (!formData.axisId) throw new Error('O eixo estratégico é obrigatório.');
    if (!formData.status) throw new Error('O status é obrigatório.');

    const progress = parseInt(formData.progresso) || 0;
    if (progress < 0 || progress > 100) throw new Error('O progresso deve estar entre 0 e 100.');

    if (formData.prazo && formData.data_inicio && formData.prazo < formData.data_inicio) {
        throw new Error('A data de término não pode ser anterior à data de início.');
    }

    // 2. module_id já conhecido (fixo)
    const moduleId = MODULE_ID;

    // 3. Obter usuário autenticado e escopos para RLS/Permissão
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não foi possível identificar o usuário logado. Refaça o login.");

    // Buscar escopos ativos do usuário para este módulo
    const { data: userScopes, error: scopeErr } = await supabase
        .from('user_access_scopes')
        .select('secretariat_id')
        .eq('user_id', user.id)
        .eq('module_id', moduleId);

    if (scopeErr) {
        console.error('[planejamentoAcoes] Erro ao buscar escopos do usuário:', scopeErr);
    }

    const allowedSecretariatIds = userScopes?.map(s => s.secretariat_id).filter(Boolean) || [];

    // 4. Validar/Ajustar secretaria_id (Garantir que bate com o escopo)
    let finalSecretariatId = formData.secretariatId;

    if (allowedSecretariatIds.length > 0) {
        const isAllowed = allowedSecretariatIds.includes(finalSecretariatId);
        if (!isAllowed) {
            console.warn('[planejamentoAcoes] Secretaria enviada não está no escopo ou vazia. Usando fallback do primeiro escopo ativo.');
            finalSecretariatId = allowedSecretariatIds[0];
        }
    }

    if (!finalSecretariatId) {
        throw new Error('A secretaria é obrigatória e não foi encontrada no seu perfil de acesso.');
    }

    // 5. Obter objetivo fornecido pelo form, ou fallback para o primeiro ativo do eixo
    const objectiveIdFound = formData.objectiveId || await fetchFirstObjectiveByAxis(tenantId, formData.axisId);

    // Lógica defensiva de Conclusão automática para satisfazer a constraint do banco
    let finalStatus = formData.status;
    const isCompleted = finalStatus === 'CONCLUIDA' || progress >= 100;
    if (progress >= 100) {
        finalStatus = 'CONCLUIDA';
    }

    // 6. Montar payload
    const payload = {
        tenant_id: tenantId,
        module_id: moduleId,
        axis_id: formData.axisId,
        objective_id: objectiveIdFound || null,
        secretariat_id: finalSecretariatId,
        created_by: user.id,
        title: formData.nome.trim(),
        description: formData.descricao?.trim() || null,
        status: finalStatus,
        progress_percent: progress,
        start_date: formData.data_inicio || null,
        due_date: formData.prazo || null,
        completion_date: isCompleted ? (formData.completion_date || new Date().toISOString()) : null,
        neighborhood: formData.address_district || formData.local || null,
        notes: formData.observacoes?.trim() || null,
        responsible_name: formData.responsible_name?.trim() || null,
        action_type: formData.action_type || 'PROJETO',
        address_street: formData.address_street?.trim() || null,
        address_number: formData.address_number?.trim() || null,
        address_complement: formData.address_complement?.trim() || null,
        address_district: formData.address_district?.trim() || null,
        address_city: formData.address_city?.trim() || 'Bezerros',
        address_state: formData.address_state?.trim() || 'PE',
        address_zipcode: formData.address_zipcode?.trim() || null,
        address_reference: formData.address_reference?.trim() || null,
        custom_stages: formData.custom_stages || null,
        current_stage_index: formData.current_stage_index ?? null,
        current_stage_observation: formData.current_stage_observation?.trim() || null,
    };

    // LOG DE DIAGNÓSTICO OBRIGATÓRIO
    console.log("=== DIAGNÓSTICO DE CRIAÇÃO DE AÇÃO ===");
    console.log("1. Usuário:", user.id, `(${user.email})`);
    console.log("2. Tenant ID:", tenantId);
    console.log("3. Module ID:", moduleId);
    console.log("4. Escopos Ativos (Secretarias):", allowedSecretariatIds);
    console.log("5. Eixo Estratégico (axis_id):", formData.axisId);
    console.log("6. Objetivo (objective_id):", payload.objective_id);
    console.log("7. Secretaria Final (secretariat_id):", payload.secretariat_id);
    console.log("8. Payload Completo:", payload);
    console.log("=======================================");

    const { data, error } = await supabase
        .from('planning_actions')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('[planejamentoAcoes] Erro Supabase no INSERT:', error);
        
        if (error.message?.includes('row-level security policy') || error.code === '42501') {
            throw new Error("Erro 403: Permissão Negada. O secretariat_id ou tenant_id do payload não condiz com seus escopos ativos no banco.");
        }

        throw new Error(error.message || 'Erro ao salvar ação no banco.');
    }

    // Sincronizar secretarias participantes (garantindo RLS via sync function)
    await syncActionSecretariats(tenantId, data.id, payload.secretariat_id, formData.participantes || []);

    return data;
};

// ── Atualizar ação existente ───────────────────────────────────────────────────
export const updateAcao = async (tenantId, id, formData) => {
    if (!formData.nome?.trim()) throw new Error('O nome da ação é obrigatório.');

    const progress = parseInt(formData.progresso) || 0;
    if (progress < 0 || progress > 100) throw new Error('O progresso deve estar entre 0 e 100.');

    if (formData.prazo && formData.data_inicio && formData.prazo < formData.data_inicio) {
        throw new Error('A data de término não pode ser anterior à data de início.');
    }

    // Lógica defensiva de Conclusão automática para satisfazer a constraint do banco
    let finalStatus = formData.status;
    const isCompleted = finalStatus === 'CONCLUIDA' || progress >= 100;
    if (progress >= 100) {
        finalStatus = 'CONCLUIDA';
    }

    const payload = {
        title: formData.nome.trim(),
        description: formData.descricao?.trim() || null,
        status: finalStatus,
        progress_percent: progress,
        start_date: formData.data_inicio || null,
        due_date: formData.prazo || null,
        completion_date: isCompleted ? (formData.completion_date || new Date().toISOString()) : null,
        neighborhood: formData.address_district || formData.local || null,
        notes: formData.observacoes?.trim() || null,
        responsible_name: formData.responsible_name?.trim() || null,
        action_type: formData.action_type || 'PROJETO',
        address_street: formData.address_street?.trim() || null,
        address_number: formData.address_number?.trim() || null,
        address_complement: formData.address_complement?.trim() || null,
        address_district: formData.address_district?.trim() || null,
        address_city: formData.address_city?.trim() || 'Bezerros',
        address_state: formData.address_state?.trim() || 'PE',
        address_zipcode: formData.address_zipcode?.trim() || null,
        address_reference: formData.address_reference?.trim() || null,
        custom_stages: formData.custom_stages || null,
        current_stage_index: formData.current_stage_index ?? null,
        current_stage_observation: formData.current_stage_observation?.trim() || null,
        ...(formData.axisId && { axis_id: formData.axisId }),
        ...(formData.secretariatId && { secretariat_id: formData.secretariatId }),
        objective_id: formData.objectiveId !== undefined ? formData.objectiveId : null,
    };

    console.log('[planningActions] payload update', payload);

    const { data, error } = await supabase
        .from('planning_actions')
        .update(payload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[planejamentoAcoes] Erro ao atualizar ação:', error);
        throw new Error(error.message || 'Erro ao atualizar ação no banco.');
    }

    // Sincronizar secretarias participantes
    // Atenção: a primarySecId pode vir do formData.secretariatId ou manter a original.
    // formData tem `secretariatId` definido na edição.
    await syncActionSecretariats(tenantId, id, formData.secretariatId, formData.participantes || []);

    return data;
};

// ── Buscar Atualizações (planning_action_updates) ─────────────────────────────
export const fetchAtualizacoes = async (tenantId) => {
    if (!tenantId) return [];
    try {
        const { data: updates, error } = await supabase
            .from('planning_action_updates')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) { console.error('[planejamentoAcoes] Erro ao buscar atualizações:', error); throw error; }
        if (!updates || updates.length === 0) return [];

        const actionIds = [...new Set(updates.map(u => u.action_id).filter(Boolean))];
        let actionsMap = new Map();
        if (actionIds.length > 0) {
            const { data: actions } = await supabase
                .from('planning_actions')
                .select('id, title, secretariat_id, responsible_name')
                .in('id', actionIds);

            const secIds = [...new Set((actions || []).map(a => a.secretariat_id).filter(Boolean))];
            let secMap = new Map();
            if (secIds.length > 0) {
                const { data: secs } = await supabase.from('secretariats').select('id, name').in('id', secIds);
                (secs || []).forEach(s => secMap.set(s.id, s.name));
            }
            (actions || []).forEach(a => actionsMap.set(a.id, { ...a, secretariaNome: secMap.get(a.secretariat_id) || 'Não informada' }));
        }

        // 1. Agrupar atualizações por ação para processamento cronológico local
        const updatesByAction = {};
        updates.forEach(u => {
            if (!updatesByAction[u.action_id]) updatesByAction[u.action_id] = [];
            updatesByAction[u.action_id].push(u);
        });

        // 2. Derivar dinamicamente progresso e status anteriores ordenando por data ascendente (mais antigos primeiro)
        Object.keys(updatesByAction).forEach(actionId => {
            const group = updatesByAction[actionId];
            group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            let lastProg = 0; // Baseline progress
            let lastStatus = 'NAO_INICIADA'; // Baseline status
            
            group.forEach(u => {
                // Injeta metadados temporários comparativos
                u._progressoAnterior = lastProg;
                u._statusAnterior = lastStatus;
                
                // Atualiza acumuladores para a próxima iteração cronológica
                if (u.progress_percent_snapshot !== null && !isNaN(u.progress_percent_snapshot)) {
                    lastProg = u.progress_percent_snapshot;
                }
                if (u.status_snapshot && u.status_snapshot !== '') {
                    lastStatus = u.status_snapshot;
                }
            });
        });

        const derivarTipo = (u) => {
            // Prioridade 1: Mudança de Status efetiva em relação ao ponto anterior do histórico
            if (u.status_snapshot && u.status_snapshot !== u._statusAnterior) {
                return 'Mudança de Status';
            }
            // Prioridade 2: Avanço de Progresso efetivo em relação ao ponto anterior do histórico
            if (u.progress_percent_snapshot !== null && u.progress_percent_snapshot !== u._progressoAnterior) {
                return 'Avanço de Progresso';
            }
            // Fallback: Geral
            return 'Geral';
        };

        return updates.map(u => {
            const acao = actionsMap.get(u.action_id) || {};
            return {
                id: u.id,
                acao: acao.title || 'Ação não encontrada',
                acaoId: u.action_id,
                secretaria: acao.secretariaNome || 'Não informada',
                tipo: u.update_type || derivarTipo(u),
                data: u.created_at,
                update_date: u.update_date || u.created_at,
                responsavel: acao.responsible_name || 'Não informado',
                descricao: u.summary || '',
                details: u.details || '',
                next_steps: u.next_steps || '',
                reference_week: u.reference_week || '',
                progressoAnterior: u._progressoAnterior !== undefined ? u._progressoAnterior : null,
                progressoNovo: u.progress_percent_snapshot ?? null,
                statusAnterior: u._statusAnterior !== undefined ? u._statusAnterior : null,
                statusNovo: u.status_snapshot || null,
                critica: u.is_critical || false,
            };
        });
    } catch (err) {
        console.error('[planejamentoAcoes] Erro inesperado ao buscar atualizações:', err);
        throw err;
    }
};

export const fetchUpdatesByAction = async (tenantId, actionId) => {
    if (!tenantId || !actionId) return [];
    try {
        const { data, error } = await supabase
            .from('planning_action_updates')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('action_id', actionId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[planejamentoAcoes] Erro ao buscar atualizações da ação:', err);
        return [];
    }
};

// ── Criar nova Atualização (planning_action_updates) ──────────────────────────
export const createAtualizacao = async (tenantId, formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não identificado. Refaça o login.');
    if (!formData.acaoId) throw new Error('A ação estratégica é obrigatória.');
    if (!formData.descricao?.trim()) throw new Error('A descrição é obrigatória.');

    // Buscar a secretaria vinculada à ação correspondente para passar no RLS
    const { data: action, error: actionErr } = await supabase
        .from('planning_actions')
        .select('secretariat_id')
        .eq('id', formData.acaoId)
        .single();

    if (actionErr) {
        console.error('[planejamentoAcoes] Erro ao buscar secretaria da ação para atualização:', actionErr);
    }

    const payload = {
        tenant_id: tenantId,
        module_id: MODULE_ID,
        secretariat_id: action?.secretariat_id || null,
        action_id: formData.acaoId,
        summary: formData.descricao.trim(),
        details: formData.details?.trim() || null,
        update_date: formData.update_date || new Date().toISOString(),
        updated_by: user.id,
    };

    if (formData.next_steps) payload.next_steps = formData.next_steps;
    if (formData.reference_week) payload.reference_week = formData.reference_week;

    // Só enviar status_snapshot se não for "Manter atual"
    if (formData.novoStatus && formData.novoStatus !== '') {
        payload.status_snapshot = formData.novoStatus;
    }

    // Só enviar progress_percent_snapshot se foi preenchido
    const progresso = (formData.novoProgresso !== '' && formData.novoProgresso !== null && formData.novoProgresso !== undefined)
        ? parseInt(formData.novoProgresso, 10) : null;
    if (progresso !== null && !isNaN(progresso)) {
        payload.progress_percent_snapshot = progresso;
    }

    console.log('[planejamentoAcoes] Criando atualização:', payload);

    const { error } = await supabase
        .from('planning_action_updates')
        .insert([payload]);

    if (error) {
        console.error('[planejamentoAcoes] Erro ao criar atualização:', error);
        if (error.code === '42501' || error.message?.includes('row-level security')) {
            throw new Error('Permissão negada. Verifique seu acesso ao módulo de Planejamento.');
        }
        throw new Error(error.message || 'Erro ao salvar atualização no banco.');
    }
    return true;
};

// ── Atualizar Atualização Existente (planning_action_updates) ─────────────────
export const updateAtualizacao = async (tenantId, id, formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não identificado. Refaça o login.');
    if (!formData.descricao?.trim()) throw new Error('A descrição é obrigatória.');

    const payload = {
        summary: formData.descricao.trim(),
        updated_by: user.id,
    };

    if (formData.novoStatus !== undefined) {
        payload.status_snapshot = formData.novoStatus === '' ? null : formData.novoStatus;
    }

    if (formData.novoProgresso !== undefined) {
        const progresso = (formData.novoProgresso !== '' && formData.novoProgresso !== null)
            ? parseInt(formData.novoProgresso, 10) : null;
        payload.progress_percent_snapshot = (progresso !== null && !isNaN(progresso)) ? progresso : null;
    }

    if (formData.details !== undefined) payload.details = formData.details || null;
    if (formData.next_steps !== undefined) payload.next_steps = formData.next_steps || null;
    if (formData.reference_week !== undefined) {
        payload.reference_week = formData.reference_week && formData.reference_week.trim() !== '' ? formData.reference_week : null;
    }
    if (formData.update_date !== undefined) {
        payload.update_date = formData.update_date && formData.update_date.trim() !== '' ? formData.update_date : null;
    }

    console.log('[planejamentoAcoes] Atualizando registro:', payload);

    const { error } = await supabase
        .from('planning_action_updates')
        .update(payload)
        .eq('id', id)
        .eq('tenant_id', tenantId);

    if (error) {
        console.error('[planejamentoAcoes] Erro ao atualizar registro de atualização:', error);
        throw new Error(error.message || 'Erro ao atualizar no banco.');
    }
    return true;
};

// ── Excluir Atualização Existente (planning_action_updates) ───────────────────
export const deleteAtualizacao = async (tenantId, id) => {
    if (!tenantId || !id) throw new Error('Parâmetros inválidos para exclusão.');

    const { error } = await supabase
        .from('planning_action_updates')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

    if (error) {
        console.error('[planejamentoAcoes] Erro ao excluir registro de atualização:', error);
        throw new Error(error.message || 'Erro ao excluir atualização no banco.');
    }
    return true;
};

// ── Histórico de Alterações (planning_action_history) ─────────────────────────
// Fire-and-forget: erros são logados mas nunca bloqueiam o save da ação.
export const recordActionHistory = async (tenantId, actionId, events) => {
    if (!tenantId || !actionId || !Array.isArray(events) || events.length === 0) return;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        const rows = events.map(ev => ({
            tenant_id:       tenantId,
            action_id:       actionId,
            user_id:         userId,
            event_type:      ev.event_type,
            field_changed:   ev.field_changed,
            old_value:       ev.old_value       ?? null,
            new_value:       ev.new_value       ?? null,
            old_stage_index: ev.old_stage_index ?? null,
            new_stage_index: ev.new_stage_index ?? null,
            description:     ev.description     || null,
            observations:    ev.observations    || null,
        }));

        const { error } = await supabase
            .from('planning_action_history')
            .insert(rows);

        if (error) {
            console.warn('[planejamentoAcoes] Falha ao registrar histórico (não bloqueia save):', error);
        }
    } catch (err) {
        console.warn('[planejamentoAcoes] Falha ao registrar histórico:', err);
    }
};

// ── Excluir Ação Estratégica (cascata manual para proteger integridade) ───────
export const deleteAcao = async (tenantId, id) => {
    console.log('[SERVICE_DELETE_ACAO] Início do fluxo. Tenant:', tenantId, 'ID:', id);
    if (!tenantId || !id) {
        console.error('[SERVICE_DELETE_ACAO] Parâmetros inválidos fornecidos.');
        throw new Error('Parâmetros inválidos para exclusão no service.');
    }

    // 0. Registrar em planning_action_deletions ANTES de apagar
    console.log('[SERVICE_DELETE_ACAO] Etapa 0/5: Registrando log de exclusão em planning_action_deletions...');
    try {
        // 0.1 Buscar dados mínimos da ação
        const { data: acaoInfo, error: errAcao } = await supabase
            .from('planning_actions')
            .select('title')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (errAcao) throw errAcao;

        // 0.2 Buscar usuário logado
        const { data: { user }, error: errUser } = await supabase.auth.getUser();
        if (errUser || !user) throw new Error('Usuário não autenticado.');

        let deletedByName = 'Usuário não identificado';
        if (user.user_metadata?.full_name) {
            deletedByName = user.user_metadata.full_name;
        } else if (user.user_metadata?.display_name) {
            deletedByName = user.user_metadata.display_name;
        } else if (user.user_metadata?.name) {
            deletedByName = user.user_metadata.name;
        } else if (user.user_metadata?.profile_name) {
            deletedByName = user.user_metadata.profile_name;
        } else if (user.email) {
            deletedByName = user.email;
        }

        // 0.3 Inserir log
        const logPayload = {
            tenant_id: tenantId,
            action_title: acaoInfo?.title || 'Ação sem título',
            deleted_by: user.id,
            deleted_by_name: deletedByName,
            deleted_at: new Date().toISOString()
        };

        const { error: errLog } = await supabase
            .from('planning_action_deletions')
            .insert([logPayload]);

        if (errLog) {
            throw errLog;
        }
        console.log('[SERVICE_DELETE_ACAO] Etapa 0 OK. Histórico registrado com sucesso.');
    } catch (errReg) {
        console.error('[SERVICE_DELETE_ACAO] FALHA na Etapa 0 (Log de Exclusão):', errReg);
        throw new Error(`Falha ao registrar histórico de exclusão: ${errReg.message}. A ação NÃO foi apagada.`);
    }

    // 1. Limpar vínculos de secretarias participantes
    console.log('[SERVICE_DELETE_ACAO] Etapa 1/5: Removendo vínculos de secretarias participantes (planning_action_secretariats)...');
    const { error: errSecs } = await supabase
        .from('planning_action_secretariats')
        .delete()
        .eq('action_id', id)
        .eq('tenant_id', tenantId);

    if (errSecs) {
        console.error('[SERVICE_DELETE_ACAO] FALHA na Etapa 1:', errSecs);
        throw new Error(`Falha ao limpar secretarias participantes: ${errSecs.message}`);
    }
    console.log('[SERVICE_DELETE_ACAO] Etapa 1 OK.');

    // 2. Limpar histórico de alterações
    console.log('[SERVICE_DELETE_ACAO] Etapa 2/5: Removendo histórico de alterações (planning_action_history)...');
    const { error: errHist } = await supabase
        .from('planning_action_history')
        .delete()
        .eq('action_id', id)
        .eq('tenant_id', tenantId);

    if (errHist) {
        console.error('[SERVICE_DELETE_ACAO] FALHA na Etapa 2:', errHist);
        throw new Error(`Falha ao limpar histórico de alterações: ${errHist.message}`);
    }
    console.log('[SERVICE_DELETE_ACAO] Etapa 2 OK.');

    // 3. Limpar atualizações da ação
    console.log('[SERVICE_DELETE_ACAO] Etapa 3/5: Removendo atualizações da ação (planning_action_updates)...');
    const { error: errUpdates } = await supabase
        .from('planning_action_updates')
        .delete()
        .eq('action_id', id)
        .eq('tenant_id', tenantId);

    if (errUpdates) {
        console.error('[SERVICE_DELETE_ACAO] FALHA na Etapa 3:', errUpdates);
        throw new Error(`Falha ao limpar atualizações da ação: ${errUpdates.message}`);
    }
    console.log('[SERVICE_DELETE_ACAO] Etapa 3 OK.');

    // 4. Limpar entraves vinculados
    console.log('[SERVICE_DELETE_ACAO] Etapa 4/5: Removendo entraves vinculados (planning_action_issues)...');
    const { error: errIssues } = await supabase
        .from('planning_action_issues')
        .delete()
        .eq('action_id', id)
        .eq('tenant_id', tenantId);

    if (errIssues) {
        console.error('[SERVICE_DELETE_ACAO] FALHA na Etapa 4:', errIssues);
        throw new Error(`Falha ao limpar entraves vinculados: ${errIssues.message}`);
    }
    console.log('[SERVICE_DELETE_ACAO] Etapa 4 OK.');

    // 5. Excluir a ação principal
    console.log('[SERVICE_DELETE_ACAO] Etapa 5/5: Excluindo a ação estratégica principal (planning_actions)...');
    const { data: delData, error } = await supabase
        .from('planning_actions')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select();

    if (error) {
        console.error('[SERVICE_DELETE_ACAO] FALHA na Etapa 5 (Ação Principal):', error);
        if (error.code === '42501' || error.message?.includes('row-level security')) {
            throw new Error('Permissão negada no banco de dados (RLS). Você não tem autorização para excluir esta ação.');
        }
        throw new Error(`Erro ao excluir ação principal: ${error.message}`);
    }
    
    if (!delData || delData.length === 0) {
        console.warn('[SERVICE_DELETE_ACAO] AVISO CRÍTICO: A query de delete finalizou com sucesso técnico, porém NENHUMA linha foi afetada na tabela planning_actions. Isso indica quase sempre um bloqueio na política de RLS (Row Level Security) no Supabase que ignorou a exclusão silenciosamente.');
    }

    console.log('[SERVICE_DELETE_ACAO] Fluxo finalizado com sucesso total para o ID:', id);
    return true;
};

// ── Buscar Histórico de Exclusões (planning_action_deletions) ─────────────────
export const fetchActionDeletions = async (tenantId) => {
    if (!tenantId) return [];
    try {
        const { data, error } = await supabase
            .from('planning_action_deletions')
            .select('id, action_title, deleted_by, deleted_by_name, deleted_at')
            .eq('tenant_id', tenantId)
            .order('deleted_at', { ascending: false });

        if (error) {
            console.error('[planejamentoAcoes] Erro ao buscar exclusões:', error);
            throw error;
        }
        return data || [];
    } catch (err) {
        console.error('[planejamentoAcoes] Erro inesperado ao buscar exclusões:', err);
        return [];
    }
};
