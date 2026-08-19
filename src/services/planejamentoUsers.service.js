import { supabase } from '../lib/supabase';

export const getCurrentTenantId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Usuário não autenticado");

    const { data } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();
        
    if (!data) throw new Error("Tenant local não encontrado");
    return data.tenant_id;
};

/**
 * Busca usuários vinculados ao módulo PLANEJAMENTO_ESTRATEGICO.
 * Reutiliza a RPC consolidada get_farmacia_users_with_auth e filtra pelo escopo de planejamento.
 */
export const fetchPlanejamentoUsers = async (tenantId, allowedSecretariatNames = null) => {
    // 1. Obter ID do módulo PLANEJAMENTO_ESTRATEGICO
    const { data: moduleData } = await supabase
        .from('system_modules')
        .select('id')
        .eq('key', 'PLANEJAMENTO_ESTRATEGICO')
        .maybeSingle();

    if (!moduleData) return [];

    // 2. Buscar user_ids e secretarias com escopo no módulo PLANEJAMENTO_ESTRATEGICO
    const { data: scopeData } = await supabase
        .from('user_access_scopes')
        .select('user_id, secretariat_id, is_primary_secretariat, secretariats(name)')
        .eq('tenant_id', tenantId)
        .eq('module_id', moduleData.id)
        .eq('is_active', true);

    const planningUserIds = scopeData ? Array.from(new Set(scopeData.map(s => s.user_id))) : [];
    
    // Mapear secretarias por usuário para o módulo de Planejamento
    const userSecretariatMap = {};
    if (scopeData) {
        scopeData.forEach(s => {
            const secName = s.secretariats?.name;
            if (secName) {
                if (!userSecretariatMap[s.user_id]) {
                    userSecretariatMap[s.user_id] = { scopes: [] };
                }
                userSecretariatMap[s.user_id].scopes.push({
                    name: secName,
                    id: s.secretariat_id,
                    is_primary: s.is_primary_secretariat
                });
            }
        });
    }

    // 2.5 Buscar mapa de user_tenants para resolução segura de Auth User ID
    const { data: userTenantsData } = await supabase
        .from('user_tenants')
        .select('id, user_id')
        .eq('tenant_id', tenantId);

    const userTenantMap = {};
    if (userTenantsData) {
        userTenantsData.forEach(ut => {
            if (ut.id && ut.user_id) {
                userTenantMap[ut.id] = ut.user_id;
            }
        });
    }

    // 3. Chamar a RPC consolidada que retorna auth + tenants
    const { data, error } = await supabase.rpc('get_farmacia_users_with_auth', {
        p_tenant_id: tenantId
    });

    if (error) {
        console.error('Erro ao buscar usuários do planejamento:', error);
        throw error;
    }

    if (!data) return [];

    const uniqueUsers = new Map();

    data.forEach(row => {
        // Resolver o Auth User ID com máxima precisão
        const resolvedAuthUserId = 
            (row.user_id && planningUserIds.includes(row.user_id)) ? row.user_id :
            (row.id && planningUserIds.includes(row.id)) ? row.id :
            (row.user_tenant_id && userTenantMap[row.user_tenant_id]) ? userTenantMap[row.user_tenant_id] :
            (row.id && userTenantMap[row.id]) ? userTenantMap[row.id] :
            row.user_id || row.auth_user_id || (planningUserIds.includes(row.id) ? row.id : null) || row.id;

        const userId = resolvedAuthUserId;
        
        // 5. REGRA: Excluir SUPERADMIN da listagem operacional do módulo
        const role = row.role || row.profile || 'OPERADOR';
        if (role === 'SUPERADMIN') return;

        let finalSecName = 'Planejamento e Inovação';
        let finalSecId = null;
        let displaySecName = finalSecName;

        if (row.secretariat_name) {
            finalSecName = row.secretariat_name;
            displaySecName = finalSecName;
        } else if (userSecretariatMap[userId]) {
            const scopes = userSecretariatMap[userId].scopes;
            const primaryScope = scopes.find(s => s.is_primary === true) || scopes[0];
            
            finalSecId = primaryScope?.id || null;
            if (primaryScope?.name) {
                finalSecName = primaryScope.name;
                displaySecName = finalSecName;
                const otherCount = scopes.length - 1;
                if (otherCount > 0) {
                    displaySecName += ` + ${otherCount} secretaria${otherCount > 1 ? 's' : ''}`;
                }
            }
        }

        // 4. FILTRAR: Só incluir se o usuário tiver escopo real no Planejamento
        let hasAccess = planningUserIds.includes(userId) || planningUserIds.includes(row.user_id) || planningUserIds.includes(row.id);
        
        // Burlar bloqueio de RLS para VISUALIZADOR usando as secretarias permitidas pelo contexto
        if (!hasAccess && allowedSecretariatNames) {
            // Permitir se o usuário pertencer a uma das secretarias que o Visualizador tem acesso ou se tiver acesso total
            if (allowedSecretariatNames.includes('TODAS') || allowedSecretariatNames.includes(finalSecName)) {
                hasAccess = true;
            }
        }
        
        if (!hasAccess) return;

        // 6. DEDUPLICAR: Garantir apenas uma linha por user_id (evita duplicidade por múltiplos vínculos)
        if (!uniqueUsers.has(userId)) {
            uniqueUsers.set(userId, {
                id: userId,
                user_id: resolvedAuthUserId,
                auth_user_id: resolvedAuthUserId,
                user_tenant_id: row.user_tenant_id || row.id || userId,
                name: row.full_name || row.name || 'Usuário Sem Nome',
                email: row.email || '',
                profile: role,
                status: (row.is_active === true || row.status === 'ATIVO') ? 'ATIVO' : 'INATIVO',
                secretariat_name: finalSecName,
                secretariat_id: finalSecId,
                display_secretariat_name: displaySecName,
                modulo: 'Planejamento Estratégico'
            });
        }
    });

    // Ajuste fino solicitado para Osvaldo Albanez (vinculo institucional Saúde)
    return Array.from(uniqueUsers.values()).map(u => {
        if (u.email && u.email.toLowerCase().includes('osvaldo.albanez')) {
            return { ...u, secretariat_name: 'Saúde' };
        }
        return u;
    });
};

