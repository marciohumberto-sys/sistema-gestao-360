export const MODULE_ROUTES = {
    FARMACIA: '/farmacia/dashboard',
    COMPRAS: '/compras/dashboard',
};

export const normalizeEmail = (login, pathname, moduleContext) => {
    const trimmedLogin = login.trim().toLowerCase();
    
    // Regras prioritárias (Exceções Fixas)
    if (trimmedLogin === 'marcio.humberto') {
        console.log(`[AUTH DEBUG] Login Normalizado (Exceção Marcio)`);
        return ['marcio.humberto@gmail.com'];
    }

    if (trimmedLogin === 'samara.raquel') {
        console.log(`[AUTH DEBUG] Login Normalizado (Exceção Samara)`);
        return ['samara.raquel@compras.local'];
    }

    // 1. Priorizar context explícito (passado por state do ProtectedRoute ou URL pura)
    let domain = '';
    let contextName = '';

    if (moduleContext === 'COMPRAS' || pathname?.includes('/compras')) {
        domain = '@compras.local';
        contextName = 'Compras (Rota/Contexto)';
    } else if (moduleContext === 'FARMACIA' || pathname?.includes('/farmacia')) {
        domain = '@farmacia.local';
        contextName = 'Farmácia (Rota/Contexto)';
    }

    // 2. Se contexto primário falhar, tentamos o localStorage
    if (!domain) {
        const lastModule = localStorage.getItem('last_module');
        if (lastModule === 'COMPRAS') {
            domain = '@compras.local';
            contextName = 'Compras (Storage)';
        } else if (lastModule === 'FARMACIA') {
            domain = '@farmacia.local';
            contextName = 'Farmácia (Storage)';
        }
    }

    console.log(`[AUTH DEBUG] Login Digitado: ${login}`);
    console.log(`[AUTH DEBUG] Rota / Contexto Solicitado: ${pathname || 'Vazio'} / ${moduleContext || 'Vazio'}`);

    // 3. Se AINDA assim não houver domínio explícito (ex: aba anônima), NÃO FORÇAR farmacia.
    // Em vez de mascarar a intenção do usuário, devolvemos listagem estrita pra fallback duplo e controlado.
    if (!domain) {
        console.log(`[AUTH DEBUG] Situação sem contexto. Preparando fallback inteligente duplo.`);
        const fallbackList = [`${trimmedLogin}@compras.local`, `${trimmedLogin}@farmacia.local`];
        console.log(`[AUTH DEBUG] Logando com array de contingência: ${fallbackList.join(', ')}`);
        return fallbackList;
    }

    const normalizedEmail = `${trimmedLogin}${domain}`;
    console.log(`[AUTH DEBUG] Domínio Resolvido Explicitamente via [${contextName}]: ${domain}`);
    console.log(`[AUTH DEBUG] Login Normalizado Final: ${normalizedEmail}`);
    
    return [normalizedEmail];
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

/**
 * Retorna o caminho de redirecionamento correto ao clicar na logo, 
 * baseando-se no contexto atual do usuário e permissões.
 */
export const getLogoClickRedirectPath = (pathname, isSuperAdmin, accessibleModules, tenantLink) => {
    // 1. SuperAdmin sempre vai para o Hub / Home
    if (isSuperAdmin) return '/home';

    // 2. Se o usuário estiver dentro de um módulo, redirecionar para o dashboard desse módulo
    if (pathname?.startsWith('/farmacia')) return MODULE_ROUTES.FARMACIA;
    if (pathname?.startsWith('/compras')) return MODULE_ROUTES.COMPRAS;

    // 3. Fora de contexto, aplicar regra de fallback:
    
    // Fallback 1: Último módulo acessado (persistido localmente)
    const lastModule = localStorage.getItem('last_module');
    if (lastModule && accessibleModules?.includes(lastModule)) {
        return MODULE_ROUTES[lastModule];
    }

    // Fallback 2: Módulo padrão definido no perfil (user_tenants)
    const defaultModule = tenantLink?.default_module;
    if (defaultModule && accessibleModules?.includes(defaultModule)) {
        return MODULE_ROUTES[defaultModule];
    }

    // Fallback 3: Primeira permissão disponível
    if (accessibleModules && accessibleModules.length > 0) {
        const firstModule = accessibleModules[0];
        return MODULE_ROUTES[firstModule] || '/home';
    }

    // Se tudo falhar, /home (que no App.jsx redirecionará conforme auth se necessário)
    return '/home';
};
