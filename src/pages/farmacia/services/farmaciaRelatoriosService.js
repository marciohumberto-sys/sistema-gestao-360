import { supabase } from '../../../lib/supabase';

// Helper de Datas
const getStartDate = (periodoStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (periodoStr === 'Hoje') {
        return today.toISOString();
    } else if (periodoStr === '7d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        return d.toISOString();
    } else if (periodoStr === '30d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        return d.toISOString();
    }
    return null; // Todo o período (Personalizado fallback)
};

// ==========================================
// RELATÓRIO 1: POSIÇÃO DE ESTOQUE
// ==========================================
export const generateStockPositionReport = async (tenantId, unidadeNome) => {
    try {
        if (!tenantId) throw new Error("TenantID não identificado.");

        const [ resItems, resMoves, resBatches, resUnits ] = await Promise.all([
            supabase.from('inventory_items').select('id, name, minimum_stock, is_active'),
            supabase.from('stock_movements').select('inventory_item_id, movement_type, quantity, batch_id, unit_id').eq('tenant_id', tenantId),
            supabase.from('item_batches').select('id, inventory_item_id, expiration_date, batch_number'),
            supabase.from('units').select('id, name')
        ]);

        if (resItems.error) console.error('[Supabase] Erro em inventory_items:', resItems.error);
        if (resMoves.error) console.error('[Supabase] Erro em stock_movements:', resMoves.error);

        const items = resItems.data;
        const movements = resMoves.data;
        const batches = resBatches.data || [];
        const units = resUnits.data || [];

        // Trata erro crasso
        if (!items || !movements) {
            return { data: [], columns: [], error: `Falha de conexão estrutural. ${resItems.error?.message || resMoves.error?.message || ''}` };
        }

        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const targetUnitId = unidadeNome !== 'Todas' ? unitMap[unidadeNome.toUpperCase()] : null;

        const validMovements = targetUnitId ? movements.filter(m => m.unit_id === targetUnitId) : movements;

        const itemBalance = {};
        const batchBalance = {};
        
        validMovements.forEach(m => {
            const qty = Number(m.quantity) || 0;
            const net = m.movement_type === 'ENTRY' ? qty : -qty; // stock_movements real no banco guarda o numero bruto e a gente subtrai se for EXIT (ou pode ja estar negativo no db)
            // IMPORTANTE: Na inserção da saída (`FarmaciaSaidaModal`) o qty já desce como negativo (-Math.abs).
            // MAS por precaução se baseia no tipo absoluto somado ao sinal para garantir padrao.
            const absoluteValue = Math.abs(qty);
            const actualNet = m.movement_type === 'ENTRY' ? absoluteValue : -absoluteValue;

            itemBalance[m.inventory_item_id] = (itemBalance[m.inventory_item_id] || 0) + actualNet;
            if (m.batch_id) {
                batchBalance[m.batch_id] = (batchBalance[m.batch_id] || 0) + actualNet;
            }
        });

        const data = items.filter(i => i.is_active).map(item => {
            const bAtual = itemBalance[item.id] || 0;
            
            let loteAtivo = '-';
            let validadeAtiva = '-';
            let minMs = Infinity;
            
            batches.filter(b => b.inventory_item_id === item.id).forEach(b => {
                const qb = batchBalance[b.id] || 0;
                if (qb > 0 && b.expiration_date) {
                    const t = new Date(b.expiration_date).getTime();
                    if (t < minMs) { 
                        minMs = t; 
                        validadeAtiva = b.expiration_date; 
                        loteAtivo = b.batch_number || '-'; 
                    }
                }
            });

            return {
                codigo: String(item.id).slice(0, 8),
                medicamento: item.name,
                lote: loteAtivo,
                validade: validadeAtiva !== '-' ? new Date(validadeAtiva).toLocaleDateString('pt-BR') : '-',
                saldo: bAtual,
                unidade: unidadeNome !== 'Todas' ? unidadeNome : 'Consolidado',
                status: bAtual <= 0 ? 'Zerado' : (bAtual < (item.minimum_stock || 0) ? 'Crítico' : 'Normal')
            };
        });

        const finalData = data.filter(d => d.saldo > 0 || d.status === 'Zerado').sort((a,b) => b.saldo - a.saldo);

        const columns = [
            { key: 'codigo', label: 'Código' },
            { key: 'medicamento', label: 'Medicamento / Material' },
            { key: 'lote', label: 'Lote' },
            { key: 'validade', label: 'Validade' },
            { key: 'saldo', label: 'Saldo Atual', align: 'right' },
            { key: 'unidade', label: 'Unidade' },
            { key: 'status', label: 'Status' }
        ];

        return { data: finalData, columns, error: null };
    } catch (e) {
        console.error('[Service] generateStockPositionReport catch:', e);
        return { data: null, columns: null, error: e.message };
    }
};

