/**
 * Dados mockados do módulo Farmácia
 * Preparados para futura substituição por chamadas Supabase.
 * NÃO alterar nenhuma outra parte do sistema.
 */

// ---------------------------------------------------------------------------
// Itens de estoque
// ---------------------------------------------------------------------------
export const mockEstoqueItems = [
  {
    id: '001',
    codigo: 'MD001',
    descricao: 'Dipirona 500mg comprimido',
    categoria: 'Analgésico',
    unidade: 'Comprimido',
    estoqueAtual: 4200,
    estoqueMinimo: 1000,
    estoquePorUnidade: { upa: 2500, umsj: 1700 },
    validade: '2026-12-01',
    setor: 'UPA',
    status: 'NORMAL',
  },
  {
    id: '002',
    codigo: 'MD002',
    descricao: 'Paracetamol 500mg comprimido',
    categoria: 'Analgésico',
    unidade: 'Comprimido',
    estoqueAtual: 1800,
    estoqueMinimo: 500,
    estoquePorUnidade: { upa: 800, umsj: 1000 },
    validade: '2026-04-10', // Vencendo em < 30 dias (hoje é 16/03/2026)
    setor: 'UMSJ',
    status: 'NORMAL',
  },
  {
    id: '003',
    codigo: 'MD003',
    descricao: 'Amoxicilina 500mg cápsula',
    categoria: 'Antibiótico',
    unidade: 'Cápsula',
    estoqueAtual: 350,
    estoqueMinimo: 400,
    estoquePorUnidade: { upa: 200, umsj: 150 },
    validade: '2026-05-05', // Vencendo 30-60 dias
    setor: 'UPA',
    status: 'ABAIXO_MINIMO',
  },
  {
    id: '004',
    codigo: 'MD004',
    descricao: 'Omeprazol 20mg cápsula',
    categoria: 'Protetor Gástrico',
    unidade: 'Cápsula',
    estoqueAtual: 1100,
    estoqueMinimo: 500,
    estoquePorUnidade: { upa: 700, umsj: 400 },
    validade: '2026-06-01', // Vencendo 60-90 dias
    setor: 'UMSJ',
    status: 'NORMAL',
  },
  {
    id: '005',
    codigo: 'MD005',
    descricao: 'Soro Fisiológico 0,9% 500ml',
    categoria: 'Solução',
    unidade: 'Frasco',
    estoqueAtual: 900,
    estoqueMinimo: 300,
    estoquePorUnidade: { upa: 600, umsj: 300 },
    validade: '2027-01-15',
    setor: 'UPA',
    status: 'NORMAL',
  },
  {
    id: '006',
    codigo: 'MD006',
    descricao: 'Losartana 50mg comprimido',
    categoria: 'Anti-hipertensivo',
    unidade: 'Comprimido',
    estoqueAtual: 2200,
    estoqueMinimo: 800,
    estoquePorUnidade: { upa: 1000, umsj: 1200 },
    validade: '2027-04-20',
    setor: 'UMSJ',
    status: 'NORMAL',
  },
  {
    id: '007',
    codigo: 'MD007',
    descricao: 'Ibuprofeno 600mg comprimido',
    categoria: 'Anti-inflamatório',
    unidade: 'Comprimido',
    estoqueAtual: 0,
    estoqueMinimo: 300,
    estoquePorUnidade: { upa: 0, umsj: 0 },
    validade: '-',
    setor: 'UMSJ',
    status: 'SEM_ESTOQUE',
  },
  {
    id: '008',
    codigo: 'MT001',
    descricao: 'Seringa 5ml',
    categoria: 'Material',
    unidade: 'Unidade',
    estoqueAtual: 5400,
    estoqueMinimo: 2000,
    estoquePorUnidade: { upa: 3400, umsj: 2000 },
    validade: '2028-06-30',
    setor: 'UPA',
    status: 'NORMAL',
  },
];

