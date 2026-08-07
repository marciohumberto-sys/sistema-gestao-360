import React from 'react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Legend 
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                minWidth: '220px'
            }}>
                <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '6px',
                    marginBottom: '8px'
                }}>
                    Período: {label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {payload.map((entry, index) => (
                        <div key={`tooltip-item-${index}`} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: entry.color,
                                    display: 'inline-block'
                                }}></span>
                                <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
                                    {entry.name}
                                </span>
                            </div>
                            <span style={{
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: '#0f172a',
                                fontVariantNumeric: 'tabular-nums'
                            }}>
                                {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const ExecucaoChart = ({ data: execucao }) => {
    if (!execucao || execucao.length === 0) {
        return (
            <div className="dashboard-card animate-fade-in-up delay-100" style={{ 
                height: '400px', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                background: '#ffffff', 
                border: '1px solid rgba(0,0,0,0.06)', 
                boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)' 
            }}>
                <div style={{ marginBottom: '16px' }}>
                    <h2 className="card-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                        Evolução Acumulada do Plano
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>
                        Avanço acumulado das ações durante o ciclo do plano
                    </p>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Nenhuma ação encontrada para os filtros selecionados.
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card animate-fade-in-up delay-100" style={{ 
            height: '400px', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff', 
            border: '1px solid rgba(0,0,0,0.06)', 
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)' 
        }}>
            <div style={{ marginBottom: '16px' }}>
                <h2 className="card-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    Evolução Acumulada do Plano
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>
                    Avanço acumulado das ações durante o ciclo do plano
                </p>
            </div>
            <div style={{ flex: 1, width: '100%', minHeight: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                        data={execucao} 
                        margin={{ top: 15, right: 20, left: -20, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            allowDecimals={false}
                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                        />
                        <Tooltip 
                            content={<CustomTooltip />} 
                            cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} 
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={30} 
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '12px', color: '#475569', paddingTop: '8px' }} 
                        />
                        <Line 
                            type="monotone" 
                            dataKey="iniciadas" 
                            name="Iniciadas acumuladas" 
                            stroke="#2563eb" 
                            strokeWidth={2.5} 
                            dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                            isAnimationActive={true}
                            animationDuration={1200}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="concluidas" 
                            name="Concluídas acumuladas" 
                            stroke="#10b981" 
                            strokeWidth={2.5} 
                            dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                            isAnimationActive={true}
                            animationDuration={1200}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="naoIniciadas" 
                            name="Não iniciadas restantes" 
                            stroke="#94a3b8" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                            dot={{ r: 3.5, fill: '#94a3b8', strokeWidth: 1.5, stroke: '#ffffff' }}
                            activeDot={{ r: 5.5, fill: '#94a3b8', strokeWidth: 2, stroke: '#ffffff' }}
                            isAnimationActive={true}
                            animationDuration={1200}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ExecucaoChart;
