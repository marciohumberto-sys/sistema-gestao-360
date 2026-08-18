/**
 * comprasAcl.js
 * Controle de Acesso Baseado em Perfis (RBAC) para o módulo Compras.
 * Espelha a estrutura de farmaciaAcl.js.
 */

export const canViewCompras = (role) => {
    return ['SUPERADMIN', 'ADMIN', 'GESTOR', 'OPERADOR', 'VISUALIZADOR'].includes(role);
};

export const canWriteCompras = (role) => {
    return ['SUPERADMIN', 'ADMIN', 'GESTOR', 'OPERADOR'].includes(role);
};

export const canAccessComprasUsuarios = (role) => {
    return ['SUPERADMIN', 'ADMIN', 'GESTOR'].includes(role);
};

export const canAccessCompras = (role, featurePath) => {
    if (!role || !featurePath) return false;

    if (featurePath.startsWith('/compras/usuarios')) {
        return canAccessComprasUsuarios(role);
    }

    if (!canViewCompras(role)) return false;

    if (['SUPERADMIN', 'ADMIN', 'GESTOR', 'VISUALIZADOR'].includes(role)) return true;

    if (role === 'OPERADOR') {
        const allowedPaths = [
            '/compras/dashboard',
            '/compras/ordens-fornecimento',
            '/compras/notas-fiscais',
        ];
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    return false;
};
