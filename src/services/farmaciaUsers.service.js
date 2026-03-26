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
 * Busca a lista consolidade de usuários vinculados ao módulo FARMACIA.
 */
export const fetchFarmaciaUsers = async (tenantId) => {
    // 1. Obter ID do módulo FARMACIA
    const { data: moduleData } = await supabase
        .from('system_modules')
        .select('id')
        .eq('key', 'FARMACIA')
        .maybeSingle();

    if (!moduleData) return [];

    // 2. Buscar IDs de usuários que possuem escopo no módulo FARMACIA
    const { data: scopeData } = await supabase
        .from('user_access_scopes')
        .select('user_id, unit_id, units(name)')
        .eq('tenant_id', tenantId)
        .eq('module_id', moduleData.id)
        .eq('is_active', true);

    const farmaciaUserIds = scopeData ? Array.from(new Set(scopeData.map(s => s.user_id))) : [];
    
    // Mapear unidades por usuário para garantir que só mostramos unidades da Farmácia
    const userUnitsMap = {};
    if (scopeData) {
        scopeData.forEach(s => {
            const uName = s.units?.name;
            if (uName) {
                if (!userUnitsMap[s.user_id]) userUnitsMap[s.user_id] = new Set();
                userUnitsMap[s.user_id].add(uName);
            }
        });
    }

    // 3. Chamar a RPC para obter dados de Auth + Tenants
    const { data, error } = await supabase.rpc('get_farmacia_users_with_auth', {
        p_tenant_id: tenantId
    });

    if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
    }

    if (!data) return [];

    const groupedUsers = {};

    data.forEach(row => {
        const userId = row.user_id || row.id;
        
        // 4. FILTRAR: Só incluir se o usuário tiver escopo real na Farmácia
        if (!farmaciaUserIds.includes(userId)) return;

        const key = row.user_tenant_id || userId;

        if (!groupedUsers[key]) {
            groupedUsers[key] = {
                id: userId, 
                user_tenant_id: row.user_tenant_id || key,
                name: row.full_name || row.name || 'Usuário Sem Nome',
                email: row.email || '',
                profile: row.role || row.profile || 'OPERADOR',
                status: (row.is_active === true || row.status === 'ATIVO') ? 'ATIVO' : 'INATIVO',
                secretariat_name: row.secretariat_name || '',
                units: userUnitsMap[userId] ? Array.from(userUnitsMap[userId]) : []
            };
        }
    });

    return Object.values(groupedUsers);
};

/**
 * Cria um usuário via Edge Function com provisionamento completo.
 */
export const createFarmaciaUser = async (tenantId, userData) => {
    const tempPassword = 'Farmacia@123';
    let unitId = null;
    let secretariatId = null;

    console.log('[Farmacia][createFarmaciaUser] Iniciando criação:', { 
        email: userData.email, 
        name: userData.name,
        profile: userData.profile,
        units: userData.units 
    });

    // 1. Buscar unit_id e secretariat_id se houver unidades
    if (userData.units && userData.units.length > 0) {
        const { data: unitData, error: unitError } = await supabase
            .from('units')
            .select('id, secretariat_id')
            .in('name', userData.units)
            .limit(1)
            .maybeSingle();

        if (unitError) {
            console.error('[Farmacia][createFarmaciaUser] Erro ao buscar unidade:', unitError);
        }

        if (unitData) {
            unitId = unitData.id;
            secretariatId = unitData.secretariat_id;
            console.log('[Farmacia][createFarmaciaUser] Unidade/Secretaria resolvidas:', { unitId, secretariatId });
        } else {
            console.warn('[Farmacia][createFarmaciaUser] Nenhuma unidade encontrada para:', userData.units);
        }
    }

    const payload = {
        email: userData.email,
        password: tempPassword,
        name: userData.name,
        role: userData.profile,
        is_active: userData.status === 'ATIVO',
        tenant_id: tenantId,
        module_key: 'FARMACIA',
        unit_id: unitId,
        secretariat_id: secretariatId
    };

    console.log('[Farmacia][createFarmaciaUser] Chamando manage-user Payload:', {
        ...payload,
        password: '***'
    });

    // 2. Chamar Edge Function com payload completo
    const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
        }
    );

    const result = await response.json();
    if (!response.ok) {
        console.error('[Farmacia][createFarmaciaUser] Erro da Edge Function:', result);
        throw new Error(result.error || 'Erro ao criar usuário');
    }

    console.log('[Farmacia][createFarmaciaUser] Sucesso:', result);
    return { success: true, user_id: result.user_id };
};

/**
 * Atualiza um usuário via Edge Function com provisionamento completo.
 */
export const updateFarmaciaUser = async (userTenantId, userData) => {
    console.log('[Farmacia][updateFarmaciaUser] Iniciando atualização:', userTenantId);

    // 1. Obter tenant_id e user_id (auth)
    const { data: tenantLink } = await supabase
        .from('user_tenants')
        .select('user_id, tenant_id')
        .or(`id.eq."${userTenantId}",user_id.eq."${userTenantId}"`)
        .limit(1)
        .single();

    if (!tenantLink) throw new Error('Usuário não encontrado no tenant');

    // 2. Buscar unit_id e secretariat_id
    let unitId = null;
    let secretariatId = null;
    if (userData.units && userData.units.length > 0) {
        const { data: unitData } = await supabase
            .from('units')
            .select('id, secretariat_id')
            .in('name', userData.units)
            .limit(1)
            .maybeSingle();

        if (unitData) {
            unitId = unitData.id;
            secretariatId = unitData.secretariat_id;
        }
    }

    const payload = {
        user_id: tenantLink.user_id,
        email: userData.email,
        name: userData.name,
        role: userData.profile,
        is_active: userData.status === 'ATIVO',
        tenant_id: tenantLink.tenant_id,
        module_key: 'FARMACIA',
        unit_id: unitId,
        secretariat_id: secretariatId
    };

    console.log('[Farmacia][updateFarmaciaUser] Payload:', payload);

    // 3. Chamar Edge Function com payload completo
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
        console.error('[Farmacia][updateFarmaciaUser] Erro:', result);
        throw new Error(result.error || 'Erro ao atualizar usuário');
    }

    console.log('[Farmacia][updateFarmaciaUser] Sucesso:', result);
    return { success: true };
};

/**
 * Alterna apenas a situação (Toggle) do acesso ao tenant.
 */
export const toggleFarmaciaUserStatus = async (userTenantId, isActive) => {
    const { error } = await supabase
        .from('user_tenants')
        .update({ is_active: isActive })
        .eq('id', userTenantId);

    if (error) throw error;
    return true;
};

/**
 * Delete 
 */
 
export const deleteFarmaciaUser = async (user) => {
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

    if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir usuário');
    }

    return true;
};