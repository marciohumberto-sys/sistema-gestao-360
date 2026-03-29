import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, 
    AlertTriangle, 
    ShieldAlert, 
    TrendingUp, 
    TrendingDown, 
    ArrowRight,
    DollarSign,
    FileText,
    Clock,
    Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './DashboardHero.css';

const AnimatedCounter = ({ value, isFloat = false, prefix = '', suffix = '', duration = 1200 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Strong cubic ease-out
            const easeOut = 1 - Math.pow(1 - percentage, 4);
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
        <span className="hero-counter">
            {prefix}{isFloat ? count.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : Math.floor(count).toLocaleString('pt-BR')}{suffix}
        </span>
    );
};

const DashboardHero = ({ metrics, isLoading }) => {
    const navigate = useNavigate();

    // Lógica de Status Inteligente (Painel HERO)
    const getHeroStatus = () => {
        if (metrics.totalPendingContracts > 0 || metrics.expiredContracts > 0) {
            return {
                label: 'CRÍTICO',
                class: 'critical',
                icon: <ShieldAlert size={32} strokeWidth={2.5} />,
                subtext: 'Risco de interrupção operacional detectado'
            };
        }
        if (metrics.pendingNfs > 0 || metrics.expiringContracts > 0) {
            return {
                label: 'ATENÇÃO',
                class: 'attention',
                icon: <AlertTriangle size={32} strokeWidth={2.5} />,
                subtext: 'Pendências requerem análise preventiva'
            };
        }
        return {
            label: 'CONTROLADA',
            class: 'controlled',
            icon: <ShieldCheck size={32} strokeWidth={2.5} />,
            subtext: 'Fluxo operacional dentro da normalidade'
        };
    };

    // Lógica de Ação Recomendada HERO
    const getHeroAction = () => {
        if (metrics.pendingNfs > 0) {
            return {
                title: 'Prioridade: Faturamento',
                text: `${metrics.pendingNfs} Notas Fiscais aguardam processamento imediato para evitar atrasos no ciclo de pagamento.`,
                button: 'Ver Notas Fiscais',
                link: '/compras/notas-fiscais'
            };
        }
        if (metrics.totalPendingContracts > 0) {
            const total = metrics.totalPendingContracts + metrics.expiredContracts;
            return {
                title: 'Prioridade: Gestão Contratual',
                text: `Existem ${total} contratos com pendências críticas. A regularização é necessária para manter a conformidade.`,
                button: 'Resolver Agora',
                link: '/compras/contratos'
            };
        }
        return {
            title: 'Análise de Rotina',
            text: 'Tudo sob controle. Aproveite para revisar o saldo remanescente dos contratos principais para o próximo trimestre.',
            button: 'Ver Contratos',
            link: '/compras/contratos'
        };
    };

    const status = getHeroStatus();
    const action = getHeroAction();

    if (isLoading) {
        return <div className="dashboard-hero loading" style={{ height: '240px', background: '#F1F5F9', border: 'none' }}></div>;
    }

    return (
        <div className="dashboard-hero animate-fade-in-up">
            {/* ÁREA 1: STATUS OPERACIONAL */}
            <div className="hero-status-area">
                <span className="hero-label">Situação Geral</span>
                <div className={`status-badge-hero ${status.class}`}>
                    {status.icon}
                    <span>{status.label}</span>
                </div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', margin: 0 }}>
                    {status.subtext}
                </p>
            </div>

            {/* ÁREA 2: INDICADORES PRINCIPAIS */}
            <div className="hero-indicators-area">
                <div className="hero-indicator-item">
                    <span className="indicator-label">Saldo em Contrato</span>
                    <div className="indicator-value">
                        <AnimatedCounter 
                            prefix="R$ " 
                            value={(metrics.balanceValueSum || 0) / 1000000} 
                            isFloat={true} 
                            suffix="M" 
                        />
                    </div>
                    <div className="indicator-secondary neutral">
                        <Activity size={14} />
                        <span>Comprometido: {metrics.totalValueSum ? Math.round(((metrics.totalValueSum - metrics.balanceValueSum) / metrics.totalValueSum) * 100) : 0}%</span>
                    </div>
                </div>

                <div className="hero-indicator-item">
                    <span className="indicator-label">OFs no Mês</span>
                    <div className="indicator-value">
                        <AnimatedCounter value={metrics.ofsThisMonth || 0} />
                    </div>
                    <div className={`indicator-secondary ${metrics.ofsChangePercentage >= 0 ? 'up' : 'down'}`}>
                        {metrics.ofsChangePercentage >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{Math.abs(metrics.ofsChangePercentage)}% tendência</span>
                    </div>
                </div>

                <div className="hero-indicator-item">
                    <span className="indicator-label">NFs Pendentes</span>
                    <div className="indicator-value">
                        <AnimatedCounter value={metrics.pendingNfs || 0} />
                    </div>
                    <div className="indicator-secondary down">
                        <Clock size={14} />
                        <span>{metrics.nfsExpiringThisWeek || 0} expiram logo</span>
                    </div>
                </div>
            </div>

            {/* ÁREA 3: AÇÃO RECOMENDADA */}
            <div className="hero-action-area">
                <span className="hero-action-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowRight size={16} color="var(--color-primary)" />
                        {action.title}
                    </div>
                </span>
                <p className="hero-action-text">{action.text}</p>
                <button 
                    className="hero-cta-btn primary-action"
                    onClick={() => navigate(action.link)}
                >
                    {action.button}
                </button>
            </div>
        </div>
    );
};

export default DashboardHero;
