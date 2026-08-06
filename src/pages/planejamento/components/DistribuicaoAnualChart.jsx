import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, CheckCircle2, Clock, Hourglass, Target, Zap } from 'lucide-react';

const STATUS_COLORS = {
    'Em Andamento': '#3b82f6',
    'Concluídas acumuladas': '#10b981',
    'Concluídas': '#10b981',
    'Não Iniciadas': '#94a3b8'
};

const CustomTooltip = ({ active, payload, total }) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        const val = item.value || 0;
        const percent = total > 0 ? ((val / total) * 100).toFixed(1).replace('.', ',') : '0,0';

        return (
            <div style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '6px 10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                pointerEvents: 'none',
                userSelect: 'none',
                minWidth: '120px',
                maxWidth: '160px',
                zIndex: 1000
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <div style={{ width: '8px', height: '8px', minWidth: '8px', borderRadius: '50%', backgroundColor: item.payload.fill }}></div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {val} {val === 1 ? 'ação' : 'ações'}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.payload.fill, fontVariantNumeric: 'tabular-nums' }}>
                        {percent}%
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

const DistribuicaoAnualChart = ({
    selectedYear,
    onSelectYear,
    availableYears = [2024, 2025, 2026, 2027, 2028],
    metrics = {
        total: 0,
        emAndamento: 0,
        concluidas: 0,
        naoIniciadas: 0,
        previstasTermino: 0,
        iniciadasNoAno: 0
    }
}) => {
    const {
        total = 0,
        emAndamento = 0,
        concluidas = 0,
        naoIniciadas = 0,
        previstasTermino = 0,
        iniciadasNoAno = 0
    } = metrics;

    const chartData = [
        { name: 'Em Andamento', value: emAndamento, fill: STATUS_COLORS['Em Andamento'] },
        { name: 'Concluídas acumuladas', value: concluidas, fill: STATUS_COLORS['Concluídas acumuladas'] },
        { name: 'Não Iniciadas', value: naoIniciadas, fill: STATUS_COLORS['Não Iniciadas'] }
    ].filter(d => d.value > 0);

    const calcPercent = (val) => {
        if (!total || total === 0) return '0%';
        return `${((val / total) * 100).toFixed(1).replace('.', ',')}%`;
    };

    return (
        <div className="pe-panel pe-distribuicao-anual-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header com Seletor de Ano */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                    <h3 className="pe-section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                        Distribuição Anual de Ações
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                        Situação acumulada das ações até <strong>{selectedYear}</strong>
                    </p>
                </div>

                {/* Seletor de Pílulas de Ano */}
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                    {availableYears.map(yr => (
                        <button
                            key={yr}
                            type="button"
                            onClick={() => onSelectYear && onSelectYear(yr)}
                            style={{
                                border: 'none',
                                background: selectedYear === yr ? '#ffffff' : 'transparent',
                                color: selectedYear === yr ? '#0f766e' : '#64748b',
                                fontWeight: selectedYear === yr ? 700 : 500,
                                fontSize: '0.8rem',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                boxShadow: selectedYear === yr ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {yr}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conteúdo Principal: Gráfico e Indicadores */}
            {total === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '2rem' }}>
                    Nenhuma ação registrada para o ano {selectedYear}.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '1rem' }}>
                    {/* Gráfico Donut */}
                    <div style={{ position: 'relative', width: '100%', height: '190px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={52}
                                    outerRadius={78}
                                    paddingAngle={3}
                                    isAnimationActive={true}
                                    animationDuration={800}
                                    labelLine={false}
                                    label={false}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    content={<CustomTooltip total={total} />} 
                                    wrapperStyle={{ pointerEvents: 'none', zIndex: 1000, outline: 'none' }}
                                    offset={12}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Centro do Donut */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            zIndex: 1
                        }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                                {total}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Ações
                            </span>
                        </div>
                    </div>

                    {/* Legenda dos 3 Status Excludentes */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '0 4px' }}>
                        <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '8px 10px', borderLeft: `3px solid ${STATUS_COLORS['Em Andamento']}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e40af', fontSize: '0.72rem', fontWeight: 600 }}>
                                <Clock size={12} /> Em Andamento
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e3a8a' }}>{emAndamento}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3b82f6' }}>{calcPercent(emAndamento)}</span>
                            </div>
                        </div>

                        <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '8px 10px', borderLeft: `3px solid ${STATUS_COLORS['Concluídas acumuladas']}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontSize: '0.72rem', fontWeight: 600 }}>
                                <CheckCircle2 size={12} /> Concluídas acumuladas
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#14532d' }}>{concluidas}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#16a34a' }}>{calcPercent(concluidas)}</span>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 10px', borderLeft: `3px solid ${STATUS_COLORS['Não Iniciadas']}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontSize: '0.72rem', fontWeight: 600 }}>
                                <Hourglass size={12} /> Não Iniciadas
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155' }}>{naoIniciadas}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>{calcPercent(naoIniciadas)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Indicadores Complementares Baseados em Prazos (Cards Separados sem duplicar o Donut) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                        {/* Previstas para Término */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: '#fffbeb',
                            border: '1px solid #fef3c7',
                            borderRadius: '8px',
                            padding: '8px 12px'
                        }}>
                            <div style={{ background: '#fde68a', color: '#b45309', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                                <Target size={16} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Previsão Término ({selectedYear})
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#78350f', lineHeight: 1.1 }}>
                                    {previstasTermino} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#b45309' }}>ações com prazo</span>
                                </div>
                            </div>
                        </div>

                        {/* Novas Ações Iniciadas */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: '#f5f3ff',
                            border: '1px solid #ede9fe',
                            borderRadius: '8px',
                            padding: '8px 12px'
                        }}>
                            <div style={{ background: '#ddd6fe', color: '#6d28d9', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                                <Zap size={16} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '0.72rem', color: '#5b21b6', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Início no Ano ({selectedYear})
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4c1d95', lineHeight: 1.1 }}>
                                    {iniciadasNoAno} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6d28d9' }}>novas ações</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DistribuicaoAnualChart;
