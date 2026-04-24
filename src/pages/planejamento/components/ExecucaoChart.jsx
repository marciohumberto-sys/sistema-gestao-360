import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-recharts-tooltip">
                <p className="custom-recharts-tooltip-title">{label}</p>
                {payload.map((entry, index) => (
                    <p key={`item-${index}`} style={{ color: entry.color, margin: 0, padding: '2px 0' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: entry.color, borderRadius: '50%', marginRight: '6px' }}></span>
                        {entry.name}: <strong style={{ marginLeft: '4px' }}>{entry.value}</strong>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const ExecucaoChart = ({ data: execucao }) => {
    if (!execucao || execucao.length === 0) {
        return (
            <div className="dashboard-card animate-fade-in-up delay-100" style={{ height: '100%' }}>
                <h2 className="card-title">Evolução da Execução</h2>
                <div style={{ flex: 1, width: '100%', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Nenhuma atualização registrada.
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card animate-fade-in-up delay-100" style={{ height: '100%' }}>
            <h2 className="card-title">Evolução da Execução</h2>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={execucao} margin={{ top: 0, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
                        <defs>
                            <linearGradient id="gradNaoIniciadas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#64748b" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#475569" stopOpacity={1}/>
                            </linearGradient>
                            <linearGradient id="gradEmAndamento" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a78bfa" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#c4b5fd" stopOpacity={1}/>
                            </linearGradient>
                            <linearGradient id="gradConcluidas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#34d399" stopOpacity={1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} />
                        <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '10px' }} />
                        <Bar dataKey="NaoIniciadas" name="Não Iniciadas" stackId="a" fill="url(#gradNaoIniciadas)" isAnimationActive={true} animationBegin={0} animationDuration={1500} animationEasing="ease-out" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="EmAndamento" name="Em Andamento" stackId="a" fill="url(#gradEmAndamento)" isAnimationActive={true} animationBegin={200} animationDuration={1500} animationEasing="ease-out" />
                        <Bar dataKey="Concluidas" name="Concluídas" stackId="a" fill="url(#gradConcluidas)" isAnimationActive={true} animationBegin={400} animationDuration={1500} animationEasing="ease-out" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ExecucaoChart;
