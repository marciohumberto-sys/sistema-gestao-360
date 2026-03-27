import React, { useState, useMemo, useEffect } from 'react';
import { Search, Package, AlertTriangle, XCircle, Calendar, ChevronDown, Plus, Minus, Menu, ArrowUpDown, Ban } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessFarmacia, canWriteFarmacia } from '../../utils/farmaciaAcl';
import { supabase } from '../../lib/supabase';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import './FarmaciaPages.css';

// Calcula data limite para alertas de validade (60 dias conforme novo requisito)
const hoje = new Date();
const em60Dias = new Date();
em60Dias.setDate(hoje.getDate() + 60);

const calcularDias = (dataString) => {
    if(!dataString || dataString === '-') return null;
    const diffTime = new Date(dataString) - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const FarmaciaEstoque = () => {
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const hasAccess = canAccessFarmacia(role, '/farmacia/estoque');

    const { unidadeAtiva, setOpenModal } = useFarmacia();
    const [animated, setAnimated] = useState(false);
    
    const [busca, setBusca] = useState('');
    const [unidadeFiltro, setUnidadeFiltro] = useState(unidadeAtiva?.label || 'Todos');
    const [statusFiltro, setStatusFiltro] = useState('Todos');
    const [sortFiltro, setSortFiltro] = useState('nome-asc');

    // Garante que se o usuário alterar "Operando em" lá no header, a grid se recalcula sozinha
    useEffect(() => {
        if (unidadeAtiva?.label) setUnidadeFiltro(unidadeAtiva.label);
    }, [unidadeAtiva]);

    const [rawData, setRawData] = useState({ items: [], movements: [], batches: [], units: [] });
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Supabase Data
    useEffect(() => {
        const fetchRealData = async () => {
            setIsLoading(true);
            try {
                const [
                    { data: items },
                    { data: movements },
                    { data: batches },
                    { data: units }
                ] = await Promise.all([
                    supabase.from('inventory_items').select('id, name, code, item_form, minimum_stock, is_active'),
                    supabase.from('stock_movements').select('id, inventory_item_id, movement_type, quantity, batch_id, unit_id, created_at, created_by').eq('notes', 'massa_fake_dashboard').order('created_at', { ascending: false }),
                    supabase.from('item_batches').select('id, inventory_item_id, expiration_date, batch_number'),
                    supabase.from('units').select('id, name')
                ]);
                
                // Guard clause for safe mapping
                setRawData({
                    items: items?.filter(i => i.is_active) || [],
                    movements: movements || [],
                    batches: batches || [],
                    units: units || []
                });
            } catch (err) {
                console.error('Erro ao processar dados reais', err);
            } finally {
                setIsLoading(false);
                setTimeout(() => setAnimated(true), 100);
            }
        };
        fetchRealData();
    }, []);

    // Calcula os saldos isolados com base na UNIDADE selecionada (ou Todos)
    const baseEstoque = useMemo(() => {
        const { items, movements, batches, units } = rawData;
        if (!items.length) return [];

        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const mappedUnitId = unidadeFiltro !== 'Todos' ? unitMap[unidadeFiltro.toUpperCase()] : null;

        // Isola as movimentações pela unidade do filtro, se selecionado!
        const validMovements = mappedUnitId 
            ? movements.filter(m => m.unit_id === mappedUnitId)
            : movements;

        // Mapea o balanço e cruza com vencimentos
        const itemBalance = {};
        const batchBalance = {};
        
        validMovements.forEach(m => {
            const qty = Number(m.quantity) || 0;
            const net = m.movement_type === 'ENTRY' ? qty : -qty;
            itemBalance[m.inventory_item_id] = (itemBalance[m.inventory_item_id] || 0) + net;
            if (m.batch_id) {
                batchBalance[m.batch_id] = (batchBalance[m.batch_id] || 0) + net;
            }
        });

        return items.map(item => {
            const bAtual = itemBalance[item.id] || 0;
            const bMinimo = Number(item.minimum_stock) || 0;
            
            // Validade mais próxima (Apenas em lotes que têm saldo NESTA unidade)
            let minMs = Infinity;
            let minDateObj = '-';
            batches.filter(b => b.inventory_item_id === item.id).forEach(b => {
                const qb = batchBalance[b.id] || 0;
                if (qb > 0 && b.expiration_date) {
                    const t = new Date(b.expiration_date).getTime();
                    if (t < minMs) { minMs = t; minDateObj = b.expiration_date; }
                }
            });

            // Derivando o Status Visual
            let status = 'NORMAL';
            if (bAtual === 0) status = 'SEM_ESTOQUE';
            else if (bAtual > 0 && bAtual < bMinimo) status = 'ABAIXO_MINIMO';
            
            // Tratamento unidade de exibição (fallback por ausência de relação map no DB)
            const unitName = '-';

            return {
                ...item,
                id: item.id,
                descricao: item.name,
                codigo: item.code || null,
                unidade: item.item_form || null,
                estoqueAtual: bAtual,
                estoqueMinimo: bMinimo,
                validade: minDateObj,
                setor: unidadeFiltro !== 'Todos' ? unidadeFiltro : 'Consolidado',
                status: status
            };
        });
    }, [rawData, unidadeFiltro]);

    const METRICAS = useMemo(() => ({
        totalItens: baseEstoque.length,
        semEstoque: baseEstoque.filter(i => i.estoqueAtual === 0).length,
        abaixoMinimo: baseEstoque.filter(i => i.estoqueAtual > 0 && i.estoqueAtual < i.estoqueMinimo).length,
        vencendoBreve: baseEstoque.filter(i => {
            if (i.validade === '-' || !i.validade) return false;
            return new Date(i.validade) <= em60Dias;
        }).length,
    }), [baseEstoque]);

    const itensFiltrados = useMemo(() => {
        let result = baseEstoque.filter(item => {
            const matchBusca = busca === '' || item.descricao.toLowerCase().includes(busca.toLowerCase()) || (item.codigo && item.codigo.toLowerCase().includes(busca.toLowerCase()));
            
            let matchStatus = true;
            if (statusFiltro !== 'Todos') {
                if (statusFiltro === 'CRITICO') {
                    matchStatus = item.estoqueAtual < item.estoqueMinimo || item.estoqueAtual === 0;
                } else {
                    matchStatus = item.status === statusFiltro;
                }
            }
            return matchBusca && matchStatus;
        });

        if (sortFiltro) {
            const [key, direction] = sortFiltro.split('-');
            result.sort((a, b) => {
                let aVal = a[key] || '';
                let bVal = b[key] || '';
                if (key === 'validade') {
                    aVal = aVal === '-' ? new Date('2099-01-01') : new Date(aVal);
                    bVal = bVal === '-' ? new Date('2099-01-01') : new Date(bVal);
                } else if (key === 'descricao') {
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }
                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [busca, statusFiltro, sortFiltro, baseEstoque]);

    const [itemFoco, setItemFoco] = useState(null);

    const handleSort = (key) => {
        setSortFiltro(prev => {
            const currentKey = prev.split('-')[0];
            const currentDir = prev.split('-')[1];
            if (currentKey === key) return `${key}-${currentDir === 'asc' ? 'desc' : 'asc'}`;
            return `${key}-asc`;
        });
    };

    if (!hasAccess) {
        return <Navigate to="/farmacia/dashboard" replace />;
    }

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Estoque de Medicamentos</h1>
                    <p className="farmacia-page-subtitle">Visão geral do estoque atual por medicamento.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {isLoading && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, background: 'rgba(0,150,125,0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                            <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(0, 150, 125, 0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> 
                            Atualizando...
                        </span>
                    )}
                    <FarmaciaUnitBadge />
                </div>
            </header>

            {/* 4 Cards de Resumo conforme solicitado */}
            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">TOTAL DE MEDICAMENTOS</span>
                    <span className="premium-card-value text-secondary">{METRICAS.totalItens}</span>
                    <span className="premium-card-desc">itens cadastrados</span>
                    <div className="premium-card-icon-box bg-itens"><Package size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ABAIXO DO MÍNIMO</span>
                    <span className="premium-card-value color-orange">{METRICAS.abaixoMinimo}</span>
                    <span className="premium-card-desc">reposição necessária</span>
                    <div className="premium-card-icon-box bg-unidade"><AlertTriangle size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">VENCENDO EM BREVE</span>
                    <span className={`premium-card-value ${METRICAS.vencendoBreve > 0 ? 'color-blue' : ''}`}>{METRICAS.vencendoBreve}</span>
                    <span className="premium-card-desc">próximos 60 dias</span>
                    <div className="premium-card-icon-box bg-top"><Calendar size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card" style={{ background: '#FFF7F7', border: '1px solid #F2CACA' }}>
                    <span className="premium-card-label" style={{ color: '#E57373' }}>SEM ESTOQUE</span>
                    <span className="premium-card-value" style={{ color: '#DC2626' }}>{METRICAS.semEstoque}</span>
                    <span className="premium-card-desc">estoque zerado</span>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }}><Ban size={20} /></div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '450px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input
                            type="text"
                            className="farmacia-search-input"
                            placeholder="Buscar medicamento, código ou lote..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>
                    
                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select
                            className="farmacia-filter-select"
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={unidadeFiltro}
                            onChange={e => setUnidadeFiltro(e.target.value)}
                        >
                            <option value="Todos">Unidade: Todas (Consolidado)</option>
                            <option value="UPA">UPA</option>
                            <option value="UMSJ">UMSJ</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '150px', position: 'relative' }}>
                        <select
                            className="farmacia-filter-select"
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={statusFiltro}
                            onChange={e => setStatusFiltro(e.target.value)}
                        >
                            <option value="Todos">Status: Todos</option>
                            <option value="NORMAL">Normal</option>
                            <option value="ABAIXO_MINIMO">Abaixo do mínimo</option>
                            <option value="CRITICO">Crítico</option>
                            <option value="SEM_ESTOQUE">Sem estoque</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '160px', position: 'relative' }}>
                        <select
                            className="farmacia-filter-select"
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={sortFiltro}
                            onChange={e => setSortFiltro(e.target.value)}
                        >
                            <option value="nome-asc">Ordenar por: Nome</option>
                            <option value="estoque-asc">Menor estoque</option>
                            <option value="estoque-desc">Maior estoque</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, background: 'var(--bg-body)', padding: '6px 12px', borderRadius: '8px', minWidth: 'fit-content' }}>
                        <span>{itensFiltrados.length} resultados (de {baseEstoque.length})</span>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1.1rem 1.5rem 0.9rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted-light)' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Listagem de Itens</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)', overflowX: 'hidden', maxWidth: '100%', width: '100%' }}>
                    <table className="farmacia-table" style={{ tableLayout: 'fixed', width: '100%', maxWidth: '100%' }}>
                        <colgroup>
                            <col style={{ width: '28%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '11%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '12%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('descricao')} style={{ cursor: 'pointer', width: '28%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Medicamento <ArrowUpDown size={12} style={{ opacity: sortFiltro.startsWith('descricao') ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('estoqueAtual')} style={{ cursor: 'pointer', textAlign: 'right', width: '13%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                        Estoque Atual <ArrowUpDown size={12} style={{ opacity: sortFiltro.startsWith('estoqueAtual') ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('estoqueMinimo')} style={{ cursor: 'pointer', textAlign: 'right', width: '11%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                        Estoque Mín. <ArrowUpDown size={12} style={{ opacity: sortFiltro.startsWith('estoqueMinimo') ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('validade')} style={{ cursor: 'pointer', width: '14%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ lineHeight: '1.2' }}>Validade<br/>mais próxima</div>
                                        <ArrowUpDown size={12} style={{ opacity: sortFiltro.startsWith('validade') ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th style={{ width: '8%' }}>Unidade</th>
                                <th style={{ width: '14%' }}>Status</th>
                                <th style={{ textAlign: 'center', width: '12%' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="farmacia-empty">
                                        Nenhum item encontrado para os filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                itensFiltrados.map(item => {
                                    const isZerado = item.estoqueAtual === 0;
                                    const isAbaixoMin = item.estoqueAtual < item.estoqueMinimo;
                                    const isValidadeProxima = item.validade !== '-' && new Date(item.validade) <= em60Dias;
                                    const diasVenc = calcularDias(item.validade);
                                    
                                    // Calculo risco de ruptura apenas na largura
                                    const minVal = item.estoqueMinimo || 1;
                                    const perc = (item.estoqueAtual / minVal) * 100;
                                    const barColor = '#4FAF8E'; // Verde suave institucional
                                    const barWidth = Math.min(perc, 100);

                                    return (
                                        <tr 
                                            key={item.id} 
                                            className="farmacia-table-row-interactive" 
                                            style={{ transition: 'background-color 0.2s ease', cursor: 'pointer' }}
                                            onClick={() => setItemFoco(item)}
                                        >
                                            <td className="farmacia-td-primary">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                                        {item.descricao}
                                                    </span>
                                                    {(item.codigo || item.unidade) && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {item.codigo && (
                                                                <span style={{
                                                                    fontSize: '0.65rem',
                                                                    backgroundColor: 'var(--bg-body)',
                                                                    color: '#64748b',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    fontWeight: 700,
                                                                    border: '1px solid var(--border)',
                                                                    fontFamily: 'monospace'
                                                                }}>
                                                                    {item.codigo}
                                                                </span>
                                                            )}
                                                            {item.unidade && (
                                                                <span style={{
                                                                    fontSize: '0.65rem',
                                                                    backgroundColor: 'var(--bg-body)',
                                                                    color: '#64748b',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    fontWeight: 600,
                                                                    border: '1px solid var(--border)',
                                                                    letterSpacing: '0.02em',
                                                                }}>
                                                                    {item.unidade}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: isZerado ? '#b91c1c' : (isAbaixoMin ? '#b45309' : 'var(--text-primary)'), fontSize: '1rem', position: 'relative' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                                    <span>{item.estoqueAtual.toLocaleString('pt-BR')}</span>
                                                    <div style={{ width: '80px', height: '6px', background: '#D6DEE2', borderRadius: '4px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-start' }}>
                                                        {barWidth > 0 && (
                                                            <div style={{ width: animated ? `${barWidth}%` : '0%', height: '100%', background: barColor, borderRadius: '4px', transition: 'width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} />
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }} className="farmacia-td-muted">
                                                {item.estoqueMinimo.toLocaleString('pt-BR')}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    <span 
                                                        className="farmacia-badge"
                                                        style={{
                                                            background: isValidadeProxima ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-muted)',
                                                            color: isValidadeProxima ? '#3b82f6' : 'var(--text-muted)',
                                                            border: isValidadeProxima ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid var(--border)',
                                                            fontWeight: 600,
                                                            width: 'fit-content'
                                                        }}
                                                    >
                                                        {item.validade && item.validade !== '-' ? new Date(item.validade).toLocaleDateString('pt-BR') : '—'}
                                                    </span>
                                                    {diasVenc !== null && (
                                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textAlign: 'center', marginTop: '2px' }}>
                                                            {diasVenc > 0 ? `vence em ${diasVenc} dias` : (diasVenc === 0 ? 'vence hoje' : `venceu há ${Math.abs(diasVenc)} dias`)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.85rem' }}>{item.setor}</td>
                                            <td>
                                                <span 
                                                    className={`farmacia-badge badge-${isZerado ? 'sem_estoque' : (isAbaixoMin ? 'abaixo_minimo' : 'normal')}`}
                                                    style={isZerado ? { background: '#b91c1c', color: '#fff', border: '1px solid #991b1b' } : {}}
                                                    title={isZerado ? "Estoque Zerado" : (isAbaixoMin ? "Abaixo do Mínimo" : "Estoque Normal")}
                                                >
                                                    {isZerado ? 'SEM ESTOQUE' : (isAbaixoMin ? 'ABAIXO DO MÍNIMO' : 'NORMAL')}
                                                </span>
                                                                 <td style={{ textAlign: 'center' }}>
                                                {canWriteFarmacia(role) ? (
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button className="farmacia-action-icon" onClick={(e) => { e.stopPropagation(); setOpenModal('entrada'); }}>
                                                            <Plus size={16} />
                                                            <span className="premium-tooltip">Entrada rápida</span>
                                                        </button>
                                                        <button className="farmacia-action-icon" onClick={(e) => { e.stopPropagation(); setOpenModal('saida'); }}>
                                                            <Minus size={16} />
                                                            <span className="premium-tooltip">Saída rápida</span>
                                                        </button>
                                                        <button className="farmacia-action-icon" onClick={(e) => { e.stopPropagation(); setOpenModal('ajuste'); }}>
                                                            <Menu size={16} />
                                                            <span className="premium-tooltip">Mais opções</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Somente leitura</span>
                                                )}
                                            </td>
                             </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal/Painel de Detalhes do Item */}
            {itemFoco && (
                <div className="farmacia-modal-overlay" onClick={() => setItemFoco(null)}>
                    <div className="farmacia-modal-content" style={{ width: '480px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
                        <div className="farmacia-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 className="farmacia-modal-title">Detalhes do Item</h2>
                            <button className="farmacia-modal-close" onClick={() => setItemFoco(null)}>
                                <XCircle size={20} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-muted-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <Package size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{itemFoco.descricao}</h3>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {itemFoco.codigo && (
                                            <span className="farmacia-code-badge" style={{ margin: 0 }}>{itemFoco.codigo}</span>
                                        )}
                                        {itemFoco.unidade && (
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                Forma: {itemFoco.unidade}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div className="farmacia-card" style={{ padding: '1rem', background: 'var(--bg-muted-light)', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>ESTOQUE ATUAL</span>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: itemFoco.estoqueAtual === 0 ? '#b91c1c' : itemFoco.estoqueAtual < itemFoco.estoqueMinimo ? '#b45309' : 'var(--color-primary)' }}>
                                        {itemFoco.estoqueAtual.toLocaleString('pt-BR')}
                                    </div>
                                </div>
                                <div className="farmacia-card" style={{ padding: '1rem', background: 'var(--bg-muted-light)', border: 'none' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>ESTOQUE MÍNIMO</span>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                        {itemFoco.estoqueMinimo.toLocaleString('pt-BR')}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                    Histórico Recente
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {(() => {
                                        // Unit aware history
                                        const { movements, batches, units } = rawData;
                                        const unitMap = {}; units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
                                        const targetUnitId = unidadeFiltro !== 'Todos' ? unitMap[unidadeFiltro.toUpperCase()] : null;
                                        
                                        const historicoItem = movements.filter(m => m.inventory_item_id === itemFoco.id && (!targetUnitId || m.unit_id === targetUnitId)).slice(0, 2);

                                        if (historicoItem.length === 0) return <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma movimentação encontrada.</div>;

                                        return historicoItem.map(mov => {
                                            const isEntry = mov.movement_type === 'ENTRY';
                                            const batchName = batches.find(b => b.id === mov.batch_id)?.batch_number || 'S/ Lote';
                                            const unitName = units.find(u => u.id === mov.unit_id)?.name || 'Central';

                                            return (
                                                <div key={mov.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-body)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isEntry ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isEntry ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isEntry ? <Plus size={14} /> : <Minus size={14} />}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{isEntry ? 'Entrada de Estoque' : 'Saída de Estoque'}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lote: {batchName} • Unidade: {unitName}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isEntry ? '#16a34a' : '#dc2626' }}>{isEntry ? '+' : '-'}{mov.quantity} {itemFoco.unidade}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(mov.created_at).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FarmaciaEstoque;

