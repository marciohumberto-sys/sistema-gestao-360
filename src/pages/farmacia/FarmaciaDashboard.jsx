import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Package, PackagePlus, PackageMinus, AlertTriangle, ArrowLeftRight,
    ChevronRight, Bell, XCircle, Clock, TrendingUp, Activity, Heart, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockFarmaciaKPIs, mockMovimentacoes, mockEstoqueItems } from '../../mocks/farmaciaMocks';
import {
    LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
    Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, Area, AreaChart, Legend, ReferenceLine
} from 'recharts';
import './FarmaciaPages.css';

/* ─── Dados Mockados ─────────────────────────────────────────── */
const mockTendencia = [
    { name: 'Seg', Entradas: 40, Saídas: 24 },
    { name: 'Ter', Entradas: 30, Saídas: 13 },
    { name: 'Qua', Entradas: 20, Saídas: 48 },
    { name: 'Qui', Entradas: 27, Saídas: 39 },
    { name: 'Sex', Entradas: 18, Saídas: 48 },
    { name: 'Sáb', Entradas: 23, Saídas: 38 },
    { name: 'Dom', Entradas: 34, Saídas: 43 },
];

const mockDistribuicao = [
    { name: 'Comprimido', value: 400, color: '#00967D' },
    { name: 'Ampola',     value: 300, color: '#3b82f6' },
    { name: 'Frasco',     value: 300, color: '#f59e0b' },
    { name: 'Cápsula',    value: 200, color: '#8b5cf6' },
    { name: 'Outros',     value: 100, color: '#64748b' }
];
const totalDistrib = mockDistribuicao.reduce((a, b) => a + b.value, 0);

// Consumo calculado dinamicamente a partir dos dados reais de estoque
const calcConsumoUnidades = () => {
    const mapa = {};
    mockEstoqueItems.forEach(item => {
        if (item.estoquePorUnidade) {
            Object.entries(item.estoquePorUnidade).forEach(([unid, qtd]) => {
                const label = unid.toUpperCase();
                mapa[label] = (mapa[label] || 0) + (qtd || 0);
            });
        }
    });
    return Object.entries(mapa)
        .map(([name, consumo]) => ({ name, consumo }))
        .sort((a, b) => b.consumo - a.consumo);
};

const topMedicamentos = [
    { nome: 'Dipirona 500mg',      qtd: 1240, max: 1240 },
    { nome: 'Paracetamol 750mg',   qtd: 980,  max: 1240 },
    { nome: 'Ibuprofeno 600mg',    qtd: 750,  max: 1240 },
    { nome: 'Seringa 5ml',         qtd: 420,  max: 1240 },
    { nome: 'Omeprazol 20mg',      qtd: 310,  max: 1240 },
];
const rankColors = ['#00967D', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];

/* ─── Gauge SVG Circular ─────────────────────────────────────── */
const GaugeCircular = ({ pct, cor }) => {
    const R = 36;
    const circ = 2 * Math.PI * R;
    const dash = (pct / 100) * circ;
    return (
        <svg width="76" height="76" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto' }}>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--bg-muted)" strokeWidth="10" />
            <circle
                cx="50" cy="50" r={R} fill="none"
                stroke={cor} strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 1s ease' }}
            />
            <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="700" fill={cor}>{pct}%</text>
        </svg>
    );
};

/* ─── Tooltip Customizado do Hero Chart ──────────────────────── */
const HeroTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--text)' }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>
                    {p.name}: <span style={{ color: 'var(--text)' }}>{p.value} unid</span>
                </p>
            ))}
        </div>
    );
};

