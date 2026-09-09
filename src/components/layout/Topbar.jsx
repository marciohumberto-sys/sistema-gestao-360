import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, User, Plus, LogOut } from 'lucide-react';
import { brandConfig } from '../../config/brand';
import { useAuth } from '../../context/AuthContext';
import { getLogoClickRedirectPath } from '../../utils/authUtils';
import { supabase } from '../../lib/supabase';
import { updateFarmaciaUser } from '../../services/farmaciaUsers.service';
import { useCompras } from '../../context/ComprasContext';

const Topbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { authUser, logout, isSuperAdmin, accessibleModules, tenantLink, scopes } = useAuth();
    
    // Derivar nome do usuário a exibir: full_name > name > login derivado do email
    const displayName = authUser?.user_metadata?.full_name
        || authUser?.user_metadata?.name
        || (authUser?.email ? authUser.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Usuário Local');
    
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const isFarmacia = location.pathname.startsWith('/farmacia');
    const isCompras = location.pathname.startsWith('/compras');
    const isPlanejamento = location.pathname.startsWith('/planejamento');

    const { 
        entidadesPermitidas, 
        entidadeAtiva, 
        podeTrocarEntidade, 
        setEntidadeAtiva, 
        loading: comprasContextLoading 
    } = useCompras();

    const [currentUnitName, setCurrentUnitName] = useState('');
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState('');
    const [isSavingUnit, setIsSavingUnit] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showConfirmUnit, setShowConfirmUnit] = useState(false);

    useEffect(() => {
        if (accessibleModules.includes('FARMACIA') && scopes) {
            const farmaciaScope = scopes.find(s => s.module_key === 'FARMACIA' && s.unit_id);
            if (farmaciaScope) {
                supabase.from('units').select('name').eq('id', farmaciaScope.unit_id).single()
                    .then(({ data }) => {
                        if (data) setCurrentUnitName(data.name);
                    });
            } else if (isSuperAdmin) {
                setCurrentUnitName('Todas');
            }
        }
    }, [accessibleModules, scopes, isSuperAdmin]);
    
    const role = isSuperAdmin ? 'SUPERADMIN' : String(tenantLink?.profile || tenantLink?.role || 'VISUALIZADOR').trim().toUpperCase();
    const canWriteGlobal = role !== 'VISUALIZADOR';
    
    const showGlobalAddButton = (isPlanejamento || isFarmacia || isCompras) && canWriteGlobal;

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

    const tooltipText = isPlanejamento 
        ? "Criar nova ação" 
        : isFarmacia 
            ? "Nova Saída" 
            : "Nova Ordem de Fornecimento";

    const ariaLabelTex = tooltipText;

    const handleActionClick = () => {
        if (isPlanejamento) {
            navigate('/planejamento/acoes', { state: { openModal: 'nova-acao' } });
        } else if (isFarmacia) {
            navigate('/farmacia/saidas', { state: { openModal: 'saida' } });
        } else {
            // Gatilho global para Nova OF (Compras)
            navigate('/compras/ordens-fornecimento', { state: { openModal: 'nova-of' } });
        }
    };

    const handleLogoClick = () => {
        const redirectPath = getLogoClickRedirectPath(
            location.pathname,
            isSuperAdmin,
            accessibleModules,
            tenantLink
        );
        navigate(redirectPath);
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
            <div 
                className="topbar-left" 
                onClick={handleLogoClick}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1.5rem',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
                <img src={brandConfig.logoPath} alt={`Logo da Prefeitura de ${brandConfig.cityName}`} style={{ maxHeight: '42px', objectFit: 'contain' }} />
                <h1 style={{ fontSize: '22px', margin: 0, display: 'flex', gap: '6px', alignItems: 'center', letterSpacing: '-0.02em' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Gestão Pública</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>Inteligente</span>
                </h1>
            </div>

            <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                {showGlobalAddButton && (
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
                )}

                {showGlobalAddButton && <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 0.25rem' }} />}

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
                            
                            {isFarmacia && accessibleModules.includes('FARMACIA') && !isSuperAdmin && (
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minha unidade</span>
                                    <button
                                        onClick={() => {
                                            setSelectedUnit(currentUnitName || 'UPA');
                                            setIsUnitModalOpen(true);
                                            setUserMenuOpen(false);
                                        }}
                                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--bg-muted-light)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}
                                    >
                                        {currentUnitName || 'Carregando...'}
                                    </button>
                                </div>
                            )}

                            {isCompras && (
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minha entidade</span>
                                    {podeTrocarEntidade ? (
                                        <select
                                            value={entidadeAtiva?.id || ''}
                                            onChange={(e) => setEntidadeAtiva(e.target.value)}
                                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--bg-muted-light)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', outline: 'none', appearance: 'menulist' }}
                                        >
                                            {entidadesPermitidas.map(ent => (
                                                <option key={ent.id} value={ent.id}>{ent.nome}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--bg-muted-light)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>
                                            {comprasContextLoading ? 'Carregando...' : (entidadeAtiva?.nome || 'Nenhuma entidade vinculada')}
                                        </div>
                                    )}
                                </div>
                            )}

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

            {isUnitModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        {!showConfirmUnit ? (
                            <>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>Minha unidade</h3>
                                <div style={{ marginBottom: '24px' }}>
                                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Unidade Operacional</p>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                                        <input type="radio" name="unit" checked={selectedUnit === 'UPA'} onChange={() => setSelectedUnit('UPA')} />
                                        <span style={{ fontSize: '14px', color: '#334155' }}>UPA</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="radio" name="unit" checked={selectedUnit === 'UMSJ'} onChange={() => setSelectedUnit('UMSJ')} />
                                        <span style={{ fontSize: '14px', color: '#334155' }}>UMSJ</span>
                                    </label>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button onClick={() => setIsUnitModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                                    <button onClick={() => {
                                        if (selectedUnit === currentUnitName) {
                                            setIsUnitModalOpen(false);
                                        } else {
                                            setShowConfirmUnit(true);
                                        }
                                    }} style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Salvar alteração</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>Alterar unidade</h3>
                                <p style={{ fontSize: '14px', color: '#334155', marginBottom: '24px', lineHeight: '1.5' }}>
                                    Deseja alterar sua unidade operacional de <strong>{currentUnitName}</strong> para <strong>{selectedUnit}</strong>?
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button onClick={() => setShowConfirmUnit(false)} disabled={isSavingUnit} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                                    <button onClick={async () => {
                                        setIsSavingUnit(true);
                                        try {
                                            const payload = {
                                                email: authUser.email,
                                                name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0],
                                                profile: tenantLink.role,
                                                status: tenantLink.is_active ? 'ATIVO' : 'INATIVO',
                                                units: [selectedUnit]
                                            };
                                            await updateFarmaciaUser(tenantLink.id, payload);
                                            setToastMessage(`Unidade alterada para ${selectedUnit} com sucesso.`);
                                            setIsUnitModalOpen(false);
                                            setShowConfirmUnit(false);
                                            setTimeout(() => {
                                                window.location.reload();
                                            }, 1500);
                                        } catch (e) {
                                            alert('Erro: ' + e.message);
                                        } finally {
                                            setIsSavingUnit(false);
                                        }
                                    }} disabled={isSavingUnit} style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                                        {isSavingUnit ? 'Aguarde...' : 'Confirmar alteração'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {toastMessage && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#059669', color: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10000, fontSize: '14px', fontWeight: 500 }}>
                    {toastMessage}
                </div>
            )}
        </header>
    );
};

export default Topbar;
