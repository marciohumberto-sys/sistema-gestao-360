import { supabase } from '../lib/supabase';

export const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
};

export const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getUserTenantAndScopes = async (userId) => {
    // 1. Busca vínculo principal em user_tenants
    const { data: tenantLink, error: tenantError } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

    if (tenantError) {
        if (tenantError.code === 'PGRST116') { // Não encontrou nenhum registro
            return { tenantLink: null, scopes: [], accessibleModules: [], isSuperAdmin: false };
        }
        throw tenantError;
    }

    if (!tenantLink) {
        return { tenantLink: null, scopes: [], accessibleModules: [], isSuperAdmin: false };
    }

    const isSuperAdmin = tenantLink.role === 'SUPERADMIN';
    let scopes = [];
    let accessibleModules = [];

    if (!isSuperAdmin) {
        // 2. Busca escopos em user_access_scopes com join implicito
        const { data: scopesData, error: scopesError } = await supabase
            .from('user_access_scopes')
            .select(`
                id,
                module_id,
                secretariat_id,
                unit_id,
                system_modules (
                    key
                )
            `)
            .eq('user_id', userId)
            .eq('tenant_id', tenantLink.tenant_id)
            .eq('is_active', true);

        if (scopesError) {
            console.error('Erro ao buscar escopos:', scopesError);
            throw scopesError;
        }

        if (scopesData) {
            scopes = scopesData.map(s => ({
                id: s.id,
                module_id: s.module_id,
                secretariat_id: s.secretariat_id,
                unit_id: s.unit_id,
                module_key: s.system_modules?.key,
                module_name: s.system_modules?.key
            }));
            
            // Derivar os módulos acessíveis
            const moduleKeys = new Set(scopes.map(s => s.module_key).filter(Boolean));
            accessibleModules = Array.from(moduleKeys);
        }
    }

    return { tenantLink, scopes, accessibleModules, isSuperAdmin };
};
