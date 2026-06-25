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
 * Busca a lista consolidade de usuários vinculados ao módulo LABORATORIO.
 */
export const fetchLaboratorioUsers = async (tenantId) => {
    // 1. Obter ID do módulo LABORATORIO

    const { data: moduleData } = await supabase
        .from('system_modules')
        .select('id')
        .eq('key', 'LABORATORIO')
        .maybeSingle();

    if (!moduleData) return [];

    // 2. Buscar IDs de usuários que possuem escopo no módulo LABORATORIO
    const { data: scopeData } = await supabase
        .from('user_access_scopes')
        .select('user_id, unit_id, units(name)')
        .eq('tenant_id', tenantId)
        .eq('module_id', moduleData.id)
        .eq('is_active', true);

    const laboratorioUserIds = scopeData ? Array.from(new Set(scopeData.map(s => s.user_id))) : [];
    
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
    // Usando a mesma RPC de Farmácia se não houver uma específica, mas o ideal seria 'get_users_with_auth'
    // Como a RPC get_farmacia_users_with_auth parece genérica (pelo nome só tem Farmácia mas recebe tenant_id),
    // usaremos ela ou 'get_tenant_users'. Se falhar, retornamos array vazio (mock).
    const { data, error } = await supabase.rpc('get_farmacia_users_with_auth', {
        p_tenant_id: tenantId
    });

    if (error) {
        console.error('Erro ao buscar usuários do laboratório:', error);
        throw error;
    }

    if (!data) return [];

    const groupedUsers = {};

    data.forEach(row => {
        const userId = row.user_id || row.id;
        
        // 4. FILTRAR: Só incluir se o usuário tiver escopo real no Laboratório
        if (!laboratorioUserIds.includes(userId)) return;

        const key = row.user_tenant_id || userId;

        if (!groupedUsers[key]) {
            groupedUsers[key] = {
                id: userId, 
                user_tenant_id: row.user_tenant_id || key,
                name: row.full_name || row.name || 'Usuário Sem Nome',
                email: row.email || '',
                profile: row.role || row.profile || 'VISUALIZADOR',
                status: (row.is_active === true || row.status === 'ATIVO') ? 'ATIVO' : 'INATIVO',
                secretariat_name: row.secretariat_name || '',
                units: userUnitsMap[userId] ? Array.from(userUnitsMap[userId]) : []
            };
        }
    });

    return Object.values(groupedUsers);
};

export const createLaboratorioUser = async (tenantId, userData) => {
    const tempPassword = 'Laboratorio@123';
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

    if (!secretariatId) {
        const { data: fallbackSec } = await supabase
            .from('secretariats')
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(1)
            .maybeSingle();
        if (fallbackSec) {
            secretariatId = fallbackSec.id;
        }
    }

    // 1. Tentar localizar o usuário existente pelo e-mail (reaproveitar e apenas vincular)
    const { data: existingUsers } = await supabase.rpc('get_farmacia_users_with_auth', {
        p_tenant_id: tenantId
    });
    
    const existingUser = existingUsers?.find(u => (u.email || '').toLowerCase() === (userData.email || '').toLowerCase());
    
    if (existingUser) {
        console.log('[Laboratorio] Usuário já existe. Realizando vínculo/update via PUT...');
        const payload = {
            user_id: existingUser.user_id || existingUser.id,
            email: userData.email,
            name: userData.name,
            role: userData.profile,
            is_active: userData.status === 'ATIVO',
            tenant_id: tenantId,
            module_key: 'LABORATORIO',
            unit_id: unitId,
            secretariat_id: secretariatId
        };

        const putResponse = await fetch(
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

        const putResult = await putResponse.json();
        if (!putResponse.ok) {
            throw new Error(putResult.error || 'Erro ao vincular usuário existente');
        }

        // GARANTIR O VÍNCULO NO BANCO (MANUAL UPSERT)
        const { data: modData } = await supabase.from('system_modules').select('id').eq('key', 'LABORATORIO').maybeSingle();
        if (modData) {
            const { data: checkScope } = await supabase
                .from('user_access_scopes')
                .select('id')
                .eq('user_id', payload.user_id)
                .eq('tenant_id', tenantId)
                .eq('module_id', modData.id)
                .maybeSingle();

            if (checkScope) {
                const { error: updErr } = await supabase.from('user_access_scopes').update({
                    is_active: true,
                    unit_id: unitId,
                    secretariat_id: secretariatId
                }).eq('id', checkScope.id);
                if (updErr) throw new Error('Falha ao atualizar user_access_scopes: ' + updErr.message);
            } else {
                const { error: insErr } = await supabase.from('user_access_scopes').insert({
                    user_id: payload.user_id,
                    tenant_id: tenantId,
                    module_id: modData.id,
                    is_active: true,
                    unit_id: unitId,
                    secretariat_id: secretariatId
                });
                if (insErr) throw new Error('Falha ao inserir em user_access_scopes: ' + insErr.message);
            }
        } else {
            throw new Error('Módulo LABORATORIO não encontrado na tabela system_modules.');
        }

        return { success: true, user_id: payload.user_id };
    }

    // 2. Se não existe, prosseguir com a criação via POST
    const payload = {
        email: userData.email,
        password: tempPassword,
        name: userData.name,
        role: userData.profile,
        is_active: userData.status === 'ATIVO',
        tenant_id: tenantId,
        module_key: 'LABORATORIO',
        unit_id: unitId,
        secretariat_id: secretariatId
    };

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
        // Fallback catch em caso de existir no Auth mas não no tenant
        if (result.error && result.error.includes('already been registered')) {
             throw new Error('Este e-mail já pertence a outro usuário do sistema fora do seu ambiente.');
        }
        throw new Error(result.error || 'Erro ao criar usuário');
    }

    // GARANTIR O VÍNCULO NO BANCO (MANUAL UPSERT)
    const { data: modData } = await supabase.from('system_modules').select('id').eq('key', 'LABORATORIO').maybeSingle();
    if (modData) {
        const { data: checkScope } = await supabase
            .from('user_access_scopes')
            .select('id')
            .eq('user_id', result.user_id)
            .eq('tenant_id', tenantId)
            .eq('module_id', modData.id)
            .maybeSingle();
            
        if (checkScope) {
            const { error: updErr } = await supabase.from('user_access_scopes').update({
                is_active: true,
                unit_id: unitId,
                secretariat_id: secretariatId
            }).eq('id', checkScope.id);
            if (updErr) throw new Error('Falha ao atualizar user_access_scopes: ' + updErr.message);
        } else {
            const { error: insErr } = await supabase.from('user_access_scopes').insert({
                user_id: result.user_id,
                tenant_id: tenantId,
                module_id: modData.id,
                is_active: true,
                unit_id: unitId,
                secretariat_id: secretariatId
            });
            if (insErr) throw new Error('Falha ao inserir em user_access_scopes: ' + insErr.message);
        }
    } else {
        throw new Error('Módulo LABORATORIO não encontrado na tabela system_modules.');
    }

    return { success: true, user_id: result.user_id };
};

