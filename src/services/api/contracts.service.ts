import { httpClient } from './httpClient';
import { ENDPOINTS } from './endpoints';
import { Contract, DashboardMetrics } from '../../types';
import { supabase } from '../../lib/supabase';
import { parseLocalDate } from '../../utils/dateUtils';

class ContractsService {
    private enrichContract(dbContract: any): Contract {
        // Map snake_case from DB to camelCase for UI
        const enriched = {
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
            secretariat_id: dbContract.secretariat_id,
            biddingProcess: dbContract.bidding_process,
            electronicAuction: dbContract.electronic_auction,
            notes: dbContract.notes,
            contract_object: dbContract.contract_object,
            cnpj: dbContract.cnpj,
            address: dbContract.address,
            managerName: dbContract.manager_name,
            manager_registration: dbContract.manager_registration,
            technical_fiscal_name: dbContract.technical_fiscal_name,
            technical_fiscal_registration: dbContract.technical_fiscal_registration,
            administrative_fiscal_name: dbContract.administrative_fiscal_name,
            administrative_fiscal_registration: dbContract.administrative_fiscal_registration,
            contract_pdf_url: dbContract.contract_pdf_url,
            rescinded_at: dbContract.rescinded_at,
            rescission_notes: dbContract.rescission_notes,
            rescission_pdf_url: dbContract.rescission_pdf_url,
            createdAt: dbContract.created_at,
            updatedAt: dbContract.updated_at,
            isPending: false,
            pendingIssues: []
        } as Contract;

        // Dynamic status calculation
        if (enriched.status === 'ATIVO' && enriched.dateRange.endDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const endDate = parseLocalDate(enriched.dateRange.endDate);
            if (endDate) {
                endDate.setHours(0, 0, 0, 0);
                const diffTime = endDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) enriched.status = 'VENCIDO';
                else if (diffDays <= 30) enriched.status = 'VENCENDO';
            }
        }

        // Rule 1: ATIVO and zero items
        const itemCount = dbContract.contract_items?.[0]?.count ?? dbContract.item_count ?? 0;
        if (enriched.status === 'ATIVO' && itemCount === 0) {
            enriched.isPending = true;
            enriched.pendingIssues = ["Sem itens"];
        }

