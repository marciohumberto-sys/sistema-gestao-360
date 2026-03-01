import { supabase } from '../../lib/supabase';

export interface ContractItem {
    id: string;
    tenant_id: string;
    contract_id: string;
    item_number?: string;
    description: string;
    unit?: string;
    unit_price?: number;
    total_quantity?: number;
    created_at: string;
}

class ContractItemsService {
    async listContractItems(contractId: string, tenantId: string): Promise<ContractItem[]> {
        if (!tenantId) throw new Error("A tenantId is required.");

        const { data, error } = await supabase
            .from("contract_items")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("contract_id", contractId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async countContractItems(contractId: string, tenantId: string): Promise<number> {
        if (!tenantId) throw new Error("A tenantId is required.");

        const { count, error } = await supabase
            .from("contract_items")
            .select('*', { count: 'exact', head: true })
            .eq("tenant_id", tenantId)
            .eq("contract_id", contractId);

        if (error) throw error;
        return count || 0;
    }

    async createContractItem(payload: Partial<ContractItem>, tenantId: string): Promise<ContractItem> {
        if (!tenantId) throw new Error("A tenantId is required.");

        const { data, error } = await supabase
            .from("contract_items")
            .insert([{ ...payload, tenant_id: tenantId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateContractItem(itemId: string, payload: Partial<ContractItem>, tenantId: string): Promise<ContractItem> {
        if (!tenantId) throw new Error("A tenantId is required.");

        const { data, error } = await supabase
            .from("contract_items")
            .update(payload)
            .eq("id", itemId)
            .eq("tenant_id", tenantId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteContractItem(itemId: string, tenantId: string): Promise<void> {
        if (!tenantId) throw new Error("A tenantId is required.");

        const { error } = await supabase
            .from("contract_items")
            .delete()
            .eq("id", itemId)
            .eq("tenant_id", tenantId);

        if (error) throw error;
    }
}

export const contractItemsService = new ContractItemsService();
