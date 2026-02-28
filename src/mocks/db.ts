import { Contract, Supplier } from '../types';

export let suppliersTable: Supplier[] = [
    {
        id: 'sup_1',
        name: 'Tech Corp Brasil Ltda',
        cnpj: '12.345.678/0001-90',
        contactEmail: 'contato@techcorp.com.br',
        contactPhone: '(11) 98765-4321',
        createdAt: new Date('2025-01-10T10:00:00Z').toISOString()
    },
    {
        id: 'sup_2',
        name: 'Construtora Horizonte',
        cnpj: '98.765.432/0001-10',
        contactEmail: 'obras@horizonte.com.br',
        createdAt: new Date('2025-02-05T14:30:00Z').toISOString()
    }
];

// Data Helpers para garantir ISO dates realistas baseados em "hoje"
const today = new Date();
const addDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString();
};

export let contractsTable: Contract[] = [
    // --- 6 ATIVOS (fim > 30 dias) ---
    {
        id: 'ct_001',
        number: '101/2026',
        title: 'Licença de Software ERP',
        supplierName: 'Tech Corp Brasil Ltda',
        status: 'ATIVO',
        totalValue: 1500000,
        committedValue: 1000000,
        balanceValue: 500000,
        dateRange: { startDate: addDays(-100), endDate: addDays(365) },
        createdAt: addDays(-100),
        updatedAt: addDays(-100)
    },
    {
        id: 'ct_002',
        number: '102/2026',
        title: 'Manutenção Predial Sede',
        supplierName: 'Construtora Horizonte',
        status: 'ATIVO',
        totalValue: 800000,
        committedValue: 200000,
        balanceValue: 600000,
        dateRange: { startDate: addDays(-50), endDate: addDays(180) },
        createdAt: addDays(-50),
        updatedAt: addDays(-10)
    },
    {
        id: 'ct_003',
        number: '103/2026',
        title: 'Fornecimento de Combustível',
        supplierName: 'Auto Posto Central',
        status: 'ATIVO',
        totalValue: 350000,
        committedValue: 350000,
        balanceValue: 0,
        dateRange: { startDate: addDays(-200), endDate: addDays(120) },
        createdAt: addDays(-200),
        updatedAt: addDays(-5)
    },
    {
        id: 'ct_004',
        number: '104/2026',
        title: 'Serviços de Limpeza Terceirizada',
        supplierName: 'Clean Express Ltda',
        status: 'ATIVO',
        totalValue: 1200000,
        committedValue: 600000,
        balanceValue: 600000,
        dateRange: { startDate: addDays(-10), endDate: addDays(355) },
        createdAt: addDays(-10),
        updatedAt: addDays(-10)
    },
    {
        id: 'ct_005',
        number: '105/2026',
        title: 'Locação de Veículos Oficiais',
        supplierName: 'Locadora Brasil',
        status: 'ATIVO',
        totalValue: 950000,
        committedValue: 150000,
        balanceValue: 800000,
        dateRange: { startDate: addDays(-300), endDate: addDays(65) },
        createdAt: addDays(-300),
        updatedAt: addDays(-300)
    },
    {
        id: 'ct_006',
        number: '106/2026',
        title: 'Equipamentos de T.I',
        supplierName: 'InfoTech Solutions',
        status: 'ATIVO',
        totalValue: 2500000,
        committedValue: 2000000,
        balanceValue: 500000,
        dateRange: { startDate: addDays(-5), endDate: addDays(90) },
        createdAt: addDays(-5),
        updatedAt: addDays(-5)
    },

    // --- 3 VENCENDO (fim entre hoje e +30 dias) ---
    {
        id: 'ct_007',
        number: '090/2025',
        title: 'Consultoria Estratégica',
        supplierName: 'Resultados Consultoria',
        status: 'VENCENDO',
        totalValue: 300000,
        committedValue: 300000,
        balanceValue: 0,
        dateRange: { startDate: addDays(-350), endDate: addDays(12) }, // Falta 12 dias
        createdAt: addDays(-350),
        updatedAt: addDays(-30)
    },
    {
        id: 'ct_008',
        number: '091/2025',
        title: 'Locação Drones Agrícolas',
        supplierName: 'AeroFarm',
        status: 'VENCENDO',
        totalValue: 450000,
        committedValue: 400000,
        balanceValue: 50000,
        dateRange: { startDate: addDays(-180), endDate: addDays(5) }, // Falta 5 dias
        createdAt: addDays(-180),
        updatedAt: addDays(-10)
    },
    {
        id: 'ct_009',
        number: '092/2025',
        title: 'Serviço de Segurança Armada',
        supplierName: 'Fortress Vigilância',
        status: 'VENCENDO',
        totalValue: 1800000,
        committedValue: 1500000,
        balanceValue: 300000,
        dateRange: { startDate: addDays(-360), endDate: addDays(28) }, // Falta 28 dias
        createdAt: addDays(-360),
        updatedAt: addDays(-360)
    },

    // --- 2 VENCIDO (fim no passado) ---
    {
        id: 'ct_010',
        number: '010/2024',
        title: 'Campanha Publicitária',
        supplierName: 'Agência Criativa',
        status: 'VENCIDO',
        totalValue: 500000,
        committedValue: 500000,
        balanceValue: 0,
        dateRange: { startDate: addDays(-400), endDate: addDays(-35) }, // Venceu há 35 dias
        createdAt: addDays(-400),
        updatedAt: addDays(-40)
    },
    {
        id: 'ct_011',
        number: '011/2024',
        title: 'Licença Antivírus Anual',
        supplierName: 'Segurança Dig Ltda',
        status: 'VENCIDO',
        totalValue: 120000,
        committedValue: 120000,
        balanceValue: 0,
        dateRange: { startDate: addDays(-380), endDate: addDays(-15) }, // Venceu há 15 dias
        createdAt: addDays(-380),
        updatedAt: addDays(-15)
    },

    // --- 1 SUSPENSO / CANCELADO ---
    {
        id: 'ct_012',
        number: '055/2025',
        title: 'Obras de Expansão Anexo III',
        supplierName: 'Construtora Horizonte',
        status: 'SUSPENSO',
        totalValue: 4500000,
        committedValue: 1000000,
        balanceValue: 3500000,
        dateRange: { startDate: addDays(-50), endDate: addDays(315) },
        createdAt: addDays(-50),
        updatedAt: addDays(-2) // Suspenso recentemente
    }
];

export const database = {
    suppliers: suppliersTable,
    contracts: contractsTable
};
