import { supabase } from '../../lib/supabase';

// module_id fixo do módulo PLANEJAMENTO_ESTRATEGICO
const MODULE_ID = '2d53a6f6-5638-45bc-a87e-1ab5d88d6134';

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
    
    try {
        const { data, error } = await supabase
            .from('planning_objectives')
            .select('id, title, is_active')
            .eq('tenant_id', tenantId)
            .eq('axis_id', axisId);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[planejamentoAcoes] Erro ao buscar objetivos:', err);
        return [];
    }
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

    // 2. Buscar secretarias em consulta separada (opcional/enriquecimento)
    let secretariatsMap = new Map();
    try {
        const secIds = [...new Set(actions.map(a => a.secretariat_id).filter(Boolean))];
        if (secIds.length > 0) {
            const { data: secs } = await supabase
                .from('secretariats')
                .select('id, name')
                .in('id', secIds);
            
            if (secs) {
                secs.forEach(s => secretariatsMap.set(s.id, s.name));
            }
        }
    } catch (secErr) {
        console.warn('[planejamentoAcoes] Falha ao enriquecer secretarias:', secErr);
    }

    // 3. Buscar eixos em consulta separada
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

    // 4. Mapeamento final
    return actions.map(a => ({
        id: a.id,
        nome: a.title,
        descricao: a.description || '',
        local: a.neighborhood || '',
        observacoes: a.notes || '',
        secretaria: secretariatsMap.get(a.secretariat_id) || 'Não informada',
        secretariaId: a.secretariat_id,
        secretariaFull: secretariatsMap.get(a.secretariat_id) || '',
        eixo: axesMap.get(a.axis_id) || '',
        eixoId: a.axis_id,
        status: a.status || 'NAO_INICIADA',
        progresso: a.progress_percent ?? 0,
        prazo: a.due_date || '',
        data_inicio: a.start_date || '',
        responsavel: a.responsible_name || '',
        action_type: a.action_type,
    }));
};

// ── Criar nova ação ───────────────────────────────────────────────────────────
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

    // 5. Buscar primeiro objetivo ativo do eixo (opcional)
    const objectiveIdFound = await fetchFirstObjectiveByAxis(tenantId, formData.axisId);

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
        status: formData.status,
        progress_percent: progress,
        start_date: formData.data_inicio || null,
        due_date: formData.prazo || null,
        neighborhood: formData.local || null,
        notes: formData.observacoes?.trim() || null,
        responsible_name: formData.responsible_name?.trim() || null,
        action_type: 'PROJETO',
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

    const payload = {
        title: formData.nome.trim(),
        description: formData.descricao?.trim() || null,
        status: formData.status,
        progress_percent: progress,
        start_date: formData.data_inicio || null,
        due_date: formData.prazo || null,
        neighborhood: formData.local || null,
        notes: formData.observacoes?.trim() || null,
        responsible_name: formData.responsible_name?.trim() || null,
        ...(formData.axisId && { axis_id: formData.axisId }),
        ...(formData.secretariatId && { secretariat_id: formData.secretariatId }),
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

        const derivarTipo = (u) => {
            if (u.status_snapshot) return 'Mudança de Status';
            if (u.progress_percent_snapshot !== null && u.progress_percent_snapshot > 0) return 'Avanço de Progresso';
            return 'Geral';
        };

        return updates.map(u => {
            const acao = actionsMap.get(u.action_id) || {};
            return {
                id: u.id,
                acao: acao.title || 'Ação não encontrada',
                acaoId: u.action_id,
                secretaria: acao.secretariaNome || 'Não informada',
                tipo: derivarTipo(u),
                data: u.created_at,
                responsavel: acao.responsible_name || 'Não informado',
                descricao: u.summary || '',
                progressoAnterior: null,
                progressoNovo: u.progress_percent_snapshot ?? null,
                statusAnterior: null,
                statusNovo: u.status_snapshot || null,
                critica: false,
            };
        });
    } catch (err) {
        console.error('[planejamentoAcoes] Erro inesperado ao buscar atualizações:', err);
        throw err;
    }
};

// ── Criar nova Atualização (planning_action_updates) ──────────────────────────
export const createAtualizacao = async (tenantId, formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não identificado. Refaça o login.');
    if (!formData.acaoId) throw new Error('A ação estratégica é obrigatória.');
    if (!formData.descricao?.trim()) throw new Error('A descrição é obrigatória.');

    const payload = {
        tenant_id: tenantId,
        action_id: formData.acaoId,
        summary: formData.descricao.trim(),
        details: formData.details?.trim() || null,
        update_date: new Date().toISOString(),
        updated_by: user.id,
    };

    // Só enviar status_snapshot se não for "Manter atual"
    if (formData.novoStatus && formData.novoStatus !== '') {
        payload.status_snapshot = formData.novoStatus;
    }

    // Só enviar progress_percent_snapshot se foi preenchido
    const progresso = (formData.novoProgresso !== '' && formData.novoProgresso !== null)
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
