import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    LabelList
} from 'recharts';

// ── Cores das séries ──────────────────────────────────────────────────────────
const COR_INICIADAS  = '#2563eb';
const COR_CONCLUIDAS = '#10b981';
const COR_NAO_INIC   = '#7c3aed';

// ── Tick SVG customizado: ano em negrito + período abaixo ─────────────────────
const CustomXTick = ({ x, y, payload }) => {
    const value = payload?.value || '';
    const semMatch = value.match(/^(\d{4})\/S(\d)$/);
    let linha1 = value;
    let linha2 = '';
    if (semMatch) {
        linha1 = semMatch[1];
        linha2 = semMatch[2] === '1' ? '1º Sem' : '2º Sem';
    } else if (/^\d{4}$/.test(value)) {
        linha1 = value;
        linha2 = 'Ano';
    }
    return (
        <g transform={`translate(${x},${y})`}>
            <text textAnchor="middle">
                <tspan x={0} dy="6" fontSize="10" fontWeight="700" fill="#334155">{linha1}</tspan>
                <tspan x={0} dy="14" fontSize="9" fontWeight="400" fill="#94a3b8">{linha2}</tspan>
            </text>
        </g>
    );
};

// ── Tooltip customizado ───────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const periodoFormatado = (() => {
            const semMatch = label && label.match(/^(\d{4})\/S(\d)$/);
            if (semMatch) {
                const sem = semMatch[2] === '1' ? '1º Semestre' : '2º Semestre';
                return `${semMatch[1]} / ${sem}`;
            }
            return label;
        })();
        return (
            <div style={{
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
                padding: '12px 16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)', minWidth: '260px'
            }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '8px' }}>
                    Período: {periodoFormatado}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {payload.map((entry, index) => (
                        <div key={`ti-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color, display: 'inline-block' }} />
                                <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>{entry.name}</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

// ── Linha do painel lateral ───────────────────────────────────────────────────
const StatRow = ({ label, value, pct, color, divider }) => (
    <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 500, lineHeight: 1.5 }}>{label}</span>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</div>
                {pct !== undefined && (
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color, lineHeight: 1.3 }}>({pct}%)</div>
                )}
            </div>
        </div>
        {divider && <div style={{ height: '1px', background: '#f1f5f9' }} />}
    </>
);

// ── Componente principal ──────────────────────────────────────────────────────
const ExecucaoChart = ({ data: execucao }) => {
    if (!execucao || execucao.length === 0) {
        return (
            <div className="dashboard-card animate-fade-in-up delay-100" style={{
                padding: '24px', display: 'flex', flexDirection: 'column',
                background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)', minWidth: 0, width: '100%'
            }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    Evolução dos Objetivos do Plano de Governo
                </h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'visible', maxWidth: 'none' }}>
                    Acompanhamento da situação dos objetivos ao longo do ciclo do plano
                </p>
                <div style={{ flex: 1, minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginTop: '24px' }}>
                    Nenhum objetivo encontrado para os filtros selecionados.
                </div>
            </div>
        );
    }

    // Dados dinâmicos — todos vindos do cálculo/banco
    // total é TOTAL_OFICIAL_PLANO = 221 (definido no serviço)
    const totalObjetivos   = execucao[execucao.length - 1]?.total       ?? 0;
    const ultimo           = execucao[execucao.length - 1]              ?? {};
    const iniciados2028    = ultimo.iniciadas                            ?? 0;
    const concluidos2028   = ultimo.concluidas                          ?? 0;
    const naoIniciados2028 = ultimo.naoIniciadas                        ?? 0;
    const pct = (val) => totalObjetivos > 0 ? (val / totalObjetivos * 100).toFixed(1) : '0.0';

    return (
        <div className="dashboard-card animate-fade-in-up delay-100" style={{
            padding: '24px',
            background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)'
        }}>
            {/*
             * Layout de 2 colunas:
             * ESQUERDA: header + mini-cards + gráfico + rodapé  (flex: 1)
             * DIREITA:  painel "Situação atual (2028)"           (width: 210px)
             *
             * O painel direito começa JUNTO com o header esquerdo (topo do card),
             * eliminando o espaço vazio acima que existia antes.
             */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

                {/* ── Coluna esquerda ──────────────────────────── */}
                <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Cabeçalho */}
                    <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ margin: '0 0 3px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                            Evolução dos {totalObjetivos} Objetivos do Plano de Governo
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'visible', maxWidth: 'none' }}>
                            Acompanhamento da situação dos objetivos ao longo do ciclo do plano
                        </p>
                    </div>

                    {/* Mini-cards */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: '#f0f9ff', border: '1px solid #bae6fd',
                            borderRadius: '8px', padding: '7px 12px'
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            <div>
                                <div style={{ fontSize: '0.62rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                                    Total de objetivos do plano
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0c4a6e', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                                    {totalObjetivos}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '8px', padding: '7px 12px'
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <div>
                                <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                                    Período exibido
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', lineHeight: 1.1 }}>
                                    2024&nbsp;&nbsp; a&nbsp;&nbsp; 2028
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gráfico */}
                    <div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, marginBottom: '4px', marginLeft: '2px' }}>
                            Quantidade de objetivos
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={execucao} margin={{ top: 22, right: 20, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
									interval={0}
									minTickGap={0}
                                    tick={<CustomXTick />}
                                    height={65}
                                    tickMargin={22}
                                />
                                <YAxis
                                    width={44}tickMargin={10}
									axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                
                                <Line
                                    type="monotone" dataKey="iniciadas"
                                    name="Objetivos iniciados"
                                    stroke={COR_INICIADAS} strokeWidth={2.5}
                                    dot={{ r: 4, fill: COR_INICIADAS, strokeWidth: 2, stroke: '#ffffff' }}
                                    activeDot={{ r: 6, fill: COR_INICIADAS, strokeWidth: 2, stroke: '#ffffff' }}
                                    isAnimationActive={true} animationDuration={1200}
                                >
                                    <LabelList dataKey="iniciadas" position="top"
                                        style={{ fontSize: '9px', fontWeight: 400, fill: COR_INICIADAS }} offset={8} />
                                </Line>
                                <Line
                                    type="monotone" dataKey="concluidas"
                                    name="Objetivos concluídos"
                                    stroke={COR_CONCLUIDAS} strokeWidth={2.5}
                                    dot={{ r: 4, fill: COR_CONCLUIDAS, strokeWidth: 2, stroke: '#ffffff' }}
                                    activeDot={{ r: 6, fill: COR_CONCLUIDAS, strokeWidth: 2, stroke: '#ffffff' }}
                                    isAnimationActive={true} animationDuration={1200}
                                >
                                    <LabelList dataKey="concluidas" position="bottom"
                                        style={{ fontSize: '9px', fontWeight: 400, fill: COR_CONCLUIDAS }} offset={8} />
                                </Line>
                                <Line
                                    type="monotone" dataKey="naoIniciadas"
                                    name="Objetivos não iniciados"
                                    stroke={COR_NAO_INIC} strokeWidth={2.5}
                                    dot={{ r: 4, fill: COR_NAO_INIC, strokeWidth: 2, stroke: '#ffffff' }}
                                    activeDot={{ r: 6, fill: COR_NAO_INIC, strokeWidth: 2, stroke: '#ffffff' }}
                                    isAnimationActive={true} animationDuration={1200}
                                >
                                    <LabelList dataKey="naoIniciadas" position="top"
                                        style={{ fontSize: '9px', fontWeight: 400, fill: COR_NAO_INIC }} offset={8} />
                                </Line>
                            </LineChart>
                        </ResponsiveContainer>
						<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '-6px', fontSize: '8.8px', color: '#475569' }}>
						  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
							<span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COR_INICIADAS }} />
							<span>Objetivos iniciados</span>
						  </div>

						  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
							<span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COR_CONCLUIDAS }} />
							<span>Objetivos concluídos</span>
						  </div>

						  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
							<span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COR_NAO_INIC }} />
							<span>Objetivos não iniciados</span>
						  </div>
						</div>
                    </div>

                    {/* Rodapé */}
                    <div style={{
                        marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <span style={{ fontSize: '0.67rem', color: '#1e40af', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                            <strong style={{ fontStyle: 'normal', color: '#1e40af' }}>Importante:</strong> cada objetivo está contabilizado uma situação. A soma das situações é sempre igual a {totalObjetivos}.
                        </span>
                    </div>
                </div>

                {/* ── Painel lateral — alinhado com os mini-cards superiores ── */}
                <div style={{
                    width: '230px', flexShrink: 0,
                    background: '#ffffff', border: '1px solid #e2e8f0',
                    borderRadius: '12px', padding: '16px 14px',
                    display: 'flex', flexDirection: 'column',
                    marginTop: '68px'
                }}>
                    <div style={{
                        fontSize: '0.85rem', fontWeight: 700, color: '#0f172a',
                        paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', marginBottom: '2px'
                    }}>
                        Situação atual (2028)
                    </div>

                    <StatRow label="Objetivos iniciados"     value={iniciados2028}    pct={pct(iniciados2028)}    color={COR_INICIADAS}  divider={true} />
                    <StatRow label="Objetivos concluídos"    value={concluidos2028}   pct={pct(concluidos2028)}   color={COR_CONCLUIDAS} divider={true} />
                    <StatRow label="Objetivos não iniciados" value={naoIniciados2028} pct={pct(naoIniciados2028)} color={COR_NAO_INIC}   divider={true} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0 12px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#334155', fontWeight: 700 }}>Total de objetivos do plano</span>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{totalObjetivos}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>(100%)</div>
                        </div>
                    </div>

                    <div style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: '8px', padding: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e40af' }}>Importante</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: '#1e40af', lineHeight: 1.5 }}>
                            A soma das situações considera o total oficial de {totalObjetivos} objetivos do Plano de Governo.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecucaoChart;
