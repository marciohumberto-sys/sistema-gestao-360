import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderKanban, Pill, LogOut, ArrowRight, ShieldCheck, User, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { brandConfig } from '../config/brand';
import { getLogoClickRedirectPath } from '../utils/authUtils';

const Home = () => {
    const { isSuperAdmin, accessibleModules, logout, authUser, tenantLink } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Regra: Bloquear Hub APENAS para usuários com um único módulo (Redirecionar para Dashboard)
    // Usuários com 2 ou mais módulos devem ver o hub para escolha.
    useEffect(() => {
        const isMultiModule = (accessibleModules || []).length > 1;

        if (!isSuperAdmin && !isMultiModule) {
            const redirectPath = getLogoClickRedirectPath(
                location.pathname,
                isSuperAdmin,
                accessibleModules,
                tenantLink
            );
            
            if (redirectPath !== '/home') {
                navigate(redirectPath, { replace: true });
            }
        }
    }, [isSuperAdmin, accessibleModules, tenantLink, navigate, location.pathname]);

    const hasFarmacia = isSuperAdmin || accessibleModules?.includes('FARMACIA');
    const hasCompras = isSuperAdmin || accessibleModules?.includes('COMPRAS');
    const hasPlanejamento = isSuperAdmin || accessibleModules?.includes('PLANEJAMENTO_ESTRATEGICO');

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Extrair o primeiro nome a partir do email (ex: joao.silva@... -> Joao)
    const userName = authUser?.email 
        ? authUser.email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + authUser.email.split('@')[0].split('.')[0].slice(1)
        : 'Usuário';

    return (
        <div style={{ minHeight: '100vh', backgroundImage: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-family, system-ui, sans-serif)' }}>
            
            {/* Header Simples Premium */}
            <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '1.25rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <img src={brandConfig.logoPath} alt="Logo" style={{ height: '42px', objectFit: 'contain' }} />
                    <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h1 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 600 }}>Sistema Gestão</span>
                            <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>360</span>
                        </h1>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, letterSpacing: '0.01em', marginTop: '2px' }}>Plataforma inteligente de gestão pública</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{userName}</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>{authUser?.email}</span>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 150, 125, 0.08)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 150, 125, 0.15)' }}>
                            <User size={18} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 0.25rem' }} />
                    <button 
                        onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Encerrar Sessão"
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = '#fff'; }}
                    >
                        <LogOut size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            {/* Hub Central de Módulos */}
            <main style={{ flex: 1, padding: '4rem 2rem', maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
                
                <div style={{ marginBottom: '3.5rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
                        Olá, {userName}
                    </h1>
                    <p style={{ color: '#475569', fontSize: '1.15rem', fontWeight: 400, margin: 0 }}>
                        Escolha um módulo para continuar
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    
                    {/* Card Compras */}
                    {hasCompras && (
                        <ModuleCard 
                            title="Compras e Contratos"
                            description="Gestão integrada de contratos, empenhos, aditivos fiscais e relatórios gerenciais das ordens de fornecimento."
                            icon={FolderKanban}
                            color="#3b82f6"
                            onClick={() => navigate('/compras/dashboard')}
                        />
                    )}

                    {/* Card Farmácia */}
                    {hasFarmacia && (
                        <ModuleCard 
                            title="Farmácia e Estoque"
                            description="Controle avançado de inventário, dispensação de medicamentos, entradas, saídas e rastreabilidade de lotes."
                            icon={Pill}
                            color="#059669"
                            onClick={() => navigate('/farmacia/dashboard')}
                        />
                    )}

                    {/* Card Planejamento */}
                    {hasPlanejamento && (
                        <ModuleCard 
                            title="Planejamento Estratégico"
                            description="Monitoramento executivo de ações, gestão de metas, resolução de pendências e visão estratégica intersetorial."
                            icon={Target}
                            color="#8b5cf6"
                            onClick={() => navigate('/planejamento/dashboard')}
                        />
                    )}

                </div>
            </main>
        </div>
    );
};

// Componente Isolado Premium Card
const ModuleCard = ({ title, description, icon: Icon, color, onClick }) => {
    return (
        <div 
            onClick={onClick}
            style={{ 
                backgroundColor: '#fff', 
                borderRadius: '16px', 
                padding: '2rem', 
                cursor: 'pointer', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.25rem', 
                transition: 'all 0.2s ease-out', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)', 
                position: 'relative', 
                overflow: 'hidden',
                border: '1px solid #f1f5f9',
                height: '100%'
            }}
            onMouseEnter={e => { 
                e.currentTarget.style.transform = 'translateY(-6px)'; 
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)'; 
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.querySelector('.card-arrow').style.transform = 'translateX(4px)';
                e.currentTarget.querySelector('.card-arrow').style.color = color;
                e.currentTarget.querySelector('.card-top-line').style.opacity = '1';
                e.currentTarget.querySelector('.card-top-line').style.boxShadow = `0 2px 8px ${color}50`;
            }}
            onMouseLeave={e => { 
                e.currentTarget.style.transform = 'translateY(0)'; 
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.04)'; 
                e.currentTarget.style.borderColor = '#f1f5f9';
                e.currentTarget.querySelector('.card-arrow').style.transform = 'translateX(0)';
                e.currentTarget.querySelector('.card-arrow').style.color = '#cbd5e1';
                e.currentTarget.querySelector('.card-top-line').style.opacity = '0.85';
                e.currentTarget.querySelector('.card-top-line').style.boxShadow = 'none';
            }}
        >
            {/* Top Indicator Line */}
            <div className="card-top-line" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: color, opacity: 0.85, transition: 'all 0.2s' }}></div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={36} strokeWidth={2} />
                </div>
                <div className="card-arrow" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#cbd5e1', transition: 'all 0.25s' }}>
                    <ArrowRight size={22} strokeWidth={2.5} />
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.65rem', letterSpacing: '-0.02em' }}>{title}</h3>
                <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
                    {description}
                </p>
            </div>
        </div>
    );
};

export default Home;
