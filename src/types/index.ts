export type ContractStatus = 'ATIVO' | 'VENCENDO' | 'VENCIDO' | 'SUSPENSO' | 'CANCELADO';

export interface Money {
    amount: number;
    currency: string;
    formatted: string;
}

export interface DateRange {
    startDate: string; // ISO DB string
    endDate: string;   // ISO DB string
}

export interface Supplier {
    id: string;
    name: string;
    cnpj: string;
    contactEmail?: string;
    contactPhone?: string;
    createdAt: string;
}

export interface Contract {
    id: string;
    number: string;
    title: string;
    supplierName: string;
    supplierId?: string; // Optional agora, dado que temos supplierName direto
    status: ContractStatus;
    totalValue: number;
    committedValue: number;
    balanceValue: number;
    dateRange: DateRange;
    createdAt: string;
    updatedAt: string;
}

export interface DashboardMetrics {
    totalContracts: number;
    expiringContracts: number;
    expiredContracts: number;
    totalValueSum: number;
    balanceValueSum: number;

    // UI specific mock extras required to not break dashboard static layout yet:
    ofsThisMonth: number;
    ofsChangePercentage: number;
    pendingNfs: number;
    nfsExpiringThisWeek: number;
}

export type EmpenhoStatus = 'EMPENHADO' | 'LIQUIDADO' | 'PAGO';

export interface Empenho {
    id: string;
    number: string;
    contractId: string;
    description: string;
    value: number;
    status: EmpenhoStatus;
    issueDate: string; // ISO DB string
    paymentDate?: string; // ISO DB string (optional)
}
