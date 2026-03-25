export const MODULE_ROUTES = {
    FARMACIA: '/farmacia/dashboard',
    COMPRAS: '/compras/dashboard',
};

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
        return MODULE_ROUTES[accessibleModules[0]] || '/home';
    }

    return '/home';
};