// ---------------------------------------------------------------------------
// Movimentações gerais
// ---------------------------------------------------------------------------
export const mockMovimentacoes = [
  // DIA 16/03/2026 - Entradas
  {
    id: 'm16-e1', data: '2026-03-16T08:15:00', tipo: 'ENTRADA', medicamento: 'Dipirona 500mg comprimido', codigo: 'MD001',
    quantidade: 300, unidade: 'Caixa', responsavel: 'João Mendes', setor: 'UPA', observacao: 'Recebimento de rotina'
  },
  {
    id: 'm16-e2', data: '2026-03-16T09:30:00', tipo: 'ENTRADA', medicamento: 'Paracetamol 500mg comprimido', codigo: 'MD002',
    quantidade: 200, unidade: 'Caixa', responsavel: 'Maria Silva', setor: 'UMSJ', observacao: 'Recebimento de rotina'
  },
  {
    id: 'm16-e3', data: '2026-03-16T10:45:00', tipo: 'ENTRADA', medicamento: 'Soro Fisiológico 0,9% 500ml', codigo: 'MD005',
    quantidade: 120, unidade: 'Frasco', responsavel: 'Carlos Souza', setor: 'UPA', observacao: 'Recebimento de rotina'
  },
  // DIA 16/03/2026 - Saídas
  {
    id: 'm16-s1', data: '2026-03-16T11:20:00', tipo: 'SAIDA', medicamento: 'Dipirona 500mg comprimido', codigo: 'MD001',
    quantidade: -40, unidade: 'Comprimido', responsavel: 'Ana Souza', setor: 'UPA', observacao: 'Dispensação enfermaria'
  },
  {
    id: 'm16-s2', data: '2026-03-16T14:10:00', tipo: 'SAIDA', medicamento: 'Paracetamol 500mg comprimido', codigo: 'MD002',
    quantidade: -35, unidade: 'Comprimido', responsavel: 'Roberto Alves', setor: 'UMSJ', observacao: 'Dispensação balcão'
  },
  {
    id: 'm16-s3', data: '2026-03-16T16:05:00', tipo: 'SAIDA', medicamento: 'Amoxicilina 500mg cápsula', codigo: 'MD003',
    quantidade: -20, unidade: 'Cápsula', responsavel: 'Maria Silva', setor: 'UPA', observacao: 'Dispensação com retenção de receita'
  },
  // DIA 16/03/2026 - Ajustes
  {
    id: 'm16-a1', data: '2026-03-16T17:30:00', tipo: 'AJUSTE', medicamento: 'Soro Fisiológico 0,9% 500ml', codigo: 'MD005',
    quantidade: 10, unidade: 'Frasco', responsavel: 'João Mendes', setor: 'UPA', observacao: 'Ajuste de inventário (sobra)'
  },

  // DIA 17/03/2026 - Entradas
  {
    id: 'm17-e1', data: '2026-03-17T08:00:00', tipo: 'ENTRADA', medicamento: 'Omeprazol 20mg cápsula', codigo: 'MD004',
    quantidade: 150, unidade: 'Caixa', responsavel: 'Carlos Souza', setor: 'UPA', observacao: 'Reposição semanal'
  },
  {
    id: 'm17-e2', data: '2026-03-17T10:15:00', tipo: 'ENTRADA', medicamento: 'Losartana 50mg comprimido', codigo: 'MD006',
    quantidade: 200, unidade: 'Caixa', responsavel: 'Ana Souza', setor: 'UMSJ', observacao: 'Reposição semanal'
  },
  // DIA 17/03/2026 - Saídas
  {
    id: 'm17-s1', data: '2026-03-17T11:45:00', tipo: 'SAIDA', medicamento: 'Dipirona 500mg comprimido', codigo: 'MD001',
    quantidade: -50, unidade: 'Comprimido', responsavel: 'Roberto Alves', setor: 'UPA', observacao: 'Dispensação enfermaria'
  },
  {
    id: 'm17-s2', data: '2026-03-17T13:30:00', tipo: 'SAIDA', medicamento: 'Ibuprofeno 600mg comprimido', codigo: 'MD007',
    quantidade: -30, unidade: 'Comprimido', responsavel: 'Maria Silva', setor: 'UMSJ', observacao: 'Últimas unidades dispensadas'
  },
  {
    id: 'm17-s3', data: '2026-03-17T15:20:00', tipo: 'SAIDA', medicamento: 'Paracetamol 500mg comprimido', codigo: 'MD002',
    quantidade: -25, unidade: 'Comprimido', responsavel: 'João Mendes', setor: 'UPA', observacao: 'Dispensação balcão'
  },
  // DIA 17/03/2026 - Ajustes
  {
    id: 'm17-a1', data: '2026-03-17T16:50:00', tipo: 'AJUSTE', medicamento: 'Paracetamol 500mg comprimido', codigo: 'MD002',
    quantidade: -15, unidade: 'Comprimido', responsavel: 'Carlos Souza', setor: 'UMSJ', observacao: 'Erro de lançamento no lote anterior'
  },

  // DIA 18/03/2026 - Entradas
  {
    id: 'm18-e1', data: '2026-03-18T09:00:00', tipo: 'ENTRADA', medicamento: 'Amoxicilina 500mg cápsula', codigo: 'MD003',
    quantidade: 180, unidade: 'Caixa', responsavel: 'Maria Silva', setor: 'UPA', observacao: 'Atendimento de pedido emergencial'
  },
  // DIA 18/03/2026 - Saídas
  {
    id: 'm18-s1', data: '2026-03-18T10:30:00', tipo: 'SAIDA', medicamento: 'Dipirona 500mg comprimido', codigo: 'MD001',
    quantidade: -45, unidade: 'Comprimido', responsavel: 'Ana Souza', setor: 'UPA', observacao: 'Dispensação enfermaria'
  },
  {
    id: 'm18-s2', data: '2026-03-18T14:15:00', tipo: 'SAIDA', medicamento: 'Omeprazol 20mg cápsula', codigo: 'MD004',
    quantidade: -22, unidade: 'Cápsula', responsavel: 'João Mendes', setor: 'UMSJ', observacao: 'Dispensação balcão'
  },
  {
    id: 'm18-s3', data: '2026-03-18T16:40:00', tipo: 'SAIDA', medicamento: 'Losartana 50mg comprimido', codigo: 'MD006',
    quantidade: -18, unidade: 'Comprimido', responsavel: 'Roberto Alves', setor: 'UPA', observacao: 'Dispensação contínua'
  },
  // DIA 18/03/2026 - Ajustes
  {
    id: 'm18-a1', data: '2026-03-18T17:15:00', tipo: 'AJUSTE', medicamento: 'Seringa 5ml', codigo: 'MT001',
    quantidade: 40, unidade: 'Unidade', responsavel: 'Carlos Souza', setor: 'UPA', observacao: 'Ajuste de inventário (sobra)'
  },
];

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------
export const mockEntradas = mockMovimentacoes.filter(m => m.tipo === 'ENTRADA');

