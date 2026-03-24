import React, { useState, useMemo, useEffect } from 'react';
import { Search, Activity, Users, Pill, Package, ChevronDown } from 'lucide-react';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import { supabase } from '../../lib/supabase';
import './FarmaciaPages.css';

const FarmaciaSaidas = () => {
    const { setOpenModal, unidadeAtiva, dataRefreshKey } = useFarmacia();
    const [busca, setBusca] = useState('');
    const [periodoFiltro, setPeriodoFiltro] = useState('Hoje');
    const [unidadeFiltro, setUnidadeFiltro] = useState(unidadeAtiva?.label || 'Todas');

    const [rawData, setRawData] = useState({ items: [], movements: [], units: [] });
    const [isLoading, setIsLoading] = useState(true);

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
                    { data: units }
                ] = await Promise.all([
                    supabase.from('inventory_items').select('id, name, item_form'),
                    supabase.from('stock_movements').select('id, inventory_item_id, quantity, unit_id, created_at, created_by, notes').eq('movement_type', 'EXIT').order('created_at', { ascending: false }),
                    supabase.from('units').select('id, name')
                ]);

                setRawData({
                    items: items || [],
                    movements: movements || [],
                    units: units || []
                });
            } catch (err) {
                console.error('Erro ao buscar saídas reais', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRealData();
    }, [dataRefreshKey]);

    const baseSaidas = useMemo(() => {
        const { items, movements, units } = rawData;
        if (!movements.length) return [];

        const unitMap = {}; 
        units.forEach(u => unitMap[u.name.toUpperCase()] = u.id);
        const mappedUnitId = unidadeFiltro !== 'Todas' ? unitMap[unidadeFiltro.toUpperCase()] : null;

        const validMovements = mappedUnitId 
            ? movements.filter(m => m.unit_id === mappedUnitId)
            : movements;

        return validMovements.map(m => {
            const itemObj = items.find(i => i.id === m.inventory_item_id) || {};
            const unitObj = units.find(u => u.id === m.unit_id) || {};

            // Extrair responsável codificado em notes (formato: 'Obs||RESP:Nome')
            let responsavel = '—';
            let safeObs = m.notes || '';
            if (safeObs.includes('||RESP:')) {
                const parts = safeObs.split('||RESP:');
                safeObs = parts[0].trim();
                responsavel = parts[1].trim() || '—';
            }
            if (!safeObs || safeObs === 'massa_fake_dashboard') safeObs = '—';

            return {
                id: m.id,
                data: m.created_at,
                medicamento: itemObj.name || 'Desconhecido',
                codigo: '-',
                quantidade: m.quantity,
                unidade: unitObj.name || 'Desconhecida',
                responsavel,
                acondicionamento: itemObj.item_form || '—',
                observacao: safeObs
            };
        });
    }, [rawData, unidadeFiltro]);

    const itensFiltrados = useMemo(() => {
        return baseSaidas.filter(m => {
            const matchesBusca = !busca ||
                m.medicamento.toLowerCase().includes(busca.toLowerCase()) ||
                (m.observacao && m.observacao.toLowerCase().includes(busca.toLowerCase()));

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
    }, [baseSaidas, busca, periodoFiltro]);

    const METRICAS = useMemo(() => {
        const HOJE = new Date().toISOString().split('T')[0];
        const saidasHojeList = baseSaidas.filter(m => m.data.startsWith(HOJE));
        
        const registrosHoje = saidasHojeList.length;
        const itensHoje = saidasHojeList.reduce((acc, m) => acc + Math.abs(m.quantidade), 0);

        let topMedicamento = '—';
        if (itensFiltrados.length > 0) {
            const agMed = itensFiltrados.reduce((acc, curr) => {
                acc[curr.medicamento] = (acc[curr.medicamento] || 0) + Math.abs(curr.quantidade);
                return acc;
            }, {});
            topMedicamento = Object.entries(agMed).sort((a,b) => b[1] - a[1])[0][0];
        }

        let unidadeConsumo = '—';
        if (itensFiltrados.length > 0) {
            if (unidadeFiltro === 'Todas' || unidadeFiltro === 'Todas (Consolidado)') {
                const agUni = itensFiltrados.reduce((acc, curr) => {
                    acc[curr.unidade] = (acc[curr.unidade] || 0) + Math.abs(curr.quantidade);
                    return acc;
                }, {});
                unidadeConsumo = Object.entries(agUni).sort((a,b) => b[1] - a[1])[0][0].toUpperCase();
            } else {
                unidadeConsumo = unidadeFiltro.toUpperCase();
            }
        }

        return { registrosHoje, itensHoje, topMedicamento, unidadeConsumo };
    }, [baseSaidas, itensFiltrados, unidadeFiltro]);

    if (isLoading) {
        return (
            <div className="farmacia-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', opacity: 0.6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 150, 125, 0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Sincronizando banco de dados...</span>
                </div>
            </div>
        );
    }

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
                    <span className="premium-card-desc">registros da unidade</span>
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
                        <span className="premium-card-value color-blue" style={{ fontSize: METRICAS.topMedicamento === '—' ? '2.5rem' : '1.4rem', lineHeight: '1.2' }}>
                            {METRICAS.topMedicamento !== '—' ? METRICAS.topMedicamento.split(' ')[0] : '—'} 
                            {METRICAS.topMedicamento !== '—' && METRICAS.topMedicamento.split(' ').length > 1 ? ' ' + METRICAS.topMedicamento.split(' ')[1] : ''}
                        </span>
                        {METRICAS.topMedicamento !== '—' && (
                            <span className="premium-card-desc" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {METRICAS.topMedicamento.split(' ').slice(2).join(' ')}
                            </span>
                        )}
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
                        <input type="text" className="farmacia-search-input" placeholder="Buscar medicamento ou observação..." value={busca} onChange={e => setBusca(e.target.value)} />
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

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, background: 'var(--bg-body)', padding: '6px 12px', borderRadius: '8px', minWidth: 'fit-content' }}>
                        <span>{itensFiltrados.length} resultados (de {baseSaidas.length})</span>
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
                                <th style={{ width: '9%' }}>Data</th>
                                <th style={{ width: '27%' }}>Medicamento / Material</th>
                                <th style={{ textAlign: 'right', width: '9%' }}>Quantidade</th>
                                <th style={{ width: '15%' }}>Acondicionamento</th>
                                <th style={{ width: '15%' }}>Responsável</th>
                                <th style={{ width: '9%' }}>Unidade</th>
                                <th style={{ width: '16%' }}>Observação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr><td colSpan={7} className="farmacia-empty">Nenhuma saída encontrada para os filtros.</td></tr>
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
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#b91c1c', fontSize: '1.05rem' }}>
                                            {Math.abs(item.quantidade).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="farmacia-td-muted" style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' }} title={item.acondicionamento}>{item.acondicionamento}</td>
                                        <td className="farmacia-td-muted" style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' }} title={item.responsavel}>{item.responsavel}</td>
                                        <td>{item.unidade}</td>
                                        <td className="farmacia-td-muted" style={{ whiteSpace: 'normal', lineHeight: '1.3' }}>{item.observacao || '—'}</td>
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
