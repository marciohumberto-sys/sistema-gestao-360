/**
 * Utilitário para determinar as permissões e o contexto do usuário no módulo de Planejamento.
 */
export const canWritePlanejamento = (role) => {
    return role !== 'VISUALIZADOR';
};

export const getPlanejamentoContext = (userRole, scopes) => {
    // Fallback: se não tiver scopes ou for inválido, assumimos restrito e sem secretaria, a menos que seja SUPERADMIN
    const fallbackContext = { 
        hasFullAccess: userRole === 'SUPERADMIN', 
        hasRestrictedAccess: userRole !== 'SUPERADMIN' && userRole !== 'VISUALIZADOR', 
        primarySecretariatId: null, 
        primarySecretariatName: null,
        allowedSecretariatIds: [],
        allowedSecretariatNames: [],
        hasMultipleRestrictedSecretariats: false
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

    if (!primarySecretariatId && userRole !== 'SUPERADMIN' && userRole !== 'VISUALIZADOR') {
        console.log("Escopo principal do Planejamento não encontrado no AuthContext");
        return fallbackContext;
    }

    const hasFullAccess =
        userRole === 'SUPERADMIN' ||
        primarySecretariatName === 'Planejamento e Inovação' ||
        primarySecretariatName === 'Gabinete';

    const hasRestrictedAccess = !hasFullAccess && userRole !== 'VISUALIZADOR';

    let planningActiveScopes = scopes.filter(scope => 
        scope.module_key === 'PLANEJAMENTO_ESTRATEGICO' && 
        scope.is_active === true && 
        scope.secretariat_id
    );

    // INVERSÃO DA REGRA: 
    // Se não for full access e o perfil for diferente de GESTOR (ex: OPERADOR), 
    // limitamos as secretarias permitidas apenas à principal.
    if (hasRestrictedAccess && userRole !== 'GESTOR') {
        planningActiveScopes = planningActiveScopes.filter(scope => scope.is_primary_secretariat === true);
    }

    const allowedSecretariatIds = planningActiveScopes.map(s => s.secretariat_id);
    const allowedSecretariatNames = planningActiveScopes.map(s => s.secretariat_name);
    
    // Múltiplas secretarias apenas para GESTOR restrito
    const hasMultipleRestrictedSecretariats = hasRestrictedAccess && userRole === 'GESTOR' && allowedSecretariatIds.length > 1;

    return {
        hasFullAccess,
        hasRestrictedAccess,
        primarySecretariatId,
        primarySecretariatName,
        allowedSecretariatIds,
        allowedSecretariatNames,
        hasMultipleRestrictedSecretariats
    };
};
