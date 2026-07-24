import { supabase } from '../../lib/supabase';

class LaboratorioMapasService {
    
    // Lista os lotes gerados para o tenant
    async listarLotes(tenantId) {
        try {
            if (!tenantId) throw new Error("Tenant não identificado.");
            
            const { data, error } = await supabase
                .from('lab_map_batches')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('generated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao listar lotes:', error);
            throw error;
        }
    }

    // Chama a RPC de geração do lote coletivo
    async gerarLoteColetivo({ tenantId, referenceDate, sectorId, startCode, endCode }) {
        try {
            if (!tenantId) throw new Error("Tenant não identificado.");

            const { data, error } = await supabase.rpc('rpc_lab_generate_map_batch', {
                p_tenant_id: tenantId,
                p_reference_date: referenceDate,
                p_sector_id: sectorId,
                p_start_code: startCode,
                p_end_code: endCode
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao gerar lote:', error);
            throw error;
        }
    }

    // Chama a RPC de geração do lote coletivo (todos os pacientes)
    async gerarLoteColetivoTodos({ tenantId, referenceDate, sectorId }) {
        try {
            if (!tenantId) throw new Error("Tenant não identificado.");

            const { data, error } = await supabase.rpc('rpc_lab_generate_all_map_batch', {
                p_tenant_id: tenantId,
                p_reference_date: referenceDate,
                p_sector_id: sectorId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao gerar lote de todos:', error);
            throw error;
        }
    }

    // Chama a RPC para marcar como impresso
    async marcarLoteComoImpresso({ tenantId, batchId }) {
        try {
            if (!tenantId || !batchId) throw new Error("Parâmetros inválidos para impressão.");

            const { data, error } = await supabase.rpc('rpc_lab_mark_map_batch_printed', {
                p_tenant_id: tenantId,
                p_batch_id: batchId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao marcar lote como impresso:', error);
            throw error;
        }
    }

    // Chama a RPC para cancelar lote
    async cancelarLote({ tenantId, batchId }) {
        try {
            if (!tenantId || !batchId) throw new Error("Parâmetros inválidos para cancelamento.");

            const { data, error } = await supabase.rpc('rpc_lab_cancel_map_batch', {
                p_tenant_id: tenantId,
                p_batch_id: batchId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao cancelar lote:', error);
            throw error;
        }
    }
}

export const laboratorioMapasService = new LaboratorioMapasService();
