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
export const generateMovementsByPeriodReport = async (tenantId, dataInicio, dataFim, unidadeNome, tipoItem = 'Todos', tipoMovimentacao = 'Todos') => {
    try {
        if (!tenantId) throw new Error("TenantID não identificado.");

        // 1. Resolver Unidade de antemão para filtrar no Supabase (reduz tráfego e filas de registros)
        const { data: resUnits, error: errUnits } = await supabase
            .from('units')
            .select('id, name');
        
        if (errUnits) console.error('[Supabase] Erro ao mapear unidades:', errUnits);

        const units = resUnits || [];
        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const targetUnitId = unidadeNome !== 'Todas' ? unitMap[unidadeNome.toUpperCase()] : null;

        // Preparação de Período em UTC
        let startISO = null;
        let endISO = null;
        if (dataInicio && dataFim) {
            const [yearStart, monthStart, dayStart] = dataInicio.split('-').map(Number);
            const [yearEnd, monthEnd, dayEnd] = dataFim.split('-').map(Number);
            const start = new Date(yearStart, monthStart - 1, dayStart, 0, 0, 0, 0);
            const end = new Date(yearEnd, monthEnd - 1, dayEnd, 23, 59, 59, 999);
            startISO = start.toISOString();
            endISO = end.toISOString();
        }

        // 2. Resgate Paginação Recursiva de Movimentações (Garante contornar o limite padrão de 1000 registros do PostgREST/Supabase)
        let allMovements = [];
        let fromIndex = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            // Eager Join direto no Supabase para trazer itens e unidades de forma relacionada nativamente
            let queryMoves = supabase
                .from('stock_movements')
                .select(`
                    created_at, 
                    movement_type, 
                    quantity, 
                    notes,
                    itemObj:inventory_items (id, name, item_type),
                    unitObj:units (id, name)
                `)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .range(fromIndex, fromIndex + PAGE_SIZE - 1);

            if (startISO && endISO) {
                queryMoves = queryMoves.gte('created_at', startISO).lte('created_at', endISO);
            }

            if (tipoMovimentacao === 'Entradas') {
                queryMoves = queryMoves.eq('movement_type', 'ENTRY');
            } else if (tipoMovimentacao === 'Saídas') {
                queryMoves = queryMoves.eq('movement_type', 'EXIT');
            } else {
                queryMoves = queryMoves.in('movement_type', ['ENTRY', 'EXIT']);
            }

            if (targetUnitId) {
                queryMoves = queryMoves.eq('unit_id', targetUnitId);
            }

            const { data: pageData, error: pageError } = await queryMoves;

            if (pageError) {
                console.error('[Supabase] Erro na página de busca do relatório:', pageError);
                throw pageError;
            }

            if (!pageData || pageData.length === 0) {
                hasMore = false;
            } else {
                allMovements = [...allMovements, ...pageData];
                if (pageData.length < PAGE_SIZE) {
                    hasMore = false;
                } else {
                    fromIndex += PAGE_SIZE;
                }
            }
        }

        // 3. Processar Dataset Consolidado e Aplicar Filtro de Item
        const data = [];

        allMovements.forEach(m => {
            // Parser seguro suportando objeto ou array de relacionamento
            const rawItem = m.itemObj;
            const itemObj = rawItem ? (Array.isArray(rawItem) ? rawItem[0] : rawItem) : null;
            
            if (!itemObj) return; // Pula caso o relacionamento do item falhe

            // Filtro de Tipo de Item em memória
            if (tipoItem === 'Medicamentos' && itemObj.item_type !== 'MEDICAMENTO') return;
            if (tipoItem === 'Materiais' && itemObj.item_type !== 'MATERIAL') return;
            if (tipoItem === 'Insumos' && itemObj.item_type !== 'INSUMO') return;

            const rawUnit = m.unitObj;
            const unitObj = rawUnit ? (Array.isArray(rawUnit) ? rawUnit[0] : rawUnit) : {};
            
            let tipoLabel = m.movement_type;
            if (tipoLabel === 'ENTRY') tipoLabel = 'ENTRADA';
            if (tipoLabel === 'EXIT') tipoLabel = 'SAÍDA';
            if (tipoLabel === 'ADJUSTMENT') tipoLabel = 'AJUSTE';

            data.push({
                data: new Date(m.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(m.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
                tipo: tipoLabel,
                medicamento: itemObj.name || '-',
                unidade: unitObj.name || '-',
                quantidade: Math.abs(m.quantity || 0),
                obs: (!m.notes || m.notes.trim() === '') ? '—' : m.notes
            });
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
export const generateConsumptionBySectorReport = async (tenantId, dataInicio, dataFim, unidadeNome, tipoItem = 'Todos') => {
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
export const generateAbcConsumptionReport = async (tenantId, dataInicio, dataFim, unidadeNome, tipoItem = 'Todos') => {
    try {
        if (!tenantId) throw new Error("TenantID não identificado.");

        let queryExits = supabase.from('stock_movements').select('quantity, inventory_item_id, unit_id').eq('tenant_id', tenantId).eq('movement_type', 'EXIT');
        
        if (dataInicio && dataFim) {
            const start = new Date(dataInicio);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dataFim);
            end.setHours(23, 59, 59, 999);
            queryExits = queryExits.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
        }

        const [ resExits, resItems, resUnits ] = await Promise.all([
            queryExits,
            supabase.from('inventory_items').select('id, name, item_type'),
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

        const validItems = items.filter(i => {
            if (tipoItem === 'Medicamentos' && i.item_type !== 'MEDICAMENTO') return false;
            if (tipoItem === 'Materiais' && i.item_type !== 'MATERIAL') return false;
            if (tipoItem === 'Insumos' && i.item_type !== 'INSUMO') return false;
            return true;
        });
        const validItemIds = new Set(validItems.map(i => i.id));

        let totalConsumo = 0;
        const itemConsumo = {};
        
        validExits.forEach(m => {
            if (!validItemIds.has(m.inventory_item_id)) return;
            const q = Math.abs(m.quantity || 0);
            itemConsumo[m.inventory_item_id] = (itemConsumo[m.inventory_item_id] || 0) + q;
            totalConsumo += q;
        });

        if (totalConsumo === 0) {
            return { data: [], columns: [], error: null, emptyMessage: 'Não há histórico de saída/consumo no banco sob este período de recorte ou filtros selecionados para modelar a Curva ABC.' };
        }

        const dataArray = validItems.filter(i => itemConsumo[i.id] > 0).map(item => {
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

// ==========================================
// RELATÓRIO 7: TOP 30 CONSUMO
// ==========================================
export const generateTopConsumptionReport = async (tenantId, dataInicio, dataFim, unidadeNome, tipoItem = 'Todos') => {
    try {
        if (!tenantId) throw new Error("TenantID não identificado.");

        let queryExits = supabase
            .from('stock_movements')
            .select('quantity, inventory_item_id, unit_id')
            .eq('tenant_id', tenantId)
            .eq('movement_type', 'EXIT');
        
        // Aplica filtro de período personalizado
        if (dataInicio && dataFim) {
            const start = new Date(dataInicio);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(dataFim);
            end.setHours(23, 59, 59, 999);

            queryExits = queryExits
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString());
        }

        const [ resExits, resItems, resUnits ] = await Promise.all([
            queryExits,
            supabase.from('inventory_items').select('id, name, item_type, unit_of_measure'),
            supabase.from('units').select('id, name')
        ]);

        if (resExits.error) console.error('[Supabase] Erro nas saídas (Top Consumo):', resExits.error);

        const exits = resExits.data;
        const items = resItems.data || [];
        const units = resUnits.data || [];

        if (!exits) {
            return { data: [], columns: [], error: 'Falha técnica ao rastrear consumo.' };
        }

        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const targetUnitId = unidadeNome !== 'Todas' ? unitMap[unidadeNome.toUpperCase()] : null;

        const validExits = targetUnitId ? exits.filter(m => m.unit_id === targetUnitId) : exits;

        const itemUnitConsumo = {};
        validExits.forEach(m => {
            const q = Math.abs(m.quantity || 0);
            const key = `${m.inventory_item_id}_${m.unit_id}`;
            if (!itemUnitConsumo[key]) {
                itemUnitConsumo[key] = {
                    item_id: m.inventory_item_id,
                    unit_id: m.unit_id,
                    total: 0
                };
            }
            itemUnitConsumo[key].total += q;
        });

        // Filtrar e Mapear Itens
        const dataArray = [];
        Object.values(itemUnitConsumo).forEach(group => {
            const item = items.find(i => i.id === group.item_id);
            const unit = units.find(u => u.id === group.unit_id);
            
            if (!item) return;

            // Filtro por tipo
            if (tipoItem === 'Medicamentos' && item.item_type !== 'MEDICAMENTO') return;
            if (tipoItem === 'Insumos' && (item.item_type !== 'INSUMO' && item.item_type !== 'MATERIAL')) return;

            dataArray.push({
                item: item.name,
                tipo: item.item_type === 'MEDICAMENTO' ? 'Medicamento' : 'Insumo',
                unidade: unit ? unit.name : '-',
                consumido: group.total,
                unidade_medida: (item.unit_of_measure || 'UN').toUpperCase()
            });
        });

        // Ordenar decrescentemente e pegar os top 30
        dataArray.sort((a,b) => b.consumido - a.consumido);
        const top30 = dataArray.slice(0, 30).map((row, index) => ({
            ranking: index + 1,
            ...row
        }));

        if (top30.length === 0) {
            return { data: [], columns: [], error: null, emptyMessage: 'Não há histórico de saídas para os filtros selecionados.' };
        }

        const columns = [
            { key: 'ranking', label: 'Ranking', align: 'center' },
            { key: 'item', label: 'Item (Medicamento/Insumo)' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'unidade', label: 'Unidade' },
            { key: 'consumido', label: 'Total Consumido', align: 'right' },
            { key: 'unidade_medida', label: 'Unid. Medida', align: 'center' }
        ];

        return { data: top30, columns, error: null };
    } catch (e) {
        console.error('[Service] generateTopConsumptionReport catch:', e);
        return { data: null, columns: null, error: e.message };
    }
};

// ==========================================
// RELATÓRIO 8: SAÍDAS POR OBSERVAÇÃO
// ==========================================
export const generateExitByObservationReport = async (tenantId, dataInicio, dataFim, unidadeNome) => {
    try {
        if (!tenantId) throw new Error("TenantID não identificado.");

        let queryMoves = supabase
            .from('stock_movements')
            .select('created_at, movement_type, quantity, inventory_item_id, unit_id, notes')
            .eq('tenant_id', tenantId)
            .eq('movement_type', 'EXIT')
            .order('created_at', { ascending: false });

        if (dataInicio && dataFim) {
            const start = new Date(dataInicio);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dataFim);
            end.setHours(23, 59, 59, 999);
            queryMoves = queryMoves.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
        }

        const [ resMoves, resItems, resUnits ] = await Promise.all([
            queryMoves,
            supabase.from('inventory_items').select('id, name, item_type, unit_of_measure'),
            supabase.from('units').select('id, name')
        ]);

        if (resMoves.error) throw resMoves.error;

        const movements = resMoves.data || [];
        const items = resItems.data || [];
        const units = resUnits.data || [];

        const keywords = [
            'sala amarela',
            'sala verde',
            'sala vermelha',
            'sala de medicação',
            'funcionári'
        ];

        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const targetUnitId = (unidadeNome && unidadeNome !== 'Todas' && unidadeNome !== 'Todos') 
            ? unitMap[unidadeNome.toUpperCase()] 
            : null;

        const filteredMoves = movements.filter(m => {
            if (!m.notes) return false;
            const obs = m.notes.toLowerCase();
            const matchesKeyword = keywords.some(k => obs.includes(k.toLowerCase()));
            if (!matchesKeyword) return false;
            if (targetUnitId && m.unit_id !== targetUnitId) return false;
            return true;
        });

        const data = filteredMoves.map(m => {
            const item = items.find(i => i.id === m.inventory_item_id);
            const unit = units.find(u => u.id === m.unit_id);
            return {
                data: new Date(m.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(m.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
                unidade: unit ? unit.name : '-',
                item: item ? item.name : '-',
                tipo: item ? (item.item_type === 'MEDICAMENTO' ? 'Medicamento' : 'Insumo') : '-',
                quantidade: Math.abs(m.quantity || 0),
                unidade_medida: (item?.unit_of_measure || 'UN').toUpperCase(),
                observacoes: m.notes
            };
        });

        if (data.length === 0) {
            return { data: [], columns: [], error: null, emptyMessage: 'Nenhuma saída encontrada com as observações especificadas no período.' };
        }

        const columns = [
            { key: 'data', label: 'Data' },
            { key: 'unidade', label: 'Unidade' },
            { key: 'item', label: 'Item' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'quantidade', label: 'Quantidade', align: 'right' },
            { key: 'unidade_medida', label: 'Unid. Medida', align: 'center' },
            { key: 'observacoes', label: 'Observações' }
        ];

        return { data, columns, error: null };
    } catch (e) {
        console.error('[Service] generateExitByObservationReport catch:', e);
        return { data: null, columns: null, error: e.message };
    }
};



