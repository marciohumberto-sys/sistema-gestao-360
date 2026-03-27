import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, Activity, Users, Pill, Package, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import { supabase } from '../../lib/supabase';
import './FarmaciaPages.css';

const formatEmptyState = (value) => {
    if (!value || value === '—') {
        return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9em', fontWeight: 400 }}>Não informado</span>;
    }
    return value;
};

/**
 * Calcula o intervalo [início, fim] do "dia de hoje" em America/Sao_Paulo.
 * Usa Intl.DateTimeFormat para extrair os componentes da data local sem
 * risco de double-offset (problema quando o browser já está em BRT).
 * Retorna objetos Date reais — comparáveis com `new Date(isoString)`.
 */
const getHojeSP = () => {
    const agora = new Date();
    const partes = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(agora);

    const p = Object.fromEntries(partes.map(x => [x.type, x.value]));
    // Constrói o intervalo ancorado no fuso -03:00 (BRT)
    const inicio = new Date(`${p.year}-${p.month}-${p.day}T00:00:00-03:00`);
    const fim    = new Date(`${p.year}-${p.month}-${p.day}T23:59:59.999-03:00`);
    return { inicio, fim };
};

/**
 * Retorna o intervalo de datas para um período dado.
 * Todos os valores como objetos Date para comparação direta.
 */
const getRangeParaPeriodo = (periodo) => {
    const agora = new Date();
    if (periodo === 'Hoje') {
        return getHojeSP();
    }
    if (periodo === '7d') {
        const inicio = new Date(agora);
        inicio.setDate(inicio.getDate() - 7);
        inicio.setHours(0, 0, 0, 0);
        return { inicio, fim: agora };
    }
    if (periodo === '30d') {
        const inicio = new Date(agora);
        inicio.setDate(inicio.getDate() - 30);
        inicio.setHours(0, 0, 0, 0);
        return { inicio, fim: agora };
    }
    return { inicio: null, fim: null };
};

/**
 * Lê os searchParams e retorna os filtros iniciais de forma segura.
 * Chamado UMA vez na inicialização do componente via useRef.
 */
const readFiltersFromUrl = (searchParams, unidadeAtiva) => ({
    busca: searchParams.get('busca') || '',
    periodo: searchParams.get('periodo') || 'Hoje',
    unidade: searchParams.get('unidade') || unidadeAtiva?.label || 'Todas',
});

