import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, TrendingUp, TrendingDown, Pill, ClipboardList, Clock, ArrowUpDown } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessFarmacia, canWriteFarmacia } from '../../utils/farmaciaAcl';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import { supabase } from '../../lib/supabase';
import './FarmaciaPages.css';

const FarmaciaAjustes = () => {
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const hasAccess = canAccessFarmacia(role, '/farmacia/ajustes');

    const { setOpenModal, unidadeAtiva, dataRefreshKey } = useFarmacia();
    const [busca, setBusca] = useState('');
    const [periodoFiltro, setPeriodoFiltro] = useState('Hoje');
    const [unidadeFiltro, setUnidadeFiltro] = useState(unidadeAtiva?.label || 'Todas');
    const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });

    const [rawData, setRawData] = useState({ items: [], movements: [], units: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (unidadeAtiva?.label) setUnidadeFiltro(unidadeAtiva.label);
    }, [unidadeAtiva]);

    useEffect(() => {
        const fetchRealData = async () => {
            try {
                setIsLoading(true);
                const [
                    { data: items },
                    { data: movements },
                    { data: units }
                ] = await Promise.all([
                    supabase.from('inventory_items').select('id, name, code'),
                    supabase.from('stock_movements').select('id, inventory_item_id, quantity, unit_id, created_at, notes')
                        .eq('movement_type', 'ADJUSTMENT')
                        .order('created_at', { ascending: false }),
                    supabase.from('units').select('id, name')
                ]);

                setRawData({
                    items: items || [],
                    movements: movements || [],
                    units: units || []
                });
            } catch (err) {
                console.error('Erro ao buscar pipeline de ajustes', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRealData();
    }, [dataRefreshKey]);

    const baseAjustes = useMemo(() => {
        const { items, movements, units } = rawData;
        if (!movements.length) return [];

        return movements.map(m => {
            const itemObj = items.find(i => i.id === m.inventory_item_id) || {};
            const unitObj = units.find(u => u.id === m.unit_id) || {};

            let obs = m.notes;
            if (!obs || obs.trim() === '' || obs === 'massa_fake_dashboard') obs = '—';

            return {
                id: m.id,
                data: m.created_at,
                medicamento: itemObj.name || 'Desconhecido',
                codigo: itemObj.code || '-',
                diferenca: m.quantity,
                setor: unitObj.name || 'Desconhecida',
                observacao: obs
            };
        });
    }, [rawData]);

    // Lógica de métricas em tempo real isoladas pela unidade
    const metricasRealTime = useMemo(() => {
        const HOJE = new Date().toISOString().split('T')[0];
        let ctxt = baseAjustes;
        if (unidadeFiltro !== 'Todas') {
            ctxt = ctxt.filter(a => a.setor.toUpperCase() === unidadeFiltro.toUpperCase());
        }

        const ajustesHoje = ctxt.filter(a => a.data.startsWith(HOJE));
        
        // Reduções: soma das diferenças negativas em valor absoluto
        const reducoes = Math.abs(ctxt.filter(a => a.diferenca < 0).reduce((acc, curr) => acc + curr.diferenca, 0));
        
        // Incrementos: soma das diferenças positivas
        const incrementos = ctxt.filter(a => a.diferenca > 0).reduce((acc, curr) => acc + curr.diferenca, 0);
        
        let ultimo = '—';
        if (ctxt.length > 0) {
            const dataMaisRecente = new Date(Math.max(...ctxt.map(e => new Date(e.data).getTime())));
            ultimo = `${dataMaisRecente.toLocaleDateString('pt-BR')} ${dataMaisRecente.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }

        return {
            ajustesHoje: ajustesHoje.length,
            reducoes,
            incrementos,
            ultimoAjuste: ultimo
        };
    }, [baseAjustes, unidadeFiltro]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const ajustesFiltrados = useMemo(() => {
        let result = baseAjustes.filter(aj => {
            const matchesBusca = !busca || 
                aj.medicamento.toLowerCase().includes(busca.toLowerCase()) || 
                (aj.codigo !== '-' && aj.codigo.toLowerCase().includes(busca.toLowerCase())) ||
                (aj.observacao !== '—' && aj.observacao.toLowerCase().includes(busca.toLowerCase()));
            
            const matchesUnidade = unidadeFiltro === 'Todas' || (aj.setor && aj.setor.toUpperCase() === unidadeFiltro.toUpperCase());
            
            let matchesPeriodo = true;
            const dataItem = new Date(aj.data);
            const HOJE = new Date().toISOString().split('T')[0];
            if (periodoFiltro === 'Hoje') {
                matchesPeriodo = aj.data.startsWith(HOJE);
            } else if (periodoFiltro === '7d') {
                const seteDiasAtras = new Date();
                seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
                matchesPeriodo = dataItem >= seteDiasAtras;
            } else if (periodoFiltro === '30d') {
                const trintaDiasAtras = new Date();
                trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
                matchesPeriodo = dataItem >= trintaDiasAtras;
            }

            return matchesBusca && matchesUnidade && matchesPeriodo;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                if (sortConfig.key === 'data') {
                    const timeA = new Date(a.data).getTime();
                    const timeB = new Date(b.data).getTime();
                    if (timeA < timeB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (timeA > timeB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
                if (sortConfig.key === 'medicamento') {
                    return sortConfig.direction === 'asc' 
                        ? a.medicamento.localeCompare(b.medicamento)
                        : b.medicamento.localeCompare(a.medicamento);
                }
                return 0;
            });
        }
        return result;
    }, [baseAjustes, busca, periodoFiltro, unidadeFiltro, sortConfig]);

    if (!hasAccess) {
        return <Navigate to="/farmacia/dashboard" replace />;
    }

    // Removido o bloqueio agressivo de tela por isLoading

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Ajustes de Inventário</h1>
                    <p className="farmacia-page-subtitle">Correções de saldo pontuais (Auditorias/Avarias).</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {isLoading && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, background: 'rgba(0,150,125,0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                            <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(0, 150, 125, 0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> 
                            Atualizando...
                        </span>
                    )}
                    {canWriteFarmacia(role) && (
                        <button className="farmacia-btn-primary" onClick={() => setOpenModal('ajuste')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Pill size={16} /> + Novo Ajuste
                        </button>
                    )}
                    <FarmaciaUnitBadge />
                </div>
            </header>

            {/* KPI Grid - 4 Cards Premium */}
            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">AJUSTES HOJE</span>
                    <span className="premium-card-value text-secondary" style={{ color: 'var(--color-primary)' }}>{metricasRealTime.ajustesHoje}</span>
                    <span className="premium-card-desc">registros do dia</span>
                    <div className="premium-card-icon-box bg-saida" style={{ background: 'rgba(0, 150, 125, 0.1)' }}><ClipboardList size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">REDUÇÕES DE ESTOQUE</span>
                    <span className="premium-card-value" style={{ color: '#dc2626' }}>{metricasRealTime.reducoes}</span>
                    <span className="premium-card-desc">ajustes negativos totais</span>
                    <div className="premium-card-icon-box bg-itens" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}><TrendingDown size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">INCREMENTOS DE ESTOQUE</span>
                    <span className="premium-card-value" style={{ color: 'var(--color-secondary)' }}>{metricasRealTime.incrementos}</span>
                    <span className="premium-card-desc">ajustes positivos totais</span>
                    <div className="premium-card-icon-box bg-top" style={{ background: 'rgba(0, 150, 125, 0.1)', color: 'var(--color-secondary)' }}><TrendingUp size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ÚLTIMO AJUSTE</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="premium-card-value color-blue" style={{ fontSize: '1.2rem' }}>{metricasRealTime.ultimoAjuste}</span>
                        <span className="premium-card-desc">data do mais recente</span>
                    </div>
                    <div className="premium-card-icon-box bg-unidade"><Clock size={20} /></div>
                </div>
            </div>

            {/* Toolbar - Filtros Padronizados */}
            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '450px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input type="text" className="farmacia-search-input" placeholder="Buscar medicamento, código ou observação..." value={busca} onChange={e => setBusca(e.target.value)} />
                    </div>
                    
                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }} value={periodoFiltro} onChange={e => setPeriodoFiltro(e.target.value)}>
                            <option value="Hoje">Período: Hoje</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }} value={unidadeFiltro} onChange={e => setUnidadeFiltro(e.target.value)}>
                            <option value="Todas">Unidade: Todas</option>
                            <option value="UPA">UPA</option>
                            <option value="UMSJ">UMSJ</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    {/* Espaço morto preenchido via CSS auto */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, background: 'var(--bg-body)', padding: '6px 12px', borderRadius: '8px', minWidth: 'fit-content' }}>
                        <span>{ajustesFiltrados.length} registros no período</span>
                    </div>
                </div>
            </div>

            {/* Tabela de Histórico Repaginada e Honesta (5 Colunas) */}
            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1.2rem 1.5rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-muted-light)' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Histórico Consolidado</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                    <table className="farmacia-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup><col style={{ width: '15%' }} /><col style={{ width: '38%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} /><col style={{ width: '23%' }} /></colgroup>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('data')} style={{ cursor: 'pointer', paddingLeft: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        DATA <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'data' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('medicamento')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Medicamento / Material <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'medicamento' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th style={{ textAlign: 'right' }}>Diferença Fís.</th>
                                <th>Unidade</th>
                                <th>Observação Técnica</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ajustesFiltrados.length === 0 ? (
                                <tr><td colSpan={5} className="farmacia-empty">Nenhum ajuste real documentado na base.</td></tr>
                            ) : (
                                ajustesFiltrados.map((aj, index) => {
                                    const isZebra = index % 2 !== 0; 
                                    const baseBg = isZebra ? 'var(--bg-muted)' : 'transparent';
                                    
                                    return (
                                        <tr key={aj.id} className="farmacia-table-row-interactive" style={{ transition: 'background-color 0.2s ease', cursor: 'default', backgroundColor: baseBg, height: '3.6rem' }}>
                                            <td className="farmacia-td-muted" style={{ whiteSpace: 'nowrap', paddingLeft: '1.25rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                    <span style={{ fontWeight: 600 }}>{new Date(aj.data).toLocaleDateString('pt-BR')}</span>
                                                    <span style={{ fontSize: '11px', opacity: 0.7 }}>{new Date(aj.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="farmacia-td-primary">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{aj.medicamento}</span>
                                                    {aj.codigo !== '-' && (
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7, fontWeight: 600, fontFamily: 'monospace' }}>{aj.codigo}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span style={{ 
                                                    fontWeight: 800, 
                                                    color: aj.diferenca < 0 ? '#dc2626' : '#15803d',
                                                    background: aj.diferenca < 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(21, 128, 61, 0.08)',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    {aj.diferenca > 0 ? '+' : ''}{aj.diferenca.toLocaleString('pt-BR')}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{aj.setor}</td>
                                            <td 
                                                className="farmacia-td-muted" 
                                                title={aj.observacao !== '—' ? aj.observacao : ''}
                                                style={{ 
                                                    maxWidth: '200px',
                                                    fontSize: '0.8rem', 
                                                    whiteSpace: 'nowrap', 
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    fontStyle: aj.observacao !== '—' ? 'normal' : 'italic', 
                                                    opacity: aj.observacao === '—' ? 0.5 : 1,
                                                    paddingRight: '1.25rem'
                                                }}
                                            >
                                                {aj.observacao}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FarmaciaAjustes;
