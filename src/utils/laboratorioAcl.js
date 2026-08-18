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

export const canWriteLaboratorio = (role) => {
    if (role === 'VISUALIZADOR') return false;
    return true; // As outras roles já têm acesso por rota, se passaram nelas, podem escrever no seu escopo
};

export const canAccessLaboratorio = (role, featurePath) => {
    if (!role || !featurePath) return false;

    // Proteção de Usuários e Configurações: Apenas Administrador
    if (featurePath.startsWith('/laboratorio/usuarios') || featurePath.startsWith('/laboratorio/configuracoes')) {
        return canManageLaboratorioUsers(role);
    }

    // Acesso básico de visualização
    if (!canViewLaboratorio(role)) return false;

    // ADMINISTRADOR, ADMIN, Superiores e VISUALIZADOR têm acesso total a todas as outras rotas permitidas
    if (['SUPERADMIN', 'ADMIN', 'GESTOR', 'ADMINISTRADOR', 'VISUALIZADOR'].includes(role)) {
        return true;
    }

    // OPERADOR (fallback) acessa o dashboard e visualizações operacionais
    if (role === 'OPERADOR') {
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
            '/laboratorio/coleta',
            '/laboratorio/mapas',
            '/laboratorio/resultados',
            '/laboratorio/laudos'
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
            '/laboratorio/pacientes',
            '/laboratorio/coleta',
            '/laboratorio/mapas',
            '/laboratorio/resultados',
            '/laboratorio/laudos',
            '/laboratorio/relatorios'
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
