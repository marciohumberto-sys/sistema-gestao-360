/**
 * farmaciaAcl.js
 * Utilitário centralizado para Controle de Acesso Baseado em Perfis (RBAC) do módulo Farmácia.
 */

export const canViewFarmacia = (role) => {
    return ['SUPERADMIN', 'ADMIN', 'GESTOR', 'OPERADOR', 'VISUALIZADOR'].includes(role);
};

export const canWriteFarmacia = (role) => {
    return ['SUPERADMIN', 'ADMIN', 'GESTOR', 'OPERADOR'].includes(role);
};

export const canManageFarmaciaUsers = (role) => {
    return ['SUPERADMIN', 'ADMIN', 'GESTOR'].includes(role);
};

export const canAccessFarmacia = (role, featurePath) => {
    if (!role || !featurePath) return false;

    // Proteção de Usuários: Apenas Perfis Administrativos
    if (featurePath.startsWith('/farmacia/usuarios')) {
        return canManageFarmaciaUsers(role);
    }

    // Acesso básico de visualização
    if (!canViewFarmacia(role)) return false;

    // GESTOR e Superiores têm acesso total a todas as outras rotas
    if (['SUPERADMIN', 'ADMIN', 'GESTOR'].includes(role)) {
        return true;
    }

    // VISUALIZADOR acessa o dashboard e visualizações operacionais
    if (role === 'VISUALIZADOR') {
        const allowedPaths = [
            '/farmacia/dashboard',
            '/farmacia/estoque',
            '/farmacia/entradas',
            '/farmacia/saidas',
            '/farmacia/movimentacoes',
            '/farmacia/relatorios'
        ];
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    // OPERADOR acessa apenas um subset estrito
    if (role === 'OPERADOR') {
        const allowedPaths = [
            '/farmacia/dashboard',
            '/farmacia/saidas',
            '/farmacia/movimentacoes'
        ];
        
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    return false;
};
