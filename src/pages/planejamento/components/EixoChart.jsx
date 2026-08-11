import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#9f7aea', '#64748b'];

const CustomTooltip = ({ active, payload, total }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const percent = total > 0 ? ((data.value / total) * 100).toFixed(1).replace('.', ',') : '0,0';
        return (
            <div className="custom-recharts-tooltip" style={{ 
                borderLeft: `4px solid ${data.payload.fill}`,
                background: '#ffffff',
                padding: '12px 16px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                borderRadius: '8px'
            }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{data.name}</div>
                <div style={{ color: data.payload.fill, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{data.value} ações</span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>({percent}%)</span>
                </div>
            </div>
        );
    }
    return null;
};



const EixoChart = ({ data: distribuicaoEixos }) => {
    if (!distribuicaoEixos || distribuicaoEixos.length === 0) {
        return (
            <div className="dashboard-card animate-fade-in-up delay-200" style={{ 
                height: '400px', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                background: '#ffffff', 
                border: '1px solid rgba(0,0,0,0.06)', 
                boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)' 
            }}>
                <h2 className="card-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Distribuição de Ações por Eixo do Plano</h2>
                <div style={{ flex: 1, width: '100%', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Nenhuma ação cadastrada por eixo.
                </div>
            </div>
        );
    }

    const total = distribuicaoEixos.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="dashboard-card animate-fade-in-up delay-200" style={{ 
            height: '400px', 
            padding: '24px',
            display: 'flex', 
            flexDirection: 'column',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)', 
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)' 
        }}>
            <h2 className="card-title" style={{ marginBottom: '16px', marginTop: 0, fontSize: '0.9rem' }}>Distribuição de Ações por Eixo do Plano</h2>
            
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <Pie
                                data={distribuicaoEixos}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={105}
                                paddingAngle={2}
                                isAnimationActive={true}
                                animationBegin={300}
                                animationDuration={1500}
                                labelLine={false}
                                label={false}
                            >
                                {distribuicaoEixos.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip total={total} />} />
                            <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '2rem', fontWeight: 800, fill: '#0f172a' }}>
                                {total}
                            </text>
                            <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '0.85rem', fontWeight: 600, fill: '#64748b' }}>
                                Total de Ações
                            </text>
                            <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '0.75rem', fontWeight: 500, fill: '#94a3b8' }}>
                                {distribuicaoEixos.length} eixos
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default EixoChart;