export const updateLaboratorioUser = async (userTenantId, userData) => {
    const { data: tenantLink } = await supabase
        .from('user_tenants')
        .select('user_id, tenant_id')
        .or(`id.eq."${userTenantId}",user_id.eq."${userTenantId}"`)
        .limit(1)
        .single();

    if (!tenantLink) throw new Error('Usuário não encontrado no tenant');

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

    if (!secretariatId) {
        const { data: fallbackSec } = await supabase
            .from('secretariats')
            .select('id')
            .eq('tenant_id', tenantLink.tenant_id)
            .limit(1)
            .maybeSingle();
        if (fallbackSec) {
            secretariatId = fallbackSec.id;
        }
    }

    const payload = {
        user_id: tenantLink.user_id,
        email: userData.email,
        name: userData.name,
        role: userData.profile,
        is_active: userData.status === 'ATIVO',
        tenant_id: tenantLink.tenant_id,
        module_key: 'LABORATORIO',
        unit_id: unitId,
        secretariat_id: secretariatId
    };

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
        throw new Error(result.error || 'Erro ao atualizar usuário');
    }

    // GARANTIR O VÍNCULO NO BANCO (MANUAL UPSERT)
    const { data: modData } = await supabase.from('system_modules').select('id').eq('key', 'LABORATORIO').maybeSingle();
    if (modData) {
        const { data: checkScope } = await supabase
            .from('user_access_scopes')
            .select('id')
            .eq('user_id', payload.user_id)
            .eq('tenant_id', tenantLink.tenant_id)
            .eq('module_id', modData.id)
            .maybeSingle();
            
        if (checkScope) {
            const { error: updErr } = await supabase.from('user_access_scopes').update({
                is_active: true,
                unit_id: unitId,
                secretariat_id: secretariatId
            }).eq('id', checkScope.id);
            if (updErr) throw new Error('Falha ao atualizar user_access_scopes: ' + updErr.message);
        } else {
            const { error: insErr } = await supabase.from('user_access_scopes').insert({
                user_id: payload.user_id,
                tenant_id: tenantLink.tenant_id,
                module_id: modData.id,
                is_active: true,
                unit_id: unitId,
                secretariat_id: secretariatId
            });
            if (insErr) throw new Error('Falha ao inserir em user_access_scopes: ' + insErr.message);
        }
    } else {
        throw new Error('Módulo LABORATORIO não encontrado na tabela system_modules.');
    }

    return { success: true };
};

export const toggleLaboratorioUserStatus = async (userTenantId, isActive) => {
    const { error } = await supabase
        .from('user_tenants')
        .update({ is_active: isActive })
        .eq('id', userTenantId);

    if (error) throw error;
    return true;
};

export const deleteLaboratorioUser = async (user) => {
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
