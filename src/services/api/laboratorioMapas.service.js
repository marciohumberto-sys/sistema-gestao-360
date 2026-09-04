import { supabase } from '../../lib/supabase';

class LaboratorioMapasService {
    
    // Lista os lotes gerados para o tenant
    async listarLotes(tenantId) {
        try {
            if (!tenantId) throw new Error("Tenant não identificado.");
            
            const { data, error } = await supabase
                .from('lab_map_batches')
                .select('id, tenant_id, status, generated_at, reference_date')
                .eq('tenant_id', tenantId)
                .order('generated_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao listar lotes:', error);
            throw error;
        }
    }

    // Busca detalhes completos de um lote (inclui document_snapshot pesado)
    async buscarDetalhesLote(tenantId, loteId) {
        try {
            if (!tenantId || !loteId) return null;
            const { data, error } = await supabase
                .from('lab_map_batches')
                .select('document_snapshot')
                .eq('tenant_id', tenantId)
                .eq('id', loteId)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao buscar detalhes do lote:', error);
            throw error;
        }
    }

    // Carrega totalizadores usando count no banco
    async carregarEstatisticas(tenantId) {
        try {
            if (!tenantId) return { pendentes: 0, impressos: 0, pacientes: 0, exames: 0 };
            
            const [pendentesReq, impressosReq, pacientesReq, examesReq] = await Promise.all([
                supabase.from('lab_map_batches').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'PENDING'),
                supabase.from('lab_map_batches').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'PRINTED'),
                // O card "Pacientes" historicamente contava Atendimentos impressos em mapas. Aproximamos usando lab_attendances.
                supabase.from('lab_attendances').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
                // O card "Exames" contava os exames contidos nos mapas. Usamos lab_map_batch_items.
                supabase.from('lab_map_batch_items').select('*', { count: 'exact', head: true })
            ]);
            
            return {
                pendentes: pendentesReq.count || 0,
                impressos: impressosReq.count || 0,
                pacientes: pacientesReq.count || 0,
                exames: examesReq.count || 0
            };
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao carregar estatísticas:', error);
            return { pendentes: 0, impressos: 0, pacientes: 0, exames: 0 };
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
