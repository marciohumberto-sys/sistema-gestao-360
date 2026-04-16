import { supabase } from '../../lib/supabase';

export interface OF {
    id: string;
    tenant_id: string;
    contract_id: string;
    secretariat_id: string;
    commitment_id: string;
    number: string;
    issue_date: string;
    requester_name?: string;
    requester_department?: string;
    status: 'DRAFT' | 'ISSUED' | 'CANCELED';
    notes?: string;
    total_amount: number;
    created_at: string;
    updated_at: string;
    contract?: {
        number: string;
        title: string;
    };
    secretariat?: {
        name: string;
    };
}

class OFsService {
    async list(tenantId: string): Promise<OF[]> {
        if (!tenantId) return [];
        
        const { data, error } = await supabase
            .from('ofs')
            .select('*, contract:contracts(number, title), secretariat:secretariats(name)')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Return mapped data safely
        return (data || []).map((item: any) => ({
            ...item,
            contract: item.contract ? (Array.isArray(item.contract) ? item.contract[0] : item.contract) : null,
            secretariat: item.secretariat ? (Array.isArray(item.secretariat) ? item.secretariat[0] : item.secretariat) : null
        }));
    }

    async listByContract(contractId: string): Promise<OF[]> {
        if (!contractId) return [];
        
        const { data, error } = await supabase
            .from('ofs')
            .select('*, secretariat:secretariats(name), items:of_items(*)')
            .eq('contract_id', contractId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return (data || []).map((item: any) => ({
            ...item,
            secretariat: item.secretariat ? (Array.isArray(item.secretariat) ? item.secretariat[0] : item.secretariat) : null
        }));
    }

    async listByCommitment(commitmentId: string): Promise<OF[]> {
        if (!commitmentId) return [];
        
        const { data, error } = await supabase
            .from('ofs')
            .select('*, contract:contracts(number, title), secretariat:secretariats(name)')
            .eq('commitment_id', commitmentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return (data || []).map((item: any) => ({
            ...item,
            contract: item.contract ? (Array.isArray(item.contract) ? item.contract[0] : item.contract) : null,
            secretariat: item.secretariat ? (Array.isArray(item.secretariat) ? item.secretariat[0] : item.secretariat) : null
        }));
    }
    async getConsumptionBySecretariat(tenantId: string): Promise<Array<{ label: string, value: number, color: string }>> {
        if (!tenantId) return [];

        // Fetches ALL of_items with its OF status and Secretariat name
        // We filter by tenant_id and status != 'CANCELLED'
        const { data, error } = await supabase
            .from('of_items')
            .select(`
                total_price,
                of:ofs!inner(
                    status,
                    tenant_id,
                    secretariat:secretariats(name)
                )
            `)
            .eq('of.tenant_id', tenantId)
            .neq('of.status', 'CANCELLED');

        if (error) throw error;

        // Group by secretariat name and sum totals
        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#94A3B8', '#8B5CF6', '#EC4899'];
        const groups: Record<string, number> = {};

        (data || []).forEach((item: any) => {
            const secName = item.of?.secretariat?.name || 'Não Informado';
            groups[secName] = (groups[secName] || 0) + Number(item.total_price || 0);
        });

        const totalConsumption = Object.values(groups).reduce((acc, curr) => acc + curr, 0);

        return Object.entries(groups)
            .sort((a, b) => b[1] - a[1]) // Top consumption first
            .map(([label, total], index) => ({
                label,
                total, // Absolute value in BRL
                value: totalConsumption > 0 ? Math.round((total / totalConsumption) * 100) : 0, // Percentage for the bar
                color: colors[index % colors.length]
            }));
    }

    async getById(id: string): Promise<OF> {
        const { data, error } = await supabase
            .from('ofs')
            .select(`
                *, 
                contract:contracts(
                    number, 
                    title, 
                    electronic_auction, 
                    bidding_process, 
                    supplier_name, 
                    cnpj, 
                    address, 
                    contract_object,
                    manager_name,
                    manager_registration,
                    technical_fiscal_name,
                    technical_fiscal_registration,
                    administrative_fiscal_name,
                    administrative_fiscal_registration,
                    secretariat:secretariats(name)
                ), 
                secretariat:secretariats(name), 
                items:of_items(*, contract_item:contract_items(item_number)), 
                commitment:commitments(id, number, current_balance, status)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        
        return {
            ...data,
            contract: data.contract ? {
                ...(Array.isArray(data.contract) ? data.contract[0] : data.contract),
                secretariat: (Array.isArray(data.contract) ? data.contract[0] : data.contract).secretariat ? 
                    (Array.isArray((Array.isArray(data.contract) ? data.contract[0] : data.contract).secretariat) ? 
                        (Array.isArray(data.contract) ? data.contract[0] : data.contract).secretariat[0] : 
                        (Array.isArray(data.contract) ? data.contract[0] : data.contract).secretariat) : null
            } : null,
            secretariat: data.secretariat ? (Array.isArray(data.secretariat) ? data.secretariat[0] : data.secretariat) : null,
            commitment: data.commitment ? (Array.isArray(data.commitment) ? data.commitment[0] : data.commitment) : null
        };
    }

    async createOf(tenantId: string, contractId: string, secretariatId: string, issueDate: string, commitmentId: string | null = null): Promise<any> {
        if (!tenantId) throw new Error("tenantId is required");

        const targetDate = issueDate || new Date().toISOString().split('T')[0];

        // 1. Generate the OF number using the database function
        const { data: generatedNumber, error: rpcErr } = await supabase
            .rpc('generate_of_number', { p_issue_date: targetDate });

        if (rpcErr) throw new Error(`Erro ao gerar número da OF: ${rpcErr.message}`);
        if (!generatedNumber) throw new Error("A função do banco não retornou um número válido.");

        const payload = {
            tenant_id: tenantId,
            contract_id: contractId,
            secretariat_id: secretariatId,
            commitment_id: commitmentId,
            status: 'DRAFT',
            issue_date: targetDate,
            number: generatedNumber,
            total_amount: 0,
            requester_name: null,
            requester_department: null,
            notes: null
        };

        const { data, error } = await supabase
            .from('ofs')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateOf(id: string, tenantId: string, updates: Partial<OF>): Promise<void> {
        if (!tenantId) throw new Error("tenantId is required");
        
        const { error } = await supabase
            .from('ofs')
            .update(updates)
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
    }

    async addOfItem(payload: any): Promise<void> {
        if (!payload.tenant_id) throw new Error("tenant_id is required");
        
        const quantity = Number(payload.quantity || 0);
        const unit_price = Number(payload.unit_price || 0);
        const total_price = quantity * unit_price;

        const { error } = await supabase.from('of_items').insert([{
            tenant_id: payload.tenant_id,
            of_id: payload.of_id,
            contract_item_id: payload.contract_item_id,
            item_number: payload.item_number || '1',
            description: payload.description,
            unit: payload.unit || 'UN',
            quantity: quantity,
            unit_price: unit_price,
            total_price: total_price,
            description_snapshot: payload.description_snapshot,
            unit_snapshot: payload.unit_snapshot,
            unit_price_snapshot: payload.unit_price_snapshot
        }]);
        
        if (error) throw error;
    }

    async updateOfItem(itemId: string, tenantId: string, updates: any): Promise<void> {
        if (!tenantId) throw new Error("tenantId is required");
        
        // Custo total calculado no JS para atualizar direto via REST, ou delega pro recalc
        const quantity = Number(updates.quantity || 0);
        const unit_price = Number(updates.unit_price || 0);
        const total_price = quantity * unit_price;
        
        const { error } = await supabase
            .from('of_items')
            .update({
                contract_item_id: updates.contract_item_id,
                item_number: updates.item_number,
                description: updates.description,
                unit: updates.unit,
                quantity: quantity,
                unit_price: unit_price,
                total_price: total_price,
                description_snapshot: updates.description_snapshot,
                unit_snapshot: updates.unit_snapshot,
                unit_price_snapshot: updates.unit_price_snapshot
            })
            .eq('id', itemId)
            .eq('tenant_id', tenantId);

        if (error) throw error;
    }

    async deleteOfItem(itemId: string, tenantId: string): Promise<void> {
        if (!tenantId) throw new Error("tenantId is required");
        // We call the RPC delete_of_item
        const { error } = await supabase.rpc('delete_of_item', { 
            p_of_item_id: itemId,
            p_tenant_id: tenantId 
        });
        if (error) throw error;
    }

    async recalculateOfTotal(ofId: string, tenantId: string): Promise<void> {
        if (!tenantId) throw new Error("tenantId is required");
        // We call the RPC recalculate_of_total
        const { error } = await supabase.rpc('recalculate_of_total', { 
            p_of_id: ofId,
            p_tenant_id: tenantId 
        });
        if (error) throw error;
    }

    async issueOf(id: string, tenantId: string, signatoryInfo: { name: string, role: string, registration?: string }): Promise<void> {
        if (!tenantId) throw new Error("tenantId is required");

        // 1. Fetch current OF
        const { data: ofData, error: err1 } = await supabase
            .from('ofs')
            .select('*, items:of_items(*), commitment:commitments(*), contract:contracts(*)')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();
        
        if (err1 || !ofData) throw new Error("OF não encontrada.");
        if (ofData.status !== 'DRAFT') throw new Error("A OF não está em rascunho.");
        if (!ofData.commitment_id || !ofData.commitment) throw new Error("Nenhum empenho vinculado.");
        if (!ofData.items || ofData.items.length === 0) throw new Error("A OF deve ter ao menos um item.");

        // 2. Validate Commitment Balance
        const totalAmount = Number(ofData.total_amount || 0);
        const currentBalance = Number(ofData.commitment.current_balance || 0);
        if (currentBalance < totalAmount) {
            throw new Error(`O empenho selecionado não possui saldo suficiente (Disponível: R$ ${currentBalance.toFixed(2)}).`);
        }

        // 3. Fetch all non-canceled OFs for the same contract to validate balance
        const { data: allOfs, error: err2 } = await supabase
		  .from('ofs')
		  .select('id, status, total_amount, secretariat_id, items:of_items(contract_item_id, quantity)')
		  .eq('contract_id', ofData.contract_id)
		  .eq('tenant_id', tenantId)
		  .neq('status', 'CANCELLED');
        if (err2) {
  console.error('Erro real ao validar histórico de OFs:', err2);
  throw new Error(`Erro ao validar histórico de OFs: ${err2.message}`);
}

        // Validate Contract Balance (Global)
        const contractTotalValue = Number(ofData.contract.total_value || 0);
        // For global balance, we only count ISSUED ones as "executed"
        const executedValue = (allOfs || []).filter((o: any) => o.status === 'ISSUED').reduce((acc: number, curr: any) => acc + Number(curr.total_amount || 0), 0);
        if (contractTotalValue - executedValue < totalAmount) {
            throw new Error(`O contrato não possui saldo global disponível suficiente (Disponível: R$ ${(contractTotalValue - executedValue).toFixed(2)}).`);
        }

        // 4. Validate Allocations
        const { data: allocations, error: err3 } = await supabase
            .from('contract_item_allocations')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('secretariat_id', ofData.secretariat_id);
        if (err3) throw new Error("Erro ao carregar rateios da secretaria.");

        for (let item of ofData.items) {
            if (!item.contract_item_id) {
                 throw new Error(`Item do contrato não referenciado corretamente na OF (Item: ${item.description}).`);
            }
            const allocation = (allocations || []).find((a: any) => a.contract_item_id === item.contract_item_id);
            if (!allocation) {
                throw new Error(`Não há rateio cadastrado para a secretaria no item "${item.description}".`);
            }

            let consumedQtd = 0;
            (allOfs || []).forEach((existingOf: any) => {
                if (existingOf.id === id) return; // Skip CURRENT OF being issued
                if (existingOf.secretariat_id === ofData.secretariat_id) {
                    const elements = existingOf.items.filter((i: any) => i.contract_item_id === item.contract_item_id);
                    elements.forEach((e: any) => consumedQtd += Number(e.quantity || 0));
                }
            });

            const allocatedQtd = Number(allocation.quantity_allocated || 0);
            const requestedQtd = Number(item.quantity || 0);

            if (allocatedQtd - consumedQtd < requestedQtd) {
                throw new Error(`A quantidade solicitada para o item "${item.description}" (${requestedQtd}) excede o saldo do rateio da secretaria (Disponível: ${allocatedQtd - consumedQtd}).`);
            }
        }

        // 5. Apply Updates Transacting via Sequential Async Functions
        const newConsumed = Number(ofData.commitment.consumed_amount || 0) + totalAmount;
        const newBalance = currentBalance - totalAmount;

        const { error: err4 } = await supabase.from('commitments').update({
            consumed_amount: newConsumed,
            current_balance: newBalance
        }).eq('id', ofData.commitment.id);
        if (err4) throw new Error("Erro ao atualizar o saldo do empenho.");

        const { error: err5 } = await supabase.from('commitment_movements').insert([{
            tenant_id: tenantId,
            commitment_id: ofData.commitment.id,
            movement_type: 'OF_CONSUMPTION',
            amount: totalAmount,
            description: `Emissão da OF Nº ${ofData.number || 'S/N'}`,
            of_id: id,
            movement_date: new Date().toISOString(),
            previous_balance: currentBalance,
            new_balance: newBalance
        }]);
        if (err5) console.warn("Erro ao registrar movimentação do empenho:", err5.message);

        const { error: err6 } = await supabase.from('ofs').update({
            status: 'ISSUED',
            issue_date: new Date().toISOString().split('T')[0],
            requester_name: signatoryInfo.name,
            requester_department: `${signatoryInfo.role}${signatoryInfo.registration ? ` - Matrícula: ${signatoryInfo.registration}` : ''}`
        }).eq('id', id);
        if (err6) throw new Error("Erro ao marcar OF como emitida.");
    }

    async cancelOf(id: string, tenantId: string, userId: string): Promise<void> {
        if (!tenantId) throw new Error("tenantId is required");
        if (!userId) throw new Error("userId is required for cancellation auditing");

        const { error } = await supabase.rpc('cancel_of', { 
            p_of_id: id,
            p_tenant_id: tenantId,
            p_updated_by: userId
        });
        
        if (error) throw error;
    }
}

export const ofsService = new OFsService();
