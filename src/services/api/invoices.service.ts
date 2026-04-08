import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

export interface Invoice {
    id: string;
    tenant_id: string;
    number: string;
    issue_date: string;
    contract_id: string;
    of_id: string;
    commitment_id?: string;
    total_amount: number;
    liquidation_number?: string;
    liquidation_date?: string;
    payment_date?: string;
    created_at: string;
    updated_at: string;
    contract?: any;
    of?: any;
    commitment?: any;
    items?: any[];
}

class InvoicesService {
    async list(tenantId: string): Promise<Invoice[]> {
        if (!tenantId) return [];

        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                contract:contracts(number, title, supplier_name, cnpj),
                of:ofs(number, issue_date),
                commitment:commitments(number)
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((item: any) => ({
            ...item,
            contract: item.contract ? (Array.isArray(item.contract) ? item.contract[0] : item.contract) : null,
            of: item.of ? (Array.isArray(item.of) ? item.of[0] : item.of) : null,
            commitment: item.commitment ? (Array.isArray(item.commitment) ? item.commitment[0] : item.commitment) : null
        }));
    }

    async getById(id: string): Promise<Invoice> {
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                contract:contracts(number, title, supplier_name, cnpj),
                of:ofs(number, total_amount),
                commitment:commitments(number, current_balance),
                items:invoice_items(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        return {
            ...data,
            contract: data.contract ? (Array.isArray(data.contract) ? data.contract[0] : data.contract) : null,
            of: data.of ? (Array.isArray(data.of) ? data.of[0] : data.of) : null,
            commitment: data.commitment ? (Array.isArray(data.commitment) ? data.commitment[0] : data.commitment) : null
        };
    }

    async getOfItemsWithInvoicedBalances(ofId: string, tenantId: string): Promise<any[]> {
        if (!tenantId) throw new Error("tenantId is required");

        // 1. Fetch all items of this OF
        const { data: ofItems, error: ofItemsErr } = await supabase
            .from('of_items')
            .select('*')
            .eq('of_id', ofId)
            .eq('tenant_id', tenantId);

        if (ofItemsErr) throw ofItemsErr;
        if (!ofItems || ofItems.length === 0) return [];

        // 2. Extract item IDs
        const ofItemIds = ofItems.map((item: any) => item.id);

        // 3. Fetch all previously invoiced items for these OF items
        const { data: invItems, error: invItemsErr } = await supabase
            .from('invoice_items')
            .select('of_item_id, quantity')
            .in('of_item_id', ofItemIds)
            .eq('tenant_id', tenantId);

        if (invItemsErr) throw invItemsErr;

        // 4. Summarize quantities already invoiced
        const alreadyInvoicedMap: Record<string, number> = {};
        (invItems || []).forEach((invItem: any) => {
            const id = invItem.of_item_id;
            const qtd = Number(invItem.quantity || 0);
            alreadyInvoicedMap[id] = (alreadyInvoicedMap[id] || 0) + qtd;
        });

        // 5. Combine data for UX
        return ofItems.map((item: any) => {
            const quantityTotal = Number(item.quantity || 0);
            const quantityInvoiced = alreadyInvoicedMap[item.id] || 0;
            const balance = quantityTotal - quantityInvoiced;
            
            return {
                ...item,
                quantity_invoiced: quantityInvoiced,
                quantity_balance: balance > 0 ? balance : 0 // UI protection
            };
        });
    }

    async createInvoice(tenantId: string, headerData: any, itemsData: any[]): Promise<any> {
        if (!tenantId) throw new Error("tenantId is required");
        if (!itemsData || itemsData.length === 0) throw new Error("Nenhum item faturado fornecido.");

        // Sequencial Save: 1. Header
        const invoiceHeaderPayload = {
            tenant_id: tenantId,
            contract_id: headerData.contract_id,
            of_id: headerData.of_id,
            commitment_id: headerData.commitment_id || null,
            secretariat_id: headerData.secretariat_id || null,
            number: headerData.number,
            issue_date: headerData.issue_date,
            contract_number_snapshot: headerData.contract_number_snapshot || null,
            of_number_snapshot: headerData.of_number_snapshot || null,
            commitment_number_snapshot: headerData.commitment_number_snapshot || null,
            supplier_name_snapshot: headerData.supplier_name_snapshot || null,
            supplier_document_snapshot: headerData.supplier_document_snapshot || null,
            secretariat_name_snapshot: headerData.secretariat_name_snapshot || null,
            total_amount: headerData.total_amount,
            notes: headerData.notes || null
        };

        console.log("=== PAYLOAD FINAL INVOICE HEADER ===");
        console.log(JSON.stringify(invoiceHeaderPayload, null, 2));

        const { data: invoiceData, error: invoiceError } = await supabase
            .from('invoices')
            .insert([invoiceHeaderPayload])
            .select()
            .single();

        if (invoiceError) throw new Error("Erro ao criar cabeçalho da Nota Fiscal: " + invoiceError.message);
        if (!invoiceData) throw new Error("Falha desconhecida ao criar Nota Fiscal");

        // Sequencial Save: 2. Items
        const mappedItems = itemsData.map((item: any) => ({
            tenant_id: tenantId,
            invoice_id: invoiceData.id,
            of_item_id: item.of_item_id,
            contract_item_id: item.contract_item_id || null,
            item_number: item.item_number || null,
            description_snapshot: item.description_snapshot || null,
            unit_snapshot: item.unit_snapshot || null,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price)
        }));

        console.log("=== PAYLOAD FINAL INVOICE ITEMS ===");
        console.log(JSON.stringify(mappedItems, null, 2));

        const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(mappedItems);

        if (itemsError) {
             // In a perfect world we would rollback the header here if items failed, or backend would handle it.
             // We'll throw to alert the user.
             throw new Error("Nota Fiscal criada, mas erro ao salvar os itens: " + itemsError.message);
        }

        return invoiceData;
    }

    async updateComplementaryData(id: string, tenantId: string, updates: any): Promise<void> {
        if (!tenantId) throw new Error("tenantId is required");

        const payload = {
            liquidation_number: updates.liquidation_number || null,
            liquidation_date: updates.liquidation_date || null,
            payment_date: updates.payment_date || null,
            notes: updates.notes || null
        };

        const { error } = await supabase
            .from('invoices')
            .update(payload)
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
    }
}

export const invoicesService = new InvoicesService();
