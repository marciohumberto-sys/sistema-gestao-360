import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, User, Plus, LogOut } from 'lucide-react';
import { brandConfig } from '../../config/brand';
import { useAuth } from '../../context/AuthContext';

const Topbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { authUser, logout } = useAuth();

    // Derivar nome do usuário a exibir: full_name > name > login derivado do email
    const displayName = authUser?.user_metadata?.full_name
        || authUser?.user_metadata?.name
        || (authUser?.email ? authUser.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Usuário Local');
    
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const isFarmacia = location.pathname.startsWith('/farmacia');
    const isCompras = location.pathname.startsWith('/compras');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const tooltipText = isFarmacia ? "Nova Saída" : "Nova Ordem de Fornecimento";
    const ariaLabelTex = isFarmacia ? "Nova Saída" : "Nova Ordem de Fornecimento";

    const handleActionClick = () => {
        if (isFarmacia) {
            navigate('/farmacia/saidas', { state: { openModal: 'saida' } });
        } else {
            // Comportamento atual mantido para Compras e demais
            // (no momento o botão não possuía onClick associado no frontend)
        }
    };

    return (
        <header className="topbar" style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            height: 'var(--topbar-height)',
            backgroundColor: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 1.5rem', zIndex: 50,
            transition: 'background-color 0.25s ease, box-shadow 0.25s ease'
        }}>
            <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <img src={brandConfig.logoPath} alt={`Logo da Prefeitura de ${brandConfig.cityName}`} style={{ maxHeight: '42px', objectFit: 'contain' }} />
                <h1 style={{ fontSize: '22px', margin: 0, display: 'flex', gap: '6px', alignItems: 'center', letterSpacing: '-0.02em' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Gestão Pública</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>Inteligente</span>
                </h1>
            </div>

            <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ position: 'relative' }} className="topbar-action-group">
                    <button aria-label={ariaLabelTex} className="topbar-global-add-btn"
                        onClick={handleActionClick}
                        style={{ backgroundColor: 'var(--color-secondary)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: 'var(--shadow-sm)' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04) translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.filter = 'brightness(1.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.filter = 'brightness(1)'; }}
                    >
                        <Plus size={20} strokeWidth={2.5} />
                    </button>
                    <span className="premium-tooltip">{tooltipText}</span>
                </div>

                <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 0.25rem' }} />

                <button className="topbar-action-btn" aria-label="Notificações"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg)'; e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    <Bell size={20} />
                </button>

                <div style={{ position: 'relative' }} ref={menuRef}>
                    <button aria-label="Perfil do Usuário"
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        style={{ background: 'var(--bg)', border: '2px solid var(--border)', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', transition: 'all 0.2s ease', padding: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-secondary)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        <User size={20} />
                    </button>
                    
                    {userMenuOpen && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: '220px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conectado como</span>
                                <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>{displayName}</span>
                                {authUser?.email && (
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 400, color: '#94a3b8', lineHeight: 1.4, marginTop: '2px', wordBreak: 'break-all' }}>{authUser.email}</span>
                                )}
                            </div>
                            <button 
                                onClick={handleLogout}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#dc2626', fontSize: '13px', fontWeight: 600, transition: 'background-color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <LogOut size={16} /> Encerrar Sessão
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Topbar;
