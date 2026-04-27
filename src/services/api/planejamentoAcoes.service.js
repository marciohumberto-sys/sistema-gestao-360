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
    if (!formData.secretariatId) throw new Error('A secretaria é obrigatória.');
    if (!formData.status) throw new Error('O status é obrigatório.');

    const progress = parseInt(formData.progresso) || 0;
    if (progress < 0 || progress > 100) throw new Error('O progresso deve estar entre 0 e 100.');

    if (formData.prazo && formData.data_inicio && formData.prazo < formData.data_inicio) {
        throw new Error('A data de término não pode ser anterior à data de início.');
    }

    // 2. module_id já conhecido (fixo) — evita fetch extra
    const moduleId = MODULE_ID;

    // 3. Obter usuário autenticado para RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não foi possível identificar o usuário logado. Refaça o login.");

    // 4. Buscar primeiro objetivo ativo do eixo (opcional)
    const objectiveId = await fetchFirstObjectiveByAxis(tenantId, formData.axisId);

    // 5. Montar payload
    const payload = {
        tenant_id: tenantId,
        module_id: moduleId,
        axis_id: formData.axisId,
        objective_id: objectiveId || null,
        secretariat_id: formData.secretariatId,
        created_by: user.id, // Campo essencial para RLS
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

    console.log("[Planejamento][Criar Ação] usuário:", user?.id);
    console.log("[Planejamento][Criar Ação] payload:", payload);
    console.log("[Planejamento][Criar Ação] contexto:", {
      tenantId,
      moduleId,
      secretariatId: formData.secretariatId
    });

    const { data, error } = await supabase
        .from('planning_actions')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('[planejamentoAcoes] Erro ao criar ação:', error);
        
        // Mensagem amigável para erro de RLS
        if (error.message?.includes('row-level security policy')) {
            throw new Error("Não foi possível criar a ação. Verifique se seu usuário possui permissão para cadastrar ações neste módulo.");
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
