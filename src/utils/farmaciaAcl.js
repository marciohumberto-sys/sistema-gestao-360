/**
 * farmaciaAcl.js
 * Utilitário centralizado para Controle de Acesso Baseado em Perfis (RBAC) do módulo Farmácia.
 */

export const canAccessFarmacia = (role, featurePath) => {
    if (!role || !featurePath) return false;

    // SUPERADMIN, ADMIN e GESTOR têm acesso total ao módulo
    if (['SUPERADMIN', 'ADMIN', 'GESTOR'].includes(role)) {
        return true;
    }

    // OPERADOR acessa apenas um subset estrito
    if (role === 'OPERADOR') {
        const allowedPaths = [
            '/farmacia/dashboard',
            '/farmacia/saidas',
            '/farmacia/movimentacoes'
        ];
        
        // Verifica se a featurePath requisitada começa com algum dos caminhos permitidos (para abraçar rotas filhas se houver)
        return allowedPaths.some(p => featurePath.startsWith(p));
    }

    // Outros perfis são negados por padrão
    return false;
};
