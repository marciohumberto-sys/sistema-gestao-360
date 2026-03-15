import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Package, PackagePlus, PackageMinus, AlertTriangle, ArrowLeftRight,
    ChevronRight, Bell, XCircle, Clock, TrendingUp, Activity, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockFarmaciaKPIs, mockMovimentacoes, mockEstoqueItems } from '../../mocks/farmaciaMocks';
import {
    LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
    Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, Area, AreaChart, Legend
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
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto' }}>
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

const FarmaciaDashboard = () => {
    const navigate = useNavigate();
    const [alertaAberto, setAlertaAberto] = useState(false);
    const alertaRef = useRef(null);
    const movRecentes = mockMovimentacoes.slice(0, 5);

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

    const kpiCards = [
        { label: 'Total de Itens',  value: mockFarmaciaKPIs.totalItens,  desc: 'medicamentos cadastrados', icon: Package,      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        { label: 'Entradas Hoje',   value: mockFarmaciaKPIs.entradasHoje, desc: 'movimentação registrada', icon: PackagePlus,   color: '#00967D', bg: 'rgba(0,150,125,0.1)' },
        { label: 'Saídas Hoje',     value: mockFarmaciaKPIs.saidasHoje,   desc: 'dispensação realizada',   icon: PackageMinus,  color: '#ea580c', bg: 'rgba(234,88,12,0.1)' },
        { label: 'Itens Críticos',  value: mockFarmaciaKPIs.itensCriticos,desc: 'estoque baixo ou zerado', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: '#ef4444' },
    ];

    return (
        <div className="farmacia-page-container">
            {/* Keyframe da animação do painel flutuante */}
            <style>{`
                @keyframes alertaPainelEntrar {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
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
                            <Bell size={14} strokeWidth={2.5} />
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
                                boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
                                padding: '1rem',
                                animation: 'alertaPainelEntrar 0.18s ease both',
                            }}>
                                {/* Cabeçalho do painel */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                    <Bell size={14} color="#dc2626" strokeWidth={2.5} />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Atenção Operacional</span>
                                </div>

                                {/* Alertas por nível */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {itensSemEstoque > 0 && (
                                        <button onClick={() => { navigate('/farmacia/estoque'); setAlertaAberto(false); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', textAlign: 'left', transition: 'background 0.15s', width: '100%' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <XCircle size={14} color="#dc2626" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#dc2626' }}>{itensSemEstoque} item{itensSemEstoque > 1 ? 's' : ''} sem estoque</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>Nível crítico — clique para ver</div>
                                            </div>
                                        </button>
                                    )}
                                    {itensAbaixoMinimo > 0 && (
                                        <button onClick={() => { navigate('/farmacia/estoque'); setAlertaAberto(false); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.06)', textAlign: 'left', transition: 'background 0.15s', width: '100%' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <AlertTriangle size={14} color="#b45309" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#b45309' }}>{itensAbaixoMinimo} item{itensAbaixoMinimo > 1 ? 's' : ''} abaixo do mínimo</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>Atenção — reabastecimento recomendado</div>
                                            </div>
                                        </button>
                                    )}
                                    {itensVencendo > 0 && (
                                        <button onClick={() => { navigate('/farmacia/relatorios'); setAlertaAberto(false); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.06)', textAlign: 'left', transition: 'background 0.15s', width: '100%' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Clock size={14} color="#1d4ed8" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1d4ed8' }}>{itensVencendo} item{itensVencendo > 1 ? 's' : ''} com validade próxima</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>Monitoramento — clique para relatório</div>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* ── 2) Hero Chart – Fluxo Últimos 7 Dias (logo acima da dobra) ── */}
            <div className="dashboard-chart-surface" style={{ padding: '1.5rem 1.5rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
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
                    </div>
                </div>
                <div style={{ width: '100%', height: 320 }}>
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
                            <Area type="monotone" dataKey="Entradas" stroke="#00967D" strokeWidth={3} fill="url(#gradEntradas)" dot={{ r: 4, fill: '#00967D', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#00967D' }} animationDuration={1000} />
                            <Area type="monotone" dataKey="Saídas"   stroke="#ea580c" strokeWidth={3} fill="url(#gradSaidas)"   dot={{ r: 4, fill: '#ea580c', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#ea580c' }} animationDuration={1000} animationBegin={200} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── 3) KPI Cards + Gauge Saúde ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                {kpiCards.map((k, i) => (
                    <div key={i} className="farmacia-kpi-card dashboard-chart-surface" style={{ borderLeft: `4px solid ${k.border || k.color}`, gap: '0.2rem', padding: '0.75rem 1rem 0.65rem' }}>
                        <span className="farmacia-kpi-label">{k.label}</span>
                        <span className="farmacia-kpi-value" style={{ color: k.color }}>
                            <AnimatedCount target={k.value} />
                        </span>
                        <span className="farmacia-kpi-desc">{k.desc}</span>
                        <div className="farmacia-kpi-icon" style={{ backgroundColor: k.bg, color: k.color }}>
                            <k.icon size={16} />
                        </div>
                    </div>
                ))}

                {/* Gauge Saúde */}
                <div className="farmacia-kpi-card dashboard-chart-surface" style={{ borderLeft: `4px solid ${saudeCor}`, gap: '0.2rem', padding: '0.75rem 1rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <span className="farmacia-kpi-label" style={{ marginBottom: '0.5rem' }}>Saúde do Estoque</span>
                    <GaugeCircular pct={saudePercentual} cor={saudeCor} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: saudeCor, marginTop: '4px' }}>{saudeLabel}</span>
                </div>
            </div>

            {/* ── 4) Análise Operacional: Donut + Barras Setor ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
                <Activity size={17} style={{ color: 'var(--color-secondary)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Análise Operacional</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>

                {/* Donut Distribuição — refinado */}
                <div className="dashboard-chart-surface">
                    <h3 className="farmacia-title-small">Distribuição do Estoque</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.75rem' }}>
                        {/* Donut com espessura maior (innerRadius 50, outerRadius 78 = 28px de espessura) */}
                        <div style={{ width: 170, height: 170, flexShrink: 0 }}>
                            <ResponsiveContainer width={170} height={170}>
                                <PieChart>
                                    <Pie
                                        data={mockDistribuicao}
                                        innerRadius={50} outerRadius={78}
                                        paddingAngle={3} dataKey="value"
                                        stroke="none" startAngle={90} endAngle={-270}
                                        animationDuration={800}
                                    >
                                        {mockDistribuicao.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.82rem' }}
                                        formatter={(value, name) => [`${Math.round((value / totalDistrib) * 100)}%`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Legenda com melhor alinhamento e espaçamento */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                            {mockDistribuicao.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: item.color, flexShrink: 0 }} />
                                    <span style={{ color: 'var(--text)', fontWeight: 500, flex: 1, fontSize: '0.84rem' }}>{item.name}</span>
                                    <span style={{ color: item.color, fontWeight: 700, fontSize: '0.84rem' }}>
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
                            // Trilho com contraste maior para realçar a barra ativa
                            const trilhoColor = i === 0 ? 'rgba(0,150,125,0.15)' : 'rgba(46,134,171,0.12)';
                            return (
                                <div key={i}>
                                    {/* Nome da unidade — destaque máximo */}
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: '4px' }}>
                                        {u.name}
                                    </div>
                                    {/* Barra proporcional — mais espessa e com contraste */}
                                    <div style={{ height: '16px', background: trilhoColor, borderRadius: '8px', overflow: 'hidden', marginBottom: '6px' }}>
                                        <div style={{ height: '100%', width: `${barW}%`, background: barColor, borderRadius: '8px', transition: 'width 0.9s ease' }} />
                                    </div>
                                    {/* Valor e percentual — hierarquia clara */}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: barColor }}>
                                            {u.consumo.toLocaleString('pt-BR')} un
                                        </span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                                            ({pct}% do total)
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
            <div className="dashboard-chart-surface">
                <h3 className="farmacia-title-small" style={{ marginBottom: '1.25rem' }}>Medicamentos Mais Movimentados</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {topMedicamentos.map((m, i) => (
                        <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}>
                                <span style={{ color: 'var(--text)' }}>
                                    <span style={{ display: 'inline-block', width: '18px', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}.</span>
                                    {m.nome}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>{m.qtd.toLocaleString('pt-BR')} un</span>
                            </div>
                            <div style={{ height: '8px', background: 'var(--bg-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(m.qtd / m.max) * 100}%`, background: rankColors[i], borderRadius: '4px', transition: 'width 0.8s ease' }} />
                            </div>
                        </div>
                    ))}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', fontWeight: 600, marginBottom: '6px' }}>
                                <span style={{ color: v.cor }}>{v.label} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({v.sub})</span></span>
                                <span style={{ color: 'var(--text)' }}>{v.qtd} itens</span>
                            </div>
                            <div style={{ height: '8px', background: v.bg, borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${v.pct}%`, background: v.cor, borderRadius: '4px', transition: 'width 1s ease' }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Movimentações Recentes */}
                <div className="farmacia-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="farmacia-title-small">Movimentações Recentes</h3>
                        <button className="farmacia-link-action" onClick={() => navigate('/farmacia/movimentacoes')} style={{ fontSize: '0.83rem' }}>
                            Ver todas <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="farmacia-table-wrapper" style={{ border: 'none', flex: 1, borderRadius: 0 }}>
                        <table className="farmacia-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Tipo</th>
                                    <th>Medicamento</th>
                                    <th>Responsável</th>
                                    <th style={{ textAlign: 'right' }}>Qtd</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movRecentes.map(mov => (
                                    <tr key={mov.id} style={{ cursor: 'default', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted-light)'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td className="farmacia-td-muted" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                            {new Date(mov.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                        </td>
                                        <td>
                                            <span className={`farmacia-badge badge-tipo badge-tipo-${mov.tipo.toLowerCase()}`}
                                                style={{ fontSize: '0.7rem', padding: '0.12rem 0.4rem' }}>
                                                {mov.tipo}
                                            </span>
                                        </td>
                                        <td className="farmacia-td-primary" style={{ fontSize: '0.84rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {mov.medicamento}
                                        </td>
                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{mov.responsavel}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: mov.quantidade > 0 ? '#00967D' : '#ea580c' }}>
                                            {mov.quantidade > 0 ? '+' : ''}{mov.quantidade}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FarmaciaDashboard;
