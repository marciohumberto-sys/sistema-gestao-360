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
    code?: string;
    title: string;
    supplierName: string;
    supplierId?: string;
    status: ContractStatus;
    totalValue: number;
    committedValue: number;
    balanceValue: number;
    dateRange: DateRange;
    secretariat_id?: string;
    biddingProcess?: string;
    electronicAuction?: string;
    notes?: string;

    // New Fields Added
    contract_object?: string;
    cnpj?: string;
    address?: string;
    managerName?: string;
    manager_registration?: string;
    technical_fiscal_name?: string;
    technical_fiscal_registration?: string;
    administrative_fiscal_name?: string;
    administrative_fiscal_registration?: string;
    contract_pdf_url?: string;
    rescinded_at?: string;
    rescission_notes?: string;
    rescission_pdf_url?: string;

    createdAt: string;
    updatedAt: string;
    // Pendency Indicator (Items Check)
    isPending?: boolean;
    pendingIssues?: string[];
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
    totalPendingContracts: number;
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
export interface ContractHistory {
    id: string;
    tenant_id: string;
    contract_id: string;
    event_type: string;
    event_title: string;
    event_description?: string;
    old_value?: number;
    new_value?: number;
    event_date: string; // ISO string
    created_at: string; // ISO string
}
