export const PLANNING_ACTION_TYPES = {
    'PROJETO': { 
        value: 'PROJETO', label: 'Projeto', color: '#2563eb', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)',
        stages: [
            { label: 'Planejamento inicial', progress: 10 },
            { label: 'Parte introdutória', progress: 20 },
            { label: 'Desenvolvimento', progress: 40 },
            { label: 'Execução parcial', progress: 60 },
            { label: 'Finalização', progress: 80 },
            { label: 'Concluído', progress: 100 }
        ]
    },
    'OBRA': { 
        value: 'OBRA', label: 'Obra', color: '#d97706', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)',
        stages: [
            { label: 'Planejamento', progress: 10 },
            { label: 'Licitação/Contratação', progress: 20 },
            { label: 'Ordem de Serviço', progress: 30 },
            { label: 'Execução inicial', progress: 45 },
            { label: 'Execução intermediária', progress: 65 },
            { label: 'Execução final', progress: 85 },
            { label: 'Concluída', progress: 100 }
        ]
    },
    'SERVICO': { 
        value: 'SERVICO', label: 'Serviço', color: '#059669', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)',
        stages: [
            { label: 'Planejamento', progress: 10 },
            { label: 'Contratação', progress: 25 },
            { label: 'Início da execução', progress: 40 },
            { label: 'Execução em andamento', progress: 70 },
            { label: 'Finalizado', progress: 100 }
        ]
    },
    'PROGRAMA': { 
        value: 'PROGRAMA', label: 'Programa', color: '#7c3aed', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)',
        stages: [
            { label: 'Planejamento', progress: 10 },
            { label: 'Mobilização', progress: 25 },
            { label: 'Execução inicial', progress: 40 },
            { label: 'Execução continuada', progress: 70 },
            { label: 'Avaliação/Encerramento', progress: 100 }
        ]
    },
    'AQUISICAO': { 
        value: 'AQUISICAO', label: 'Aquisição', color: '#0d9488', bg: 'rgba(20, 184, 166, 0.1)', border: 'rgba(20, 184, 166, 0.2)',
        stages: null // Sem etapas automáticas
    },
    'ACAO_PONTUAL': { 
        value: 'ACAO_PONTUAL', label: 'Ação Pontual', color: '#db2777', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.2)',
        stages: null // Sem etapas automáticas
    },
    'ACAO': { 
        value: 'ACAO', label: 'Ação Pontual', color: '#db2777', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.2)',
        stages: null // Compatibilidade legado
    }
};

// Array para iteração em selects/filtros (excluindo o legado 'ACAO' para não duplicar opções)
export const PLANNING_ACTION_TYPES_ARRAY = Object.values(PLANNING_ACTION_TYPES)
    .filter(t => t.value !== 'ACAO')
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

export const getActionTypeConfig = (type) => {
    return PLANNING_ACTION_TYPES[type] || PLANNING_ACTION_TYPES['ACAO_PONTUAL'];
};

export const getActionTypeStages = (type) => {
    const config = getActionTypeConfig(type);
    return config?.stages || null;
};

export const getStageProgress = (type, stageLabel) => {
    const stages = getActionTypeStages(type);
    if (!stages) return null;
    const stage = stages.find(s => s.label === stageLabel);
    return stage ? stage.progress : null;
};
