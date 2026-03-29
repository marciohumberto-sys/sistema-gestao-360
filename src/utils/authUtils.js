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
