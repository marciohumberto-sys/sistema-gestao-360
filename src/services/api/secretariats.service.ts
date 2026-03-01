import { supabase } from '../../lib/supabase';

export interface Secretariat {
    id: string;
    tenant_id: string;
    name: string;
    created_at: string;
}

class SecretariatsService {
    async listSecretariats(tenantId: string): Promise<Secretariat[]> {
        if (!tenantId) throw new Error("A tenantId is required to fetch secretariats.");

        const { data, error } = await supabase
            .from("secretariats")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async createSecretariat(payload: { name: string }, tenantId: string): Promise<Secretariat> {
        if (!tenantId) throw new Error("A tenantId is required to create a secretariat.");

        const { data, error } = await supabase
            .from("secretariats")
            .insert([{ ...payload, tenant_id: tenantId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export const secretariatsService = new SecretariatsService();
