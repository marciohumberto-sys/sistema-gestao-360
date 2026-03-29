import React, { useState, useEffect, useRef } from 'react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell, 
    LabelList 
} from 'recharts';
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
    ShieldAlert,
    ShieldCheck,
    Activity,
    Sparkles,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { contractsService } from '../services/api/contracts.service';
import { ofsService } from '../services/api/ofs.service';
import { useTenant } from '../context/TenantContext';
import './Dashboard.css';

const useScrollReveal = (threshold = 0.3, delay = 1000) => {
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const elementRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (entry.isIntersecting && !shouldAnimate) {
                setTimeout(() => {
                    setShouldAnimate(true);
                }, delay);
                // Uma vez disparado, desconecta para economizar recursos e não repetir
                if (elementRef.current) {
                    observer.unobserve(elementRef.current);
                }
            }
        }, { threshold });

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => {
            if (elementRef.current) {
                observer.unobserve(elementRef.current);
            }
        };
    }, [threshold, delay, shouldAnimate]);

    return [elementRef, shouldAnimate];
};

const AnimatedCounter = ({ value, isFloat = false, decimals = 1, prefix = '', suffix = '', duration = 1000 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            const easeOut = 1 - Math.pow(1 - percentage, 3);
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
        <span className="animated-counter">
            {prefix}{isFloat ? count.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : Math.floor(count).toLocaleString('pt-BR')}{suffix}
        </span>
    );
};