/* ─── Componente Contador Animado ────────────────────────────── */
const AnimatedCount = ({ target, dur = 1000 }) => {
    const [val, setVal] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = Math.ceil(target / (dur / 16));
        const timer = setInterval(() => {
            start = Math.min(start + step, target);
            setVal(start);
            if (start >= target) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [target, dur]);
    return <>{val.toLocaleString('pt-BR')}</>;
};

/* ─── Componente Principal ───────────────────────────────────── */
/* Tooltip customizado com percentual */
const TooltipConsumo = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const dados = calcConsumoUnidades();
    const total = dados.reduce((s, d) => s + d.consumo, 0) || 1;
    const pct = ((item.consumo / total) * 100).toFixed(1);
    return (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.82rem' }}>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>{item.name}</p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>Distribuído: <strong style={{ color: 'var(--text)' }}>{item.consumo.toLocaleString('pt-BR')} un</strong></p>
            <p style={{ margin: '2px 0 0', color: 'var(--text-muted)' }}>Participação: <strong style={{ color: '#00967D' }}>{pct}%</strong></p>
        </div>
    );
};

/* Tooltip customizado para Distribuição do Estoque */
const TooltipDistribuicao = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const color = item.payload.fill || item.color || item.payload.color;
    const pct = Math.round((item.value / totalDistrib) * 100);
    return (
        <div style={{ 
            background: 'var(--bg)', 
            border: '1px solid var(--border)', 
            borderLeft: `4px solid ${color}`,
            borderRadius: '8px', 
            padding: '10px 14px', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)', 
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
        }}>
            <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9rem' }}>{item.name}</span>
            <span style={{ fontWeight: 700, color: color }}>
                {pct}% <span style={{ fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-muted)' }}>do total</span>
            </span>
        </div>
    );
};