// ---------------------------------------------------------------------------
// Saídas
// ---------------------------------------------------------------------------
export const mockSaidas = mockMovimentacoes.filter(m => m.tipo === 'SAIDA');

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------
export const mockAjustes = [
  {
    id: 'm16-a1', data: '2026-03-16T17:30:00', medicamento: 'Soro Fisiológico 0,9% 500ml', codigo: 'MD005',
    quantidadeAntes: 890, quantidadeApos: 900, diferenca: 10, unidade: 'Frasco', responsavel: 'João Mendes', setor: 'UPA', motivo: 'Inventário', observacao: 'Ajuste de inventário (sobra)'
  },
  {
    id: 'm17-a1', data: '2026-03-17T16:50:00', medicamento: 'Paracetamol 500mg comprimido', codigo: 'MD002',
    quantidadeAntes: 1815, quantidadeApos: 1800, diferenca: -15, unidade: 'Comprimido', responsavel: 'Carlos Souza', setor: 'UMSJ', motivo: 'Erros de lançamento', observacao: 'Erro de lançamento no lote anterior'
  },
  {
    id: 'm18-a1', data: '2026-03-18T17:15:00', medicamento: 'Seringa 5ml', codigo: 'MT001',
    quantidadeAntes: 5360, quantidadeApos: 5400, diferenca: 40, unidade: 'Unidade', responsavel: 'Carlos Souza', setor: 'UPA', motivo: 'Inventário', observacao: 'Ajuste de inventário (sobra)'
  },
  {
    id: 'm16-a2', data: '2026-03-16T10:15:00', medicamento: 'Amoxicilina 500mg cápsula', codigo: 'MD003',
    quantidadeAntes: 355, quantidadeApos: 350, diferenca: -5, unidade: 'Cápsula', responsavel: 'Maria Silva', setor: 'UPA', motivo: 'Avaria', observacao: 'Embalagem danificada'
  },
  {
    id: 'm16-a3', data: '2026-03-16T14:40:00', medicamento: 'Dipirona 500mg comprimido', codigo: 'MD001',
    quantidadeAntes: 4210, quantidadeApos: 4200, diferenca: -10, unidade: 'Comprimido', responsavel: 'João Mendes', setor: 'UPA', motivo: 'Vencimento', observacao: 'Lote retirado para descarte'
  },
  {
    id: 'm17-a2', data: '2026-03-17T09:20:00', medicamento: 'Losartana 50mg comprimido', codigo: 'MD006',
    quantidadeAntes: 2180, quantidadeApos: 2200, diferenca: 20, unidade: 'Comprimido', responsavel: 'Ana Souza', setor: 'UMSJ', motivo: 'Devolução', observacao: 'Devolução da enfermaria'
  },
];

