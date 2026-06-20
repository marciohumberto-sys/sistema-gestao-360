import React from 'react';
import { 
    Users, 
    TestTubes, 
    ClipboardCheck, 
    CheckSquare, 
    Activity, 
    BarChart3, 
    Microscope, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    FileText,
    TrendingUp,
    ArrowRight
} from 'lucide-react';
import './LaboratorioDashboard.css';

const LaboratorioDashboard = () => {
    // Dados Mockados enriquecidos para visualização premium
    const kpis = [
        { label: 'Pacientes do dia', value: '128', icon: Users, color: '#0ea5e9', trend: '+12%', trendText: 'vs. ontem' },
        { label: 'Exames hoje', value: '256', icon: TestTubes, color: '#8b5cf6', trend: '+8%', trendText: 'vs. ontem' },
        { label: 'Aguardando conferência', value: '64', icon: CheckSquare, color: '#f59e0b', trend: '-3', trendText: 'últimas 2h' },
        { label: 'Laudos liberados', value: '192', icon: ClipboardCheck, color: '#10b981', trend: '+24', trendText: 'últimas 2h' },
        { label: 'Taxa de liberação', value: '94%', icon: Activity, color: '#ec4899', trend: '+2.5%', trendText: 'vs. média mensal' },
    ];

    const setores = [
        { name: 'Bioquímica', value: '86', percent: 45, color: '#0ea5e9' },
        { name: 'Hematologia', value: '64', percent: 30, color: '#8b5cf6' },
        { name: 'Urinálise', value: '42', percent: 15, color: '#10b981' },
        { name: 'Sorologia', value: '38', percent: 12, color: '#f59e0b' },
        { name: 'Fezes', value: '18', percent: 5, color: '#ec4899' },
        { name: 'Diversos', value: '8', percent: 2, color: '#64748b' },
    ];

    const statusExames = [
        { label: 'Em atendimento', count: '12', percent: 10, color: '#3b82f6' },
        { label: 'Aguardando coleta', count: '28', percent: 20, color: '#f59e0b' },
        { label: 'Resultado digitado', count: '45', percent: 35, color: '#8b5cf6' },
        { label: 'Aguardando conferência', count: '64', percent: 50, color: '#ef4444', alert: true },
        { label: 'Liberado', count: '82', percent: 65, color: '#10b981' },
        { label: 'Entregues ao paciente', count: '25', percent: 20, color: '#64748b' },
    ];

    const atividadesRecentes = [
        { title: 'Lote de Bioquímica finalizado', desc: 'Processamento automático via interface', time: 'Há 5 minutos', icon: Microscope, color: '#0ea5e9' },
        { title: 'Laudo urgente liberado', desc: 'Paciente: João Silva - Leito 402', time: 'Há 12 minutos', icon: FileText, color: '#ef4444' },
        { title: 'Equipamento Hematologia recalibrado', desc: 'Manutenção diária concluída', time: 'Há 45 minutos', icon: Activity, color: '#10b981' },
        { title: '14 coletas recebidas da triagem', desc: 'Lote #4928 recebido no setor', time: 'Há 1 hora', icon: TestTubes, color: '#8b5cf6' },
    ];

    const indicadoresOp = [
        { label: 'Tempo médio de coleta', val: '04m 12s', icon: Clock, color: '#0ea5e9' },
        { label: 'Tempo médio de liberação', val: '02h 45m', icon: CheckCircle2, color: '#10b981' },
        { label: 'Exames urgentes pendentes', val: '3', icon: AlertCircle, color: '#ef4444' },
        { label: 'Amostras rejeitadas hoje', val: '1', icon: Activity, color: '#f59e0b' },
    ];

    return (
        <div className="lab-dashboard-container">
            <header className="lab-header">
                <div>
                    <h1 className="lab-title">Dashboard — Laboratório</h1>
                    <p className="lab-subtitle">Visão geral da operação e fluxo de exames</p>
                </div>
            </header>

            {/* KPIs Superiores */}
            <div className="lab-kpis-grid">
                {kpis.map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={idx} className="lab-kpi-card" style={{ borderTop: `4px solid ${kpi.color}` }}>
                            <div className="lab-kpi-header">
                                <div className="lab-kpi-icon-wrapper" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                                    <Icon size={22} strokeWidth={2.5} />
                                </div>
                                <div className="lab-kpi-trend">
                                    <TrendingUp size={14} color={kpi.color} />
                                    <span style={{ color: kpi.color, fontWeight: 700 }}>{kpi.trend}</span>
                                </div>
                            </div>
                            <div className="lab-kpi-content">
                                <h2 className="lab-kpi-value">{kpi.value}</h2>
                                <span className="lab-kpi-label">{kpi.label}</span>
                                <span className="lab-kpi-trend-text">{kpi.trendText}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Middle Section */}
            <div className="lab-sections-grid">
                
                {/* Produção por Setor */}
                <div className="lab-panel lab-panel-producao">
                    <div className="lab-panel-header">
                        <h3 className="lab-panel-title">
                            <BarChart3 size={20} color="#0ea5e9" />
                            Produção por Setor
                        </h3>
                        <button className="lab-panel-action">Ver detalhes <ArrowRight size={14} /></button>
                    </div>
                    <div className="lab-sectors-list">
                        {setores.map((setor, idx) => (
                            <div key={idx} className="lab-sector-item">
                                <div className="lab-sector-info">
                                    <span className="lab-sector-name">{setor.name}</span>
                                    <span className="lab-sector-value">{setor.value} <small>exames ({setor.percent}%)</small></span>
                                </div>
                                <div className="lab-sector-progress-bg">
                                    <div className="lab-sector-progress-fill" style={{ width: `${setor.percent}%`, backgroundColor: setor.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status dos Exames */}
                <div className="lab-panel">
                    <div className="lab-panel-header">
                        <h3 className="lab-panel-title">
                            <Clock size={20} color="#f59e0b" />
                            Status dos Exames
                        </h3>
                    </div>
                    <div className="lab-status-list">
                        {statusExames.map((status, idx) => (
                            <div key={idx} className={`lab-status-item ${status.alert ? 'alert' : ''}`}>
                                <div className="lab-status-info">
                                    <div className="lab-status-label-group">
                                        <span className="lab-status-dot" style={{ backgroundColor: status.color, boxShadow: `0 0 0 3px ${status.color}20` }}></span>
                                        <span className="lab-status-label">{status.label}</span>
                                    </div>
                                    <span className="lab-status-count">{status.count}</span>
                                </div>
                                <div className="lab-status-progress-bg">
                                    <div className="lab-status-progress-fill" style={{ width: `${status.percent}%`, backgroundColor: status.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Bottom Section */}
            <div className="lab-secondary-grid">
                
                {/* Atividades Recentes (Timeline) */}
                <div className="lab-panel">
                    <div className="lab-panel-header">
                        <h3 className="lab-panel-title">
                            <Activity size={20} color="#8b5cf6" />
                            Atividades Recentes
                        </h3>
                    </div>
                    <div className="lab-timeline">
                        {atividadesRecentes.map((ativ, idx) => {
                            const Icon = ativ.icon;
                            return (
                                <div key={idx} className="lab-timeline-item">
                                    <div className="lab-timeline-icon" style={{ backgroundColor: `${ativ.color}15`, color: ativ.color }}>
                                        <Icon size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="lab-timeline-content">
                                        <div className="lab-timeline-header">
                                            <span className="lab-timeline-title">{ativ.title}</span>
                                            <span className="lab-timeline-time">{ativ.time}</span>
                                        </div>
                                        <span className="lab-timeline-desc">{ativ.desc}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Indicadores Operacionais */}
                <div className="lab-panel lab-panel-indicadores">
                    <div className="lab-panel-header">
                        <h3 className="lab-panel-title">
                            <CheckCircle2 size={20} color="#10b981" />
                            Indicadores Operacionais
                        </h3>
                    </div>
                    <div className="lab-indicadores-grid">
                        {indicadoresOp.map((ind, idx) => {
                            const Icon = ind.icon;
                            return (
                                <div key={idx} className="lab-indicador-card">
                                    <div className="lab-indicador-icon" style={{ backgroundColor: `${ind.color}10`, color: ind.color }}>
                                        <Icon size={24} strokeWidth={2} />
                                    </div>
                                    <div className="lab-indicador-info">
                                        <span className="lab-indicador-val">{ind.val}</span>
                                        <span className="lab-indicador-label">{ind.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

        </div>
    );
};

export default LaboratorioDashboard;
