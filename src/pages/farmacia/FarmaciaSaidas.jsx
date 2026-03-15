import React, { useState, useMemo } from 'react';
import { Search, Activity, Users, Pill, Package, ChevronDown } from 'lucide-react';
import { mockSaidas } from '../../mocks/farmaciaMocks';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import './FarmaciaPages.css';

const HOJE = new Date().toISOString().split('T')[0];
const saidasHoje = mockSaidas.filter(m => m.data.startsWith(HOJE));

const METRICAS = {
    registrosHoje: saidasHoje.length,
    itensHoje: saidasHoje.reduce((acc, m) => acc + Math.abs(m.quantidade), 0),
    topMedicamento: saidasHoje.length > 0 
        ? Object.entries(saidasHoje.reduce((acc, curr) => {
            acc[curr.medicamento] = (acc[curr.medicamento] || 0) + Math.abs(curr.quantidade);
            return acc;
          }, {})).sort((a,b) => b[1] - a[1])[0][0]
        : '—',
    unidadeConsumo: saidasHoje.length > 0
        ? Object.entries(saidasHoje.reduce((acc, curr) => {
            acc[curr.unidadeId || 'UPA'] = (acc[curr.unidadeId || 'UPA'] || 0) + Math.abs(curr.quantidade);
            return acc;
          }, {})).sort((a,b) => b[1] - a[1])[0][0].toUpperCase()
        : '—'
};

const FarmaciaSaidas = () => {
    const { setOpenModal } = useFarmacia();
    const [busca, setBusca] = useState('');
    const [periodoFiltro, setPeriodoFiltro] = useState('Hoje');
    const [unidadeFiltro, setUnidadeFiltro] = useState('Todas');
    const [responsavelFiltro, setResponsavelFiltro] = useState('Todos');

    const itensFiltrados = useMemo(() => {
        return mockSaidas.filter(m => {
            const matchesBusca = !busca ||
                m.medicamento.toLowerCase().includes(busca.toLowerCase()) ||
                m.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
                m.setor.toLowerCase().includes(busca.toLowerCase());

            const matchesUnidade = unidadeFiltro === 'Todas' || m.unidade.includes(unidadeFiltro);
            const matchesResponsavel = responsavelFiltro === 'Todos' || m.responsavel === responsavelFiltro;

            const dataItem = new Date(m.data);
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

            return matchesBusca && matchesUnidade && matchesResponsavel && matchesPeriodo;
        });
    }, [busca, periodoFiltro, unidadeFiltro, responsavelFiltro]);

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Saídas / Dispensação</h1>
                    <p className="farmacia-page-subtitle">Registro de consumo por paciente ou setor.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="farmacia-btn-primary" onClick={() => setOpenModal('saida')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Pill size={16} /> + Nova Saída
                    </button>
                    <FarmaciaUnitBadge />
                </div>
            </header>

            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">SAÍDAS HOJE</span>
                    <span className="premium-card-value">{METRICAS.registrosHoje}</span>
                    <span className="premium-card-desc">registros do dia</span>
                    <div className="premium-card-icon-box bg-saida"><Activity size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ITENS DISPENSADOS</span>
                    <span className="premium-card-value color-orange">{METRICAS.itensHoje.toLocaleString('pt-BR')}</span>
                    <span className="premium-card-desc">unidades hoje</span>
                    <div className="premium-card-icon-box bg-itens"><Pill size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">MAIS DISPENSADO</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="premium-card-value color-blue" style={{ fontSize: '1.4rem', lineHeight: '1.2' }}>
                            {METRICAS.topMedicamento.split(' ')[0]} {METRICAS.topMedicamento.split(' ')[1] || ''}
                        </span>
                        <span className="premium-card-desc" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {METRICAS.topMedicamento.split(' ').slice(2).join(' ')}
                        </span>
                    </div>
                    <div className="premium-card-icon-box bg-top"><Package size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">MAIOR CONSUMO</span>
                    <span className="premium-card-value color-primary">{METRICAS.unidadeConsumo}</span>
                    <span className="premium-card-desc">unidade destaque</span>
                    <div className="premium-card-icon-box bg-unidade"><Users size={20} /></div>
                </div>
            </div>

            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '450px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input type="text" className="farmacia-search-input" placeholder="Buscar medicamento, responsável ou setor..." value={busca} onChange={e => setBusca(e.target.value)} />
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
                        <span>{itensFiltrados.length} resultados (de {mockSaidas.length})</span>
                    </div>
                </div>
            </div>

            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1rem 1.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 className="farmacia-card-title">Histórico de Saídas</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                    <table className="farmacia-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '10%' }}>Data</th>
                                <th style={{ width: '30%' }}>Medicamento / Material</th>
                                <th style={{ textAlign: 'right', width: '12%' }}>Quantidade</th>
                                <th style={{ width: '12%' }}>Acondicionamento</th>
                                <th style={{ width: '12%' }}>Responsável</th>
                                <th style={{ width: '10%' }}>Unidade</th>
                                <th style={{ width: '14%' }}>Observação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr><td colSpan={7} className="farmacia-empty">Nenhuma saída encontrada.</td></tr>
                            ) : (
                                itensFiltrados.map(item => (
                                    <tr key={item.id}>
                                        <td className="farmacia-td-muted" style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(item.data).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="farmacia-td-primary">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.medicamento}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="farmacia-code-badge" style={{ margin: 0, fontSize: '10px', padding: '1px 4px' }}>{item.codigo}</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {item.unidade}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                                            -{Math.abs(item.quantidade).toLocaleString('pt-BR')}
                                        </td>
                                        <td>{item.unidade}</td>
                                        <td>{item.responsavel}</td>
                                        <td className="farmacia-td-muted">{item.setor}</td>
                                        <td className="farmacia-td-muted">{item.observacao || '—'}</td>
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

export default FarmaciaSaidas;

