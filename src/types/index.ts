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
    comprometidoPercent: number;

    // UI specific mock extras required to not break dashboard static layout yet:
    ofsThisMonth: number;
    ofsChangePercentage: number;
    pendingNfs: number;
    nfsExpiringThisWeek: number;
    totalPendingContracts: number;
}

export type EmpenhoStatus = 'EMPENHADO' | 'LIQUIDADO' | 'PAGO';

export interface Commitment {
    id: string;
    tenant_id: string;
    contract_id: string;
    secretariat_id: string;
    number: string;
    issue_date: string;
    initial_amount: number;
    added_amount: number;
    annulled_amount: number;
    consumed_amount: number;
    current_balance?: number; // Calculated on UI or returned by DB view
    status: EmpenhoStatus;
    notes?: string;
    created_at: string;
    updated_at: string;
    
    // Virtual fields (joined)
    contract?: import('./index').Contract;
    secretariat?: any;
}

export type MovementType = 'INITIAL' | 'ADDITION' | 'ANNULMENT' | 'CONSUMPTION' | 'REVERSAL';

export interface CommitmentMovement {
    id: string;
    tenant_id: string;
    commitment_id: string;
    type: MovementType;
    value: number;
    previous_balance: number;
    current_balance: number;
    description: string;
    date: string;
    created_at: string;
}

// Keeping legacy Empenho for now until fully replaced
export interface Empenho {
    id: string;
    number: string;
    contractId: string;
    description: string;
    value: number;
    status: EmpenhoStatus;
    issueDate: string; 
    paymentDate?: string; 
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