const PendenciesDrawer = ({ isOpen, onClose, contracts, metrics, navigate }) => {
    // Categorização robusta baseada no estado atual
    const categories = [
        {
            id: 'critical',
            title: '🔴 CRÍTICAS',
            items: [
                ...(contracts || []).filter(c => c.status === 'VENCIDO' || c.isPending).map(c => ({
                    id: `crit-${c.id}`,
                    title: `Contrato ${c.number} ${c.status === 'VENCIDO' ? 'Vencido' : 'Pendente'}`,
                    description: `${c.supplierName} • ${c.isPending ? (c.pendingIssues?.join(', ') || 'Pendências de documentação') : 'Contrato expirado'}`,
                    onAction: () => { onClose(); navigate(`/compras/contratos/${c.id}`); }
                }))
            ]
        },
        {
            id: 'warning',
            title: '🟠 ATENÇÃO',
            items: [
                ...(contracts || []).filter(c => c.status === 'VENCENDO').map(c => ({
                    id: `warn-${c.id}`,
                    title: `Contrato ${c.number} próximo do vencimento`,
                    description: `${c.supplierName} • Expira em menos de 30 dias.`,
                    onAction: () => { onClose(); navigate(`/compras/contratos/${c.id}`); }
                })),
                ...(metrics.nfsExpiringThisWeek > 0 ? [{
                    id: 'warn-nfs-week',
                    title: `${metrics.nfsExpiringThisWeek} NFs vencem esta semana`,
                    description: 'Risco de juros e multas por atraso de pagamento.',
                    onAction: () => { onClose(); navigate('/compras/notas-fiscais'); }
                }] : [])
            ]
        },
        {
            id: 'operational',
            title: '🔵 OPERACIONAIS',
            items: [
                ...(metrics.pendingNfs > 0 ? [{
                    id: 'op-nfs-pending',
                    title: `${metrics.pendingNfs} Notas Fiscais pendentes`,
                    description: 'NFs aguardando conferência ou liquidação.',
                    onAction: () => { onClose(); navigate('/compras/notas-fiscais'); }
                }] : []),
                {
                    id: 'op-ofs-draft',
                    title: 'OFs em Rascunho',
                    description: 'Existem ordens de fornecimento aguardando emissão final.',
                    onAction: () => { onClose(); navigate('/compras/ordens-fornecimento?status=DRAFT'); }
                }
            ]
        }
    ];

    const hasAnyPendency = categories.some(cat => cat.items.length > 0);

    return (
        <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className="drawer-content" onClick={e => e.stopPropagation()}>
                <header className="drawer-header">
                    <div className="drawer-header-title">
                        <h2>Pendências do Sistema</h2>
                        <p>Itens que exigem atenção</p>
                    </div>
                    <button className="drawer-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="drawer-body">
                    {hasAnyPendency ? (
                        categories.map(category => (
                            category.items.length > 0 && (
                                <section key={category.id} className={`pendency-section ${category.id}`}>
                                    <div className="pendency-section-header">
                                        <h3>{category.title}</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {category.items.map(item => (
                                            <div key={item.id} className="pendency-card">
                                                <div className="pendency-card-header">
                                                    <h4>{item.title}</h4>
                                                    <p>{item.description}</p>
                                                </div>
                                                <button className="pendency-action-btn" onClick={item.onAction}>
                                                    Analisar
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )
                        ))
                    ) : (
                        <div className="drawer-empty-state">
                            <Sparkles size={48} strokeWidth={1} />
                            <p>Nenhuma pendência encontrada no momento.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { tenantId } = useTenant();
    const [metrics, setMetrics] = useState({
        totalContracts: 0,
        expiringContracts: 0,
        expiredContracts: 0,
        totalValueSum: 0,
        balanceValueSum: 0,
        ofsThisMonth: 0,
        ofsChangePercentage: 0,
        pendingNfs: 0,
        nfsExpiringThisWeek: 0,
        totalPendingContracts: 0
    });
    const [queueContracts, setQueueContracts] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [secretariatData, setSecretariatData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        if (!tenantId) return;

        async function testContracts() {
            try {
                const data = await contractsService.list(tenantId);
                setContracts(data);
            } catch (error) {
                console.error("Error fetching contracts:", error);
            }
        }

        testContracts();
    }, [tenantId]);

    useEffect(() => {
        let isMounted = true;

        const loadMetrics = async () => {
            if (!tenantId) return;
            try {
                const [data, contractsList, secData] = await Promise.all([
                    contractsService.getDashboardMetrics(tenantId),
                    contractsService.list(tenantId),
                    ofsService.getConsumptionBySecretariat(tenantId)
                ]);

                if (isMounted) {
                    setMetrics(data);
                    setSecretariatData(secData);
                    // Get 5 expiring or recently expired 
                    const priorityContracts = (contractsList || [])
                        .sort((a, b) => {
                            const getScore = (c) => {
                                if (c.isPending) return 1;
                                if (c.status === 'VENCENDO') return 2;
                                return 3;
                            };

                            const scoreA = getScore(a);
                            const scoreB = getScore(b);

                            if (scoreA !== scoreB) return scoreA - scoreB;

                            const dateA = a.dateRange?.endDate ? new Date(a.dateRange.endDate).getTime() : 1e15;
                            const dateB = b.dateRange?.endDate ? new Date(b.dateRange.endDate).getTime() : 1e15;
                            return dateA - dateB;
                        })
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
    }, [tenantId]);

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
                <div className="alerts-label" style={{ color: '#EF4444' }}>
                    <Bell size={16} color="#EF4444" className={metrics.totalPendingContracts > 0 ? "alert-pulse-icon" : ""} />
                    <span>Atenção Sugerida:</span>
                </div>
                <div className="alerts-chips">
                    {metrics.expiringContracts > 0 && (
                        <div className="alert-group">
                            <button className="alert-chip warning">
                                <AlertTriangle size={14} />
                                {metrics.expiringContracts} Contratos vencendo (30 dias)
                            </button>
                            <span className="alert-action-hint">→ Revisar prazos</span>
                        </div>
                    )}
                    {metrics.totalPendingContracts > 0 && (
                        <div className="alert-group">
                            <button
                                className="alert-chip danger"
                                onClick={() => navigate('/compras/contratos?pending=1')}
                            >
                                <AlertCircle size={14} />
                                {metrics.totalPendingContracts} Contratos com pendência
                            </button>
                            <span className="alert-action-hint">→ Regularizar itens</span>
                        </div>
                    )}
                    <div className="alert-group">
                        <button className="alert-chip info">
                            <AlertCircle size={14} />
                            Saúde excedeu 85% da cota
                        </button>
                        <span className="alert-action-hint">→ Avaliar contratos de saúde</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* SEÇÃO 2: KPIs Executivos Premium */}
                <div className="metric-card col-span-3 animate-fade-in-up status-stable">
                    <div className="metric-header">
                        <span className="metric-title">Contratos Ativos</span>
                        <div className="metric-icon-wrapper">
                            <FileBadge size={16} />
                        </div>
                    </div>
                    <div className="metric-value">
                        {!isLoading && <AnimatedCounter value={contracts.length} />}
                    </div>
                    <div className="metric-footer positive">
                        <TrendingUp size={14} />
                        <span>+3 neste mês</span>
                    </div>
                </div>

                <div className="metric-card col-span-3 animate-fade-in-up delay-100 status-reliable">
                    <div className="metric-header">
                        <span className="metric-title">Saldo de Contratos</span>
                        <div className="metric-icon-wrapper">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div className="metric-body">
                        <div className="metric-value">
                            {!isLoading && (
                                <AnimatedCounter 
                                    prefix="R$ " 
                                    value={(metrics.balanceValueSum || 0) >= 1000000 ? (metrics.balanceValueSum || 0) / 1000000 : (metrics.balanceValueSum || 0)} 
                                    isFloat={true} 
                                    decimals={(metrics.balanceValueSum || 0) >= 1000000 ? 1 : 0}
                                    suffix={(metrics.balanceValueSum || 0) >= 1000000 ? "M" : ""} 
                                />
                            )}
                        </div>
                        <div className="metric-context">
                            de R$ {Math.floor(metrics.totalValueSum || 0).toLocaleString('pt-BR')}
                        </div>
                        <div className="metric-progress-container">
                            <div className="metric-progress-bar">
                                <div 
                                    className={`metric-progress-fill ${
                                        (metrics.comprometidoPercent || 0) < 50 ? 'status-low' : 
                                        (metrics.comprometidoPercent || 0) <= 80 ? 'status-medium' : 'status-high'
                                    }`}
                                    style={{ width: `${Math.min(100, metrics.comprometidoPercent || 0)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    <div className="metric-footer neutral">
                        <span>Execução: {Math.round(metrics.comprometidoPercent || 0)}%</span>
                    </div>
                </div>

                <div className="metric-card col-span-3 animate-fade-in-up delay-200 status-growth">
                    <div className="metric-header">
                        <span className="metric-title">OFs no Mês</span>
                        <div className="metric-icon-wrapper">
                            <FileText size={16} />
                        </div>
                    </div>
                    <div className="metric-value">
                        {!isLoading && <AnimatedCounter value={metrics.ofsThisMonth || 0} />}
                    </div>
                    <div className="metric-footer positive">
                        <TrendingUp size={14} />
                        <span>+{metrics.ofsChangePercentage}% vs anterior</span>
                    </div>
                </div>

                <div className="metric-card col-span-3 animate-fade-in-up delay-300 status-attention">
                    <div className="metric-header">
                        <span className="metric-title">NFs Pendentes</span>
                        <div className="metric-icon-wrapper">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="metric-value">
                        {!isLoading && <AnimatedCounter value={metrics.pendingNfs || 0} />}
                    </div>
                    <div className="metric-footer danger">
                        <AlertCircle size={14} />
                        <span>{metrics.nfsExpiringThisWeek || 0} vencem esta semana</span>
                    </div>
                </div>

                {/* 2. SITUAÇÃO DOS CONTRATOS (MINI-CARDS) */}
                <div className="col-span-12 situation-block-container animate-fade-in-up">
                    <div className="situation-block" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '0' }}>
                        <div className="situation-mini-card">
                            <div className="situation-icon" style={{ backgroundColor: 'rgba(0, 150, 125, 0.1)', color: 'var(--color-primary)' }}>
                                <ShieldCheck size={18} />
                            </div>
                            <div className="situation-info">
                                <h4>Atuais</h4>
                                <span>{contracts.filter(c => c.status === 'ATIVO').length}</span>
                            </div>
                        </div>
                        <div className="situation-mini-card">
                            <div className="situation-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                                <Clock size={18} />
                            </div>
                            <div className="situation-info">
                                <h4>Próximos do Vencimento</h4>
                                <span>{metrics.expiringContracts}</span>
                            </div>
                        </div>
                        <div className="situation-mini-card">
                            <div className="situation-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                                <AlertTriangle size={18} />
                            </div>
                            <div className="situation-info">
                                <h4>Críticos / Pendentes</h4>
                                <span>{metrics.totalPendingContracts + metrics.expiredContracts}</span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* SEÇÃO 5: Gráficos de Suporte (Vinculados aos KPIs) */}
                <div className="dashboard-card col-span-6 animate-fade-in-up">
                    <div className="card-header-flex">
                        <div>
                            <h2 className="card-title">Consumo por Secretaria</h2>
                            {secretariatData && secretariatData.length > 0 ? (
                                <p style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 800, margin: '0' }}>
                                    • {secretariatData[0].label} concentra a maior parte do consumo atual
                                </p>
                            ) : (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0' }}>• Sem consumo registrado no momento</p>
                            )}
                        </div>
                        <button className="icon-action"><Maximize2 size={16} /></button>
                    </div>
                    <div className="chart-placeholder">
                        <BarChart2Placeholder data={secretariatData} />
                    </div>
                </div>

                <div className="dashboard-card col-span-6 animate-fade-in-up">
                    <div className="card-header-flex">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 className="card-title">Saúde da Execução Contratual</h2>
                                <span className="trend-badge positive">Saúde da Carteira</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Quantidade de contratos ativos por faixa de progresso</p>
                        </div>
                        <button className="icon-action"><Maximize2 size={16} /></button>
                    </div>
                    <div className="chart-placeholder">
                        <ExecutionBarChart contracts={contracts} />
                    </div>
                </div>

                {/* SEÇÃO 6: Centro de Comando (Fila + Insights) */}
                <div className="col-span-12 bottom-grid-container animate-fade-in-up delay-200">
                    {/* Fila do Dia (Principal) */}
                    <div className="dashboard-card queue-card" style={{ marginBottom: 0 }}>
                        <div className="card-header-flex">
                            <h2 className="card-title">Fila do Dia (Prioridades de Ação)</h2>
                            <button className="link-action" onClick={() => setIsDrawerOpen(true)}>Ver todas as pendências</button>
                        </div>

                        <div className="queue-list">
                            {isLoading ? (
                                <p style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Carregando fila...</p>
                            ) : (
                                queueContracts.map(contract => {
                                    let statusClass = 'pending';
                                    if (contract.status === 'VENCENDO') statusClass = 'warning';
                                    if (contract.status === 'VENCIDO') statusClass = 'danger';
                                    if (contract.status === 'ATIVO') statusClass = 'success';
                                    if (contract.status === 'SUSPENSO' || contract.status === 'CANCELADO') statusClass = 'danger';

                                    return (
                                        <div key={contract.id} className={`queue-item ${statusClass}`}>
                                            <div className="queue-tooltip">
                                                <span className="tooltip-title" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '0.85rem', borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                                                    {contract.title}
                                                </span>
                                            </div>
                                            <div className="queue-status-indicator"></div>
                                            <div className="queue-content">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <h4>{contract.number} - {contract.title.substring(0, 32)}{contract.title.length > 32 ? '...' : ''}</h4>
                                                    {(contract.status === 'VENCIDO' || contract.status === 'VENCENDO' || contract.isPending) && (
                                                        <AlertTriangle size={14} className="pendency-icon-pulse" />
                                                    )}
                                                </div>
                                                <p style={{ fontWeight: 500 }}>
                                                    {contract.supplierName} • <span style={{ color: 'var(--text-muted)' }}>{contract.status}</span>
                                                    {contract.isPending && <span style={{ color: '#EF4444', marginLeft: '8px' }}>• {contract.pendingIssues?.join(', ')}</span>}
                                                </p>
                                            </div>
                                            <button
                                                className="queue-action"
                                                onClick={() => navigate(`/compras/contratos/${contract.id}`)}
                                            >
                                                {contract.status === 'VENCIDO' ? 'Tratar Urgência' : 'Analisar'}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Bloco de Insights Inteligentes - Padrão Farmácia */}
                    <div className="smart-insight-card">
                        <h3>Insights de Consumo</h3>
                        <TrendingUp className="insight-watermark" size={140} />
                        
                        <div className="insight-item success">
                            <span className="insight-tag">Alta Emissão</span>
                            <span className="insight-item-title">Crescimento de <span className="insight-highlight">{metrics.ofsChangePercentage}%</span></span>
                            <p className="insight-item-desc">O volume de OFs emitidas este mês (<span className="insight-highlight">{metrics.ofsThisMonth}</span>) supera a média do último trimestre.</p>
                        </div>

                        <div className="insight-item danger">
                            <span className="insight-tag">Saldo Crítico</span>
                            <span className="insight-item-title">Esgotamento em <span className="insight-highlight">45 dias</span></span>
                            <p className="insight-item-desc">A projeção compromete o saldo de <span className="insight-highlight">R$ {((metrics.balanceValueSum || 0) / 1000000).toFixed(1)}M</span> nos contratos próximos do limite.</p>
                        </div>

                        <div className="insight-footer">
                            → Avaliar aditivos para contratos abaixo de 15%.
                        </div>
                    </div>
                </div>
            </div>
            <PendenciesDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
                contracts={contracts} 
                metrics={metrics}
                navigate={navigate}
            />
        </div>
    );
};

// Componentes analíticos reais (Visualizações Premium)
const BarChart2Placeholder = ({ data = [] }) => {
    const [containerRef, shouldAnimate] = useScrollReveal();
    const [displayWidths, setDisplayWidths] = useState([]);

    useEffect(() => {
        if (shouldAnimate) {
            // [TAREFA 1] Injetar estatísticas reais do banco transformadas pelo service
            setDisplayWidths(data.map(d => d.value));
        }
    }, [shouldAnimate, data]);

    // Identificar o valor máximo para destaque automático
    const maxValue = Math.max(...data.map(d => d.value));

    return (
        <div ref={containerRef} className="analytical-chart bar-list">
            {(data || []).length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Nenhum dado de consumo disponível.
                </div>
            )}
            {data.map((item, idx) => {
                const isMax = item.value === maxValue;
                // [TAREFA 3] Chaves únicas e estáveis usando label e index
                const stableKey = `${item.label}-${idx}`;
                
                return (
                    <div key={stableKey} className={`bar-row ${isMax ? 'bar-max' : ''}`}>
                        <div className="bar-label">
                            <span className="label-name">{item.label}</span>
                            <span 
                                className="label-percentage"
                                style={{ 
                                    opacity: shouldAnimate ? 1 : 0, 
                                    transition: `opacity 0.5s ease-out ${0.6 + (idx * 0.1)}s` 
                                }}
                            >
                                {item.value}%
                            </span>
                        </div>
                        
                        <div className="bar-area-wrapper">
                            <div className="bar-tooltip" style={{ minWidth: '220px', alignItems: 'stretch', padding: '12px 14px' }}>
                                <div className="tooltip-header" style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', whiteSpace: 'nowrap', gap: '12px' }}>
                                    <span className="tooltip-title" style={{ border: 'none', padding: 0, margin: 0, flexShrink: 0 }}>
                                        {item.label.toUpperCase()}
                                    </span>
                                    <span className="tooltip-value" style={{ flexShrink: 0, textAlign: 'right' }}>
                                        {item.total ? `R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `${item.value}%`}
                                    </span>
                                </div>
                                <p className="tooltip-desc" style={{ textAlign: 'left', margin: '6px 0 0 0', fontSize: '0.68rem', opacity: 0.7, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>
                                    {isMax ? 'Principal foco de consumo do órgão' : 'Distribuição de consumo por secretaria'}
                                </p>
                            </div>

                            <div className="bar-track">
                                <div 
                                    className="bar-fill" 
                                    style={{ 
                                        width: `${displayWidths[idx] || 0}%`, 
                                        opacity: shouldAnimate ? 1 : 0,
                                        background: `linear-gradient(to right, ${item.color} 0%, rgba(15, 23, 42, 0.15) 100%)`,
                                        transition: `width 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 0.1}s, opacity 0.4s ease ${idx * 0.1}s`
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ExecutionBarChart = ({ contracts = [] }) => {
    const [containerRef, shouldAnimate] = useScrollReveal();
    const [displayData, setDisplayData] = useState([
        { faixa: '0–25%', quantidade: 0, percentual: 0, color: 'url(#gradRed)' },
        { faixa: '25–50%', quantidade: 0, percentual: 0, color: 'url(#gradOrange)' },
        { faixa: '50–75%', quantidade: 0, percentual: 0, color: 'url(#gradYellow)' },
        { faixa: '75–100%', quantidade: 0, percentual: 0, color: 'url(#gradGreen)' }
    ]);

    // Categorização por marcos de execução
    const getExecution = (c) => {
        const total = c.totalValue || 0;
        const balance = c.balanceValue || 0;
        if (total === 0) return 0;
        const realExec = ((total - balance) / total) * 100;
        // Demonstração visual se a base estiver zerada (mock id-based)
        return realExec > 0 ? realExec : (parseInt(c.id?.substring(0,2), 16) % 100) || 0;
    };

    useEffect(() => {
        if (shouldAnimate) {
            const bucketsRaw = [
                { label: '0–25%', color: 'url(#gradRed)', count: 0 },
                { label: '25–50%', color: 'url(#gradOrange)', count: 0 },
                { label: '50–75%', color: 'url(#gradYellow)', count: 0 },
                { label: '75–100%', color: 'url(#gradGreen)', count: 0 }
            ];

            const activeContracts = contracts.length > 0 ? contracts : [];
            
            if (activeContracts.length > 0) {
                activeContracts.forEach(c => {
                    const exec = getExecution(c);
                    if (exec < 25) bucketsRaw[0].count++;
                    else if (exec < 50) bucketsRaw[1].count++;
                    else if (exec < 75) bucketsRaw[2].count++;
                    else bucketsRaw[3].count++;
                });

                const totalCount = activeContracts.length;
                
                const realData = bucketsRaw.map(b => ({
                    faixa: b.label,
                    quantidade: b.count,
                    percentual: Math.round((b.count / totalCount) * 100),
                    color: b.color
                }));
                
                setDisplayData(realData);
            } else {
                setDisplayData([]);
            }
        }
    }, [shouldAnimate, contracts]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bar-tooltip-hud">
                    <span className="tooltip-title">Faixa {d.faixa}</span>
                    <div className="tooltip-hud-row">
                        <span className="hud-label">Contratos:</span>
                        <span className="hud-value">{d.quantidade}</span>
                    </div>
                    <div className="tooltip-hud-row">
                        <span className="hud-label">Participação:</span>
                        <span className="hud-value secondary">{d.percentual}%</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const renderCustomizedLabel = (props) => {
        const { x, y, width, value, index } = props;
        const pct = displayData[index] ? displayData[index].percentual : 0;
        return (
            <g key={`custom-label-${index}-${value}`}>
                <text 
                    x={x + width / 2} 
                    y={y - 12} 
                    fill="var(--text-primary)" 
                    textAnchor="middle" 
                    fontSize={13} 
                    fontWeight={900}
                >
                    {value}
                </text>
                <text 
                    x={x + width / 2} 
                    y={y + 18} 
                    fill="rgba(255, 255, 255, 0.95)" 
                    textAnchor="middle" 
                    fontSize={10} 
                    fontWeight={600}
                >
                    {pct}%
                </text>
            </g>
        );
    };

    const renderXAxisTick = ({ x, y, payload, index }) => {
        return (
            <g key={`x-tick-${index}-${payload.value}`} transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={0}
                    dy={16}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize={11}
                    fontWeight={600}
                >
                    {payload.value}
                </text>
            </g>
        );
    };

    const renderYAxisTick = ({ x, y, payload, index }) => {
        return (
            <g key={`y-tick-${index}-${payload.value}`} transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={0}
                    dx={-10}
                    dy={4}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize={10}
                >
                    {payload.value}
                </text>
            </g>
        );
    };

    const hasChartData = displayData && displayData.length > 0 && displayData.some(d => d.quantidade > 0);

    return (
        <div ref={containerRef} className="execution-chart-shell">
            {hasChartData ? (
                <div className="execution-chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                            id="compras-execution-chart"
                            data={displayData}
                            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#fb7185" />
                                    <stop offset="100%" stopColor="#e11d48" />
                                </linearGradient>
                                <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#fb923c" />
                                    <stop offset="100%" stopColor="#f97316" />
                                </linearGradient>
                                <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#facc15" />
                                    <stop offset="100%" stopColor="#eab308" />
                                </linearGradient>
                                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34d399" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                            <XAxis 
                                id="execution-xaxis"
                                dataKey="faixa" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={renderXAxisTick}
                            />
                            <YAxis 
                                id="execution-yaxis"
                                axisLine={false} 
                                tickLine={false} 
                                tick={renderYAxisTick}
                                allowDecimals={false}
                                domain={[0, dataMax => Math.ceil(dataMax + 0.3)]}
                            />
                            <Tooltip 
                                content={<CustomTooltip />} 
                                cursor={{ fill: 'rgba(148, 163, 184, 0.04)' }} 
                                offset={20}
                            />
                            <Bar 
                                dataKey="quantidade" 
                                barSize={48} 
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={true}
                                animationDuration={1200}
                                animationEasing="ease-out"
                            >
                                {displayData.map((entry, index) => (
                                    <Cell key={`exec-cell-${entry.faixa}-${index}`} fill={entry.color} />
                                ))}
                                {shouldAnimate && <LabelList dataKey="quantidade" content={renderCustomizedLabel} />}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="execution-chart-empty">
                    <AlertCircle size={32} />
                    <p>Sem contratos registrados para analisar a execução no momento.</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
