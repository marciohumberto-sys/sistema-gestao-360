import React from 'react';
import { Bell, User, Plus } from 'lucide-react';
import { brandConfig } from '../../config/brand';

const Topbar = () => {
    return (
        <header className="topbar" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 'var(--topbar-height)',
            backgroundColor: 'var(--bg)', /* Diferente do body (que agora é bg-muted) */
            borderBottom: '1px solid var(--border)', /* Linha inferior sutil */
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            zIndex: 50,
            transition: 'background-color 0.25s ease, box-shadow 0.25s ease'
        }}>
            {/* Esquerda: Branding & Hierarquia */}
            <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <img
                    src={brandConfig.logoPath}
                    alt={`Logo da Prefeitura de ${brandConfig.cityName}`}
                    style={{ maxHeight: '42px', objectFit: 'contain' }}
                />
                <h1 style={{
                    fontSize: '22px',
                    margin: 0,
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center',
                    letterSpacing: '-0.02em'
                }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        Gestão Pública
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                        Inteligente
                    </span>
                </h1>
            </div>

            {/* Direita: Ações Rápidas & Ícones */}
            <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

                {/* Botão Primário SaaS Moderno - Ação Global Compacta */}
                <div style={{ position: 'relative' }} className="topbar-action-group">
                    <button
                        aria-label="Nova Ordem de Fornecimento"
                        className="topbar-global-add-btn"
                        style={{
                            backgroundColor: 'var(--color-secondary)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%', /* Circular premium */
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.04) translateY(-1px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                            e.currentTarget.style.filter = 'brightness(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1) translateY(0)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                            e.currentTarget.style.filter = 'brightness(1)';
                        }}
                    >
                        <Plus size={20} strokeWidth={2.5} />
                    </button>
                    <span className="premium-tooltip">Nova Ordem de Fornecimento</span>
                </div>

                <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 0.25rem' }}></div>

                <button
                    className="topbar-action-btn"
                    aria-label="Notificações"
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <Bell size={20} />
                </button>

                <button
                    aria-label="Perfil do Usuário"
                    style={{
                        background: 'var(--bg)',
                        border: '2px solid var(--border)',
                        cursor: 'pointer',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        transition: 'all 0.2s ease',
                        padding: 0
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-secondary)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <User size={20} />
                </button>
            </div>
        </header>
    );
};

export default Topbar;
