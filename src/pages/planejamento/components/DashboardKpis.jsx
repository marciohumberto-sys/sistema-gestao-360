import React from 'react';
import { Target, TrendingUp, CheckCircle, Clock, AlertTriangle, AlertOctagon } from 'lucide-react';

const DashboardKpis = ({ data: kpis }) => {
    if (!kpis) return null;

    const cards = [
        { label: 'Total de Ações', value: kpis.totalAcoes, icon: Target, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        { label: 'Em Andamento', value: kpis.emAndamento, icon: TrendingUp, color: '#9f7aea', bg: 'rgba(159, 122, 234, 0.12)' },
        { label: 'Concluídas', value: kpis.concluidas, icon: CheckCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        { label: 'Ações em Risco', value: kpis.emRisco, icon: AlertTriangle, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.08)' }
    ];

    return (
        <div className="kpi-grid">
            {cards.map((card, index) => (
                <div key={index} className={`kpi-card animate-fade-in-up delay-${(index % 3) * 100}`} style={{ borderLeft: `4px solid ${card.color}` }}>
                    <div className="kpi-header">
                        <div className="kpi-icon-wrapper" style={{ backgroundColor: card.bg, color: card.color }}>
                            <card.icon size={26} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="kpi-value">{card.value}</div>
                    <div className="kpi-label">{card.label}</div>
                </div>
            ))}
        </div>
    );
};

export default DashboardKpis;
