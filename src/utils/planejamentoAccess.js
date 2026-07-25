/**
 * Utilitário para determinar as permissões e o contexto do usuário no módulo de Planejamento.
 */
export const getPlanejamentoContext = (userRole, scopes) => {
    // Fallback: se não tiver scopes ou for inválido, assumimos restrito e sem secretaria, a menos que seja SUPERADMIN
    const fallbackContext = { 
        hasFullAccess: userRole === 'SUPERADMIN', 
        hasRestrictedAccess: userRole !== 'SUPERADMIN', 
        primarySecretariatId: null, 
        primarySecretariatName: null 
    };

    if (!scopes || !Array.isArray(scopes)) {
        return fallbackContext;
    }

    const planningPrimaryScope = scopes.find(scope =>
        scope.module_key === 'PLANEJAMENTO_ESTRATEGICO' &&
        scope.is_active === true &&
        scope.is_primary_secretariat === true
    );

    const primarySecretariatId = planningPrimaryScope?.secretariat_id || null;
    const primarySecretariatName = planningPrimaryScope?.secretariat_name || null;

    if (!primarySecretariatId && userRole !== 'SUPERADMIN') {
        console.log("Escopo principal do Planejamento não encontrado no AuthContext");
        return fallbackContext;
    }

    const hasFullAccess =
        userRole === 'SUPERADMIN' ||
        primarySecretariatName === 'Planejamento e Inovação' ||
        primarySecretariatName === 'Gabinete';

    const hasRestrictedAccess = !hasFullAccess;

    return {
        hasFullAccess,
        hasRestrictedAccess,
        primarySecretariatId,
        primarySecretariatName
    };
};
