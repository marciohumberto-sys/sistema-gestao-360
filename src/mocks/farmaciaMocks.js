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
    descricao: 'Paracetamol 500mg comprimido',
    categoria: 'Analgésico',
    unidade: 'Comprimido',
    estoqueAtual: 4800,
    estoqueMinimo: 500,
    estoquePorUnidade: { upa: 2800, umsj: 2000 },
    validade: '2026-08-31',
    setor: 'UPA',
    status: 'NORMAL',
  },
  {
    id: '002',
    codigo: 'MD002',
    descricao: 'Amoxicilina 500mg cápsula',
    categoria: 'Antibiótico',
    unidade: 'Cápsula',
    estoqueAtual: 320,
    estoqueMinimo: 400,
    estoquePorUnidade: { upa: 200, umsj: 120 },
    validade: '2026-05-15',
    setor: 'UMSJ',
    status: 'ABAIXO_MINIMO',
  },
  {
    id: '003',
    codigo: 'MD003',
    descricao: 'Dipirona Sódica 500mg comprimido',
    categoria: 'Analgésico',
    unidade: 'Comprimido',
    estoqueAtual: 6200,
    estoqueMinimo: 1000,
    estoquePorUnidade: { upa: 3500, umsj: 2700 },
    validade: '2027-01-20',
    setor: 'UPA',
    status: 'NORMAL',
  },
  {
    id: '004',
    codigo: 'MD004',
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
    id: '005',
    codigo: 'MD005',
    descricao: 'Soro Fisiológico 0,9% 500ml',
    categoria: 'Solução',
    unidade: 'Frasco',
    estoqueAtual: 850,
    estoqueMinimo: 200,
    estoquePorUnidade: { upa: 500, umsj: 350 },
    validade: '2026-12-01',
    setor: 'UPA',
    status: 'NORMAL',
  },
  {
    id: '006',
    codigo: 'MD006',
    descricao: 'Omeprazol 20mg cápsula',
    categoria: 'Protetor Gástrico',
    unidade: 'Cápsula',
    estoqueAtual: 1100,
    estoqueMinimo: 500,
    estoquePorUnidade: { upa: 650, umsj: 450 },
    validade: '2026-09-10',
    setor: 'UMSJ',
    status: 'NORMAL',
  },
  {
    id: '007',
    codigo: 'MD007',
    descricao: 'Metformina 850mg comprimido',
    categoria: 'Antidiabético',
    unidade: 'Comprimido',
    estoqueAtual: 95,
    estoqueMinimo: 400,
    estoquePorUnidade: { upa: 60, umsj: 35 },
    validade: '2026-04-30',
    setor: 'UPA',
    status: 'ABAIXO_MINIMO',
  },
  {
    id: '008',
    codigo: 'MT001',
    descricao: 'Seringa Descartável 5ml',
    categoria: 'Material',
    unidade: 'Unidade',
    estoqueAtual: 3400,
    estoqueMinimo: 1000,
    estoquePorUnidade: { upa: 2000, umsj: 1400 },
    validade: '2028-06-30',
    setor: 'UMSJ',
    status: 'NORMAL',
  },
];

