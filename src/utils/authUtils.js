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

    // Lista de domínios conhecidos para tentativa sequencial
    const allDomains = [
        '@sistema.local',
        '@farmacia.local',
        '@compras.local',
        '@planejamento.local'
    ];

    // Determinar domínio prioritário baseado no contexto da URL ou do estado do app
    let priorityDomain = null;
    if (moduleContext === 'FARMACIA' || pathname?.includes('/farmacia')) {
        priorityDomain = '@farmacia.local';
    } else if (moduleContext === 'COMPRAS' || pathname?.includes('/compras')) {
        priorityDomain = '@compras.local';
    } else if (moduleContext === 'PLANEJAMENTO' || pathname?.includes('/planejamento')) {
        // Atualmente o planejamento usa @sistema.local, mas mantemos a lógica de prioridade
        priorityDomain = '@sistema.local';
    }

    // Construir lista única de tentativas
    const emailsToTry = [];
    
    // 1. Tentar primeiro o domínio do contexto atual (se existir)
    if (priorityDomain) {
        emailsToTry.push(`${trimmedLogin}${priorityDomain}`);
        console.log(`[AUTH DEBUG] Prioridade de domínio detectada: ${priorityDomain}`);
    }
    
    // 2. Adicionar os outros domínios como fallback (sem duplicar o prioritário)
    allDomains.forEach(domain => {
        const email = `${trimmedLogin}${domain}`;
        if (!emailsToTry.includes(email)) {
            emailsToTry.push(email);
        }
    });

    console.log(`[AUTH DEBUG] Lista de tentativas gerada: ${emailsToTry.join(', ')}`);
    
    return emailsToTry;
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
