import { supabase } from '../../lib/supabase';

export interface Allocation {
    id: string;
    tenant_id: string;
    contract_item_id: string;
    secretariat_id: string;
    quantity_allocated: number;
    created_at: string;
}

class AllocationsService {
    async listAllocationsByItem(contractItemId: string, tenantId: string): Promise<Allocation[]> {
        if (!tenantId) throw new Error("A tenantId is required.");

        const { data, error } = await supabase
            .from("contract_item_allocations")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("contract_item_id", contractItemId);

        if (error) throw error;
        return data || [];
    }

    async listAllocationsByItemIds(itemIds: string[], tenantId: string): Promise<Allocation[]> {
        if (!tenantId) throw new Error("A tenantId is required.");
        if (!itemIds || itemIds.length === 0) return [];

        const { data, error } = await supabase
            .from("contract_item_allocations")
            .select("*")
            .eq("tenant_id", tenantId)
            .in("contract_item_id", itemIds);

        if (error) throw error;
        return data || [];
    }

    async upsertAllocation(payload: { contract_item_id: string, secretariat_id: string, quantity_allocated: number }, tenantId: string): Promise<Allocation> {
        if (!tenantId) throw new Error("A tenantId is required.");

        // First, try to fetch to determine if we update or insert manually
        const { data: existing, error: fetchError } = await supabase
            .from("contract_item_allocations")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("contract_item_id", payload.contract_item_id)
            .eq("secretariat_id", payload.secretariat_id)
            .maybeSingle(); // Does not throw error if 0 rows returned

        if (fetchError) throw fetchError;

        if (existing) {
            // Update
            const { data, error } = await supabase
                .from("contract_item_allocations")
                .update({ quantity_allocated: payload.quantity_allocated })
                .eq("id", existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Insert
            const { data, error } = await supabase
                .from("contract_item_allocations")
                .insert([{ ...payload, tenant_id: tenantId }])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    }

    async deleteAllocation(contractItemId: string, secretariatId: string, tenantId: string): Promise<void> {
        if (!tenantId) throw new Error("A tenantId is required.");

        const { error } = await supabase
            .from("contract_item_allocations")
            .delete()
            .eq("tenant_id", tenantId)
            .eq("contract_item_id", contractItemId)
            .eq("secretariat_id", secretariatId);

        if (error) throw error;
    }
}

export const allocationsService = new AllocationsService();
