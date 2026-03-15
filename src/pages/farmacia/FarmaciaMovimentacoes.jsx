import React, { useState, useMemo } from 'react';
import { Search, Package, ArrowUpDown, ChevronDown, PackagePlus, PackageMinus, RefreshCw } from 'lucide-react';
import { mockMovimentacoes, mockAjustes } from '../../mocks/farmaciaMocks';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import './FarmaciaPages.css';

const HOJE = '2026-03-14';

// Componente visual unificado para Type Badge
const TipoBadge = ({ tipo }) => {
    switch (tipo) {
        case 'ENTRADA':
            return (
                <span className="farmacia-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.2)', fontWeight: 700 }}>
                    ENTRADA
                </span>
            );
        case 'SAIDA':
            return (
                <span className="farmacia-badge" style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.2)', fontWeight: 700 }}>
                    SAÍDA
                </span>
            );
        case 'AJUSTE':
            return (
                <span className="farmacia-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 700 }}>
                    AJUSTE
                </span>
            );
        default:
            return <span className="farmacia-badge">{tipo}</span>;
    }
};

const FarmaciaMovimentacoes = () => {
    const { entradasLocal } = useFarmacia();
    const [busca, setBusca] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('Todos os tipos');
    const [periodoFiltro, setPeriodoFiltro] = useState('Hoje');
    const [setorFiltro, setSetorFiltro] = useState('Todos');
    const [responsavelFiltro, setResponsavelFiltro] = useState('Todos');
    const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });

    // Preparação unificada de dados (mock Movimentações Gerais + Entradas em Runtime + Ajustes Mockados)
    const todosRegistros = useMemo(() => {
        // Formatar ajustes reais do sistema para bater o layout unificado esperado
        const ajustesFormatados = mockAjustes.map(aj => ({
            id: aj.id,
            data: aj.data,
            tipo: 'AJUSTE',
            medicamento: aj.medicamento,
            codigo: aj.codigo,
            quantidade: aj.diferenca, // Diferenca positiva ou negativa do ajuste
            unidade: aj.unidade, // unidade do medicamento (ex: Comprimido)
            responsavel: aj.responsavel,
            setor: 'UPA',
            observacao: aj.motivo + (aj.observacao ? ` - ${aj.observacao}` : '')
        }));
        
        // Mapear entradas geradas em runtime no contexto (se houverem novas)
        const runtimeEntradas = entradasLocal
            .filter(e => !mockMovimentacoes.some(m => m.id === e.id))
            .map(e => ({
                id: e.id,
                data: e.data,
                tipo: 'ENTRADA',
                medicamento: e.medicamento,
                codigo: e.codigo || 'MED000',
                quantidade: e.quantidade,
                unidade: e.unidade,
                responsavel: e.responsavel,
                setor: e.setor === 'UMSJ' ? 'UMSJ' : 'UPA',
                observacao: e.observacao
            }));

        const combined = [...mockMovimentacoes, ...ajustesFormatados, ...runtimeEntradas];
        
        // Remove duplicatas just in case
        const uniqueSet = new Map();
        combined.forEach(item => uniqueSet.set(item.id, item));
        return Array.from(uniqueSet.values());
    }, [entradasLocal]);

    // Métricas para os Cards KPI
    const METRICAS = useMemo(() => {
        const movsHoje = todosRegistros.filter(m => m.data.startsWith(HOJE));
        const entradasHoje = movsHoje.filter(m => m.tipo === 'ENTRADA');
        const saidasHoje = movsHoje.filter(m => m.tipo === 'SAIDA');
        const ajustesHoje = movsHoje.filter(m => m.tipo === 'AJUSTE');

        return {
            movimentacoesHoje: movsHoje.length,
            entradasHoje: entradasHoje.length,
            saidasHoje: saidasHoje.length,
            ajustesHoje: ajustesHoje.length
        };
    }, [todosRegistros]);

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
                m.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
                (m.codigo && m.codigo.toLowerCase().includes(busca.toLowerCase())) ||
                m.setor.toLowerCase().includes(busca.toLowerCase());

            const matchesTipo = tipoFiltro === 'Todos os tipos' || m.tipo === tipoFiltro.toUpperCase();
            
            // Filtro por Setor (UPA / UMSJ)
            const matchesSetor = setorFiltro === 'Todos' || (m.setor && m.setor.includes(setorFiltro)); 
            const matchesResponsavel = responsavelFiltro === 'Todos' || m.responsavel === responsavelFiltro;
            
            // Filtro de Datas
            const dataItem = new Date(m.data);
            let matchesPeriodo = true;
            if (periodoFiltro === 'Hoje') {
                matchesPeriodo = m.data.startsWith(HOJE);
            } else if (periodoFiltro === '7d') {
                const seteDiasAtras = new Date(HOJE); // Usando HOJE fixo dos mocks para manter a UI consistente
                seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
                matchesPeriodo = dataItem >= seteDiasAtras;
            } else if (periodoFiltro === '30d') {
                const trintaDiasAtras = new Date(HOJE);
                trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
                matchesPeriodo = dataItem >= trintaDiasAtras;
            }

            return matchesBusca && matchesTipo && matchesSetor && matchesResponsavel && matchesPeriodo;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                // Apenas a ordenação de 'data' restou funcional
                const timeA = new Date(a.data).getTime();
                const timeB = new Date(b.data).getTime();

                if (timeA < timeB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (timeA > timeB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [todosRegistros, busca, tipoFiltro, periodoFiltro, setorFiltro, responsavelFiltro, sortConfig]);

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            {/* Header Espelhado */}
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Movimentações</h1>
                    <p className="farmacia-page-subtitle">Histórico completo de todas as movimentações do estoque.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <FarmaciaUnitBadge />
                </div>
            </header>

            {/* KPI Grid Espelhado */}
            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">MOVIMENTAÇÕES HOJE</span>
                    <span className="premium-card-value text-secondary">{METRICAS.movimentacoesHoje}</span>
                    <span className="premium-card-desc">quantidade total de registros do dia</span>
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

            {/* Toolbar Busca e Filtros Espelhada */}
            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '450px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input 
                            type="text" 
                            className="farmacia-search-input" 
                            placeholder="Buscar por medicamento, responsável ou setor..." 
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
                            <option value="Todos os tipos">Tipo: Todos os tipos</option>
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
                            <option value="Todos">Unidade: Todas</option>
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
                            <option value="Maria Alves">Maria Alves</option>
                            <option value="Carlos Lima">Carlos Lima</option>
                            <option value="Ana Souza">Ana Souza</option>
                            <option value="Fernanda Costa">Fernanda Costa</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, background: 'var(--bg-body)', padding: '6px 12px', borderRadius: '8px', minWidth: 'fit-content' }}>
                        <span>{itensFiltrados.length} registros</span>
                    </div>
                </div>
            </div>

            {/* Tabela de Histórico Espelhada */}
            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1.1rem 1.5rem 0.9rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted-light)' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Histórico de Movimentações</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                    <table className="farmacia-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('data')} style={{ cursor: 'pointer', width: '110px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        DATA / HORA <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'data' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th style={{ width: '95px' }}>Tipo</th>
                                <th style={{ width: '300px' }}>Medicamento / Material</th>
                                <th style={{ textAlign: 'right', width: '90px' }}>Quantidade</th>
                                <th style={{ width: '150px' }}>Acondicionamento</th>
                                <th style={{ width: '80px' }}>Unidade</th>
                                <th style={{ width: '130px' }}>Responsável</th>
                                <th style={{ width: '175px' }}>Observação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr><td colSpan={8} className="farmacia-empty">Nenhuma movimentação encontrada.</td></tr>
                            ) : (
                                (() => {
                                    let ultimaDataRenderizada = null;
                                    const renderedRows = [];
                                    const HOJE_STR = new Date().toLocaleDateString('pt-BR');

                                    itensFiltrados.forEach((item, index) => {
                                        const dataItemObj = new Date(item.data);
                                        const dataAtual = dataItemObj.toLocaleDateString('pt-BR');
                                        
                                        // 1. Agrupamento por Data: Renderiza divisor
                                        if (ultimaDataRenderizada !== dataAtual) {
                                            ultimaDataRenderizada = dataAtual;
                                            renderedRows.push(
                                                <tr key={`date-group-${dataAtual}`} style={{ background: 'var(--bg-muted-light)', borderTop: '2px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                                                    <td colSpan={8} style={{ padding: '0.6rem 1.25rem', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {dataAtual === HOJE_STR ? 'Hoje - ' : ''}{dataAtual}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        // 2. Zebra Striping interativo (Ímpar e Par) + Background default
                                        const isZebra = index % 2 !== 0; 
                                        const baseBg = isZebra ? 'var(--bg-muted)' : 'transparent'; // var(--bg-muted) é o cinza claro do sistema

                                        // Visual Setup para Quantidade basedo no Tipo
                                        let qtdDisplay = Math.abs(item.quantidade).toLocaleString('pt-BR');
                                        let qtdColor = 'var(--text-primary)';
                                        let qtdBg = 'transparent';
                                        
                                        if (item.tipo === 'ENTRADA') {
                                            qtdDisplay = `+${Math.abs(item.quantidade).toLocaleString('pt-BR')}`;
                                            qtdColor = '#16a34a'; // Verde suave
                                            qtdBg = 'rgba(34, 197, 94, 0.08)';
                                        } else if (item.tipo === 'SAIDA') {
                                            qtdDisplay = `-${Math.abs(item.quantidade).toLocaleString('pt-BR')}`;
                                            qtdColor = '#ea580c'; // Laranja suave
                                            qtdBg = 'rgba(249, 115, 22, 0.08)';
                                        } else if (item.tipo === 'AJUSTE') {
                                            // Ajuste pode ser positivo ou negativo
                                            if (item.quantidade > 0) {
                                                qtdDisplay = `+${Math.abs(item.quantidade).toLocaleString('pt-BR')}`;
                                                qtdColor = '#16a34a';
                                                qtdBg = 'rgba(34, 197, 94, 0.08)';
                                            } else if (item.quantidade < 0) {
                                                qtdDisplay = `-${Math.abs(item.quantidade).toLocaleString('pt-BR')}`;
                                                qtdColor = '#ea580c';
                                                qtdBg = 'rgba(249, 115, 22, 0.08)';
                                            }
                                        }

                                        renderedRows.push(
                                            <tr 
                                                key={item.id} 
                                                className="farmacia-table-row-interactive"
                                                style={{ transition: 'background-color 0.2s ease', cursor: 'default', backgroundColor: baseBg }}
                                            >
                                                <td className="farmacia-td-muted" style={{ whiteSpace: 'nowrap' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td>
                                                    <TipoBadge tipo={item.tipo} />
                                                </td>
                                                <td className="farmacia-td-primary">
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.medicamento}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span className="farmacia-code-badge" style={{ margin: 0, fontSize: '10px', padding: '1px 4px' }}>{item.codigo}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <span style={{ 
                                                        display: 'inline-block',
                                                        color: qtdColor,
                                                        fontWeight: 800,
                                                        fontSize: '0.9rem'
                                                    }}>
                                                        {qtdDisplay}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem' }}>{item.unidade}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{item.setor}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{item.responsavel}</td>
                                                <td className="farmacia-td-muted" style={{ fontSize: '0.8rem', whiteSpace: 'normal', lineHeight: '1.4', fontStyle: item.observacao ? 'normal' : 'italic' }}>
                                                    {item.observacao || '—'}
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
