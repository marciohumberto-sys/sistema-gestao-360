export const mockPlanejamentoDashboard = {
    kpis: {
        totalAcoes: 145,
        emAndamento: 89,
        concluidas: 34,
        naoIniciadas: 22,
        emRisco: 15,
        problemasAbertos: 8
    },
    execucao: [
        { name: 'Jan', NaoIniciadas: 5, EmAndamento: 15, Concluidas: 2 },
        { name: 'Fev', NaoIniciadas: 4, EmAndamento: 18, Concluidas: 5 },
        { name: 'Mar', NaoIniciadas: 6, EmAndamento: 20, Concluidas: 8 },
        { name: 'Abr', NaoIniciadas: 3, EmAndamento: 15, Concluidas: 12 },
        { name: 'Mai', NaoIniciadas: 4, EmAndamento: 21, Concluidas: 7 }
    ],
    distribuicaoEixos: [
        { name: 'Saúde e Bem-Estar', value: 45 },
        { name: 'Educação e Inovação', value: 35 },
        { name: 'Infraestrutura', value: 30 },
        { name: 'Gestão Eficiente', value: 20 },
        { name: 'Segurança', value: 15 }
    ],
    problemasCriticos: [
        { id: 1, problema: 'Atraso na liberação de verba', severidade: 'CRITICO', acao: 'Construção da UPA', responsavel: 'Sec. Obras', prazo: '15/04/2026' },
        { id: 2, problema: 'Falta de material de apoio', severidade: 'ALTO', acao: 'Campanha de Vacinação', responsavel: 'Sec. Saúde', prazo: '20/04/2026' },
        { id: 3, problema: 'Licitação travada no jurídico', severidade: 'CRITICO', acao: 'Reforma da Escola Base', responsavel: 'Sec. Educação', prazo: '22/04/2026' },
        { id: 4, problema: 'Divergência de projeto', severidade: 'MEDIO', acao: 'Pavimentação Zona Sul', responsavel: 'Sec. Obras', prazo: '25/04/2026' },
        { id: 5, problema: 'Sistema fora do ar', severidade: 'ALTO', acao: 'Implantação do ERP', responsavel: 'Sec. Administração', prazo: '28/04/2026' }
    ],
    rankingSetores: [
        { id: 1, setor: 'Secretaria de Obras', problemas: 5 },
        { id: 2, setor: 'Secretaria de Saúde', problemas: 3 },
        { id: 3, setor: 'Secretaria de Educação', problemas: 2 },
        { id: 4, setor: 'Secretaria de Administração', problemas: 1 }
    ],
    acoesSemUpdate: [
        { id: 101, acao: 'Revitalização do Parque Central', status: 'EM ANDAMENTO', progresso: 45, ultimaAtualizacao: '15/03/2026' },
        { id: 102, acao: 'Curso de Qualificação Profissional', status: 'NÃO INICIADA', progresso: 0, ultimaAtualizacao: '20/03/2026' },
        { id: 103, acao: 'Revisão do Plano Diretor', status: 'EM ANDAMENTO', progresso: 15, ultimaAtualizacao: '25/03/2026' },
        { id: 104, acao: 'Ampliação da Frota Escolar', status: 'EM ANDAMENTO', progresso: 60, ultimaAtualizacao: '28/03/2026' }
    ],
    acoesEmRisco: [
        { id: 201, acao: 'Construção da UPA Norte', progresso: 12, problemas: 2, statusGeral: 'CRITICO' },
        { id: 202, acao: 'Reforma da Escola Base', progresso: 35, problemas: 1, statusGeral: 'ATENCAO' },
        { id: 203, acao: 'Implantação do ERP Municipal', progresso: 80, problemas: 1, statusGeral: 'ATENCAO' },
        { id: 204, acao: 'Nova Ponte Secundária', progresso: 5, problemas: 3, statusGeral: 'CRITICO' }
    ]
};
