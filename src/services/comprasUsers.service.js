import { supabase } from '../lib/supabase';

export const getCurrentTenantId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Usuário não autenticado');

    const { data } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

    if (!data) throw new Error('Tenant local não encontrado');
    return data.tenant_id;
};

/**
 * Resolve o ID da secretaria "Administração" (secretaria fixa do módulo Compras).
 */
export const getAdminSecretariatId = async () => {
    const { data } = await supabase
        .from('secretariats')
        .select('id')
        .ilike('name', 'administra%')
        .limit(1)
        .maybeSingle();
    return data?.id || null;
};

/**
 * Busca usuários do módulo COMPRAS.
 * Reutiliza a RPC get_farmacia_users_with_auth (que retorna todos os usuários
 * do tenant) e filtra client-side pelos escopos do módulo COMPRAS.
 * Isso evita depender de uma RPC específica inexistente.
 */
export const fetchComprasUsers = async (tenantId) => {
    // 1. Obter ID do módulo COMPRAS
    const { data: moduleData } = await supabase
        .from('system_modules')
        .select('id')
        .eq('key', 'COMPRAS')
        .maybeSingle();

    // 2. Buscar user_ids com escopo no módulo COMPRAS
    let comprasUserIds = null;
    if (moduleData?.id) {
        const { data: scopes } = await supabase
            .from('user_access_scopes')
            .select('user_id')
            .eq('tenant_id', tenantId)
            .eq('module_id', moduleData.id);

        if (scopes && scopes.length > 0) {
            comprasUserIds = scopes.map(s => s.user_id);
        }
    }

    // 3. Reutilizar a RPC existente que cruza auth.users com user_tenants
    const { data, error } = await supabase.rpc('get_farmacia_users_with_auth', {
        p_tenant_id: tenantId
    });

    if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
    }

    if (!data) return [];

    // 4. Agrupar por usuário
    const groupedUsers = {};
    data.forEach(row => {
        const key = row.user_tenant_id || row.user_id || row.id;
        if (!groupedUsers[key]) {
            groupedUsers[key] = {
                id: row.user_id || row.id,
                user_tenant_id: row.user_tenant_id || key,
                name: row.full_name || row.name || 'Usuário Sem Nome',
                email: row.email || '',
                profile: row.role || row.profile || 'OPERADOR',
                status: (row.is_active === true || row.status === 'ATIVO') ? 'ATIVO' : 'INATIVO',
                secretariat_name: 'Administração',
                secretariat_id: null,
            };
        }
    });

    const allUsers = Object.values(groupedUsers);

    // 5. Filtrar pelos usuários com escopo COMPRAS
    if (comprasUserIds && comprasUserIds.length > 0) {
        return allUsers.filter(u => comprasUserIds.includes(u.id));
    }

    // Se o módulo existe mas não há escopos vinculados, retornar vazio
    if (moduleData?.id) {
        return [];
    }

    // Fallback: módulo ainda não cadastrado, retornar todos
    return allUsers;
};

/**
 * Cria um usuário via Edge Function com provisionamento completo para o módulo COMPRAS.
 */
export const createComprasUser = async (tenantId, userData) => {
    const tempPassword = 'Compras@123';

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
                name: userData.name,
                role: userData.profile,
                is_active: userData.status === 'ATIVO',
                tenant_id: tenantId,
                module_key: 'COMPRAS',
                secretariat_name: 'Administração'
            })
        }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao criar usuário');

    return { success: true, user_id: result.user_id };
};

/**
 * Atualiza um usuário via Edge Function com provisionamento completo para o módulo COMPRAS.
 */
export const updateComprasUser = async (userTenantId, userData) => {
    console.log('[Compras][updateComprasUser] Iniciando atualização:', userTenantId);
    console.log('[Compras][updateComprasUser] Payload original:', userData);

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
        role: userData.profile,
        is_active: userData.status === 'ATIVO',
        tenant_id: tenantLink.tenant_id,
        module_key: 'COMPRAS',
        secretariat_name: 'Administração'
    };

    console.log('[Compras][updateComprasUser] Payload para Edge Function:', payload);

    // 2. Chamar Edge Function com payload completo
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
    if (!response.ok) {
        console.error('[Compras][updateComprasUser] Erro:', result);
        throw new Error(result.error || 'Erro ao atualizar usuário');
    }

    console.log('[Compras][updateComprasUser] Sucesso:', result);
    return { success: true };
};

/**
 * Alterna ativo/inativo no tenant.
 */
export const toggleComprasUserStatus = async (userTenantId, isActive) => {
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
export const deleteComprasUser = async (user) => {
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
