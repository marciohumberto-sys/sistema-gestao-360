export const getPostLoginRedirectPath = (tenantLink, isSuperAdmin, accessibleModules) => {
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
        const mod = accessibleModules[0];
        if (mod === 'FARMACIA') return '/farmacia/dashboard';
        if (mod === 'COMPRAS') return '/compras/dashboard';
    }

    return '/home';
};
