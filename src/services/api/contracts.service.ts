import { httpClient } from './httpClient';
import { ENDPOINTS } from './endpoints';
import { Contract, DashboardMetrics } from '../../types';
import { supabase } from '../../lib/supabase';

class ContractsService {
    private enrichContract(dbContract: any): Contract {
        // Map snake_case from DB to camelCase for UI
        return {
            id: dbContract.id,
            number: dbContract.number,
            code: dbContract.code,
            title: dbContract.title,
            supplierName: dbContract.supplier_name,
            status: dbContract.status || 'ATIVO',
            totalValue: dbContract.total_value || 0,
            committedValue: 0, // Will be calculated in UI or via join later
            balanceValue: dbContract.total_value || 0, // Placeholder, calculated properly in UI
            dateRange: {
                startDate: dbContract.start_date || null,
                endDate: dbContract.end_date || null
            },
            responsibleUnit: dbContract.responsible_unit,
            biddingProcess: dbContract.bidding_process,
            electronicAuction: dbContract.electronic_auction,
            notes: dbContract.notes,
            createdAt: dbContract.created_at,
            updatedAt: dbContract.updated_at
        } as Contract;
    }

    async list(tenantId?: string): Promise<Contract[]> {
        let query = supabase
            .from("contracts")
            .select("*")
            .order('created_at', { ascending: false });

        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(c => this.enrichContract(c));
    }

    async getById(id: string): Promise<Contract> {
        const { data, error } = await supabase
            .from("contracts")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;
        return this.enrichContract(data);
    }

    async createContract(input: any, tenantId: string) {
        if (!tenantId) {
            return { data: null, error: new Error("tenantId is required to create a contract.") };
        }

        // Map camelCase UI to snake_case DB
        const payload = {
            number: input.number,
            code: input.code,
            title: input.title,
            supplier_name: input.supplierName,
            total_value: input.totalValue,
            start_date: input.dateRange?.startDate,
            end_date: input.dateRange?.endDate,
            status: input.status || 'ATIVO',
            responsible_unit: input.responsibleUnit,
            bidding_process: input.biddingProcess,
            electronic_auction: input.electronicAuction,
            notes: input.notes,
            tenant_id: tenantId
        };

        const { data: result, error } = await supabase
            .from("contracts")
            .insert([payload])
            .select()
            .single();

        return { data: result ? this.enrichContract(result) : null, error };
    }

    async create(data: any, tenantId: string): Promise<Contract> {
        const { data: result, error } = await this.createContract(data, tenantId);
        if (error) throw error;
        return result!;
    }

    async update(id: string, data: Partial<Contract>): Promise<Contract> {
        // Map camelCase UI to snake_case DB for partial update
        const payload: any = {};
        if (data.number !== undefined) payload.number = data.number;
        if (data.code !== undefined) payload.code = data.code;
        if (data.title !== undefined) payload.title = data.title;
        if (data.supplierName !== undefined) payload.supplier_name = data.supplierName;
        if (data.totalValue !== undefined) payload.total_value = data.totalValue;
        if (data.dateRange?.startDate !== undefined) payload.start_date = data.dateRange.startDate;
        if (data.dateRange?.endDate !== undefined) payload.end_date = data.dateRange.endDate;
        if (data.status !== undefined) payload.status = data.status;
        if (data.responsibleUnit !== undefined) payload.responsible_unit = data.responsibleUnit;
        if (data.biddingProcess !== undefined) payload.bidding_process = data.biddingProcess;
        if (data.electronicAuction !== undefined) payload.electronic_auction = data.electronicAuction;
        if (data.notes !== undefined) payload.notes = data.notes;

        const { data: result, error } = await supabase
            .from("contracts")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return this.enrichContract(result);
    }

    async remove(id: string): Promise<void> {
        const { error } = await supabase
            .from("contracts")
            .delete()
            .eq("id", id);

        if (error) throw error;
    }

    async getDashboardMetrics(tenantId?: string): Promise<DashboardMetrics> {
        const contracts = await this.list(tenantId);

        let activeCount = 0;
        let expiringCount = 0;
        let expiredCount = 0;
        let totalValSum = 0;
        let balanceValSum = 0;

        contracts.forEach(c => {
            totalValSum += c.totalValue;
            balanceValSum += c.balanceValue;

            if (c.status === 'ATIVO') activeCount++;
            if (c.status === 'VENCENDO') expiringCount++;
            if (c.status === 'VENCIDO') expiredCount++;
        });

        return {
            totalContracts: contracts.length,
            expiringContracts: expiringCount,
            expiredContracts: expiredCount,
            totalValueSum: totalValSum,
            balanceValueSum: balanceValSum,
            ofsThisMonth: 0,
            ofsChangePercentage: 0,
            pendingNfs: 0,
            nfsExpiringThisWeek: 0
        };
    }
}

export const contractsService = new ContractsService();
