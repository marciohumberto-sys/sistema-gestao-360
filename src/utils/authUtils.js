export const MODULE_ROUTES = {
    FARMACIA: '/farmacia/dashboard',
    COMPRAS: '/compras/dashboard',
    PLANEJAMENTO_ESTRATEGICO: '/planejamento/dashboard',
};

export const normalizeEmail = (login, pathname, moduleContext) => {
    const trimmedLogin = login.trim().toLowerCase();

    console.log(`[AUTH DEBUG] Login Digitado: ${login}`);

    // Se o usuário digitou um email completo com @, respeitar exatamente o valor digitado
    if (trimmedLogin.includes('@')) {
        console.log(`[AUTH DEBUG] Login com domínio detectado. Usando literal: ${trimmedLogin}`);
        return [trimmedLogin];
    }
    
    // Regra prioritária (Exceção Fixa)
    if (trimmedLogin === 'marcio.humberto') {
        console.log(`[AUTH DEBUG] Login Normalizado (Exceção Marcio)`);
        return ['marcio.humberto@gmail.com'];
    }

    // Normalizar padrão para @sistema.local
    const domain = '@sistema.local';
    const normalizedEmail = `${trimmedLogin}${domain}`;
    
    console.log(`[AUTH DEBUG] Domínio Resolvido Padrão: ${domain}`);
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
    if (pathname?.startsWith('/planejamento')) return MODULE_ROUTES.PLANEJAMENTO_ESTRATEGICO;

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

    // Fallback 3: Regra de Hub para multi-módulo
    if (accessibleModules && accessibleModules.length > 1) {
        return '/home';
    }

    // Fallback 4: Primeira permissão disponível (para usuários de módulo único)
    if (accessibleModules && accessibleModules.length === 1) {
        const firstModule = accessibleModules[0];
        return MODULE_ROUTES[firstModule] || '/home';
    }

    // Se tudo falhar, /home
    return '/home';
};
