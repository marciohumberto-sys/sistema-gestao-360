import React, { useState, useMemo } from 'react';
import { Search, Plus, Pill, TrendingUp, TrendingDown, ClipboardList, Clock, ArrowUpDown, ChevronDown, Filter, Calendar, User, Hash, Info } from 'lucide-react';
import { mockAjustes } from '../../mocks/farmaciaMocks';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import './FarmaciaPages.css';

const HOJE = '2026-03-14';

const FarmaciaAjustes = () => {
    const { setOpenModal, unidadeAtiva } = useFarmacia();
    const [busca, setBusca] = useState('');
    const [periodoFiltro, setPeriodoFiltro] = useState('Hoje');
    const [unidadeFiltro, setUnidadeFiltro] = useState('Todas');
    const [responsavelFiltro, setResponsavelFiltro] = useState('Todos');
    const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });

    // Lógica de métricas em tempo real (baseada no mock por enquanto)
    const metricasRealTime = useMemo(() => {
        const hoje = mockAjustes.filter(a => a.data.startsWith(HOJE));
        const ultimo = mockAjustes.length > 0 ? mockAjustes[0].data : null;
        
        return {
            ajustesHoje: hoje.length,
            reducoes: mockAjustes.filter(a => a.diferenca < 0).length,
            incrementos: mockAjustes.filter(a => a.diferenca > 0).length,
            ultimoAjuste: ultimo ? new Date(ultimo).toLocaleDateString('pt-BR') : '—'
        };
    }, []);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const ajustesFiltrados = useMemo(() => {
        return mockAjustes.filter(aj => {
            const matchesBusca = !busca || 
                aj.medicamento.toLowerCase().includes(busca.toLowerCase()) || 
                aj.codigo.toLowerCase().includes(busca.toLowerCase()) ||
                aj.responsavel.toLowerCase().includes(busca.toLowerCase());
            
            const matchesUnidade = unidadeFiltro === 'Todas' || aj.setor === unidadeFiltro;
            const matchesResponsavel = responsavelFiltro === 'Todos' || aj.responsavel === responsavelFiltro;
            
            let matchesPeriodo = true;
            const dataItem = new Date(aj.data);
            if (periodoFiltro === 'Hoje') {
                matchesPeriodo = aj.data.startsWith(HOJE);
            } else if (periodoFiltro === '7d') {
                const seteDiasAtras = new Date(HOJE);
                seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
                matchesPeriodo = dataItem >= seteDiasAtras;
            } else if (periodoFiltro === '30d') {
                const trintaDiasAtras = new Date(HOJE);
                trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
                matchesPeriodo = dataItem >= trintaDiasAtras;
            }

            return matchesBusca && matchesUnidade && matchesResponsavel && matchesPeriodo;
        });
    }, [busca, periodoFiltro, unidadeFiltro, responsavelFiltro]);

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Ajustes de Inventário</h1>
                    <p className="farmacia-page-subtitle">Correções de saldo, perdas e avarias.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="farmacia-btn-primary" onClick={() => setOpenModal('ajuste')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Pill size={16} /> + Novo Ajuste
                    </button>
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
                    <span className="premium-card-desc">ajustes negativos</span>
                    <div className="premium-card-icon-box bg-itens" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}><TrendingDown size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">INCREMENTOS DE ESTOQUE</span>
                    <span className="premium-card-value" style={{ color: 'var(--color-secondary)' }}>{metricasRealTime.incrementos}</span>
                    <span className="premium-card-desc">ajustes positivos</span>
                    <div className="premium-card-icon-box bg-top" style={{ background: 'rgba(0, 150, 125, 0.1)', color: 'var(--color-secondary)' }}><TrendingUp size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ÚLTIMO AJUSTE</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="premium-card-value color-blue" style={{ fontSize: '1.8rem' }}>{metricasRealTime.ultimoAjuste}</span>
                        <span className="premium-card-desc">mais recente</span>
                    </div>
                    <div className="premium-card-icon-box bg-unidade"><Clock size={20} /></div>
                </div>
            </div>

            {/* Toolbar - Filtros Padronizados */}
            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '450px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input type="text" className="farmacia-search-input" placeholder="Buscar medicamento, código ou responsável..." value={busca} onChange={e => setBusca(e.target.value)} />
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
                    
                    <div className="farmacia-select-wrapper" style={{ minWidth: '140px', position: 'relative' }}>
                        <select 
                            className="farmacia-filter-select" 
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={responsavelFiltro}
                            onChange={e => setResponsavelFiltro(e.target.value)}
                        >
                            <option value="Todos">Responsável: Todos</option>
                            <option value="João Mendes">João Mendes</option>
                            <option value="Maria Silva">Maria Silva</option>
                            <option value="Carlos Souza">Carlos Souza</option>
                            <option value="Ana Beatriz">Ana Beatriz</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, background: 'var(--bg-body)', padding: '6px 12px', borderRadius: '8px', minWidth: 'fit-content' }}>
                        <span>{ajustesFiltrados.length} resultados (de {mockAjustes.length})</span>
                    </div>
                </div>
            </div>

            {/* Tabela de Histórico */}
            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1rem 1.5rem 0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>Histórico de Ajustes</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                    <table className="farmacia-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                            <col style={{ width: '10%' }} /> {/* Data */}
                            <col style={{ width: '22%' }} /> {/* Medicamento */}
                            <col style={{ width: '8%' }} />  {/* Anterior */}
                            <col style={{ width: '8%' }} />  {/* Após */}
                            <col style={{ width: '9%' }} />  {/* Dif */}
                            <col style={{ width: '9%' }} />  {/* Unidade */}
                            <col style={{ width: '12%' }} /> {/* Responsável */}
                            <col style={{ width: '10%' }} /> {/* Motivo */}
                            <col style={{ width: '12%' }} /> {/* Obs */}
                        </colgroup>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('data')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Data <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('medicamento')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Medicamento / Material <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
                                    </div>
                                </th>
                                <th style={{ textAlign: 'right' }}>Qtd Antes</th>
                                <th style={{ textAlign: 'right' }}>Qtd Após</th>
                                <th style={{ textAlign: 'right' }}>Diferença</th>
                                <th>Unidade</th>
                                <th>Responsável</th>
                                <th>Motivo</th>
                                <th>Observação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ajustesFiltrados.length === 0 ? (
                                <tr><td colSpan={9} className="farmacia-empty">Nenhum ajuste encontrado para os filtros aplicados.</td></tr>
                            ) : (
                                ajustesFiltrados.map(aj => (
                                    <tr key={aj.id} className="farmacia-table-row-interactive">
                                        <td className="farmacia-td-muted" style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(aj.data).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="farmacia-td-primary">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 700 }}>{aj.medicamento}</span>
                                                <span className="farmacia-code-badge" style={{ width: 'fit-content' }}>{aj.codigo}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{aj.quantidadeAntes.toLocaleString('pt-BR')}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{aj.quantidadeApos.toLocaleString('pt-BR')}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span style={{ 
                                                fontWeight: 800, 
                                                color: aj.diferenca < 0 ? '#dc2626' : 'var(--color-secondary)',
                                                background: aj.diferenca < 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 150, 125, 0.08)',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '0.9rem'
                                            }}>
                                                {aj.diferenca > 0 ? '+' : ''}{aj.diferenca.toLocaleString('pt-BR')}
                                            </span>
                                        </td>
                                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '0.9rem' }}>{aj.setor}</td>
                                        <td style={{ fontSize: '0.85rem', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.2' }}>{aj.responsavel}</td>
                                        <td><span className="farmacia-badge badge-tipo badge-tipo-ajuste" style={{ fontSize: '0.65rem', whiteSpace: 'normal', textAlign: 'center' }}>{aj.motivo}</span></td>
                                        <td className="farmacia-td-muted" style={{ fontSize: '0.8rem', whiteSpace: 'normal', lineHeight: '1.4', wordBreak: 'break-word' }}>{aj.observacao || '—'}</td>
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

export default FarmaciaAjustes;
