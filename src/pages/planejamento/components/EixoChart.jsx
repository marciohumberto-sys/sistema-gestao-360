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
    const sortedEixos = [...distribuicaoEixos].sort((a, b) => b.value - a.value);
    const top2Value = (sortedEixos[0]?.value || 0) + (sortedEixos[1]?.value || 0);
    const top2Percent = total > 0 ? Math.round((top2Value / total) * 100) : 0;

    return (
        <div className="dashboard-card animate-fade-in-up delay-200" style={{ 
            height: '100%', 
            minHeight: '400px',
            padding: '24px',
            display: 'flex', 
            flexDirection: 'column',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)', 
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)' 
        }}>
            <h2
		  className="card-title" style={{ margin: 0, marginBottom: '4px', marginTop: 0, fontSize: '1.08rem', fontWeight: 800, lineHeight: 1.15, color: '#0f172a' }}
			>
			  Distribuição de Ações por Eixo do Plano
			</h2>

			<p
			  style={{ margin: 0, marginTop: '-22px', marginBottom: '8px', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.25 }}
			>
			  Ações vinculadas por eixo estratégico.
			</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, justifyContent: 'space-between', gap: '12px' }}>
			  <div style={{ flex: '1 1 auto', minHeight: '310px', marginTop: '-40px', marginBottom: '-20px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center'
			  }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={distribuicaoEixos}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={'56%'}
                                outerRadius={'82%'}
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
                            <text x="50%" y="43%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '2.2rem', fontWeight: 800, fill: '#0f172a' }}>
                                {total}
                            </text>
                            <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '0.85rem', fontWeight: 600, fill: '#64748b' }}>
                                Total de Ações
                            </text>
                            <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '0.75rem', fontWeight: 500, fill: '#94a3b8' }}>
                                {distribuicaoEixos.length} eixos
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* ── Box de Insight ── */}
                <div style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: '8px', padding: '12px', marginTop: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>Insight</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#1e40af', lineHeight: 1.5 }}>
                        2 eixos concentram {top2Value} ações, equivalente a {top2Percent}% do total.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EixoChart;
