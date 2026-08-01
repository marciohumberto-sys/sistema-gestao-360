import React, { useState, useEffect } from 'react';
import { 
    Users, 
    TestTubes, 
    ClipboardCheck, 
    CheckSquare, 
    Activity, 
    BarChart3, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    TrendingUp,
    RefreshCw
} from 'lucide-react';
import { laboratorioDashboardService } from '../../services/laboratorioDashboard.service';
import './LaboratorioDashboard.css';

const SECTOR_COLORS = [
    '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b', '#3b82f6', '#ef4444'
];

const LaboratorioDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [data, setData] = useState({
        cards: {
            pacientesHoje: 0,
            examesHoje: 0,
            aguardandoConferencia: 0,
            examesLiberadosHoje: 0,
            taxaLiberacaoHoje: 0
        },
        producaoPorSetor: []
    });

    const loadData = async () => {
        try {
            setLoading(true);
            setError(false);
            const res = await laboratorioDashboardService.fetchLaboratorioDashboardData();
            setData(res);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (error) {
        return (
            <div className="lab-dashboard-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                <AlertCircle size={48} color="#ef4444" />
                <h3 style={{ color: '#0f172a', margin: 0 }}>Não foi possível carregar os dados da Dashboard.</h3>
                <button 
                    onClick={loadData}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                    <RefreshCw size={16} /> Tentar novamente
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="lab-dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <header className="lab-header">
                    <div>
                        <h1 className="lab-title">Dashboard — Laboratório</h1>
                        <p className="lab-subtitle">Visão geral da operação e fluxo de exames</p>
                    </div>
                </header>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: '#64748b' }}>
                    Carregando indicadores...
                </div>
            </div>
        );
    }

    const { cards, producaoPorSetor, statusExames } = data;

    const kpis = [
        { label: 'Pacientes do dia', value: cards.pacientesHoje, icon: Users, color: '#0ea5e9', trendText: 'Hoje' },
        { label: 'Exames hoje', value: cards.examesHoje, icon: TestTubes, color: '#8b5cf6', trendText: 'Hoje' },
        { label: 'Aguardando conferência', value: cards.aguardandoConferencia, icon: CheckSquare, color: '#f59e0b', trendText: 'Pendência atual' },
        { label: 'Exames liberados hoje', value: cards.examesLiberadosHoje, icon: ClipboardCheck, color: '#10b981', trendText: 'Hoje' },
        { label: 'Taxa de liberação', value: `${cards.taxaLiberacaoHoje}%`, icon: Activity, color: '#ec4899', trendText: 'dos exames solicitados hoje' },
    ];

    const indicadoresOp = [
        { label: 'Tempo médio de coleta', val: 'Não disponível', icon: Clock, color: '#0ea5e9' },
        { label: 'Tempo médio de liberação', val: 'Não disponível', icon: CheckCircle2, color: '#10b981' },
        { label: 'Exames urgentes pendentes', val: '—', icon: AlertCircle, color: '#ef4444' },
        { label: 'Amostras rejeitadas hoje', val: 'Não disponível', icon: Activity, color: '#f59e0b' },
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
                                <div className="lab-kpi-trend" style={{ background: 'transparent' }}>
                                    {/* Comparativo numérico fictício removido */}
                                </div>
                            </div>
                            <div className="lab-kpi-content">
                                <h2 className="lab-kpi-value">{kpi.value}</h2>
                                <span className="lab-kpi-label">{kpi.label}</span>
                                <span className="lab-kpi-trend-text" style={{ color: '#64748b' }}>{kpi.trendText}</span>
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
                    </div>
                    <div className="lab-sectors-list">
                        {producaoPorSetor.length === 0 ? (
                            <div className="lab-empty-state">
                                Nenhum exame registrado hoje.
                            </div>
                        ) : (
                            producaoPorSetor.map((setor, idx) => {
                                const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
                                return (
                                    <div key={idx} className="lab-sector-item">
                                        <div className="lab-sector-info">
                                            <span className="lab-sector-name">{setor.nome}</span>
                                            <span className="lab-sector-value">{setor.quantidade} <small>exames ({setor.percentual}%)</small></span>
                                        </div>
                                        <div className="lab-sector-progress-bg">
                                            <div className="lab-sector-progress-fill" style={{ width: `${setor.percentual}%`, backgroundColor: color }}></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
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
                        {!statusExames || statusExames.length === 0 || cards.examesHoje === 0 ? (
                            <div className="lab-empty-state">
                                Nenhum exame registrado hoje.
                            </div>
                        ) : (
                            statusExames.map((status, idx) => (
                                <div key={idx} className={`lab-status-item ${status.alert ? 'alert' : ''}`}>
                                    <div className="lab-status-info">
                                        <div className="lab-status-label-group">
                                            <span className="lab-status-dot" style={{ backgroundColor: status.color, boxShadow: `0 0 0 3px ${status.color}20` }}></span>
                                            <span className="lab-status-label">{status.label}</span>
                                        </div>
                                        <span className="lab-status-count">{status.quantidade}</span>
                                    </div>
                                    <div className="lab-status-progress-bg">
                                        <div className="lab-status-progress-fill" style={{ width: `${status.percentual}%`, backgroundColor: status.color }}></div>
                                    </div>
                                </div>
                            ))
                        )}
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
                    <div className="lab-empty-state">
                        <span style={{ fontSize: '15px', fontWeight: 500, color: '#334155' }}>Nenhuma atividade consolidada disponível.</span>
                        <span style={{ fontSize: '13px', marginTop: '8px' }}>O histórico operacional será integrado em uma próxima etapa.</span>
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
                                        <span className="lab-indicador-val" style={{ fontSize: ind.val === '—' ? '24px' : '15px', color: ind.val === 'Não disponível' ? '#94a3b8' : '#1e293b' }}>{ind.val}</span>
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

