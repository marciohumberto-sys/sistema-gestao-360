import { supabase } from '../../lib/supabase';
import { Commitment, CommitmentMovement } from '../../types';

class CommitmentsService {
    private enrichCommitment(dbCommitment: any): Commitment {
        const initial = Number(dbCommitment.initial_amount) || 0;
        const added = Number(dbCommitment.added_amount) || 0;
        const annulled = Number(dbCommitment.annulled_amount) || 0;
        
        let consumed = 0;
        if (dbCommitment.commitment_movements && Array.isArray(dbCommitment.commitment_movements)) {
            consumed = dbCommitment.commitment_movements
                .filter((m: any) => m.movement_type === 'OF_CONSUMPTION')
                .reduce((acc: number, cur: any) => acc + (Number(cur.amount) || 0), 0);
        } else {
            consumed = Number(dbCommitment.consumed_amount) || 0;
        }

        const current_balance = initial + added - annulled - consumed;
        
        // Remove commitment_movements from the final object to keep it light if needed
        const { commitment_movements, ...rest } = dbCommitment;

        return {
            ...rest,
            consumed_amount: consumed,
            current_balance,
            status: rest.status || 'EMPENHADO',
            contract: rest.contracts,
            secretariat: rest.secretariats
        } as Commitment;
    }

    async list(tenantId?: string): Promise<Commitment[]> {
        let query = supabase
            .from("commitments")
            .select(`
                *,
                contracts (id, title, number, supplier_name),
                secretariats (id, name),
                commitment_movements ( amount, movement_type )
            `)
            .order('created_at', { ascending: false });

        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(c => this.enrichCommitment(c));
    }

    async getById(id: string): Promise<Commitment> {
        const { data, error } = await supabase
            .from("commitments")
            .select(`
                *,
                contracts (id, title, number, supplier_name),
                secretariats (id, name),
                commitment_movements ( amount, movement_type )
            `)
            .eq("id", id)
            .single();

        if (error) throw error;
        return this.enrichCommitment(data);
    }

    async getMovements(commitmentId: string): Promise<CommitmentMovement[]> {
        const { data, error } = await supabase
            .from("commitment_movements")
            .select("*")
            .eq("commitment_id", commitmentId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data as CommitmentMovement[];
    }

    async create(payload: Partial<Commitment>, tenantId: string): Promise<Commitment> {
        if (!tenantId) throw new Error("tenantId is required");

        const initialAmount = Number(payload.initial_amount) || 0;

        const rpcPayload = {
            p_tenant_id: tenantId,
            p_contract_id: payload.contract_id,
            p_secretariat_id: payload.secretariat_id,
            p_number: payload.number,
            p_issue_date: payload.issue_date,
            p_initial_amount: initialAmount,
            p_status: 'EMPENHADO',
            p_description: payload.notes || null
        };

        const { data: commitmentId, error } = await supabase
            .rpc('create_commitment', rpcPayload);

        if (error) {
            console.error("RPC Error:", error);
            throw new Error(error.message || "Erro ao criar empenho.");
        }

        // The RPC returns the new commitment ID (UUID). We need to fetch the full enriched object to return to UI.
        return this.getById(commitmentId);
    }

    async addValue(id: string, value: number, description: string, tenantId: string): Promise<void> {
        const rpcPayload = {
            p_tenant_id: tenantId,
            p_commitment_id: id,
            p_amount: value,
            p_description: description || 'Acréscimo de valor'
        };

        const { error } = await supabase.rpc('add_commitment_amount', rpcPayload);
        
        if (error) {
            console.error("add_commitment_amount RPC Error:", error);
            throw new Error(error.message || "Erro ao adicionar valor ao empenho.");
        }
    }

    async annulValue(id: string, value: number, description: string, tenantId: string): Promise<void> {
        const rpcPayload = {
            p_tenant_id: tenantId,
            p_commitment_id: id,
            p_amount: value,
            p_description: description || 'Anulação parcial de valor'
        };

        const { error } = await supabase.rpc('annul_commitment_amount', rpcPayload);
        
        if (error) {
            console.error("annul_commitment_amount RPC Error:", error);
            throw new Error(error.message || "Erro ao anular valor do empenho.");
        }
    }

    async updateCommitment(id: string, tenantId: string, updates: { issue_date?: string, notes?: string }) {
        if (!id || !tenantId) throw new Error("ID do empenho e tenantId são obrigatórios.");

        // 1. Verify movements count to enforce business rule
        const { count, error: countError } = await supabase
            .from('commitment_movements')
            .select('*', { count: 'exact', head: true })
            .eq('commitment_id', id)
            .eq('tenant_id', tenantId);

        if (countError) throw countError;

        // 2. Prepare payload
        const payload: any = { notes: updates.notes };

        // 3. Only allow issue_date update if strictly 1 movement exists
        if (count === 1 && updates.issue_date) {
            payload.issue_date = updates.issue_date;
        }

        const { error: updateError } = await supabase
            .from('commitments')
            .update(payload)
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (updateError) throw updateError;
    }

    async deleteCommitment(id: string, tenantId: string) {
        if (!id || !tenantId) throw new Error("ID do empenho e tenantId são obrigatórios.");

        // 1. Check if it has more than 1 movement
        const { count, error: countError } = await supabase
            .from('commitment_movements')
            .select('*', { count: 'exact', head: true })
            .eq('commitment_id', id)
            .eq('tenant_id', tenantId);

        if (countError) throw countError;

        if (count && count > 1) {
            throw new Error("Este empenho possui movimentações financeiras e não pode ser excluído.");
        }

        // 2. Needs to be checked against OFs. (Assumption: If ofs exist, block). 
        // We will do a generic check if there are linked OFs in commitment_movements or an of table if it exists.
        // For now, prompt states to "block if there is linked OF". If the module is not fully launched, 
        // we can still verify if there's any movement with of_id just in case, or block if of_id IS NOT NULL somewhere.
        // But rule #1 (count > 1) covers most since OF linked = consumption/reversal = movement.

        // 3. Execute delete - The Supabase ON DELETE CASCADE on commitment_movements will handle the rest
        const { error: deleteError } = await supabase
            .from('commitments')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (deleteError) throw deleteError;
    }
}

export const commitmentsService = new CommitmentsService();
