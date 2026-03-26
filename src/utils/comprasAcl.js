/**
 * comprasAcl.js
 * Controle de Acesso Baseado em Perfis (RBAC) para o módulo Compras.
 * Espelha a estrutura de farmaciaAcl.js.
 */

export const canAccessComprasUsuarios = (role) => {
    return ['SUPERADMIN', 'ADMIN', 'GESTOR'].includes(role);
};

export const canAccessCompras = (role, featurePath) => {
    if (!role || !featurePath) return false;

    if (['SUPERADMIN', 'ADMIN', 'GESTOR'].includes(role)) return true;

    if (role === 'OPERADOR') {
        const allowedPaths = [
            '/compras/dashboard',
            '/compras/ordens-fornecimento',
            '/compras/notas-fiscais',
        ];
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    if (role === 'VISUALIZADOR') {
        const allowedPaths = [
            '/compras/dashboard',
            '/compras/contratos',
            '/compras/empenhos',
            '/compras/relatorios',
        ];
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    return false;
};