// ==========================================
// RELATÓRIO 2: MOVIMENTAÇÕES POR PERÍODO
// ==========================================
export const generateMovementsByPeriodReport = async (tenantId, periodo, unidadeNome) => {
    try {
        if (!tenantId) throw new Error("TenantID não identificado.");

        let queryMoves = supabase.from('stock_movements').select('created_at, movement_type, quantity, inventory_item_id, unit_id, notes').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        
        const startDate = getStartDate(periodo);
        if (startDate) queryMoves = queryMoves.gte('created_at', startDate);

        const [ resMoves, resItems, resUnits ] = await Promise.all([
            queryMoves,
            supabase.from('inventory_items').select('id, name'),
            supabase.from('units').select('id, name')
        ]);

        if (resMoves.error) console.error('[Supabase] Erro movimentações:', resMoves.error);

        const movements = resMoves.data;
        const items = resItems.data || [];
        const units = resUnits.data || [];

        if (!movements) {
            return { data: [], columns: [], error: `Falha ao buscar movimentações reais. ${resMoves.error?.message || ''}` };
        }

        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const targetUnitId = unidadeNome !== 'Todas' ? unitMap[unidadeNome.toUpperCase()] : null;

        const validMovements = targetUnitId ? movements.filter(m => m.unit_id === targetUnitId) : movements;

        const data = validMovements.map(m => {
            const itemObj = items.find(i => i.id === m.inventory_item_id) || {};
            const unitObj = units.find(u => u.id === m.unit_id) || {};
            
            let tipoLabel = m.movement_type;
            if (tipoLabel === 'ENTRY') tipoLabel = 'ENTRADA';
            if (tipoLabel === 'EXIT') tipoLabel = 'SAÍDA';
            if (tipoLabel === 'ADJUSTMENT') tipoLabel = 'AJUSTE';

            return {
                data: new Date(m.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(m.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
                tipo: tipoLabel,
                medicamento: itemObj.name || '-',
                unidade: unitObj.name || '-',
                quantidade: Math.abs(m.quantity || 0),
                obs: (!m.notes || m.notes.trim()==='') ? '—' : m.notes
            };
        });

        const columns = [
            { key: 'data', label: 'Data/Hora' },
            { key: 'tipo', label: 'Tipo de Movimento' },
            { key: 'medicamento', label: 'Medicamento' },
            { key: 'unidade', label: 'Unidade' },
            { key: 'quantidade', label: 'Quantidade', align: 'right' },
            { key: 'obs', label: 'Observação' }
        ];

        return { data, columns, error: null };
    } catch (e) {
        console.error('[Service] generateMovementsByPeriodReport catch:', e);
        return { data: null, columns: null, error: e.message };
    }
};

// ==========================================
// RELATÓRIO 3: CONSUMO POR SETOR (Honesto)
// ==========================================
export const generateConsumptionBySectorReport = async (tenantId, periodo, unidadeNome) => {
    // FALBACK HONESTO SOLICITADO
    // A modelagem atual não dispõe de ID de Setores na 'stock_movements' além da Unidade de Destino.
    // Assim, enviamos um emptyMessage que age como "Aviso Estrutural" para a Farmacêutica.
    
    // Retorna mensagem gentil e neutra usando a estrutura normal da tabela como container.
    return {
        data: [], 
        columns: [
            { key: 'setor', label: 'Setor de Destino' },
            { key: 'medicamento', label: 'Medicamento' },
            { key: 'consumido', label: 'Vol. Consumido', align: 'right' }
        ], 
        error: null, 
        emptyMessage: 'Este relatório depende de uma identificação estruturada de destino/setor (ex: UTI, Enfermaria) nas saídas, que ainda não está disponível de forma consistente nesta etapa, constando apenas a base da Unidade.'
    };
};

// ==========================================
// RELATÓRIO 4: ABAIXO DO MÍNIMO
// ==========================================
export const generateBelowMinimumReport = async (tenantId, unidadeNome) => {
    try {
        const { data, columns, error } = await generateStockPositionReport(tenantId, unidadeNome);
        if (error) throw new Error(error);

        // Filtra os críticos
        const dataFiltrada = data.filter(d => d.status === 'Crítico' || d.status === 'Zerado');

        if (dataFiltrada.length === 0) {
            return { data: [], columns, error: null, emptyMessage: 'Nenhum item está operando abaixo do limite de estoque mínimo cadastrado.' };
        }

        return { data: dataFiltrada, columns, error: null };
    } catch (e) {
        console.error('[Service] generateBelowMinimumReport catch:', e);
        return { data: null, columns: null, error: e.message };
    }
};

// ==========================================
// RELATÓRIO 5: VALIDADES A VENCER
// ==========================================
export const generateExpiringItemsReport = async (tenantId, faixaVencimento, unidadeNome) => {
    try {
        if (!tenantId) throw new Error("TenantID ausente.");

        const [ resItems, resMoves, resBatches, resUnits ] = await Promise.all([
            supabase.from('inventory_items').select('id, name'),
            supabase.from('stock_movements').select('movement_type, quantity, batch_id, unit_id').eq('tenant_id', tenantId),
            supabase.from('item_batches').select('id, inventory_item_id, expiration_date, batch_number').not('expiration_date', 'is', null),
            supabase.from('units').select('id, name')
        ]);

        if (resBatches.error) console.error('[Supabase] Erro em item_batches:', resBatches.error);
        
        const items = resItems.data || [];
        const movements = resMoves.data || [];
        const batches = resBatches.data;
        const units = resUnits.data || [];

        if (!batches) {
            return { data: [], columns: [], error: 'Falha ao buscar lotes reais do banco.' };
        }

        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const targetUnitId = unidadeNome !== 'Todas' ? unitMap[unidadeNome.toUpperCase()] : null;

        const validMovements = targetUnitId ? movements.filter(m => m.unit_id === targetUnitId) : movements;

        const batchBalance = {};
        validMovements.forEach(m => {
            if (m.batch_id) {
                const qty = Math.abs(Number(m.quantity) || 0);
                const net = m.movement_type === 'ENTRY' ? qty : -qty;
                batchBalance[m.batch_id] = (batchBalance[m.batch_id] || 0) + net;
            }
        });

        const filterDays = faixaVencimento === '30d' ? 30 : faixaVencimento === '60d' ? 60 : 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + filterDays);

        const data = [];
        batches.forEach(b => {
            const saldo = batchBalance[b.id] || 0;
            if (saldo > 0) {
                const bDate = new Date(b.expiration_date);
                if (bDate <= cutoffDate) {
                    const diffTime = bDate - new Date();
                    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    data.push({
                        codigo: String(b.inventory_item_id).slice(0, 8),
                        medicamento: items.find(i => i.id === b.inventory_item_id)?.name || '-',
                        lote: b.batch_number || '-',
                        validade: bDate.toLocaleDateString('pt-BR'),
                        dias: dias > 0 ? `${dias} dias` : (dias === 0 ? 'Hoje' : `Venceu há ${Math.abs(dias)} dias`),
                        saldo: saldo,
                        unidade: unidadeNome !== 'Todas' ? unidadeNome : 'Consolidado'
                    });
                }
            }
        });

        data.sort((a,b) => {
            const d1 = parseInt(a.dias) || 0;
            const d2 = parseInt(b.dias) || 0;
            return d1 - d2;
        });

        const columns = [
            { key: 'codigo', label: 'Código' },
            { key: 'medicamento', label: 'Medicamento' },
            { key: 'lote', label: 'Lote' },
            { key: 'validade', label: 'Venc. Real' },
            { key: 'dias', label: 'Cálculo' },
            { key: 'saldo', label: 'Saldo (UN)', align: 'right' },
            { key: 'unidade', label: 'Unidade Base' }
        ];

        return { data, columns, error: null };
    } catch (e) {
        console.error('[Service] generateExpiringItemsReport catch:', e);
        return { data: null, columns: null, error: e.message };
    }
};

// ==========================================
// RELATÓRIO 6: CURVA ABC DE CONSUMO
// ==========================================
export const generateAbcConsumptionReport = async (tenantId, periodo, unidadeNome) => {
    try {
        if (!tenantId) throw new Error("TenantID não identificado.");

        let queryExits = supabase.from('stock_movements').select('quantity, inventory_item_id, unit_id').eq('tenant_id', tenantId).eq('movement_type', 'EXIT');
        
        const startDate = getStartDate(periodo);
        if (startDate) queryExits = queryExits.gte('created_at', startDate);

        const [ resExits, resItems, resUnits ] = await Promise.all([
            queryExits,
            supabase.from('inventory_items').select('id, name'),
            supabase.from('units').select('id, name')
        ]);

        if (resExits.error) console.error('[Supabase] Erro nas saídas (Curva ABC):', resExits.error);

        const exits = resExits.data;
        const items = resItems.data || [];
        const units = resUnits.data || [];

        if (!exits) {
            return { data: [], columns: [], error: 'Falha técnica ao rastrear consumo acumulado.' };
        }

        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const targetUnitId = unidadeNome !== 'Todas' ? unitMap[unidadeNome.toUpperCase()] : null;

        const validExits = targetUnitId ? exits.filter(m => m.unit_id === targetUnitId) : exits;

        let totalConsumo = 0;
        const itemConsumo = {};
        
        validExits.forEach(m => {
            const q = Math.abs(m.quantity || 0);
            itemConsumo[m.inventory_item_id] = (itemConsumo[m.inventory_item_id] || 0) + q;
            totalConsumo += q;
        });

        if (totalConsumo === 0) {
            return { data: [], columns: [], error: null, emptyMessage: 'Não há histórico de saída/consumo no banco sob este período de recorte para modelar a Curva ABC.' };
        }

        const dataArray = items.filter(i => itemConsumo[i.id] > 0).map(item => {
            const consumido = itemConsumo[item.id];
            const percentual = (consumido / totalConsumo) * 100;
            return {
                medicamento: item.name,
                consumido: consumido,
                percentual: percentual,
                acumulado: 0,
                classificacao: ''
            };
        });

        // Ordenar decrescentemente o consumo puro
        dataArray.sort((a,b) => b.consumido - a.consumido);

        // Classificação Base Ponderada 80-95-100
        let sumAcul = 0;
        dataArray.forEach(row => {
            sumAcul += row.percentual;
            row.acumulado = sumAcul;
            
            if (sumAcul <= 80) row.classificacao = 'A (Alta Curva)';
            else if (sumAcul <= 95) row.classificacao = 'B (Volume Intermediário)';
            else row.classificacao = 'C (Movimentação Fria)';
            
            row.percentualStr = row.percentual.toFixed(1) + '%';
        });

        const columns = [
            { key: 'medicamento', label: 'Medicamento Movimentado' },
            { key: 'consumido', label: 'Dispensação Acumulada', align: 'right' },
            { key: 'percentualStr', label: 'Representatividade', align: 'right' },
            { key: 'classificacao', label: 'Classificação Ponderada ABC' }
        ];

        return { data: dataArray, columns, error: null };
    } catch (e) {
        console.error('[Service] generateAbcConsumptionReport catch:', e);
        return { data: null, columns: null, error: e.message };
    }
};
