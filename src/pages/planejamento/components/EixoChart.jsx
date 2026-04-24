import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#9f7aea', '#64748b'];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="custom-recharts-tooltip" style={{ borderLeft: `4px solid ${data.payload.fill}` }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{data.name}</span>
                <div style={{ marginTop: '4px', color: data.payload.fill, fontWeight: 700 }}>
                    {data.value}% <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>do total</span>
                </div>
            </div>
        );
    }
    return null;
};

const EixoChart = ({ data: distribuicaoEixos }) => {
    if (!distribuicaoEixos || distribuicaoEixos.length === 0) {
        return (
            <div className="dashboard-card animate-fade-in-up delay-200" style={{ height: '100%' }}>
                <h2 className="card-title">Distribuição por Eixo</h2>
                <div style={{ flex: 1, width: '100%', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Nenhuma ação cadastrada por eixo.
                </div>
            </div>
        );
    }

    const total = distribuicaoEixos.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="dashboard-card animate-fade-in-up delay-200" style={{ height: '100%' }}>
            <h2 className="card-title">Distribuição por Eixo</h2>
            <div style={{ width: '100%', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={distribuicaoEixos}
                            cx="50%"
                            cy="50%"
                            innerRadius={85}
                            outerRadius={120}
                            paddingAngle={3}
                            dataKey="value"
                            isAnimationActive={true}
                            animationBegin={300}
                            animationDuration={1500}
                        >
                            {distribuicaoEixos.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '2rem', fontWeight: 800, fill: '#0f172a' }}>
                            {total}
                        </text>
                        <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '0.85rem', fontWeight: 600, fill: '#64748b' }}>
                            Total de Ações
                        </text>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EixoChart;