/**
 * Cria um usuário via Edge Function (manage-user) para o módulo PLANEJAMENTO_ESTRATEGICO.
 */
export const createPlanejamentoUser = async (tenantId, userData) => {
    const tempPassword = 'Plan@123';

    const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                email: userData.email,
                password: tempPassword,
                tempPassword: tempPassword,
                name: userData.name,
                full_name: userData.name,
                role: userData.profile,
                is_active: userData.status === 'ATIVO',
                tenant_id: tenantId,
                module_key: 'PLANEJAMENTO_ESTRATEGICO',
                secretariat_name: userData.secretariat_name || 'Planejamento e Inovação',
                secretariat_id: userData.secretariat_id || null,
                is_primary_secretariat: true
            })
        }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao criar usuário');

    return { success: true, user_id: result.user_id };
};

/**
 * Atualiza um usuário via Edge Function (manage-user) para o módulo PLANEJAMENTO_ESTRATEGICO.
 */
export const updatePlanejamentoUser = async (userTenantId, userData) => {
    // 1. Resolver tenant_id e user_id (auth)
    const { data: tenantLink } = await supabase
        .from('user_tenants')
        .select('user_id, tenant_id')
        .or(`id.eq."${userTenantId}",user_id.eq."${userTenantId}"`)
        .limit(1)
        .single();

    if (!tenantLink) throw new Error('Usuário não encontrado no tenant');

    const payload = {
        user_id: tenantLink.user_id,
        email: userData.email,
        name: userData.name,
        full_name: userData.name,
        role: userData.profile,
        is_active: userData.status === 'ATIVO',
        tenant_id: tenantLink.tenant_id,
        module_key: 'PLANEJAMENTO_ESTRATEGICO',
        secretariat_name: userData.secretariat_name || 'Planejamento e Inovação',
        secretariat_id: userData.secretariat_id || null,
        is_primary_secretariat: true
    };

    // 2. Chamar Edge Function
    const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
        }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao atualizar usuário');

    return { success: true };
};

/**
 * Alterna status ativo/inativo.
 */
export const togglePlanejamentoUserStatus = async (userTenantId, isActive) => {
    const { error } = await supabase
        .from('user_tenants')
        .update({ is_active: isActive })
        .eq('id', userTenantId);

    if (error) throw error;
    return true;
};

/**
 * Remove usuário via Edge Function.
 */
export const deletePlanejamentoUser = async (user) => {
    const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                user_id: user.id,
                email: user.email
            })
        }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao excluir usuário');
    return true;
};
