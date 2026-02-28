import { Empenho } from '../types';

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

export const empenhosTable: Empenho[] = [
    {
        id: 'emp-001',
        number: '2023NE000142',
        contractId: 'ct_001', // Servidor em Nuvem (Ativo)
        description: 'Empenho para cobertura de custos trimestrais de infraestrutura cloud.',
        value: 150000,
        status: 'PAGO',
        issueDate: new Date(now - 90 * dayMs).toISOString(),
        paymentDate: new Date(now - 80 * dayMs).toISOString(),
    },
    {
        id: 'emp-002',
        number: '2023NE000255',
        contractId: 'ct_001', // Servidor em Nuvem (Ativo)
        description: 'Empenho adicional para serviços de backup e redundância.',
        value: 100000,
        status: 'LIQUIDADO',
        issueDate: new Date(now - 30 * dayMs).toISOString(),
    },
    {
        id: 'emp-003',
        number: '2023NE000188',
        contractId: 'ct_002', // Limpeza
        description: 'Cobertura semestral de serviços de conservação continuada.',
        value: 450000,
        status: 'EMPENHADO',
        issueDate: new Date(now - 15 * dayMs).toISOString(),
    },
    {
        id: 'emp-004',
        number: '2023NE000092',
        contractId: 'ct_003', // Licenças Software
        description: 'Renovação do pacote Adobe Creative Cloud para equipes de design.',
        value: 85000,
        status: 'PAGO',
        issueDate: new Date(now - 120 * dayMs).toISOString(),
        paymentDate: new Date(now - 110 * dayMs).toISOString(),
    },
    {
        id: 'emp-005',
        number: '2023NE000301',
        contractId: 'ct_001', // Servidor Cloud
        description: 'Reserva para picos de tráfego de final de ano.',
        value: 50000,
        status: 'EMPENHADO',
        issueDate: new Date(now - 5 * dayMs).toISOString(),
    },
    {
        id: 'emp_010_01',
        number: '2026NE000310',
        contractId: 'ct_010',
        description: 'Empenho inicial para cobertura contratual anual',
        value: 40000,
        status: 'EMPENHADO',
        issueDate: new Date(now - 5 * dayMs).toISOString(),
    },
    {
        id: 'emp_010_02',
        number: '2026NE000311',
        contractId: 'ct_010',
        description: 'Empenho complementar para ajuste de escopo',
        value: 30000,
        status: 'PAGO',
        issueDate: new Date(now - 20 * dayMs).toISOString(),
        paymentDate: new Date(now - 10 * dayMs).toISOString(),
    }
];
