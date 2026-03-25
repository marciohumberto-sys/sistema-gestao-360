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
 * Presume a existência da RPC 'get_farmacia_users_with_auth' que cruza auth.users com user_tenants e user_access_scopes.
 */
export const fetchFarmaciaUsers = async (tenantId) => {
    const { data, error } = await supabase.rpc('get_farmacia_users_with_auth', {
        p_tenant_id: tenantId
    });

    if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
    }

    if (!data) return [];

    // Agrupar os resultados retornados, pois a RPC provavelmente retorna múltiplas linhas por usuário (uma por unidade/escopo)
    const groupedUsers = {};

    data.forEach(row => {
        // Obter chave firme para agrupamento
        const key = row.user_tenant_id || row.user_id || row.id;

        if (!groupedUsers[key]) {
            groupedUsers[key] = {
                id: row.user_id || row.id, 
                user_tenant_id: row.user_tenant_id || key,
                name: row.full_name || row.name || 'Usuário Sem Nome',
                email: row.email || '',
                profile: row.role || row.profile || 'OPERADOR', // GESTOR vs OPERADOR
                status: (row.is_active === true || row.status === 'ATIVO') ? 'ATIVO' : 'INATIVO',
                secretariat_name: row.secretariat_name || '',
                units: []
            };
        }

        // O banco retorna explicitamente 'unit_code' e 'secretariat_name'
        const unitName = row.unit_code || row.unit_name || row.unidade;
        if (unitName && !groupedUsers[key].units.includes(unitName)) {
            groupedUsers[key].units.push(unitName);
        }
    });

    return Object.values(groupedUsers);
};

/**
 * Cria um usuário no fluxo do Admin via RPC e vincula ao tenant e ao módulo da Farmácia.
 */
export const createFarmaciaUser = async (tenantId, userData) => {
    const tempPassword = 'Farmacia@123'; // Senha de reset padronizada inicial

    // 1. Criar usuário no Auth via RPC (para evitar deslogar o administrador ativo)
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
		  name: userData.name
		})
	  }
	);

	const result = await response.json();

	if (!response.ok) {
	  throw new Error(result.error || 'Erro ao criar usuário');
	}

	const userId = result.user_id;

    // 2. Localizar módulo FARMACIA
    const { data: moduleData } = await supabase
        .from('system_modules')
        .select('id')
        .eq('key', 'FARMACIA')
        .single();
        
    if (!moduleData) throw new Error("Módulo FARMACIA não encontrado no sistema.");

    // 3. Vincular usuário ao tenant (user_tenants)
    const { data: tenantLink, error: tenantError } = await supabase
        .from('user_tenants')
        .insert({
            tenant_id: tenantId,
            user_id: userId,
            role: userData.profile,
            is_active: userData.status === 'ATIVO'
        })
        .select()
        .single();

    if (tenantError) throw tenantError;

    // 4. Inserir Escopos (user_access_scopes)
    if (userData.units && Array.isArray(userData.units) && userData.units.length > 0) {
        const { data: unitsData } = await supabase
            .from('units')
            .select('id, name, secretariat_id')
            .in('name', userData.units);
        
        if (unitsData && unitsData.length > 0) {
            /* const scopes = unitsData.map(u => ({
                user_tenant_id: tenantLink.id,
                module_id: moduleData.id,
                secretariat_id: u.secretariat_id,
                unit_id: u.id,
                is_active: true
            })); */
			
			const scopes = unitsData.map(u => ({
				tenant_id: tenantId,
				user_id: userId,
				module_id: moduleData.id,
				secretariat_id: u.secretariat_id,
				unit_id: u.id,
				is_active: true
			}));

            const { error: scopeError } = await supabase
                .from('user_access_scopes')
                .insert(scopes);

            if (scopeError) throw scopeError;
        }
    }

    return { success: true, user_tenant_id: tenantLink.id };
};

/**
 * Atualiza role, status e refaz rigorosamente os escopos para o módulo Farmácia.
 */
export const updateFarmaciaUser = async (userTenantId, userData) => {
    let tenantData = null;

    const { data: tenantByLink } = await supabase
        .from('user_tenants')
        .select('id, user_id, tenant_id')
        .eq('id', userTenantId)
        .single();

    if (tenantByLink) {
        tenantData = tenantByLink;
    } else {
        const { data: tenantByUser, error: tenantByUserError } = await supabase
            .from('user_tenants')
            .select('id, user_id, tenant_id')
            .eq('user_id', userTenantId)
            .single();

        if (tenantByUserError && !tenantByUser) {
            throw new Error('Usuário não encontrado no tenant');
        }

        tenantData = tenantByUser;
    }

    if (!tenantData) throw new Error('Usuário não encontrado no tenant');

    const usernameBase = userData.username || userData.email || '';

	if (!usernameBase) {
		throw new Error('Usuário/login não informado');
	}

	const normalizedEmail = usernameBase.includes('@')
		? usernameBase
		: `${usernameBase}@farmacia.local`;

    const authResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                user_id: tenantData.user_id,
                name: userData.name,
                email: normalizedEmail
            })
        }
    );

    const authResult = await authResponse.json();

    if (!authResponse.ok) {
        throw new Error(authResult.error || 'Erro ao atualizar usuário no Auth');
    }

    const { error: updateError } = await supabase
        .from('user_tenants')
        .update({
            role: userData.profile,
            is_active: userData.status === 'ATIVO'
        })
        .eq('id', tenantData.id);

    if (updateError) throw updateError;

    const { data: moduleData } = await supabase
        .from('system_modules')
        .select('id')
        .eq('key', 'FARMACIA')
        .single();

    if (!moduleData) throw new Error("Módulo FARMACIA não encontrado.");

    const { error: deleteScopesError } = await supabase
        .from('user_access_scopes')
        .delete()
        .eq('user_id', tenantData.user_id)
        .eq('tenant_id', tenantData.tenant_id)
        .eq('module_id', moduleData.id);

    if (deleteScopesError) throw deleteScopesError;

    if (userData.units && userData.units.length > 0) {
        const { data: unitsData } = await supabase
            .from('units')
            .select('id, name, secretariat_id')
            .in('name', userData.units);

        if (unitsData && unitsData.length > 0) {
            const scopes = unitsData.map(u => ({
                tenant_id: tenantData.tenant_id,
                user_id: tenantData.user_id,
                module_id: moduleData.id,
                secretariat_id: u.secretariat_id,
                unit_id: u.id,
                is_active: true
            }));

            const { error: scopeError } = await supabase
                .from('user_access_scopes')
                .insert(scopes);

            if (scopeError) throw scopeError;
        }
    }

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