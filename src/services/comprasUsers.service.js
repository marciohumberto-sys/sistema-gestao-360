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
    const { data, error } = await supabase.rpc('get_compras_users_with_auth', {
        p_tenant_id: tenantId
    });

    if (error) {
        console.error('Erro ao buscar usuários do compras:', error);
        throw error;
    }

    if (!data) return [];

    return data.map(row => ({
        id: row.user_id,
        user_tenant_id: row.user_id,
        name: row.full_name || 'Usuário Sem Nome',
        email: row.email || '',
        profile: row.role || 'OPERADOR',
        status: row.is_active ? 'ATIVO' : 'INATIVO',
        secretariat_name: row.secretariat_name || 'Administração',
        secretariat_id: row.secretariat_id || null,
    }));
};

/**
 * Cria um usuário via Edge Function com provisionamento completo para o módulo COMPRAS.
 */
export const createComprasUser = async (tenantId, userData) => {
    const tempPassword = 'Admin@123';

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