        return enriched;
    }

    async list(tenantId?: string): Promise<Contract[]> {
        let query = supabase
            .from("contracts")
            .select("*, contract_items(count)")
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
            .select("*, contract_items(count)")
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
            secretariat_id: input.secretariat_id,
            bidding_process: input.biddingProcess,
            electronic_auction: input.electronicAuction,
            notes: input.notes,
            contract_object: input.contract_object,
            cnpj: input.cnpj,
            address: input.address,
            manager_name: input.managerName,
            manager_registration: input.manager_registration,
            technical_fiscal_name: input.technical_fiscal_name,
            technical_fiscal_registration: input.technical_fiscal_registration,
            administrative_fiscal_name: input.administrative_fiscal_name,
            administrative_fiscal_registration: input.administrative_fiscal_registration,
            contract_pdf_url: input.contract_pdf_url,
            rescinded_at: input.rescinded_at,
            rescission_notes: input.rescission_notes,
            rescission_pdf_url: input.rescission_pdf_url,
            tenant_id: tenantId
        };

        const { data: result, error } = await supabase
            .from("contracts")
            .insert([payload])
            .select()
            .single();

        if (result && !error) {
            // Registro de Eventos Iniciais
            const historyEvents = [
                {
                    contract_id: result.id,
                    tenant_id: tenantId,
                    event_type: 'contract_created',
                    event_title: 'Contrato registrado no sistema',
                    event_date: result.created_at
                }
            ];

            if (result.start_date) {
                historyEvents.push({
                    contract_id: result.id,
                    tenant_id: tenantId,
                    event_type: 'vigency_start',
                    event_title: 'Início da vigência do contrato',
                    event_date: result.start_date
                });
            }

            if (result.end_date) {
                historyEvents.push({
                    contract_id: result.id,
                    tenant_id: tenantId,
                    event_type: 'vigency_end',
                    event_title: 'Final da vigência do contrato',
                    event_date: result.end_date
                });
            }

            await supabase.from("contract_history").insert(historyEvents);
        }

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
        if (data.secretariat_id !== undefined) payload.secretariat_id = data.secretariat_id;
        if (data.biddingProcess !== undefined) payload.bidding_process = data.biddingProcess;
        if (data.electronicAuction !== undefined) payload.electronic_auction = data.electronicAuction;
        if (data.notes !== undefined) payload.notes = data.notes;
        if (data.contract_object !== undefined) payload.contract_object = data.contract_object;
        if (data.cnpj !== undefined) payload.cnpj = data.cnpj;
        if (data.address !== undefined) payload.address = data.address;
        if (data.managerName !== undefined) payload.manager_name = data.managerName;
        if (data.manager_registration !== undefined) payload.manager_registration = data.manager_registration;
        if (data.technical_fiscal_name !== undefined) payload.technical_fiscal_name = data.technical_fiscal_name;
        if (data.technical_fiscal_registration !== undefined) payload.technical_fiscal_registration = data.technical_fiscal_registration;
        if (data.administrative_fiscal_name !== undefined) payload.administrative_fiscal_name = data.administrative_fiscal_name;
        if (data.administrative_fiscal_registration !== undefined) payload.administrative_fiscal_registration = data.administrative_fiscal_registration;
        if (data.contract_pdf_url !== undefined) payload.contract_pdf_url = data.contract_pdf_url;

        if (data.rescinded_at !== undefined) payload.rescinded_at = data.rescinded_at;
        if (data.rescission_notes !== undefined) payload.rescission_notes = data.rescission_notes;
        if (data.rescission_pdf_url !== undefined) payload.rescission_pdf_url = data.rescission_pdf_url;

        // Fetch old contract to compare values for history
        const oldContract = await this.getById(id);
        if (!oldContract) throw new Error("Contrato não encontrado para atualização.");

        const { data: result, error } = await supabase
            .from("contracts")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        // Update history if necessary
        if (result) {
            // 1. Value Change (Always a new historic event)
            if (oldContract.totalValue !== result.total_value) {
                await supabase.from("contract_history").insert({
                    contract_id: id,
                    tenant_id: result.tenant_id,
                    event_type: 'value_changed',
                    event_title: 'Valor do contrato alterado',
                    old_value: oldContract.totalValue,
                    new_value: result.total_value,
                    event_date: new Date().toISOString()
                });
            }

            // 2. Start Date (Vigency) Update
            if (payload.start_date !== undefined && oldContract.dateRange.startDate !== result.start_date) {
                // Try to update existing event
                const { data: existingVigency } = await supabase
                    .from("contract_history")
                    .select("id")
                    .eq("contract_id", id)
                    .eq("event_type", 'vigency_start')
                    .single();

                if (existingVigency) {
                    await supabase.from("contract_history")
                        .update({ event_date: result.start_date })
                        .eq("id", existingVigency.id);
                } else {
                    // If doesn't exist, create it (fallback for legacy records)
                    await supabase.from("contract_history").insert({
                        contract_id: id,
                        tenant_id: result.tenant_id,
                        event_type: 'vigency_start',
                        event_title: 'Início da vigência do contrato',
                        event_date: result.start_date
                    });
                }
            }

            // 3. End Date (Vigency End) Update
            if (payload.end_date !== undefined && oldContract.dateRange.endDate !== result.end_date) {
                // Try to update existing event
                const { data: existingVigencyEnd } = await supabase
                    .from("contract_history")
                    .select("id")
                    .eq("contract_id", id)
                    .eq("event_type", 'vigency_end')
                    .single();

                if (existingVigencyEnd) {
                    await supabase.from("contract_history")
                        .update({ event_date: result.end_date })
                        .eq("id", existingVigencyEnd.id);
                } else {
                    // If doesn't exist, create it (fallback for legacy records)
                    await supabase.from("contract_history").insert({
                        contract_id: id,
                        tenant_id: result.tenant_id,
                        event_type: 'vigency_end',
                        event_title: 'Final da vigência do contrato',
                        event_date: result.end_date
                    });
                }
            }

            // 4. Rescission Update
            const wasRescinded = !!oldContract.rescinded_at;
            const isNowRescinded = !!result.rescinded_at;

            if (isNowRescinded) {
                if (!wasRescinded) {
                    // First time rescinded: Create new event
                    await supabase.from("contract_history").insert({
                        contract_id: id,
                        tenant_id: result.tenant_id,
                        event_type: 'rescinded',
                        event_title: 'Contrato rescindido',
                        event_description: result.rescission_notes || '',
                        event_date: result.rescinded_at
                    });
                } else if (oldContract.rescinded_at !== result.rescinded_at || oldContract.rescission_notes !== result.rescission_notes) {
                    // Already rescinded but date/notes changed: Update existing event
                    const { data: existingRescission } = await supabase
                        .from("contract_history")
                        .select("id")
                        .eq("contract_id", id)
                        .eq("event_type", 'rescinded')
                        .single();

                    if (existingRescission) {
                        await supabase.from("contract_history")
                            .update({
                                event_date: result.rescinded_at,
                                event_description: result.rescission_notes || ''
                            })
                            .eq("id", existingRescission.id);
                    }
                }
            }
        }

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
        let totalPending = 0;

        contracts.forEach(c => {
            totalValSum += c.totalValue;
            balanceValSum += c.balanceValue;

            if (c.status === 'ATIVO') activeCount++;
            if (c.status === 'VENCENDO') expiringCount++;
            if (c.status === 'VENCIDO') expiredCount++;
            if (c.isPending) totalPending++;
        });

        return {
            totalContracts: contracts.length,
            expiringContracts: expiringCount,
            expiredContracts: expiredCount,
            totalValueSum: totalValSum,
            balanceValueSum: balanceValSum,
            totalPendingContracts: totalPending,
            ofsThisMonth: 0,
            ofsChangePercentage: 0,
            pendingNfs: 0,
            nfsExpiringThisWeek: 0
        };
    }

    async getHistory(contractId: string) {
        const { data, error } = await supabase
            .from("contract_history")
            .select("*")
            .eq("contract_id", contractId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data;
    }
}

export const contractsService = new ContractsService();