const FarmaciaDashboard = () => {
    const navigate = useNavigate();
    const [alertaAberto, setAlertaAberto] = useState(false);
    const [barrasAnimadas, setBarrasAnimadas] = useState(false);
    const alertaRef = useRef(null);
    const analiseOpRef = useRef(null);
    const movRecentes = mockMovimentacoes.slice(0, 5);

    // Fade-in animation for bars on scroll visibility
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setBarrasAnimadas(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 } // Dispara quando 15% do bloco estiver visível
        );

        if (analiseOpRef.current) {
            observer.observe(analiseOpRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Fechar painel ao clicar fora
    useEffect(() => {
        const handleClickFora = (e) => {
            if (alertaRef.current && !alertaRef.current.contains(e.target)) {
                setAlertaAberto(false);
            }
        };
        if (alertaAberto) document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, [alertaAberto]);

    const itensSemEstoque    = mockEstoqueItems.filter(i => i.status === 'SEM_ESTOQUE').length;
    const itensAbaixoMinimo  = mockEstoqueItems.filter(i => i.status === 'ABAIXO_MINIMO').length;
    const hoje = new Date();
    const em60Dias = new Date(); em60Dias.setDate(hoje.getDate() + 60);
    const itensVencendo = mockEstoqueItems.filter(i => {
        if (i.validade === '-' || !i.validade) return false;
        return new Date(i.validade) <= em60Dias;
    }).length;

    const totalItensReal  = mockEstoqueItems.length || 1;
    const saudePercentual = Math.round(((totalItensReal - itensSemEstoque - itensAbaixoMinimo) / totalItensReal) * 100);
    const saudeCor = saudePercentual < 70 ? '#ef4444' : saudePercentual <= 85 ? '#f59e0b' : '#10b981';
    const saudeLabel = saudePercentual < 70 ? 'Crítico' : saudePercentual <= 85 ? 'Atenção' : 'Saudável';

    // Consumo por unidade — calculado dinamicamente
    const consumoUnidades = useMemo(() => calcConsumoUnidades(), []);

    // Cálculo da média semanal para o Hero Chart
    const mediaMovimentacoes = useMemo(() => {
        const total = mockTendencia.reduce((acc, curr) => acc + curr.Entradas + curr.Saídas, 0);
        return Math.round(total / (mockTendencia.length * 2));
    }, []);

    const kpiCards = [
        { label: 'Total de Itens',  value: mockFarmaciaKPIs.totalItens,  desc: 'estoque ativo no sistema', context: 'base consolidada', trendColor: 'var(--text-muted)', icon: Package,      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', shadow: 'rgba(59,130,246,0.15)' },
        { label: 'Entradas Hoje',   value: mockFarmaciaKPIs.entradasHoje, desc: 'fluxo dentro da média de abastecimento', context: '+1 vs ontem', trendColor: '#10b981', icon: PackagePlus,   color: '#00967D', bg: 'rgba(0,150,125,0.1)', shadow: 'rgba(0,150,125,0.15)' },
        { label: 'Saídas Hoje',     value: mockFarmaciaKPIs.saidasHoje,   desc: 'demanda regular do dia',   context: 'dentro da média semanal', trendColor: 'var(--text-muted)', icon: PackageMinus,  color: '#ea580c', bg: 'rgba(234,88,12,0.1)', shadow: 'rgba(234,88,12,0.15)' },
        { label: 'Itens Críticos',  value: mockFarmaciaKPIs.itensCriticos,desc: 'reposição recomendada', context: 'prioridade de análise', trendColor: '#ef4444', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: '#ef4444', shadow: 'rgba(239,68,68,0.15)' },
    ];

    return (
        <div className="farmacia-page-container" style={{ gap: '0.85rem' }}>
            {/* Keyframe da animação do painel flutuante e do ícone crítico */}
            <style>{`
                @keyframes alertaPainelEntrar {
                    from { opacity: 0; transform: translateY(-8px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pulseIconCritico {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.15); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes alertaItemFadeIn {
                    from { opacity: 0; transform: translateX(-5px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
            {/* ── Header + Alerta Dropdown Flutuante ── */}
            <header className="farmacia-page-header" style={{ alignItems: 'center', position: 'relative' }}>
                {/* Título */}
                <div style={{ flex: 1 }}>
                    <h1 className="farmacia-page-title">Dashboard — Farmácia</h1>
                    <p className="farmacia-page-subtitle">Centro de comando operacional do estoque hospitalar.</p>
                </div>

                {/* Gatilho + Painel Flutuante */}
                {(itensSemEstoque > 0 || itensAbaixoMinimo > 0 || itensVencendo > 0) && (
                    <div ref={alertaRef} style={{ position: 'relative', flexShrink: 0 }}>
                        {/* Botão gatilho */}
                        <button
                            onClick={() => setAlertaAberto(v => !v)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                                border: `1px solid ${alertaAberto ? 'rgba(239,68,68,0.45)' : 'rgba(239,68,68,0.28)'}`,
                                background: alertaAberto ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)',
                                color: '#dc2626', fontSize: '0.8rem', fontWeight: 700,
                                transition: 'all 0.2s ease',
                                boxShadow: alertaAberto ? '0 2px 8px rgba(239,68,68,0.12)' : 'none',
                            }}
                        >
                            <Bell 
                                size={16} 
                                strokeWidth={2.5} 
                                style={{
                                    animation: (!alertaAberto && itensSemEstoque > 0) ? 'pulseIconCritico 2s infinite ease-in-out' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                            <span>
                                {itensSemEstoque + itensAbaixoMinimo + itensVencendo} alerta
                                {itensSemEstoque + itensAbaixoMinimo + itensVencendo > 1 ? 's' : ''}
                            </span>
                            <span style={{ fontSize: '0.6rem', opacity: 0.65, marginLeft: '2px' }}>
                                {alertaAberto ? '▲' : '▼'}
                            </span>
                        </button>

                        {/* Painel flutuante */}
                        {alertaAberto && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                                width: '296px', zIndex: 100,
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                boxShadow: '0 16px 40px rgba(0,0,0,0.08), 0 6px 16px rgba(0,0,0,0.04)',
                                padding: '1rem',
                                animation: 'alertaPainelEntrar 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
                                transformOrigin: 'top right'
                            }}>
                                {/* Cabeçalho do painel */}
                                <div style={{ marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <Bell size={14} color="#dc2626" strokeWidth={2.5} />
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Atenção Operacional</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                                        {itensSemEstoque + itensAbaixoMinimo + itensVencendo} eventos exigem atenção
                                    </div>
                                </div>

                                {/* Alertas por nível */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {itensSemEstoque > 0 && (
                                        <button onClick={() => { navigate('/farmacia/estoque'); setAlertaAberto(false); }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', 
                                                borderRadius: '8px', cursor: 'pointer', 
                                                border: '1px solid rgba(239,68,68,0.25)', borderLeft: '3px solid #dc2626',
                                                background: 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)', 
                                                textAlign: 'left', transition: 'background 0.15s, transform 0.15s', width: '100%',
                                                animation: 'alertaItemFadeIn 0.3s ease-out 0.05s both'
                                            }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <XCircle size={14} color="#dc2626" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#dc2626' }}>
                                                    {itensSemEstoque === 1 
                                                        ? `${mockEstoqueItems.find(i => i.status === 'SEM_ESTOQUE')?.nome || '1 item'} sem estoque` 
                                                        : `${itensSemEstoque} itens sem estoque`}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Reposição imediata recomendada.</div>
                                            </div>
                                        </button>
                                    )}
                                    {itensAbaixoMinimo > 0 && (
                                        <button onClick={() => { navigate('/farmacia/estoque'); setAlertaAberto(false); }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', 
                                                borderRadius: '8px', cursor: 'pointer', 
                                                border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)', 
                                                textAlign: 'left', transition: 'background 0.15s', width: '100%',
                                                animation: 'alertaItemFadeIn 0.3s ease-out 0.1s both'
                                            }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <AlertTriangle size={14} color="#b45309" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#b45309' }}>
                                                    {itensAbaixoMinimo === 1
                                                        ? `${mockEstoqueItems.find(i => i.status === 'ABAIXO_MINIMO')?.nome || '1 item'} abaixo do mínimo`
                                                        : `${itensAbaixoMinimo} itens abaixo do mínimo`}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Análise de reabastecimento sugerida.</div>
                                            </div>
                                        </button>
                                    )}
                                    {itensVencendo > 0 && (
                                        <button onClick={() => { navigate('/farmacia/relatorios'); setAlertaAberto(false); }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', 
                                                borderRadius: '8px', cursor: 'pointer', 
                                                border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)', 
                                                textAlign: 'left', transition: 'background 0.15s', width: '100%',
                                                animation: 'alertaItemFadeIn 0.3s ease-out 0.15s both'
                                            }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Clock size={14} color="#1d4ed8" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1d4ed8' }}>
                                                    {itensVencendo === 1
                                                        ? `1 item com validade próxima` // Cannot easily extract name here without the complex filter logic duplicated
                                                        : `${itensVencendo} itens com validade próxima`}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Avaliar redistribuição de estoque.</div>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* ── 2) KPI Cards + Gauge Saúde (Movido para cima do gráfico) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
                {kpiCards.map((k, i) => (
                    <div key={i} className="farmacia-kpi-card dashboard-chart-surface" style={{ borderLeft: `4px solid ${k.border || k.color}`, gap: '0.2rem', padding: '0.875rem 1rem' }}>
                        <span className="farmacia-kpi-label">{k.label}</span>
                        <span className="farmacia-kpi-value" style={{ color: k.color }}>
                            <AnimatedCount target={k.value} />
                        </span>
                        <span className="farmacia-kpi-desc" style={{ marginBottom: '2px' }}>{k.desc}</span>
                        <span style={{ fontSize: '0.62rem', color: k.trendColor, opacity: 0.48, fontWeight: 500, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            • {k.context}
                        </span>
                        <div className="farmacia-kpi-icon" style={{ 
                            backgroundColor: k.bg, 
                            color: k.color, 
                            top: '1rem', 
                            right: '1rem',
                            border: `1px solid ${k.bg.replace('0.1)', '0.2)')}`,
                            boxShadow: `0 4px 10px ${k.shadow}`,
                            borderRadius: '8px',
                            width: '34px',
                            height: '34px'
                        }}>
                            <k.icon size={17} />
                        </div>
                    </div>
                ))}

                {/* Gauge Saúde */}
                <div className="farmacia-kpi-card dashboard-chart-surface" style={{ borderLeft: `4px solid ${saudeCor}`, gap: '0.1rem', padding: '0.875rem 1rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <span className="farmacia-kpi-label" style={{ marginBottom: '0.2rem' }}>Saúde do Estoque</span>
                    <div style={{ margin: '0.2rem 0' }}>
                        <GaugeCircular pct={saudePercentual} cor={saudeCor} />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: saudeCor, marginTop: '2px' }}>{saudeLabel}</span>
                    <span style={{ fontSize: '0.62rem', color: saudePercentual <= 85 ? saudeCor : 'var(--text-muted)', opacity: 0.48, fontWeight: 500, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        • {saudePercentual < 70 ? 'ação preventiva urgente' : saudePercentual <= 85 ? 'análise recomendada' : 'operação estabilizada'}
                    </span>
                </div>
            </div>

            {/* ── 3) Hero Chart – Fluxo Últimos 7 Dias ── */}
            <div className="dashboard-chart-surface" style={{ padding: '1.1rem 1.5rem 0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                            Fluxo de Medicamentos — Últimos 7 dias
                        </h2>
                        <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Entradas e saídas diárias do período</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ width: 18, height: 3, background: '#00967D', borderRadius: 2, display: 'inline-block' }} />
                                <span style={{ width: 8, height: 8, background: '#00967D', borderRadius: '50%', display: 'inline-block' }} />
                            </span>
                            <span style={{ color: 'var(--text)' }}>Entradas</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ width: 18, height: 3, background: '#ea580c', borderRadius: 2, display: 'inline-block' }} />
                                <span style={{ width: 8, height: 8, background: '#ea580c', borderRadius: '50%', display: 'inline-block' }} />
                            </span>
                            <span style={{ color: 'var(--text)' }}>Saídas</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--text-muted)', opacity: 0.5, display: 'inline-block' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Média semanal</span>
                        </span>
                    </div>
                </div>
                <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                        <AreaChart data={mockTendencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#00967D" stopOpacity={0.18} />
                                    <stop offset="95%" stopColor="#00967D" stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#ea580c" stopOpacity={0.14} />
                                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.01} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                            <RechartsTooltip content={<HeroTooltip />} />
                            <ReferenceLine y={mediaMovimentacoes} stroke="var(--text-muted)" strokeDasharray="4 4" opacity={0.3} />
                            <Area type="monotone" dataKey="Entradas" stroke="#00967D" strokeWidth={3} fill="url(#gradEntradas)" dot={{ r: 4, fill: '#00967D', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#00967D' }} animationDuration={1000} />
                            <Area type="monotone" dataKey="Saídas"   stroke="#ea580c" strokeWidth={3} fill="url(#gradSaidas)"   dot={{ r: 4, fill: '#ea580c', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#ea580c' }} animationDuration={1000} animationBegin={200} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── 4) Análise Operacional: Donut + Barras Setor ── */}
            <div ref={analiseOpRef} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
                <Activity size={15} style={{ color: 'var(--text-muted)', opacity: 0.8 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Análise Operacional</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>

                {/* Donut Distribuição — refinado */}
                <div className="dashboard-chart-surface">
                    <h3 className="farmacia-title-small">Distribuição do Estoque</h3>
                    <div style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4.5rem', marginTop: '1.25rem', marginBottom: '0.75rem',
                        opacity: barrasAnimadas ? 1 : 0,
                        transform: barrasAnimadas ? 'scale(1)' : 'scale(0.96)',
                        transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)' 
                    }}>
                        {/* Donut com espessura maior (innerRadius 50, outerRadius 78 = 28px de espessura) */}
                        <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
                            <ResponsiveContainer width={170} height={170} style={{ overflow: 'visible' }}>
                                <PieChart style={{ overflow: 'visible' }}>
                                    {barrasAnimadas && (
                                        <Pie
                                            data={mockDistribuicao}
                                            innerRadius={54} outerRadius={78}
                                            paddingAngle={3} dataKey="value"
                                            stroke="none" startAngle={90} endAngle={-270}
                                            animationDuration={800}
                                        >
                                            {mockDistribuicao.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                    )}
                                    <RechartsTooltip
                                        wrapperStyle={{ zIndex: 10, pointerEvents: 'none' }}
                                        content={<TooltipDistribuicao />}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Conteúdo central do Donut */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', lineHeight: 1.1 }}>
                                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85, marginBottom: '2px' }}>Total de itens</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', margin: '0' }}>{totalDistrib.toLocaleString('pt-BR')}</span>
                                <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', opacity: 0.65, marginTop: '1px' }}>formas farmacê.</span>
                            </div>
                        </div>
                        {/* Legenda com melhor alinhamento e espaçamento */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {mockDistribuicao.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                                    <span style={{ color: 'var(--text)', fontWeight: 500, fontSize: '0.82rem' }}>{item.name}</span>
                                    <span style={{ color: item.color, fontWeight: 700, fontSize: '0.85rem' }}>
                                        {Math.round((item.value / totalDistrib) * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Consumo por Unidade — presença visual reforçada */}
                <div className="dashboard-chart-surface">
                    <h3 className="farmacia-title-small">Consumo de Medicamentos por Unidade</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '1.5rem' }}>
                        {consumoUnidades.map((u, i) => {
                            const total = consumoUnidades.reduce((s, d) => s + d.consumo, 0) || 1;
                            const pct = ((u.consumo / total) * 100).toFixed(1);
                            const barW = (u.consumo / consumoUnidades[0].consumo) * 100;
                            const barColor = i === 0 ? '#00967D' : '#2E86AB';
                            const trilhoColor = i === 0 ? 'rgba(0,150,125,0.06)' : 'rgba(46,134,171,0.05)';
                            return (
                                <div key={i}>
                                    {/* Nome da unidade — destaque máximo */}
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: '4px' }}>
                                        {u.name}
                                    </div>
                                    {/* Barra proporcional — mais espessa e com contraste */}
                                    <div style={{ height: '16px', background: trilhoColor, borderRadius: '8px', overflow: 'hidden', marginBottom: '6px' }}>
                                        <div style={{ height: '100%', width: barrasAnimadas ? `${barW}%` : '0%', background: barColor, borderRadius: '8px', transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                                    </div>
                                    {/* Valor e percentual — hierarquia clara */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: barColor, lineHeight: 1 }}>
                                            {u.consumo.toLocaleString('pt-BR')} un
                                        </span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', opacity: 0.7, lineHeight: 1 }}>
                                            {pct}% do total
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── 5) Top Medicamentos ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={17} style={{ color: 'var(--color-secondary)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Análise de Consumo</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 2.5fr) minmax(280px, 1fr)', gap: '1rem' }}>
                <div className="dashboard-chart-surface" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 className="farmacia-title-small" style={{ marginBottom: '1.25rem' }}>Medicamentos Mais Movimentados</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '1rem' }}>
                        {topMedicamentos.slice(0, 4).map((m, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                        <span style={{ display: 'inline-block', width: '22px', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}º</span>
                                        {m.nome}
                                    </div>
                                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>
                                        {m.qtd.toLocaleString('pt-BR')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>un</span>
                                    </span>
                                </div>
                                
                                {/* Barra da exata mesma largura total (100%) */}
                                <div style={{ height: '6px', background: 'rgba(150, 150, 150, 0.3)', borderRadius: '999px', overflow: 'hidden', width: '100%' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: barrasAnimadas ? `${(m.qtd / m.max) * 100}%` : '0%', 
                                        background: rankColors[i], 
                                        borderRadius: '999px', 
                                        transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)' 
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Painel Inteligente de Insights */}
                <div className="dashboard-chart-surface" style={{ 
                    display: 'flex', flexDirection: 'column',
                    opacity: barrasAnimadas ? 1 : 0, 
                    transform: barrasAnimadas ? 'translateX(0)' : 'translateX(15px)',
                    background: barrasAnimadas ? 'linear-gradient(145deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.03) 100%)' : 'rgba(255, 255, 255, 0)',
                    border: barrasAnimadas ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                    boxShadow: barrasAnimadas ? '0 12px 35px -5px rgba(59, 130, 246, 0.15), 0 4px 15px rgba(59, 130, 246, 0.05)' : 'none',
                    transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.25s',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', right: '-25px', top: '50%', opacity: 0.05, pointerEvents: 'none', transform: 'translateY(-50%)', zIndex: 0 }}>
                        <Activity size={160} color="var(--color-primary)" strokeWidth={1.2} />
                    </div>
                
                    <h3 className="farmacia-title-small" style={{ marginBottom: '1.25rem', color: 'var(--color-primary)', borderBottom: '1px solid rgba(59, 130, 246, 0.25)', paddingBottom: '0.65rem', fontWeight: 900, fontSize: '0.95rem', textShadow: '0 1px 2px rgba(59, 130, 246, 0.1)', zIndex: 1, position: 'relative' }}>
                        Insights de Consumo
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, zIndex: 1, position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(150, 150, 150, 0.2)' }}>
                            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Consumo acelerado</span>
                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text)' }}>Dipirona 500mg</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>+18% no período</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(150, 150, 150, 0.2)' }}>
                            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Queda de consumo</span>
                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text)' }}>Ibuprofeno 600mg</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>-5% no período</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: 'auto' }}>
                            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recomendação / IA</span>
                            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.45 }}>
                                Reforçar estoque de Dipirona para suportar o pico de admissões da UPA.
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 6 + 7) Monitoramento + Movimentações ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={17} style={{ color: 'var(--color-secondary)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monitoramento</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr)', gap: '1rem', paddingBottom: '1.5rem' }}>

                {/* Validades */}
                <div className="dashboard-chart-surface">
                    <h3 className="farmacia-title-small" style={{ marginBottom: '1.25rem' }}>Validades Próximas</h3>
                    {[
                        { label: '0 – 30 dias', sub: 'Crítico',   qtd: 12, pct: 15, cor: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                        { label: '30 – 60 dias', sub: 'Atenção',  qtd: 28, pct: 35, cor: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                        { label: '60 – 90 dias', sub: 'Monitorar', qtd: 45, pct: 60, cor: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                    ].map((v, i) => (
                        <div key={i} style={{ marginBottom: i < 2 ? '1.25rem' : 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.83rem', fontWeight: i === 0 ? 700 : 600, marginBottom: '6px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: v.cor, fontSize: i === 0 ? '0.87rem' : '0.83rem' }}>{v.label} <span style={{ color: i === 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: i === 0 ? 700 : 400, opacity: i === 0 ? 0.9 : 1 }}>({v.sub})</span></span>
                                    {i === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>Vencem em até 30 dias</span>}
                                </div>
                                <span style={{ color: i === 0 ? 'var(--text)' : 'var(--text-muted)', fontSize: i === 0 ? '0.9rem' : '0.83rem' }}>
                                    {v.qtd} {i === 0 ? 'itens críticos' : 'itens'}
                                </span>
                            </div>
                            <div style={{ height: '8px', background: v.bg, borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${v.pct}%`, background: v.cor, borderRadius: '4px', transition: 'width 1s ease' }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Movimentações Recentes */}
                <div className="farmacia-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem 1.5rem 0.65rem', borderBottom: '1px solid rgba(150, 150, 150, 0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                            <h3 className="farmacia-title-small">Movimentações Recentes</h3>
                            <button className="farmacia-link-action" onClick={() => navigate('/farmacia/movimentacoes')} style={{ fontSize: '0.83rem' }}>
                                Ver todas <ChevronRight size={14} />
                            </button>
                        </div>
                        
                        {/* Resumo do Dia */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', backgroundColor: 'var(--bg-muted-light)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}>Hoje:</span>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                <ArrowLeftRight size={12} color="#00967D" />
                                <span style={{ fontWeight: 600, color: '#00967D' }}>+620</span> <span style={{ color: 'var(--text-muted)' }}>entradas</span>
                            </div>
                            <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--border)' }}></div>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                <ArrowLeftRight size={12} color="#ea580c" style={{ transform: 'scaleX(-1)' }} />
                                <span style={{ fontWeight: 600, color: '#ea580c' }}>-75</span> <span style={{ color: 'var(--text-muted)' }}>saídas</span>
                            </div>
                            <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--border)' }}></div>
                            <span style={{ fontWeight: 600, color: '#00967D', background: 'rgba(0, 150, 125, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Saldo positivo</span>
                        </div>
                    </div>
                    <div className="farmacia-table-wrapper" style={{ border: 'none', flex: 1, borderRadius: 0, paddingBottom: '0.75rem' }}>
                        <table className="farmacia-table">
                            <thead>
                                <tr>
                                    <th style={{ padding: '0.5rem 1rem' }}>Data</th>
                                    <th style={{ padding: '0.5rem 1rem' }}>Tipo</th>
                                    <th style={{ padding: '0.5rem 1rem' }}>Medicamento</th>
                                    <th style={{ padding: '0.5rem 1rem' }}>Responsável</th>
                                    <th style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Qtd</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const highestEntry = Math.max(...movRecentes.filter(m => m.tipo === 'Entrada').map(m => m.quantidade));
                                    const highestExit = Math.min(...movRecentes.filter(m => m.tipo === 'Saída').map(m => m.quantidade));
                                    
                                    return movRecentes.slice(0, 4).map(mov => {
                                        const isHighestEntry = mov.tipo === 'Entrada' && mov.quantidade === highestEntry;
                                        const isHighestExit = mov.tipo === 'Saída' && mov.quantidade === highestExit;
                                        const isHighlight = isHighestEntry || isHighestExit;
                                        
                                        return (
                                            <tr key={mov.id} style={{ 
                                                cursor: 'default', 
                                                transition: 'background 0.15s',
                                                backgroundColor: isHighlight ? 'var(--bg-muted)' : 'transparent'
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = isHighlight ? 'var(--bg-muted)' : 'var(--bg-muted-light)'}
                                                onMouseLeave={e => e.currentTarget.style.background = isHighlight ? 'var(--bg-muted)' : 'transparent'}>
                                                <td className="farmacia-td-muted" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                    {new Date(mov.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '0.5rem 1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span className={`farmacia-badge badge-tipo badge-tipo-${mov.tipo.toLowerCase()}`}
                                                            style={{ fontSize: '0.7rem', padding: '0.12rem 0.4rem' }}>
                                                            {mov.tipo}
                                                        </span>
                                                        {isHighlight && (
                                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Maior</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="farmacia-td-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.84rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isHighlight ? 700 : 500 }}>
                                                    {mov.medicamento}
                                                </td>
                                                <td style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{mov.responsavel}</td>
                                                <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: mov.quantidade > 0 ? '#00967D' : '#ea580c' }}>
                                                    {mov.quantidade > 0 ? '+' : ''}{mov.quantidade}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FarmaciaDashboard;
