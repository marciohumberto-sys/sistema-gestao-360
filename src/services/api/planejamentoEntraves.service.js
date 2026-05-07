import { supabase } from '../../lib/supabase';

const MODULE_ID = '2d53a6f6-5638-45bc-a87e-1ab5d88d6134';

// ── Mapeamentos de Enum ───────────────────────────────────────────────────────

/** Banco → UI */
const SEVERITY_TO_LABEL = {
    CRITICA: 'Crítica',
    ALTA: 'Alta',
    MEDIA: 'Média',
    BAIXA: 'Baixa',
};

/** UI → Banco */
const LABEL_TO_SEVERITY = {
    'Crítica': 'CRITICA',
    'Alta': 'ALTA',
    'Média': 'MEDIA',
    'Baixa': 'BAIXA',
};

/** Banco → UI */
const STATUS_TO_LABEL = {
    ABERTO: 'Aberto',
    EM_TRATAMENTO: 'Em Tratativa',
    RESOLVIDO: 'Resolvido',
};

/** UI → Banco */
const LABEL_TO_STATUS = {
    'Aberto': 'ABERTO',
    'Em Tratativa': 'EM_TRATAMENTO',
    'Resolvido': 'RESOLVIDO',
};

// ── Helpers de ordenação ──────────────────────────────────────────────────────
const SEVERITY_ORDER = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };

const sortEntraves = (list) => {
    return [...list].sort((a, b) => {
        // RESOLVIDO vai por último
        const aResolved = a.status === 'RESOLVIDO' ? 1 : 0;
        const bResolved = b.status === 'RESOLVIDO' ? 1 : 0;
        if (aResolved !== bResolved) return aResolved - bResolved;

        // Depois por severidade
        const sevA = SEVERITY_ORDER[a.severity] ?? 9;
        const sevB = SEVERITY_ORDER[b.severity] ?? 9;
        if (sevA !== sevB) return sevA - sevB;

        // Por fim, mais recente primeiro
        return new Date(b.created_at) - new Date(a.created_at);
    });
};

// ── Buscar Entraves (com join manual para evitar dependência de FK exposta) ───
export const fetchEntraves = async (tenantId) => {
    if (!tenantId) return [];

    try {
        // 1. Buscar entraves
        const { data: issues, error } = await supabase
            .from('planning_action_issues')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[planejamentoEntraves] Erro ao buscar entraves:', error);
            throw error;
        }
        if (!issues || issues.length === 0) return [];

        // 2. Buscar ações relacionadas
        const actionIds = [...new Set(issues.map(i => i.action_id).filter(Boolean))];
        let actionsMap = new Map();
        if (actionIds.length > 0) {
            const { data: actions } = await supabase
                .from('planning_actions')
                .select('id, title, secretariat_id, responsible_name, status, progress_percent')
                .in('id', actionIds);

            // 3. Buscar secretariats
            const secIds = [...new Set((actions || []).map(a => a.secretariat_id).filter(Boolean))];
            let secMap = new Map();
            if (secIds.length > 0) {
                const { data: secs } = await supabase
                    .from('secretariats')
                    .select('id, name')
                    .in('id', secIds);
                (secs || []).forEach(s => secMap.set(s.id, s.name));
            }

            (actions || []).forEach(a => actionsMap.set(a.id, {
                ...a,
                secretariaNome: secMap.get(a.secretariat_id) || 'Não informada'
            }));
        }

        // 4. Mapear para formato de UI
        const sorted = sortEntraves(issues);
        return sorted.map(i => {
            const acao = actionsMap.get(i.action_id) || {};
            return {
                id: i.id,
                acaoId: i.action_id,
                acaoNome: acao.title || 'Ação não encontrada',
                secretaria: acao.secretariaNome || 'Não informada',
                descricao: i.description || '',
                gravidade: SEVERITY_TO_LABEL[i.severity] || i.severity || 'Baixa',
                gravidade_db: i.severity,
                status: STATUS_TO_LABEL[i.status] || i.status || 'Aberto',
                status_db: i.status,
                responsavel: i.responsible_name || '',
                setor: i.responsible_sector || '',
                prazo: i.due_date || null,
                dataRegistro: i.created_at,
                dataResolucao: i.resolved_at || null,
                impacto: '',
                providencia: i.resolution_notes || '',
                isCritico: i.severity === 'CRITICA' || i.severity === 'ALTA',
                titulo: i.title || '',
            };
        });
    } catch (err) {
        console.error('[planejamentoEntraves] Erro inesperado:', err);
        throw err;
    }
};