const FarmaciaSaidas = () => {
    const { setOpenModal, unidadeAtiva, dataRefreshKey } = useFarmacia();
    const [searchParams, setSearchParams] = useSearchParams();

    // Inicialização dos filtros feita UMA vez, lendo a URL atual.
    // useRef garante que mesmo em remontagem o valor inicial seja da URL.
    const initialFilters = useRef(readFiltersFromUrl(searchParams, unidadeAtiva));

    const [busca, setBusca]             = useState(initialFilters.current.busca);
    const [periodoFiltro, setPeriodo]   = useState(initialFilters.current.periodo);
    const [unidadeFiltro, setUnidade]   = useState(initialFilters.current.unidade);

    // rawData: nunca zerado antes do fetch, para preservar dados visíveis
    const [rawData, setRawData]   = useState({ items: [], movements: [], units: [] });
    const [isLoading, setLoading] = useState(true);
    const fetchingRef             = useRef(false);

    // Sincroniza filtros → URL (replace = sem histórico extra)
    // Só atualiza a URL quando o filtro de fato muda, evitando loop.
    useEffect(() => {
        const params = {};
        if (periodoFiltro !== 'Hoje') params.periodo = periodoFiltro;
        if (unidadeFiltro !== 'Todas') params.unidade = unidadeFiltro;
        if (busca) params.busca = busca;
        setSearchParams(params, { replace: true });
    }, [busca, periodoFiltro, unidadeFiltro]);

    // Sincroniza unidade global → filtro local, mas APENAS se o usuário
    // não escolheu explicitamente uma unidade via URL ou filtro.
    const unidadeFromUrl = searchParams.get('unidade');
    useEffect(() => {
        if (unidadeAtiva?.label && !unidadeFromUrl) {
            setUnidade(unidadeAtiva.label);
        }
    }, [unidadeAtiva]);

    // Fetch de dados — preserva rawData anterior para evitar piscadas
    const fetchData = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setLoading(true);
        try {
            const [
                { data: items,     error: eItems },
                { data: movements, error: eMov   },
                { data: units,     error: eUnits  },
            ] = await Promise.all([
                supabase
                    .from('inventory_items')
                    .select('id, name, code, item_form'),
                supabase
                    .from('stock_movements')
                    .select('id, inventory_item_id, quantity, unit_id, created_at, created_by, notes')
                    .eq('movement_type', 'EXIT')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('units')
                    .select('id, name'),
            ]);

            if (eItems || eMov || eUnits) {
                console.error('[FarmaciaSaidas] Erro no fetch:', eItems || eMov || eUnits);
            } else {
                // Só substitui se o fetch foi bem-sucedido
                setRawData({
                    items:     items     ?? [],
                    movements: movements ?? [],
                    units:     units     ?? [],
                });
            }
        } catch (err) {
            console.error('[FarmaciaSaidas] Exceção no fetch:', err);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, []);

    // Dispara fetch na montagem e após ações do usuário (nova saída, etc.)
    useEffect(() => {
        fetchData();
    }, [dataRefreshKey]);

    // ── Mapeamento de dados ──────────────────────────────────────────────────

    /**
     * Mapeia cada movimento de saída para um objeto de exibição.
     * `dataObj` é um Date real criado a partir da string ISO do banco,
     * garantindo que comparações de range funcionem corretamente.
     */
    const baseSaidas = useMemo(() => {
        const { items, movements, units } = rawData;
        if (!movements.length) return [];

        const unitMap = {};
        units.forEach(u => (unitMap[u.name.toUpperCase()] = u.id));
        const targetUnitId = unidadeFiltro !== 'Todas'
            ? unitMap[unidadeFiltro.toUpperCase()]
            : null;

        const filtered = targetUnitId
            ? movements.filter(m => m.unit_id === targetUnitId)
            : movements;

        return filtered.map(m => {
            const itemObj = items.find(i => i.id === m.inventory_item_id) ?? {};
            const unitObj = units.find(u => u.id === m.unit_id) ?? {};

            let responsavel = '—';
            let safeObs = m.notes || '';
            if (safeObs.includes('||RESP:')) {
                const [obs, resp] = safeObs.split('||RESP:');
                safeObs     = obs.trim();
                responsavel = resp.trim() || '—';
            }
            if (!safeObs || safeObs === 'massa_fake_dashboard') safeObs = '—';

            // new Date() com string ISO é parseado como UTC → correto para comparação
            const dataObj = new Date(m.created_at);

            return {
                id:             m.id,
                dataObj,                        // Date object — para range comparisons
                dataISO:        m.created_at,   // string original do banco
                medicamento:    itemObj.name     ?? 'Desconhecido',
                quantidade:     m.quantity,
                unidade:        unitObj.name     ?? 'Desconhecida',
                codigo:         itemObj.code     ?? null,
                item_form:      itemObj.item_form ?? null,
                responsavel,
                acondicionamento: itemObj.item_form ?? '—',
                observacao:     safeObs,
            };
        });
    }, [rawData, unidadeFiltro]);

    // ── Filtros de período ───────────────────────────────────────────────────

    const itensFiltrados = useMemo(() => {
        const { inicio, fim } = getRangeParaPeriodo(periodoFiltro);

        return baseSaidas.filter(m => {
            const matchBusca = !busca ||
                m.medicamento.toLowerCase().includes(busca.toLowerCase()) ||
                (m.observacao !== '—' && m.observacao.toLowerCase().includes(busca.toLowerCase()));

            const matchPeriodo = (!inicio || !fim)
                ? true
                : (m.dataObj >= inicio && m.dataObj <= fim);

            return matchBusca && matchPeriodo;
        });
    }, [baseSaidas, busca, periodoFiltro]);

    // ── KPIs ─────────────────────────────────────────────────────────────────

    const METRICAS = useMemo(() => {
        // Cards de "Hoje" sempre usam o range BRT correto,
        // independente do filtro de período escolhido pelo usuário.
        const { inicio: hInicio, fim: hFim } = getHojeSP();
        const saidasHoje = baseSaidas.filter(
            m => m.dataObj >= hInicio && m.dataObj <= hFim
        );

        const registrosHoje = saidasHoje.length;
        const itensHoje = saidasHoje.reduce((acc, m) => acc + Math.abs(m.quantidade), 0);

        let topMedicamento = '—';
        if (itensFiltrados.length > 0) {
            const agMed = itensFiltrados.reduce((acc, m) => {
                acc[m.medicamento] = (acc[m.medicamento] || 0) + Math.abs(m.quantidade);
                return acc;
            }, {});
            topMedicamento = Object.entries(agMed).sort((a, b) => b[1] - a[1])[0][0];
        }

        let unidadeConsumo = '—';
        if (itensFiltrados.length > 0) {
            if (unidadeFiltro === 'Todas') {
                const agUni = itensFiltrados.reduce((acc, m) => {
                    acc[m.unidade] = (acc[m.unidade] || 0) + Math.abs(m.quantidade);
                    return acc;
                }, {});
                unidadeConsumo = Object.entries(agUni).sort((a, b) => b[1] - a[1])[0][0].toUpperCase();
            } else {
                unidadeConsumo = unidadeFiltro.toUpperCase();
            }
        }

        return { registrosHoje, itensHoje, topMedicamento, unidadeConsumo };
    }, [baseSaidas, itensFiltrados, unidadeFiltro]);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Saídas / Dispensação</h1>
                    <p className="farmacia-page-subtitle">Registro de consumo por paciente ou setor.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {isLoading && (
                        <span style={{
                            fontSize: '0.75rem', color: 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontWeight: 600, background: 'rgba(0,150,125,0.1)',
                            padding: '4px 10px', borderRadius: '12px',
                        }}>
                            <div className="spinner" style={{
                                width: '12px', height: '12px',
                                border: '2px solid rgba(0,150,125,0.2)',
                                borderTopColor: 'var(--color-primary)',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                            }} />
                            Atualizando...
                        </span>
                    )}
                    <button
                        className="farmacia-btn-primary"
                        onClick={() => setOpenModal('saida')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Pill size={16} /> + Nova Saída
                    </button>
                    <FarmaciaUnitBadge />
                </div>
            </header>

            {/* KPIs */}
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
                        <span className="premium-card-value color-blue" style={{
                            fontSize: METRICAS.topMedicamento === '—' ? '2.5rem' : '1.4rem',
                            lineHeight: '1.2',
                        }}>
                            {METRICAS.topMedicamento !== '—'
                                ? METRICAS.topMedicamento.split(' ').slice(0, 2).join(' ')
                                : '—'}
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

            {/* Toolbar de filtros */}
            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '450px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input
                            type="text"
                            className="farmacia-search-input"
                            placeholder="Buscar medicamento ou observação..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select
                            className="farmacia-filter-select"
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={periodoFiltro}
                            onChange={e => setPeriodo(e.target.value)}
                        >
                            <option value="Hoje">Período: Hoje</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                        </select>
                        <ChevronDown size={14} style={{
                            position: 'absolute', right: '12px', top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)', pointerEvents: 'none',
                        }} />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select
                            className="farmacia-filter-select"
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={unidadeFiltro}
                            onChange={e => setUnidade(e.target.value)}
                        >
                            <option value="Todas">Unidade: Todas</option>
                            <option value="UPA">UPA</option>
                            <option value="UMSJ">UMSJ</option>
                        </select>
                        <ChevronDown size={14} style={{
                            position: 'absolute', right: '12px', top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)', pointerEvents: 'none',
                        }} />
                    </div>

                    <div style={{
                        marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px',
                        color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500,
                        background: 'var(--bg-body)', padding: '6px 12px',
                        borderRadius: '8px', minWidth: 'fit-content',
                    }}>
                        <span>{itensFiltrados.length} resultados (de {baseSaidas.length})</span>
                    </div>
                </div>
            </div>

            {/* Tabela */}
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
                                <tr>
                                    <td colSpan={7} className="farmacia-empty">
                                        {isLoading
                                            ? 'Carregando registros...'
                                            : 'Nenhuma saída encontrada para os filtros aplicados.'}
                                    </td>
                                </tr>
                            ) : (
                                itensFiltrados.map(item => (
                                    <tr key={item.id}>
                                        <td className="farmacia-td-muted" style={{ whiteSpace: 'nowrap' }}>
                                            {item.dataObj.toLocaleDateString('pt-BR', {
                                                timeZone: 'America/Sao_Paulo',
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                            })}
                                        </td>
                                        <td className="farmacia-td-primary">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                                    {item.medicamento}
                                                </span>
                                                {(item.codigo || item.item_form) && (
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
                                                        {item.item_form && (
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
                                                                {item.item_form}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#b91c1c', fontSize: '1.05rem' }}>
                                            {Math.abs(item.quantidade).toLocaleString('pt-BR')}
                                        </td>
                                        <td
                                            className="farmacia-td-muted"
                                            style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' }}
                                            title={item.acondicionamento}
                                        >
                                            {formatEmptyState(item.acondicionamento)}
                                        </td>
                                        <td
                                            className="farmacia-td-muted"
                                            style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' }}
                                            title={item.responsavel}
                                        >
                                            {formatEmptyState(item.responsavel)}
                                        </td>
                                        <td>{item.unidade}</td>
                                        <td className="farmacia-td-muted" style={{ whiteSpace: 'normal', lineHeight: '1.3' }}>
                                            {formatEmptyState(item.observacao)}
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

export default FarmaciaSaidas;