// ---------------------------------------------------------------------------
// Movimentações gerais
// ---------------------------------------------------------------------------
export const mockMovimentacoes = [
  {
    id: 'm001',
    data: '2026-03-14T08:30:00',
    tipo: 'ENTRADA',
    medicamento: 'Paracetamol 500mg comprimido',
    codigo: 'MD001',
    quantidade: 2000,
    unidade: "Pacote",
    responsavel: "João Mendes",
    setor: "UMSJ",
    observacao: "Regularização de estoque contábil do mês.",
  },
  {
    id: 'm002',
    data: '2026-03-14T09:15:00',
    tipo: 'SAIDA',
    medicamento: 'Dipirona Sódica 500mg comprimido',
    codigo: 'MD003',
    quantidade: 200,
    unidade: "Comprimido",
    responsavel: "Roberto Alves",
    setor: "UMSJ",
    observacao: "Envio de insumos para ala pediátrica.",
  },
  {
    id: 'm003',
    data: '2026-03-13T14:00:00',
    tipo: 'SAIDA',
    medicamento: 'Soro Fisiológico 0,9% 500ml',
    codigo: 'MD005',
    quantidade: 50,
    unidade: 'Frasco',
    responsavel: 'Carlos Lima',
    setor: 'UPA',
    observacao: '',
  },
  {
    id: 'm004',
    data: '2026-03-13T11:20:00',
    tipo: 'AJUSTE',
    medicamento: 'Amoxicilina 500mg cápsula',
    codigo: 'MD002',
    quantidade: -80,
    unidade: "Caixa",
    responsavel: "Ana Souza",
    setor: "UPA",
    observacao: "Ajuste por avaria no lote LT-2025-002",
  },
  {
    id: 'm005',
    data: '2026-03-12T16:45:00',
    tipo: 'ENTRADA',
    medicamento: 'Metformina 850mg comprimido',
    codigo: 'MD007',
    quantidade: 500,
    unidade: 'Comprimido',
    responsavel: 'João Mendes',
    setor: 'Almoxarifado Central',
    observacao: 'Recebimento NF 00138',
  },
  {
    id: 'm006',
    data: '2026-03-12T10:00:00',
    tipo: 'SAIDA',
    medicamento: 'Omeprazol 20mg cápsula',
    codigo: 'MD006',
    quantidade: 300,
    unidade: 'Cápsula',
    responsavel: 'Fernanda Costa',
    setor: 'UBS Zona Norte',
    observacao: '',
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
    id: 'aj001',
    data: '2026-03-13T11:20:00',
    medicamento: 'Amoxicilina 500mg cápsula',
    codigo: 'MD002',
    quantidadeAntes: 400,
    quantidadeApos: 320,
    diferenca: -80,
    unidade: 'Cápsula',
    responsavel: 'Maria Alves',
    setor: 'UPA',
    motivo: 'Avaria no lote',
    observacao: 'Cápsulas danificadas durante transporte. Lote LT-2025-002.',
  },
  {
    id: 'aj002',
    data: '2026-03-10T09:00:00',
    medicamento: 'Dipirona Sódica 500mg comprimido',
    codigo: 'MD003',
    quantidadeAntes: 5800,
    quantidadeApos: 6200,
    diferenca: 400,
    unidade: 'Comprimido',
    responsavel: 'João Mendes',
    setor: 'UMSJ',
    motivo: 'Inventário',
    observacao: 'Correção após inventário físico.',
  },
  {
    id: 'aj003',
    data: '2026-03-14T10:15:00',
    medicamento: 'Paracetamol 500mg comprimido',
    codigo: 'MD001',
    quantidadeAntes: 4850,
    quantidadeApos: 4800,
    diferenca: -50,
    unidade: 'Comprimido',
    responsavel: 'Carlos Lima',
    setor: 'UMSJ',
    motivo: 'Erros de lançamento',
    observacao: 'Ajuste de contagem manual divergente do sistema.',
  },
  {
    id: 'aj004',
    data: '2026-03-14T14:45:00',
    medicamento: 'Soro Fisiológico 0,9% 500ml',
    codigo: 'MD005',
    quantidadeAntes: 830,
    quantidadeApos: 850,
    diferenca: 20,
    unidade: 'Frasco',
    responsavel: 'Ana Souza',
    setor: 'UPA',
    motivo: 'Inventário',
    observacao: 'Frascos não contabilizados na contagem anterior.',
  },
];

// ---------------------------------------------------------------------------
// KPIs para o Dashboard da Farmácia
// ---------------------------------------------------------------------------
export const mockFarmaciaKPIs = {
  totalItens: mockEstoqueItems.length,
  itensCriticos: mockEstoqueItems.filter(i => i.status === 'ABAIXO_MINIMO' || i.status === 'SEM_ESTOQUE').length,
  entradasHoje: mockMovimentacoes.filter(m => m.tipo === 'ENTRADA' && m.data.startsWith('2026-03-14')).length,
  saidasHoje: mockMovimentacoes.filter(m => m.tipo === 'SAIDA' && m.data.startsWith('2026-03-14')).length,
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
  'Antidiabético',
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
  'Ana Souza',
  'Carlos Lima',
  'Maria Alves',
  'Fernanda Costa',
  'Roberto Dias',
  'Patrícia Neves',
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
    { data: '2026-03-14', quantidade: 200, unidadeMedida: 'comprimidos', local: 'UPA' },
    { data: '2026-03-13', quantidade: 300, unidadeMedida: 'comprimidos', local: 'UMSJ' },
    { data: '2026-03-12', quantidade: 150, unidadeMedida: 'comprimidos', local: 'UPA' },
  ],
  'MD002': [
    { data: '2026-03-12', quantidade: 60,  unidadeMedida: 'cápsulas',    local: 'UPA' },
    { data: '2026-03-10', quantidade: 40,  unidadeMedida: 'cápsulas',    local: 'UMSJ' },
  ],
  'MD003': [
    { data: '2026-03-14', quantidade: 200, unidadeMedida: 'comprimidos', local: 'UPA' },
    { data: '2026-03-13', quantidade: 150, unidadeMedida: 'comprimidos', local: 'UMSJ' },
    { data: '2026-03-12', quantidade: 300, unidadeMedida: 'comprimidos', local: 'UPA' },
  ],
  'MD005': [
    { data: '2026-03-13', quantidade: 50,  unidadeMedida: 'frascos',     local: 'UPA' },
    { data: '2026-03-11', quantidade: 80,  unidadeMedida: 'frascos',     local: 'UMSJ' },
    { data: '2026-03-09', quantidade: 30,  unidadeMedida: 'frascos',     local: 'UPA' },
  ],
  'MD006': [
    { data: '2026-03-12', quantidade: 300, unidadeMedida: 'cápsulas',    local: 'UMSJ' },
    { data: '2026-03-10', quantidade: 200, unidadeMedida: 'cápsulas',    local: 'UPA' },
  ],
};


