/**
 * laboratorioAcl.js
 * Utilitário centralizado para Controle de Acesso Baseado em Perfis (RBAC) do módulo Laboratório.
 */

export const canViewLaboratorio = (role) => {
    return ['SUPERADMIN', 'ADMIN', 'GESTOR', 'OPERADOR', 'ADMINISTRADOR', 'RECEPCAO', 'COLETA', 'TECNICO', 'BIOMEDICO', 'VISUALIZADOR'].includes(role);
};

export const canManageLaboratorioUsers = (role) => {
    return ['SUPERADMIN', 'ADMIN', 'GESTOR', 'ADMINISTRADOR'].includes(role);
};

export const canAccessLaboratorio = (role, featurePath) => {
    if (!role || !featurePath) return false;

    // Proteção de Usuários e Configurações: Apenas Administrador
    if (featurePath.startsWith('/laboratorio/usuarios') || featurePath.startsWith('/laboratorio/configuracoes')) {
        return canManageLaboratorioUsers(role);
    }

    // Acesso básico de visualização
    if (!canViewLaboratorio(role)) return false;

    // ADMINISTRADOR, ADMIN e Superiores têm acesso total a todas as outras rotas
    if (['SUPERADMIN', 'ADMIN', 'GESTOR', 'ADMINISTRADOR'].includes(role)) {
        return true;
    }

    // VISUALIZADOR e OPERADOR (fallback) acessam o dashboard e visualizações operacionais
    if (role === 'VISUALIZADOR' || role === 'OPERADOR') {
        const allowedPaths = [
            '/laboratorio/dashboard',
            '/laboratorio/pacientes',
            '/laboratorio/coleta',
            '/laboratorio/mapas',
            '/laboratorio/resultados',
            '/laboratorio/relatorios'
        ];
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    if (role === 'RECEPCAO') {
        const allowedPaths = [
            '/laboratorio/dashboard',
            '/laboratorio/pacientes',
            '/laboratorio/coleta'
        ];
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    if (role === 'COLETA') {
        const allowedPaths = [
            '/laboratorio/dashboard',
            '/laboratorio/coleta',
            '/laboratorio/mapas'
        ];
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    if (role === 'TECNICO') {
        const allowedPaths = [
            '/laboratorio/dashboard',
            '/laboratorio/mapas',
            '/laboratorio/resultados'
        ];
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    if (role === 'BIOMEDICO') {
        const allowedPaths = [
            '/laboratorio/dashboard',
            '/laboratorio/conferencia',
            '/laboratorio/laudos'
        ];
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    return false;
};
