import { database } from '../mocks/db';
import { Contract, ContractStatus, DashboardMetrics } from '../types';

export class ContractsRepository {

    // Core Helper: Compute status & balance dynamically
    private enrichContract(contract: Contract): Contract {
        // Balance calculation
        const computedBalance = contract.totalValue - contract.committedValue;

        // Status calculation rules
        let computedStatus: ContractStatus = contract.status;

        if (computedStatus !== 'SUSPENSO' && computedStatus !== 'CANCELADO') {
            const today = new Date();
            const endDate = new Date(contract.dateRange.endDate);

            // Difference in days
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                computedStatus = 'VENCIDO';
            } else if (diffDays <= 30) {
                computedStatus = 'VENCENDO';
            } else {
                computedStatus = 'ATIVO';
            }
        }

        return {
            ...contract,
            balanceValue: computedBalance,
            status: computedStatus
        };
    }

    async list(): Promise<Contract[]> {
        return database.contracts.map(c => this.enrichContract(c));
    }

    async getById(id: string): Promise<Contract | null> {
        const c = database.contracts.find(ct => ct.id === id);
        return c ? this.enrichContract(c) : null;
    }

    async create(contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'balanceValue' | 'status'>): Promise<Contract> {
        const newContract: Contract = {
            ...contractData,
            id: `ct_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            balanceValue: contractData.totalValue - contractData.committedValue,
            status: 'ATIVO' // Will be enriched on return anyway
        };
        database.contracts.push(newContract);
        return this.enrichContract(newContract);
    }

    async update(id: string, updates: Partial<Contract>): Promise<Contract | null> {
        const index = database.contracts.findIndex(c => c.id === id);
        if (index === -1) return null;

        const updated = {
            ...database.contracts[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        database.contracts[index] = updated;
        return this.enrichContract(updated);
    }

    async remove(id: string): Promise<boolean> {
        const index = database.contracts.findIndex(c => c.id === id);
        if (index === -1) return false;

        database.contracts.splice(index, 1);
        return true;
    }

    // Custom method to fetch dashboard metrics
    async getDashboardMetrics(): Promise<DashboardMetrics> {
        const allContracts = await this.list(); // Ensures they are enriched

        let activeCount = 0;
        let expiringCount = 0;
        let expiredCount = 0;
        let totalValSum = 0;
        let balanceValSum = 0;

        allContracts.forEach(c => {
            // Aggregate values universally
            totalValSum += c.totalValue;
            balanceValSum += c.balanceValue;

            // Count statuses
            if (c.status === 'ATIVO') activeCount++;
            if (c.status === 'VENCENDO') expiringCount++;
            if (c.status === 'VENCIDO') expiredCount++;
        });

        return {
            totalContracts: allContracts.length,
            expiringContracts: expiringCount,
            expiredContracts: expiredCount,
            totalValueSum: totalValSum,
            balanceValueSum: balanceValSum,

            // Keep hardcoded extra fields to not break existing layout elements
            ofsThisMonth: 318,
            ofsChangePercentage: 12,
            pendingNfs: 47,
            nfsExpiringThisWeek: 12
        };
    }
}

export const contractsRepository = new ContractsRepository();
