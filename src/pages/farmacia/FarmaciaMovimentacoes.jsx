import React, { useState, useMemo, useEffect } from 'react';
import { Search, Package, ArrowUpDown, ChevronDown, PackagePlus, PackageMinus, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import { supabase } from '../../lib/supabase';
import './FarmaciaPages.css';

const TipoBadge = ({ tipo }) => {
    switch (tipo) {
        case 'ENTRADA':
            return (
                <span className="farmacia-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(34, 197, 94, 0.05)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.15)', fontWeight: 700 }}>
                    <ArrowUp size={12} strokeWidth={2.5} /> ENTRADA
                </span>
            );
        case 'SAIDA':
            return (
                <span className="farmacia-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(249, 115, 22, 0.05)', color: '#c2410c', border: '1px solid rgba(249, 115, 22, 0.15)', fontWeight: 700 }}>
                    <ArrowDown size={12} strokeWidth={2.5} /> SAÍDA
                </span>
            );
        case 'AJUSTE':
            return (
                <span className="farmacia-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.05)', color: '#1d4ed8', border: '1px solid rgba(59, 130, 246, 0.15)', fontWeight: 700 }}>
                    <RefreshCw size={12} strokeWidth={2.5} /> AJUSTE
                </span>
            );
        default:
            return <span className="farmacia-badge">{tipo}</span>;
    }
};

const FarmaciaMovimentacoes = () => {
    const { unidadeAtiva } = useFarmacia();
    const [busca, setBusca] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('Todos os tipos');
    const [periodoFiltro, setPeriodoFiltro] = useState('Hoje');
    const [setorFiltro, setSetorFiltro] = useState(unidadeAtiva?.label || 'Todas');
    const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });

    const [rawData, setRawData] = useState({ items: [], movements: [], units: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (unidadeAtiva?.label) setSetorFiltro(unidadeAtiva.label);
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
                    supabase.from('stock_movements').select('id, movement_type, inventory_item_id, quantity, unit_id, created_at, notes').order('created_at', { ascending: false }),
                    supabase.from('units').select('id, name')
                ]);

                setRawData({
                    items: items || [],
                    movements: movements || [],
                    units: units || []
                });
            } catch (err) {
                console.error('Erro ao buscar pipeline de movimentações', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRealData();
    }, []);

    const todosRegistros = useMemo(() => {
        const { items, movements, units } = rawData;
        if (!movements.length) return [];

        return movements.map(m => {
            const itemObj = items.find(i => i.id === m.inventory_item_id) || {};
            const unitObj = units.find(u => u.id === m.unit_id) || {};

            let obs = m.notes;
            if (!obs || obs.trim() === '' || obs === 'massa_fake_dashboard') obs = '—';

            let mappedType = m.movement_type;
            if (mappedType === 'ENTRY') mappedType = 'ENTRADA';
            if (mappedType === 'EXIT') mappedType = 'SAIDA';
            if (mappedType === 'ADJUSTMENT') mappedType = 'AJUSTE'; 

            let responsavel = '—';
            let safeObs = m.notes || '';
            if (safeObs.includes('||RESP:')) {
                const [obs, resp] = safeObs.split('||RESP:');
                safeObs     = obs.trim();
                responsavel = resp.trim() || '—';
            }
            if (!safeObs || safeObs === 'massa_fake_dashboard') safeObs = '—';

            return {
                id: m.id,
                data: m.created_at,
                tipo: mappedType,
                medicamento: itemObj.name || 'Desconhecido',
                codigo: itemObj.code || '-',
                quantidade: m.quantity,
                acondicionamento: '—', 
                responsavel: responsavel,
                setor: unitObj.name || 'Desconhecida',
                observacao: safeObs
            };
        });
    }, [rawData]);

    // Métricas para os Cards KPI - Isoladas pela Unidade Ativa da UI
    const METRICAS = useMemo(() => {
        const HOJE = new Date().toISOString().split('T')[0];
        let baseContext = todosRegistros;
        
        // Espelhar a unidade isolada na View, para dados dos cards serem sincrônicos (Regra 9)
        if (setorFiltro !== 'Todas') {
            baseContext = baseContext.filter(m => m.setor.toUpperCase() === setorFiltro.toUpperCase());
        }

        const movsHoje = baseContext.filter(m => m.data.startsWith(HOJE));
        const entradasHoje = movsHoje.filter(m => m.tipo === 'ENTRADA');
        const saidasHoje = movsHoje.filter(m => m.tipo === 'SAIDA');
        const ajustesHoje = movsHoje.filter(m => m.tipo === 'AJUSTE');

        return {
            movimentacoesHoje: movsHoje.length,
            entradasHoje: entradasHoje.length,
            saidasHoje: saidasHoje.length,
            ajustesHoje: ajustesHoje.length
        };
    }, [todosRegistros, setorFiltro]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const itensFiltrados = useMemo(() => {
        let result = todosRegistros.filter(m => {
            const matchesBusca = !busca || 
                m.medicamento.toLowerCase().includes(busca.toLowerCase()) ||
                (m.observacao !== '—' && m.observacao.toLowerCase().includes(busca.toLowerCase())) ||
                (m.codigo !== '-' && m.codigo.toLowerCase().includes(busca.toLowerCase()));

            const matchesTipo = tipoFiltro === 'Todos os tipos' || m.tipo.toUpperCase() === tipoFiltro.toUpperCase();
            const matchesSetor = setorFiltro === 'Todas' || (m.setor && m.setor.toUpperCase() === setorFiltro.toUpperCase()); 
            
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

            return matchesBusca && matchesTipo && matchesSetor && matchesPeriodo;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                const timeA = new Date(a.data).getTime();
                const timeB = new Date(b.data).getTime();

                if (timeA < timeB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (timeA > timeB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [todosRegistros, busca, tipoFiltro, periodoFiltro, setorFiltro, sortConfig]);

    // Removido o bloqueio agressivo de tela por isLoading

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Movimentações</h1>
                    <p className="farmacia-page-subtitle">Histórico completo de todas as movimentações do estoque.</p>
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

            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">MOVIMENTAÇÕES HOJE</span>
                    <span className="premium-card-value text-secondary">{METRICAS.movimentacoesHoje}</span>
                    <span className="premium-card-desc">total de movimentações no dia</span>
                    <div className="premium-card-icon-box bg-unidade"><Package size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ENTRADAS HOJE</span>
                    <span className="premium-card-value color-green" style={{ color: '#16a34a' }}>{METRICAS.entradasHoje}</span>
                    <span className="premium-card-desc">quantidade de movimentações do tipo entrada</span>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}><PackagePlus size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">SAÍDAS HOJE</span>
                    <span className="premium-card-value color-orange">{METRICAS.saidasHoje}</span>
                    <span className="premium-card-desc">quantidade de movimentações do tipo saída</span>
                    <div className="premium-card-icon-box bg-saida" style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#ea580c' }}><PackageMinus size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">AJUSTES HOJE</span>
                    <span className="premium-card-value color-blue">{METRICAS.ajustesHoje}</span>
                    <span className="premium-card-desc">quantidade de movimentações do tipo ajuste</span>
                    <div className="premium-card-icon-box bg-itens" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}><RefreshCw size={20} /></div>
                </div>
            </div>

            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '450px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input 
                            type="text" 
                            className="farmacia-search-input" 
                            placeholder="Buscar medicamento, código ou observação..." 
                            value={busca} 
                            onChange={e => setBusca(e.target.value)} 
                        />
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
                            value={tipoFiltro}
                            onChange={e => setTipoFiltro(e.target.value)}
                        >
                            <option value="Todos os tipos">Tipo: Todos</option>
                            <option value="Entrada">Entrada</option>
                            <option value="Saida">Saída</option>
                            <option value="Ajuste">Ajuste</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>
                    
                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select 
                            className="farmacia-filter-select" 
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={setorFiltro}
                            onChange={e => setSetorFiltro(e.target.value)}
                        >
                            <option value="Todas">Unidade: Todas</option>
                            <option value="UPA">UPA</option>
                            <option value="UMSJ">UMSJ</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    {/* Espaço morto de layout que era "Responsável", removido visualmente, substituído por span contador pra não quebrar alinhamento seletor */}

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, background: 'var(--bg-body)', padding: '6px 12px', borderRadius: '8px', minWidth: 'fit-content' }}>
                        <span>{itensFiltrados.length} registros</span>
                    </div>
                </div>
            </div>

            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1.1rem 1.5rem 0.9rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted-light)' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Histórico de Movimentações</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                    <table className="farmacia-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('data')} style={{ cursor: 'pointer', width: '130px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        DATA / HORA <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'data' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th style={{ width: '95px' }}>Tipo</th>
                                <th style={{ width: '310px' }}>Medicamento / Material</th>
                                <th style={{ textAlign: 'right', width: '90px' }}>Quantidade</th>
                                <th style={{ width: '150px' }}>Acondicionamento</th>
                                <th style={{ width: '80px' }}>Unidade</th>
                                <th style={{ width: '130px' }}>Responsável</th>
                                <th style={{ width: '175px' }}>Observação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr><td colSpan={8} className="farmacia-empty">Nenhuma movimentação encontrada na base de dados.</td></tr>
                            ) : (
                                (() => {
                                    let ultimaDataRenderizada = null;
                                    const renderedRows = [];
                                    const HOJE_STR = new Date().toLocaleDateString('pt-BR');

                                    itensFiltrados.forEach((item, index) => {
                                        const dataItemObj = new Date(item.data);
                                        const dataAtual = dataItemObj.toLocaleDateString('pt-BR');
                                        
                                        const isHoje = dataAtual === HOJE_STR;
                                        if (ultimaDataRenderizada !== dataAtual) {
                                            ultimaDataRenderizada = dataAtual;
                                            renderedRows.push(
                                                <tr key={`date-group-${dataAtual}`} style={{ background: isHoje ? 'rgba(0, 150, 125, 0.04)' : 'var(--bg-muted-light)', borderTop: '2px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                                                    <td colSpan={8} style={{ padding: '0.8rem 1.25rem', fontWeight: 800, color: isHoje ? 'var(--color-primary)' : 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {isHoje ? 'HOJE' : dataAtual}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const isZebra = index % 2 !== 0; 
                                        const baseBg = isZebra ? 'var(--bg-muted)' : 'transparent';

                                        let qtdDisplay = Math.abs(item.quantidade).toLocaleString('pt-BR');
                                        let qtdColor = 'var(--text-primary)';
                                        
                                        if (item.tipo === 'ENTRADA') {
                                            qtdDisplay = `+${Math.abs(item.quantidade).toLocaleString('pt-BR')}`;
                                            qtdColor = '#16a34a'; 
                                        } else if (item.tipo === 'SAIDA') {
                                            qtdDisplay = `-${Math.abs(item.quantidade).toLocaleString('pt-BR')}`;
                                            qtdColor = '#ea580c'; 
                                        } else if (item.tipo === 'AJUSTE') {
                                            if (item.quantidade > 0) {
                                                qtdDisplay = `+${Math.abs(item.quantidade).toLocaleString('pt-BR')}`;
                                                qtdColor = '#16a34a';
                                            } else if (item.quantidade < 0) {
                                                qtdDisplay = `-${Math.abs(item.quantidade).toLocaleString('pt-BR')}`;
                                                qtdColor = '#ea580c';
                                            }
                                        }

                                        renderedRows.push(
                                            <tr 
                                                key={item.id} 
                                                className="farmacia-table-row-interactive"
                                                style={{ transition: 'background-color 0.2s ease', cursor: 'default', backgroundColor: baseBg, height: '3.6rem' }}
                                            >
                                                <td className="farmacia-td-muted" style={{ whiteSpace: 'nowrap', paddingLeft: '1.25rem' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td><TipoBadge tipo={item.tipo} /></td>
                                                <td className="farmacia-td-primary">
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{item.medicamento}</span>
                                                        {item.codigo !== '-' && (
                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                <span style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7, fontWeight: 600, fontFamily: 'monospace' }}>{item.codigo}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <span style={{ display: 'inline-block', color: qtdColor, fontWeight: 800, fontSize: '0.9rem' }}>
                                                        {qtdDisplay}
                                                    </span>
                                                </td>
                                                <td className="farmacia-td-muted" style={{ fontSize: '0.85rem' }}>{item.acondicionamento}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{item.setor}</td>
                                                <td className="farmacia-td-muted" style={{ fontSize: '0.85rem' }}>{item.responsavel}</td>
                                                <td 
                                                    className="farmacia-td-muted td-observacao" 
                                                    title={item.observacao && item.observacao !== '—' ? item.observacao : ''}
                                                    style={{ 
                                                        fontSize: '0.8rem', 
                                                        fontStyle: item.observacao && item.observacao !== '—' ? 'normal' : 'italic', 
                                                        opacity: item.observacao === '—' ? 0.5 : 1,
                                                        paddingRight: '1.25rem'
                                                    }}
                                                >
                                                    {item.observacao}
                                                </td>
                                            </tr>
                                        );
                                    });

                                    return renderedRows;
                                })()
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FarmaciaMovimentacoes;
