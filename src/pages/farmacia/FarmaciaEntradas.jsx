import React, { useState, useMemo, useEffect } from 'react';
import { Search, PackagePlus, Boxes, Clock, Pill, ArrowUpDown, ChevronDown, X, Calendar, ClipboardList, User, Hash, Info, FileText } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessFarmacia } from '../../utils/farmaciaAcl';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import { supabase } from '../../lib/supabase';
import './FarmaciaPages.css';

const FarmaciaEntradas = () => {
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const hasAccess = canAccessFarmacia(role, '/farmacia/entradas');

    const { setOpenModal, unidadeAtiva, lastAddedId, dataRefreshKey } = useFarmacia();
    const [busca, setBusca] = useState('');
    const [periodoFiltro, setPeriodoFiltro] = useState('Hoje');
    // Herança direta do header global
    const [unidadeFiltro, setUnidadeFiltro] = useState(unidadeAtiva?.label || 'Todas');
    const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });
    const [selectedEntry, setSelectedEntry] = useState(null);

    const [rawData, setRawData] = useState({ items: [], movements: [], batches: [], units: [] });
    const [isLoading, setIsLoading] = useState(true);

    // Sincroniza o contexto global de unidade passivamente
    useEffect(() => {
        if (unidadeAtiva?.label) {
            setUnidadeFiltro(unidadeAtiva.label);
        }
    }, [unidadeAtiva]);

    useEffect(() => {
        const fetchRealData = async () => {
            try {
                setIsLoading(true);
                const [
                    { data: items },
                    { data: movements },
                    { data: batches },
                    { data: units }
                ] = await Promise.all([
                    supabase.from('inventory_items').select('id, name'),
                    supabase.from('stock_movements').select('id, inventory_item_id, quantity, unit_id, batch_id, created_at, created_by, notes').eq('movement_type', 'ENTRY').order('created_at', { ascending: false }),
                    supabase.from('item_batches').select('id, expiration_date, batch_number'),
                    supabase.from('units').select('id, name')
                ]);

                setRawData({
                    items: items || [],
                    movements: movements || [],
                    batches: batches || [],
                    units: units || []
                });
            } catch (err) {
                console.error('Erro ao buscar entradas reais', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRealData();
    }, [dataRefreshKey]);

    // Memória unificada (Data Join) e restrita matematicamente ao Contexto de Unidade
    const baseEntradas = useMemo(() => {
        const { items, movements, batches, units } = rawData;
        if (!movements.length) return [];

        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const mappedUnitId = unidadeFiltro !== 'Todas' ? unitMap[unidadeFiltro.toUpperCase()] : null;

        // Corte 1: Isola os dados apenas na aba física solicitada
        const validMovements = mappedUnitId 
            ? movements.filter(m => m.unit_id === mappedUnitId)
            : movements;

        return validMovements.map(m => {
            const itemObj = items.find(i => i.id === m.inventory_item_id) || {};
            const batchObj = batches.find(b => b.id === m.batch_id) || {};
            const unitObj = units.find(u => u.id === m.unit_id) || {};

            let loteCalc = batchObj.batch_number || null;
            let valCalc = batchObj.expiration_date || null;
            let obsText = m.notes || '';
            let docCalc = null;

            if (obsText) {
                const parts = obsText.split('|').map(p => p.trim());
                const leftoverParts = [];

                parts.forEach(p => {
                    const lowerP = p.toLowerCase();
                    if (lowerP.startsWith('lote:')) {
                        if (!loteCalc) loteCalc = p.substring(5).trim();
                    } else if (lowerP.startsWith('validade:')) {
                        if (!valCalc) valCalc = p.substring(9).trim();
                    } else if (lowerP.startsWith('nf/doc:')) {
                        if (!docCalc) docCalc = p.substring(7).trim();
                    } else if (lowerP.startsWith('obs:')) {
                        leftoverParts.push(p.substring(4).trim());
                    } else {
                        leftoverParts.push(p);
                    }
                });
                obsText = leftoverParts.join(' | ');
            }

            return {
                id: m.id,
                data: m.created_at, 
                medicamento: itemObj.name || 'Desconhecido',
                codigo: '-', // Placeholder seguro para layout sem expor nulos
                lote: loteCalc,
                validade: valCalc,
                quantidade: m.quantity,
                unidade: unitObj.name || 'Desconhecida',
                responsavel: '—', // Omissão rígida de Auth UUID
                documento: docCalc,
                observacao: obsText
            };
        });
    }, [rawData, unidadeFiltro]);

    // Cards calculados sob o contexto baseEntradas (garantindo as regras da Unidade ativa)
    const METRICAS_REALTIME = useMemo(() => {
        const HOJE = new Date().toISOString().split('T')[0];
        const MES_ATUAL_STR = new Date().toISOString().slice(0, 7);

        const entradasHoje_Filtro = baseEntradas.filter(m => m.data.startsWith(HOJE));
        const entradasMes_Filtro = baseEntradas.filter(m => m.data.startsWith(MES_ATUAL_STR));

        return {
            entradasHoje: entradasHoje_Filtro.length,
            itensRecebidosHoje: entradasHoje_Filtro.reduce((acc, m) => acc + Math.abs(m.quantidade), 0),
            ultimaEntrada: baseEntradas.length > 0 
                ? new Date(baseEntradas[0].data).toLocaleDateString('pt-BR') 
                : '—',
            entradasMes: entradasMes_Filtro.length,
        };
    }, [baseEntradas]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const itensFiltrados = useMemo(() => {
        let result = [...baseEntradas].filter(m => {
            const matchesBusca = !busca || 
                m.medicamento.toLowerCase().includes(busca.toLowerCase()) ||
                (m.lote && m.lote.toLowerCase().includes(busca.toLowerCase())) ||
                (m.observacao && m.observacao.toLowerCase().includes(busca.toLowerCase()));

            // A unidade já está maticamente podada pelo baseEntradas.
            // O período filtra visualmente:
            const dataItem = new Date(m.data);
            const HOJE = new Date().toISOString().split('T')[0];
            let matchesPeriodo = true;
            if (periodoFiltro === 'Hoje') {
                matchesPeriodo = m.data.startsWith(HOJE);
            } else if (periodoFiltro === '7d') {
                const seteDiasAtras = new Date();
                seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
                matchesPeriodo = dataItem >= seteDiasAtras;
            } else if (periodoFiltro === '30d') {
                const trintaDiasAtras = new Date();
                trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
                matchesPeriodo = dataItem >= trintaDiasAtras;
            }

            return matchesBusca && matchesPeriodo;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                if (aVal === null) aVal = '';
                if (bVal === null) bVal = '';
                
                if (sortConfig.key === 'quantidade') {
                    aVal = Math.abs(aVal || 0);
                    bVal = Math.abs(bVal || 0);
                }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [baseEntradas, busca, periodoFiltro, sortConfig]);

    if (!hasAccess) {
        return <Navigate to="/farmacia/dashboard" replace />;
    }

    // Removido o bloqueio agressivo de tela por isLoading

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Entradas de Medicamentos</h1>
                    <p className="farmacia-page-subtitle">Recebimento e registro de notas fiscais.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {isLoading && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, background: 'rgba(0,150,125,0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                            <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(0, 150, 125, 0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> 
                            Atualizando...
                        </span>
                    )}
                    <button className="farmacia-btn-primary" onClick={() => setOpenModal('entrada')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Pill size={16} /> + Nova Entrada
                    </button>
                    <FarmaciaUnitBadge />
                </div>
            </header>

            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ENTRADAS HOJE</span>
                    <span className="premium-card-value text-secondary">{METRICAS_REALTIME.entradasHoje}</span>
                    <span className="premium-card-desc">registros do dia</span>
                    <div className="premium-card-icon-box bg-saida"><PackagePlus size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">UNIDADES RECEBIDAS</span>
                    <span className="premium-card-value">{METRICAS_REALTIME.itensRecebidosHoje.toLocaleString('pt-BR')}</span>
                    <span className="premium-card-desc">unidades hoje</span>
                    <div className="premium-card-icon-box bg-itens"><Boxes size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ÚLTIMA ENTRADA</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="premium-card-value color-blue" style={{ fontSize: METRICAS_REALTIME.ultimaEntrada === '—' ? '2.5rem' : '1.4rem' }}>{METRICAS_REALTIME.ultimaEntrada}</span>
                        <span className="premium-card-desc">mais recente</span>
                    </div>
                    <div className="premium-card-icon-box bg-top"><Clock size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ENTRADAS NO MÊS</span>
                    <span className="premium-card-value color-orange">{METRICAS_REALTIME.entradasMes}</span>
                    <span className="premium-card-desc">total de registros</span>
                    <div className="premium-card-icon-box bg-unidade"><PackagePlus size={20} /></div>
                </div>
            </div>

            {/* Modal de Detalhes da Entrada */}
            {selectedEntry && (
                <div className="farmacia-modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="farmacia-modal-content" style={{ maxWidth: '500px', width: '90%', padding: '0', overflow: 'hidden', animation: 'modalFadeIn 0.3s ease-out' }}>
                        <div style={{ padding: '1.5rem', background: 'var(--bg-muted-light)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'var(--color-primary)', color: '#fff', padding: '8px', borderRadius: '10px' }}>
                                    <ClipboardList size={20} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Detalhes da Entrada</h2>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Entrada registrada em {new Date(selectedEntry.data).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} className="hover-bg-muted">
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ background: 'rgba(0, 150, 125, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(0, 150, 125, 0.2)' }}>
                                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(0, 150, 125, 0.8)', textTransform: 'uppercase', marginBottom: '8px' }}>Medicamento / Material</span>
                                
                                {(() => {
                                    const medParts = selectedEntry.medicamento.split(' ');
                                    const forma = medParts.length > 1 ? medParts.pop() : '';
                                    const nomeDosagem = medParts.length > 0 ? medParts.join(' ') : selectedEntry.medicamento;
                                    return (
                                        <>
                                            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.2' }}>{nomeDosagem}</span>
                                            {forma && <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'capitalize' }}>{forma}</span>}
                                        </>
                                    );
                                })()}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{new Date(selectedEntry.data).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <Hash size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lote</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEntry.lote || '—'}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validade</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEntry.validade ? new Date(selectedEntry.validade).toLocaleDateString('pt-BR') : '—'}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <Boxes size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quantidade</span>
                                    </div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>+{Math.abs(selectedEntry.quantidade).toLocaleString('pt-BR')}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <PackagePlus size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unidade</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEntry.unidade}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Responsável</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEntry.responsavel}</span>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>NF / Documento</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEntry.documento || '—'}</span>
                                </div>
                                
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <Info size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Observação</span>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: selectedEntry.observacao ? 'normal' : 'italic', border: '1px solid var(--border)' }}>
                                        {selectedEntry.observacao || '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-muted-light)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="farmacia-btn-primary" onClick={() => setSelectedEntry(null)} style={{ padding: '0.5rem 1.5rem' }}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '450px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input type="text" className="farmacia-search-input" placeholder="Buscar medicamento, lote ou observação..." value={busca} onChange={e => setBusca(e.target.value)} />
                    </div>
                    
                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select 
                            className="farmacia-filter-select" 
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={periodoFiltro}
                            onChange={e => setPeriodoFiltro(e.target.value)}
                        >
                            <option value="Hoje">Período: Hoje</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>
                    
                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select 
                            className="farmacia-filter-select" 
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={unidadeFiltro}
                            onChange={e => setUnidadeFiltro(e.target.value)}
                        >
                            <option value="Todas">Unidade: Todas (Consolidado)</option>
                            <option value="UPA">UPA</option>
                            <option value="UMSJ">UMSJ</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, background: 'var(--bg-body)', padding: '6px 12px', borderRadius: '8px', minWidth: 'fit-content' }}>
                        <span>{itensFiltrados.length} resultados (de {baseEntradas.length})</span>
                    </div>
                </div>
            </div>

            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1.1rem 1.5rem 0.9rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted-light)' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Histórico de Entradas</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                    <table className="farmacia-table">
                        <colgroup>
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '28%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '18%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('data')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Data <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'data' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('medicamento')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Medicamento / Material <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'medicamento' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th>Lote</th>
                                <th>Validade</th>
                                <th onClick={() => handleSort('quantidade')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                        Qtd <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'quantidade' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th>Unidade</th>
                                <th>NF / Documento</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr><td colSpan={7} className="farmacia-empty">Nenhuma entrada encontrada para os filtros.</td></tr>
                            ) : (
                                itensFiltrados.map((item, idxx) => (
                                    <tr 
                                        key={item.id + '-' + idxx} 
                                        onClick={() => setSelectedEntry(item)}
                                        style={{ 
                                            cursor: 'pointer',
                                            backgroundColor: lastAddedId === item.id ? 'rgba(0, 150, 125, 0.08)' : 'transparent',
                                            transition: 'background-color 0.5s ease'
                                        }}
                                        className="farmacia-table-row-interactive"
                                    >
                                        <td className="farmacia-td-muted" style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(item.data).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="farmacia-td-primary">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.medicamento}</span>
                                            </div>
                                        </td>
                                        <td className="farmacia-td-muted" style={{ fontWeight: 500, whiteSpace: 'nowrap', opacity: item.lote ? 1 : 0.3 }}>
                                            {item.lote || '—'}
                                        </td>
                                        <td className="farmacia-td-muted">
                                            {item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : <span style={{ opacity: 0.3 }}>—</span>}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span style={{ 
                                                display: 'inline-block',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: 'rgba(0, 150, 125, 0.08)',
                                                color: 'var(--color-primary)',
                                                fontWeight: 800,
                                                fontSize: '0.9rem'
                                            }}>
                                                +{Math.abs(item.quantidade).toLocaleString('pt-BR')}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{item.unidade}</td>
                                        <td className="farmacia-td-muted" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', fontStyle: item.documento ? 'normal' : 'italic' }}>
                                            {item.documento || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FarmaciaEntradas;
