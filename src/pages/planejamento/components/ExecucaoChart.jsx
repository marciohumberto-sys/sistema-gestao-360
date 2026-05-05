import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        // Inverte a ordem para mostrar Concluídas no topo (seguindo a pilha visual)
        const sortedPayload = [...payload].reverse();

        const getCategoryColor = (name) => {
            if (name === 'Concluídas') return '#10b981'; // verde
            if (name === 'Em Andamento') return '#8b5cf6'; // roxo
            return '#475569'; // Não Iniciadas (cinza mais escuro para contraste)
        };

        return (
            <div className="custom-recharts-tooltip" style={{ 
                background: '#f8fafc', 
                border: '1px solid rgba(0, 0, 0, 0.05)',
                borderRadius: '16px',
                padding: '26px 28px',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)',
                minWidth: '260px',
                animation: 'tooltipIn 0.15s cubic-bezier(0.2, 0, 0, 1) forwards'
            }}>
                <style>{`
                    @keyframes tooltipIn {
                        from { opacity: 0; transform: translateY(6px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
                <p style={{ 
                    margin: '0', 
                    fontSize: '1.15rem', 
                    fontWeight: 700, 
                    color: '#1f2937',
                    textTransform: 'capitalize',
                    letterSpacing: '-0.01em'
                }}>
                    {label}
                </p>
                <div style={{ 
                    height: '1px', 
                    background: '#d1d5db', 
                    margin: '24px 0' 
                }}></div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {sortedPayload.map((entry, index) => {
                        const dotColor = getCategoryColor(entry.name);
                        const isZero = entry.value === 0;
                        
                        return (
                            <div key={`item-${index}`} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                gap: '24px',
                                opacity: isZero ? 0.55 : 1,
                                transition: 'opacity 0.2s ease'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ 
                                        width: '12px', 
                                        height: '12px', 
                                        backgroundColor: isZero ? '#d1d5db' : dotColor, 
                                        borderRadius: '50%',
                                        boxShadow: isZero ? 'none' : `0 0 12px ${dotColor}66`
                                    }}></div>
                                    <span style={{ 
                                        fontSize: '0.8rem', 
                                        fontWeight: 500, 
                                        color: isZero ? '#9ca3af' : '#6b7280' 
                                    }}>
                                        {entry.name}
                                    </span>
                                </div>
                                <span style={{ 
                                    fontSize: '1.45rem', 
                                    fontWeight: 700, 
                                    color: isZero ? '#9ca3af' : dotColor, 
                                    fontVariantNumeric: 'tabular-nums',
                                    lineHeight: 1
                                }}>
                                    {entry.value}
                                </span>
                            </div>
                        );
                    })}
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
                height: '100%', 
                background: '#ffffff', 
                border: '1px solid rgba(0,0,0,0.06)', 
                boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)' 
            }}>
                <h2 className="card-title">Evolução da Execução</h2>
                <div style={{ flex: 1, width: '100%', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Nenhuma atualização registrada.
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card animate-fade-in-up delay-100" style={{ 
            height: '100%', 
            background: '#ffffff', 
            border: '1px solid rgba(0,0,0,0.06)', 
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)' 
        }}>
            <h2 className="card-title">Evolução da Execução</h2>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={execucao} margin={{ top: 0, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
                        <defs>
                            <linearGradient id="gradNaoIniciadas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#94a3b8" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#64748b" stopOpacity={1}/>
                            </linearGradient>
                            <linearGradient id="gradEmAndamento" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a78bfa" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1}/>
                            </linearGradient>
                            <linearGradient id="gradConcluidas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#10b981" stopOpacity={1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} />
                        <Tooltip 
                            content={<CustomTooltip />} 
                            cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} 
                            isAnimationActive={true}
                            animationDuration={200}
                        />
                        <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '10px' }} />
                        <Bar dataKey="NaoIniciadas" name="Não Iniciadas" stackId="a" fill="url(#gradNaoIniciadas)" isAnimationActive={true} animationBegin={0} animationDuration={1500} animationEasing="ease-out" radius={[0, 0, 4, 4]} activeBar={{ filter: 'brightness(1.05)' }} />
                        <Bar dataKey="EmAndamento" name="Em Andamento" stackId="a" fill="url(#gradEmAndamento)" isAnimationActive={true} animationBegin={200} animationDuration={1500} animationEasing="ease-out" activeBar={{ filter: 'brightness(1.05)' }} />
                        <Bar dataKey="Concluidas" name="Concluídas" stackId="a" fill="url(#gradConcluidas)" isAnimationActive={true} animationBegin={400} animationDuration={1500} animationEasing="ease-out" radius={[4, 4, 0, 0]} activeBar={{ filter: 'brightness(1.05)' }} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ExecucaoChart;