// ── Buscar Ações para o Select do formulário ──────────────────────────────────
export const fetchAcoesParaEntraves = async (tenantId) => {
    if (!tenantId) return [];
    try {
        const { data, error } = await supabase
            .from('planning_actions')
            .select('id, title, secretariat_id, responsible_name')
            .eq('tenant_id', tenantId)
            .eq('module_id', MODULE_ID)
            .order('title', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[planejamentoEntraves] Erro ao buscar ações:', err);
        return [];
    }
};

// ── Criar novo Entrave ────────────────────────────────────────────────────────
export const createEntrave = async (tenantId, formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não identificado. Refaça o login.');

    if (!formData.acaoId) throw new Error('A ação estratégica é obrigatória.');
    if (!formData.descricao?.trim()) throw new Error('A descrição do entrave é obrigatória.');

    // Buscar a secretaria vinculada à ação correspondente para passar no RLS
    const { data: action, error: actionErr } = await supabase
        .from('planning_actions')
        .select('secretariat_id')
        .eq('id', formData.acaoId)
        .eq('tenant_id', tenantId)
        .single();

    if (actionErr) {
        console.error('[planejamentoEntraves] Erro ao buscar secretaria da ação:', actionErr);
    }

    // Fallback de data: hoje + 7 dias
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);
    const dueDateFallback = defaultDueDate.toISOString().split('T')[0];

    const payload = {
        tenant_id: tenantId,
        module_id: MODULE_ID,
        secretariat_id: action?.secretariat_id || null,
        action_id: formData.acaoId,
        title: formData.titulo?.trim() || formData.descricao.substring(0, 80).trim(),
        description: formData.descricao.trim(),
        severity: LABEL_TO_SEVERITY[formData.gravidade] || 'MEDIA',
        status: LABEL_TO_STATUS[formData.status] || 'ABERTO',
        responsible_name: formData.responsavel?.trim() || 'Não definido',
        responsible_sector: formData.setor?.trim() || 'Não informado',
        due_date: formData.prazo || dueDateFallback,
        resolution_notes: formData.providencia?.trim() || null,
        created_by: user.id,
        updated_by: user.id,
    };

    console.log('[planejamentoEntraves] Criando entrave:', payload);

    const { data, error } = await supabase
        .from('planning_action_issues')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('[planejamentoEntraves] Erro ao criar entrave:', error);
        if (error.code === '42501' || error.message?.includes('row-level security')) {
            throw new Error('Permissão negada. Verifique seu acesso ao módulo de Planejamento.');
        }
        throw new Error(error.message || 'Erro ao salvar entrave no banco.');
    }

    return data;
};

// ── Atualizar Entrave ─────────────────────────────────────────────────────────
export const updateEntrave = async (tenantId, id, formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não identificado. Refaça o login.');

    const novoStatus = LABEL_TO_STATUS[formData.status] || 'ABERTO';
    const eraResolvido = formData._statusAnterior_db === 'RESOLVIDO';
    const ficaResolvido = novoStatus === 'RESOLVIDO';

    const payload = {
        title: formData.titulo?.trim() || formData.descricao?.substring(0, 80).trim() || 'Sem título',
        description: formData.descricao?.trim() || null,
        severity: LABEL_TO_SEVERITY[formData.gravidade] || 'MEDIA',
        status: novoStatus,
        responsible_name: formData.responsavel?.trim() || 'Não definido',
        responsible_sector: formData.setor?.trim() || 'Não informado',
        due_date: formData.prazo || null,
        resolution_notes: formData.providencia?.trim() || null,
        updated_by: user.id,
    };

    // Definir resolved_at
    if (ficaResolvido && !eraResolvido) {
        payload.resolved_at = new Date().toISOString();
    } else if (!ficaResolvido && eraResolvido) {
        payload.resolved_at = null;
    }

    console.log('[planejamentoEntraves] Atualizando entrave:', { id, payload });

    const { data, error } = await supabase
        .from('planning_action_issues')
        .update(payload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[planejamentoEntraves] Erro ao atualizar entrave:', error);
        throw new Error(error.message || 'Erro ao atualizar entrave no banco.');
    }

    return data;
};

// ── Marcar como Resolvido ─────────────────────────────────────────────────────
export const resolveEntrave = async (tenantId, id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não identificado. Refaça o login.');

    const payload = {
        status: 'RESOLVIDO',
        resolved_at: new Date().toISOString(),
        updated_by: user.id,
    };

    console.log('[planejamentoEntraves] Resolvendo entrave:', { id, payload });

    const { data, error } = await supabase
        .from('planning_action_issues')
        .update(payload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[planejamentoEntraves] Erro ao resolver entrave:', error);
        throw new Error(error.message || 'Erro ao marcar entrave como resolvido.');
    }

    return data;
};
