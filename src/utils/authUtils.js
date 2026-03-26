export const MODULE_ROUTES = {
    FARMACIA: '/farmacia/dashboard',
    COMPRAS: '/compras/dashboard',
};

export const normalizeEmail = (login, pathname, moduleContext) => {
    const trimmedLogin = login.trim().toLowerCase();
    
    // Regras prioritárias (Exceções Fixas)
    if (trimmedLogin === 'marcio.humberto') {
        const normalized = 'marcio.humberto@gmail.com';
        console.log(`[AUTH DEBUG] Login Normalizado (Exceção Marcio): ${login} -> ${normalized}`);
        return normalized;
    }

    if (trimmedLogin === 'samara.raquel') {
        const normalized = 'samara.raquel@compras.local';
        console.log(`[AUTH DEBUG] Login Normalizado (Exceção Samara): ${login} -> ${normalized}`);
        return normalized;
    }

    // Priorizar context explícito (passado por state do ProtectedRoute ou manually)
    let domain = '';
    let contextName = '';

    if (moduleContext === 'COMPRAS' || pathname?.includes('/compras')) {
        domain = '@compras.local';
        contextName = 'Compras';
    } else if (moduleContext === 'FARMACIA' || pathname?.includes('/farmacia')) {
        domain = '@farmacia.local';
        contextName = 'Farmácia';
    }

    // Se nenhum contexto for detectado, ainda assim não podemos retornar vazio para o Supabase
    // então usaremos Farmácia como último recurso, mas logando o "chute".
    if (!domain) {
        domain = '@farmacia.local';
        contextName = 'Não detectado (Fallback Farmácia)';
    }

    const normalizedEmail = `${trimmedLogin}${domain}`;
    console.log(`[AUTH DEBUG] Login Digitado: ${login}`);
    console.log(`[AUTH DEBUG] Pathname de Referência: ${pathname || 'Nenhum'}`);
    console.log(`[AUTH DEBUG] Contexto Real Recebido: ${moduleContext || 'Nenhum'}`);
    console.log(`[AUTH DEBUG] Domínio Escolhido: ${domain}`);
    console.log(`[AUTH DEBUG] Login Normalizado Final: ${normalizedEmail}`);
    
    return normalizedEmail;
};

export const getPostLoginRedirectPath = (tenantLink, isSuperAdmin, accessibleModules, userEmail) => {
    // Regra prioritária absoluta para marcio.humberto@gmail.com
    if (userEmail === 'marcio.humberto@gmail.com') {
        console.log('[AUTH DEBUG] Redirecionamento prioritário (Marcio) -> /home');
        return '/home';
    }

    if (!tenantLink || !tenantLink.is_active) {
        return '/acesso-negado';
    }

    if (isSuperAdmin) {
        return '/home';
    }

    if (!accessibleModules || accessibleModules.length === 0) {
        return '/acesso-negado';
    }

    if (accessibleModules.length === 1) {
        return MODULE_ROUTES[accessibleModules[0]] || '/home';
    }

    return '/home';
};