// ---------------------------------------------------------------------------
// KPIs para o Dashboard da Farmácia
// ---------------------------------------------------------------------------
export const mockFarmaciaKPIs = {
  totalItens: mockEstoqueItems.length,
  itensCriticos: mockEstoqueItems.filter(i => i.status === 'ABAIXO_MINIMO' || i.status === 'SEM_ESTOQUE').length,
  entradasHoje: mockMovimentacoes.filter(m => m.tipo === 'ENTRADA' && m.data.startsWith(new Date().toISOString().split('T')[0])).length || 1,
  saidasHoje: mockMovimentacoes.filter(m => m.tipo === 'SAIDA' && m.data.startsWith(new Date().toISOString().split('T')[0])).length || 3,
};

// ---------------------------------------------------------------------------
// Categorias disponíveis
// ---------------------------------------------------------------------------
export const mockCategorias = [
  'Todos',
  'Analgésico',
  'Antibiótico',
  'Anti-inflamatório',
  'Protetor Gástrico',
  'Anti-hipertensivo',
  'Solução',
  'Material',
];

// ---------------------------------------------------------------------------
// Unidades operacionais
// ---------------------------------------------------------------------------
export const mockUnidades = [
  { id: 'upa',  label: 'UPA' },
  { id: 'umsj', label: 'UMSJ' },
];

// ---------------------------------------------------------------------------
// Responsáveis (para selects dos modais)
// ---------------------------------------------------------------------------
export const mockResponsaveis = [
  'João Mendes',
  'Maria Silva',
  'Carlos Souza',
  'Ana Souza',
  'Roberto Alves',
];

// ---------------------------------------------------------------------------
// Motivos de ajuste
// ---------------------------------------------------------------------------
export const mockMotivosAjuste = [
  'Inventário',
  'Avaria',
  'Devolução',
  'Vencimento',
  'Erros de lançamento',
  'Outros',
];

// ---------------------------------------------------------------------------
// Histórico de dispensações por código de medicamento (mock para modal Saída)
// ---------------------------------------------------------------------------
export const mockHistoricoDispensacoes = {
  'MD001': [
    { data: '2026-03-18', quantidade: 45, unidadeMedida: 'comprimidos', local: 'UPA' },
    { data: '2026-03-17', quantidade: 50, unidadeMedida: 'comprimidos', local: 'UPA' },
    { data: '2026-03-16', quantidade: 40, unidadeMedida: 'comprimidos', local: 'UPA' },
  ],
  'MD002': [
    { data: '2026-03-17', quantidade: 25, unidadeMedida: 'comprimidos', local: 'UPA' },
    { data: '2026-03-16', quantidade: 35, unidadeMedida: 'comprimidos', local: 'UMSJ' },
  ],
  'MD003': [
    { data: '2026-03-16', quantidade: 20, unidadeMedida: 'cápsulas', local: 'UPA' },
  ],
  'MD004': [
    { data: '2026-03-18', quantidade: 22, unidadeMedida: 'cápsulas', local: 'UMSJ' },
  ],
  'MD006': [
    { data: '2026-03-18', quantidade: 18, unidadeMedida: 'comprimidos', local: 'UPA' },
  ],
  'MD007': [
    { data: '2026-03-17', quantidade: 30, unidadeMedida: 'comprimidos', local: 'UMSJ' },
  ],
};


