import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    FileText,
    DollarSign,
    FileBadge,
    AlertCircle,
    Clock,
    CheckCircle2,
    Search,
    Plus,
    FilePlus,
    ChevronRight,
    AlertTriangle,
    Bell,
    Maximize2,
    ShieldAlert
} from 'lucide-react';
import { contractsService } from '../services/api/contracts.service';
import './Dashboard.css';

const AnimatedCounter = ({ value, isFloat = false, prefix = '', suffix = '', duration = 300 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Ease-out quad
            const easeOut = percentage * (2 - percentage);
            const currentVal = easeOut * value;

            setCount(currentVal);

            if (percentage < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(value);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return (
        <>{prefix}{isFloat ? count.toFixed(1) : Math.floor(count)}{suffix}</>
    );
};

const Dashboard = () => {
    const [metrics, setMetrics] = useState({
        totalContracts: 0,
        expiringContracts: 0,
        expiredContracts: 0,
        totalValueSum: 0,
        balanceValueSum: 0,
        ofsThisMonth: 0,
        ofsChangePercentage: 0,
        pendingNfs: 0,
        nfsExpiringThisWeek: 0
    });
    const [queueContracts, setQueueContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadMetrics = async () => {
            try {
                const [data, contractsList] = await Promise.all([
                    contractsService.getDashboardMetrics(),
                    contractsService.list()
                ]);
                if (isMounted) {
                    setMetrics(data);
                    // Get 5 expiring or recently expired 
                    const priorityContracts = contractsList
                        .sort((a, b) => new Date(a.dateRange.endDate).getTime() - new Date(b.dateRange.endDate).getTime())
                        .slice(0, 5);
                    setQueueContracts(priorityContracts);
                }
            } catch (error) {
                console.error("Failed to load dashboard metrics", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadMetrics();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Dashboard</h1>
                    <p className="dashboard-subtitle">Visão executiva e operacional em tempo real.</p>
                </div>
            </header>

            {/* SEÇÃO 1: Alertas (Risco) */}
            <div className="dashboard-alerts">
                <div className="alerts-label">
                    <Bell size={16} />
                    <span>Atenção Sugerida:</span>
                </div>
                <div className="alerts-chips">
                    <button className="alert-chip warning">
                        <AlertTriangle size={14} />
                        12 Contratos vencendo (30 dias)
                    </button>
                    <button className="alert-chip danger">
                        <AlertCircle size={14} />
                        3 Empenhos sem saldo
                    </button>
                    <button className="alert-chip info">
                        <AlertCircle size={14} />
                        Saúde excedeu 85% da cota
                    </button>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* SEÇÃO 2: KPIs Executivos (4 Cards - 3 colunas cada) */}
                <div className="metric-card col-span-3">
                    <div className="metric-watermark">
                        <FileBadge size={140} strokeWidth={1.5} />
                    </div>
                    <div className="metric-header">
                        <span className="metric-title">Contratos Ativos</span>
                        <div className="metric-icon-wrapper briefcase-icon">
                            <FileBadge size={16} strokeWidth={2} />
                        </div>
                    </div>
                    <div className="metric-value">
                        {!isLoading && <AnimatedCounter value={metrics.totalContracts || 0} />}
                    </div>
                    <div className="metric-footer positive">
                        <TrendingUp size={16} />
                        <span>+3 neste mês</span>
                    </div>
                </div>

                <div className="metric-card col-span-3">
                    <div className="metric-watermark">
                        <DollarSign size={140} strokeWidth={1.5} />
                    </div>
                    <div className="metric-header">
                        <span className="metric-title">Saldo de Contratos</span>
                        <div className="metric-icon-wrapper dollar-icon">
                            <DollarSign size={16} strokeWidth={2} />
                        </div>
                    </div>
                    <div className="metric-value">
                        {!isLoading && <AnimatedCounter prefix="R$ " value={(metrics.balanceValueSum || 0) / 1000000} isFloat={true} suffix="M" />}
                    </div>
                    <div className="metric-footer neutral">
                        <span>Comprometido: {metrics.totalValueSum ? Math.round(((metrics.totalValueSum - metrics.balanceValueSum) / metrics.totalValueSum) * 100) : 0}%</span>
                    </div>
                </div>

                <div className="metric-card col-span-3">
                    <div className="metric-watermark">
                        <FileText size={140} strokeWidth={1.5} />
                    </div>
                    <div className="metric-header">
                        <span className="metric-title">OFs no Mês</span>
                        <div className="metric-icon-wrapper of-icon">
                            <FileText size={16} strokeWidth={2} />
                        </div>
                    </div>
                    <div className="metric-value">
                        {!isLoading && <AnimatedCounter value={metrics.ofsThisMonth} />}
                    </div>
                    <div className="metric-footer positive">
                        <TrendingUp size={16} />
                        <span>+{metrics.ofsChangePercentage}% vs mês anterior</span>
                    </div>
                </div>

                <div className="metric-card col-span-3">
                    <div className="metric-watermark">
                        <Clock size={140} strokeWidth={1.5} />
                    </div>
                    <div className="metric-header">
                        <span className="metric-title">NFs Pendentes</span>
                        <div className="metric-icon-wrapper nf-icon">
                            <Clock size={16} strokeWidth={2} />
                        </div>
                    </div>
                    <div className="metric-value">
                        {!isLoading && <AnimatedCounter value={metrics.pendingNfs} />}
                    </div>
                    <div className="metric-footer negative">
                        <AlertCircle size={16} />
                        <span>{metrics.nfsExpiringThisWeek} vencem esta semana</span>
                    </div>
                </div>

                {/* SEÇÃO 3: Bloco Operacional (2 Cards - 6 colunas cada) */}

                {/* 3A: Ações Rápidas & Consultas (Unificado Prompt 9.0) */}
                <div className="col-span-6 operational-stack">

                    {/* Card 1: Comando Central */}
                    <div className="dashboard-card quick-actions-card">
                        <h2 className="card-title qa-title">Ações Rápidas & Consultas</h2>
                        <div className="search-box">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Consultar contrato / fornecedor / item..."
                                className="search-input"
                            />
                            <span className="search-kbd">⌘K</span>
                        </div>

                        <div className="action-buttons-grid">
                            <button className="action-btn-large primary primary-cta">
                                <div className="action-btn-icon solid-primary">
                                    <Plus size={28} strokeWidth={2.5} />
                                </div>
                                <div className="action-btn-text">
                                    <h3>Nova OF</h3>
                                    <p>Emitir Ordem</p>
                                </div>
                                <ChevronRight size={20} className="action-btn-chevron" />
                            </button>

                            <button className="action-btn-large secondary secondary-cta">
                                <div className="action-btn-icon solid-secondary">
                                    <FilePlus size={24} strokeWidth={2.5} />
                                </div>
                                <div className="action-btn-text">
                                    <h3>Registrar NF</h3>
                                    <p>Fiscalização</p>
                                </div>
                                <ChevronRight size={18} className="action-btn-chevron" />
                            </button>
                        </div>
                    </div>

                    {/* Card 3: Resumo do Dia (Prompt 8.0) */}
                    <div className="dashboard-card summary-card">
                        <h2 className="card-title qa-title" style={{ marginBottom: '0.75rem' }}>Resumo do Dia</h2>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <div className="summary-item-header">
                                    <FileText size={16} className="summary-icon" />
                                </div>
                                <span className="summary-number">12</span>
                                <span className="summary-label">OFs emitidas</span>
                            </div>

                            <div className="summary-divider"></div>

                            <div className="summary-item">
                                <div className="summary-item-header">
                                    <CheckCircle2 size={16} className="summary-icon success" />
                                </div>
                                <span className="summary-number">7</span>
                                <span className="summary-label">NFs registradas</span>
                            </div>

                            <div className="summary-divider"></div>

                            <div className="summary-item">
                                <div className="summary-item-header">
                                    <ShieldAlert size={16} className="summary-icon alert" />
                                </div>
                                <span className="summary-number">3</span>
                                <span className="summary-label">Pendências</span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* 3B: Fila do Dia */}
                < div className="dashboard-card col-span-6 queue-card" >
                    <div className="card-header-flex">
                        <h2 className="card-title">Fila do Dia (Prioridades)</h2>
                        <button className="link-action">Ver todas</button>
                    </div>

                    <div className="queue-list">
                        {isLoading ? (
                            <p style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Carregando fila...</p>
                        ) : (
                            queueContracts.map(contract => {
                                // Map status to UI classes
                                let statusClass = 'pending'; // Default
                                if (contract.status === 'VENCENDO') statusClass = 'warning';
                                if (contract.status === 'VENCIDO') statusClass = 'danger';
                                if (contract.status === 'ATIVO') statusClass = 'success';
                                if (contract.status === 'SUSPENSO' || contract.status === 'CANCELADO') statusClass = 'danger';

                                return (
                                    <div key={contract.id} className={`queue-item ${statusClass}`}>
                                        <div className="queue-status-indicator"></div>
                                        <div className="queue-content">
                                            <h4 title={contract.title}>{contract.number} - {contract.title.substring(0, 24)}{contract.title.length > 24 ? '...' : ''}</h4>
                                            <p>{contract.supplierName} ({contract.status})</p>
                                        </div>
                                        <button className="queue-action">
                                            {contract.status === 'VENCIDO' ? 'Urgente' : 'Analisar'}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div >

                {/* SEÇÃO 4: Gráficos (2 Cards - 6 colunas cada) */}
                < div className="dashboard-card col-span-6" >
                    <div className="card-header-flex">
                        <h2 className="card-title">Consumo por Secretaria</h2>
                        <button className="icon-action"><Maximize2 size={16} /></button>
                    </div>
                    <div className="chart-placeholder">
                        <BarChart2Placeholder />
                        <p>Visualização gráfica de execução orçamentária por pasta.</p>
                    </div>
                </div >

                <div className="dashboard-card col-span-6">
                    <div className="card-header-flex">
                        <h2 className="card-title">Emissão de OFs por Mês</h2>
                        <button className="icon-action"><Maximize2 size={16} /></button>
                    </div>
                    <div className="chart-placeholder">
                        <LineChartPlaceholder />
                        <p>Volume mensal de faturamento e obrigações.</p>
                    </div>
                </div>

            </div >
        </div >
    );
};

// Componentes estéticos para mockup de gráficos
const BarChart2Placeholder = () => (
    <div className="mock-chart bar">
        <div className="bar-col" style={{ height: '40%' }}></div>
        <div className="bar-col" style={{ height: '70%' }}></div>
        <div className="bar-col" style={{ height: '100%', backgroundColor: 'var(--color-primary)' }}></div>
        <div className="bar-col" style={{ height: '50%' }}></div>
        <div className="bar-col" style={{ height: '30%' }}></div>
        <div className="bar-col" style={{ height: '80%' }}></div>
    </div>
);

const LineChartPlaceholder = () => (
    <div className="mock-chart line">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100px' }}>
            <path d="M0,30 Q20,10 40,25 T80,15 T100,5" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx="0" cy="30" r="3" fill="var(--color-secondary)" />
            <circle cx="40" cy="25" r="3" fill="var(--color-secondary)" />
            <circle cx="80" cy="15" r="3" fill="var(--color-secondary)" />
            <circle cx="100" cy="5" r="3" fill="var(--color-secondary)" />
        </svg>
    </div>
);

export default Dashboard;
