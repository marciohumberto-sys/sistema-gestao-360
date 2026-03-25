import React, { useState, useMemo } from 'react';
import { Search, Users, ShieldCheck, UserCheck, UserX, UserMinus, Plus, Edit2, XCircle, ShieldAlert, Check, ChevronDown, AlertTriangle, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessFarmacia } from '../../utils/farmaciaAcl';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import { getCurrentTenantId, fetchFarmaciaUsers, createFarmaciaUser, updateFarmaciaUser, toggleFarmaciaUserStatus, deleteFarmaciaUser } from '../../services/farmaciaUsers.service';
import './FarmaciaPages.css';

const FarmaciaUsuarios = () => {
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const hasAccess = canAccessFarmacia(role, '/farmacia/usuarios');

    const [busca, setBusca] = useState('');
    const [perfilFiltro, setPerfilFiltro] = useState('Todos');
    const [unidadeFiltro, setUnidadeFiltro] = useState('Todas');
    const [statusFiltro, setStatusFiltro] = useState('Todos');

    const [usuarios, setUsuarios] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [toast, setToast] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        login: '',
        profile: 'OPERADOR',
        units: [],
        status: 'ATIVO'
    });

    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            let extractedLogin = '';
            if (user.email) {
                if (user.email === 'marcio.humberto@gmail.com') {
                    extractedLogin = 'marcio.humberto';
                } else {
                    extractedLogin = user.email.split('@')[0];
                }
            }
            setFormData({ ...user, login: extractedLogin });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                login: '',
                profile: 'OPERADOR',
                units: ['UPA'],
                status: 'ATIVO'
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const carregarUsuarios = async () => {
        setIsLoading(true);
        try {
            const tenantId = await getCurrentTenantId();
            const data = await fetchFarmaciaUsers(tenantId);
            setUsuarios(data || []);
        } catch (e) {
            console.error('Erro na carga dos usuários da farmácia:', e);
            setUsuarios([]); // Empty state orgânico se ainda não houver RPC no backend
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        carregarUsuarios();
    }, []);

    const toggleStatusHandler = async (user) => {
        const tenantLinkId = user.user_tenant_id || user.id;
        const novoStatus = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
        const novoIsActive = novoStatus === 'ATIVO';

        // Atualização Otimista
        setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, status: novoStatus } : u));
        
        try {
            await toggleFarmaciaUserStatus(tenantLinkId, novoIsActive);
        } catch (e) {   
            console.error(e);
            alert('Falha ao atualizar o status na nuvem.');
            // Reverte fallback
            setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, status: user.status } : u));
        }
    };

    const handleDeleteUser = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDeletion = async () => {
        if (!userToDelete || deletingId) return;
        
        setDeletingId(userToDelete.id);
        try {
            await deleteFarmaciaUser(userToDelete);
            setToast('Usuário excluído com sucesso!');
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            await carregarUsuarios();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir o usuário: ' + (e.message || 'Falha na comunicação com o servidor.'));
        } finally {
            setDeletingId(null);
            setTimeout(() => setToast(false), 3000);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        
        let finalUnits = [...formData.units];
        if (formData.profile === 'OPERADOR' && finalUnits.length > 1) {
            finalUnits = [finalUnits[0]];
        }

        const trimmedLogin = formData.login.trim().toLowerCase();
        const emailParsed = trimmedLogin === 'marcio.humberto' ? 'marcio.humberto@gmail.com' : `${trimmedLogin}@farmacia.local`;
        
        const payload = { ...formData, email: emailParsed, units: finalUnits };
        delete payload.login;

        try {
            const tenantId = await getCurrentTenantId();
            
            if (editingUser) {
                const targetId = editingUser.user_tenant_id || editingUser.id;
                await updateFarmaciaUser(targetId, payload);
            } else {
                await createFarmaciaUser(tenantId, payload);
            }
            
            await carregarUsuarios(); // recarrega base consolidada
            closeModal();
            setToast('Usuário salvo com sucesso!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar o usuário: ' + (e.message || 'Falha de comunicação BD.'));
        } finally {
            setIsSaving(false);
            setTimeout(() => setToast(false), 3000);
        }
    };

    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter(u => {
            const searchVal = busca.toLowerCase();
            const extractedEmail = u.email ? (u.email === 'marcio.humberto@gmail.com' ? 'marcio.humberto' : u.email.split('@')[0].toLowerCase()) : '';
            
            const mBusca = busca === '' || u.name.toLowerCase().includes(searchVal) || extractedEmail.includes(searchVal);
            const mPerfil = perfilFiltro === 'Todos' || u.profile === perfilFiltro;
            const mUnidade = unidadeFiltro === 'Todas' || (u.units || []).includes(unidadeFiltro);
            const mStatus = statusFiltro === 'Todos' || u.status === statusFiltro;
            return mBusca && mPerfil && mUnidade && mStatus;
        });
    }, [busca, perfilFiltro, unidadeFiltro, statusFiltro, usuarios]);

    const kpis = useMemo(() => {
        return {
            total: usuarios.length,
            farmaceuticas: usuarios.filter(u => u.profile === 'GESTOR').length,
            auxUpa: usuarios.filter(u => u.profile === 'OPERADOR' && (u.units || []).includes('UPA')).length,
            auxUmsj: usuarios.filter(u => u.profile === 'OPERADOR' && (u.units || []).includes('UMSJ')).length,
        };
    }, [usuarios]);

    if (!hasAccess) {
        return <Navigate to="/farmacia/dashboard" replace />;
    }

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            <header className="farmacia-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="farmacia-page-title">Usuários da Farmácia</h1>
                    <p className="farmacia-page-subtitle">Gerencie perfis, unidades e acessos operacionais do módulo.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <FarmaciaUnitBadge />
                    <button className="farmacia-btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Novo Usuário
                    </button>
                </div>
            </header>

            {/* KPIs */}
            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">TOTAL DE USUÁRIOS</span>
                    <span className="premium-card-value text-secondary">{kpis.total}</span>
                    <span className="premium-card-desc">acessos registrados</span>
                    <div className="premium-card-icon-box bg-top"><Users size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">FARMACÊUTICAS</span>
                    <span className="premium-card-value" style={{ color: '#059669' }}>{kpis.farmaceuticas}</span>
                    <span className="premium-card-desc">perfil gestor completo</span>
                    <div className="premium-card-icon-box bg-itens"><ShieldCheck size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">AUXILIARES UPA</span>
                    <span className="premium-card-value color-blue">{kpis.auxUpa}</span>
                    <span className="premium-card-desc">operação UPA</span>
                    <div className="premium-card-icon-box bg-unidade"><UserCheck size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">AUXILIARES UMSJ</span>
                    <span className="premium-card-value color-blue">{kpis.auxUmsj}</span>
                    <span className="premium-card-desc">operação UMSJ</span>
                    <div className="premium-card-icon-box bg-unidade"><UserCheck size={20} /></div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '400px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input
                            type="text"
                            className="farmacia-search-input"
                            placeholder="Buscar por nome ou usuário..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>
                    
                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }} value={perfilFiltro} onChange={e => setPerfilFiltro(e.target.value)}>
                            <option value="Todos">Perfil: Todos</option>
                            <option value="GESTOR">Gestor</option>
                            <option value="OPERADOR">Operador</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }} value={unidadeFiltro} onChange={e => setUnidadeFiltro(e.target.value)}>
                            <option value="Todas">Unidade: Todas</option>
                            <option value="UPA">UPA</option>
                            <option value="UMSJ">UMSJ</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }} value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
                            <option value="Todos">Status: Todos</option>
                            <option value="ATIVO">Ativo</option>
                            <option value="INATIVO">Inativo</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                        <span>{usuariosFiltrados.length} resultados</span>
                    </div>
                </div>
            </div>

            {/* Listagem */}
            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1.1rem 1.5rem 0.9rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted-light)' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Contas de Acesso</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)', overflowX: 'hidden' }}>
                    <table className="farmacia-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '8%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Nome e Usuário</th>
                                <th>Perfil Administrativo</th>
                                <th>Unidade(s)</th>
                                <th>Escopo de Acesso Visual</th>
                                <th style={{ textAlign: 'center' }}>Situação</th>
                                <th style={{ textAlign: 'center' }}>Acesso</th>
                                <th style={{ textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '4rem 1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ padding: '0.75rem' }}>
                                                <div className="spinner-border" style={{ width: '30px', height: '30px', color: 'var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', border: '3px solid' }} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Buscando base de usuários...</h3>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : usuariosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-muted-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                                <Users size={28} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Nenhum usuário encontrado</h3>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Cadastre usuários para iniciar o controle de acesso do módulo.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                usuariosFiltrados.map(user => (
                                    <tr key={user.id} className="farmacia-table-row-interactive" style={{ opacity: user.status === 'INATIVO' ? 0.65 : 1 }}>
                                        <td className="farmacia-td-primary">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{user.name}</span>
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>{user.email ? (user.email === 'marcio.humberto@gmail.com' ? 'marcio.humberto' : user.email.split('@')[0]) : ''}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ 
                                                display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px',
                                                background: user.profile === 'GESTOR' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                color: user.profile === 'GESTOR' ? '#059669' : '#3b82f6'
                                            }}>
                                                {user.profile === 'GESTOR' ? <ShieldCheck size={14} /> : <UserCheck size={14} />}
                                                {user.profile}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {(user.units || []).map(u => (
                                                    <span key={u} className="farmacia-code-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '0.75rem' }}>{u}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                                {user.profile === 'GESTOR' 
                                                    ? `Farmácia Completa (${(user.units || []).join(' e ')})`
                                                    : `Operação Restrita (${(user.units || []).join(', ')})`}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <span 
                                                className={`farmacia-badge badge-${user.status === 'ATIVO' ? 'normal' : 'abaixo_minimo'}`}
                                                style={{
                                                    ...(user.status === 'INATIVO' ? { background: '#fff1f2', color: '#f43f5e', border: '1px solid #fecdd3' } : {}),
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                                                    height: '24px', boxSizing: 'border-box', lineHeight: 1, padding: '0 10px', margin: 0
                                                }}
                                            >
                                                {user.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <div 
                                                    onClick={() => toggleStatusHandler(user)}
                                                    style={{
                                                        width: '44px', height: '24px', borderRadius: '12px', boxSizing: 'border-box',
                                                        background: user.status === 'ATIVO' ? '#059669' : '#94a3b8',
                                                        display: 'inline-flex', alignItems: 'center',
                                                        position: 'relative', cursor: 'pointer', transition: 'background-color 0.25s ease-in-out',
                                                        margin: 0, padding: 0
                                                    }}
                                                    title={user.status === 'ATIVO' ? 'Bloquear acesso' : 'Liberar acesso'}
                                                >
                                                    <div style={{
                                                        width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff',
                                                        position: 'absolute', top: '50%',
                                                        transform: `translateY(-50%) translateX(${user.status === 'ATIVO' ? '22px' : '2px'})`,
                                                        transition: 'all 0.25s ease-in-out', boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)'
                                                    }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button className="farmacia-action-icon" onClick={() => openModal(user)}>
                                                    <Edit2 size={16} />
                                                    <span className="premium-tooltip">Editar Usuário</span>
                                                </button>
                                                <button 
                                                    className="farmacia-action-icon" 
                                                    onClick={() => handleDeleteUser(user)}
                                                    disabled={deletingId === user.id}
                                                    style={{ 
                                                        opacity: deletingId === user.id ? 0.5 : 1, 
                                                        cursor: deletingId === user.id ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <UserX size={16} />
                                                    <span className="premium-tooltip">Excluir Usuário</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Cadastro/Edição */}
            {isModalOpen && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal-content" style={{ width: '560px', maxWidth: '90vw' }}>
                        <div className="farmacia-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 className="farmacia-modal-title">{editingUser ? 'Editar Usuário' : 'Novo Usuário da Farmácia'}</h2>
                            <button type="button" className="farmacia-modal-close" onClick={closeModal}>
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome Completo *</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={formData.name} 
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="farmacia-input" 
                                            placeholder="Ex: João da Silva" 
                                            style={{ display: 'flex', alignItems: 'center', height: '42px', padding: '0 14px', border: '1px solid var(--border)', borderRadius: '8px', background: '#fff', outline: 'none', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 150, 0.1)'; }}
                                            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>USUÁRIO *</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={formData.login} 
                                            onChange={e => {
                                                const val = e.target.value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9.]/g, '');
                                                setFormData({...formData, login: val});
                                            }}
                                            className="farmacia-input" 
                                            placeholder="Ex: erlane.vieira" 
                                            style={{ display: 'flex', alignItems: 'center', height: '42px', padding: '0 14px', border: '1px solid var(--border)', borderRadius: '8px', background: '#fff', outline: 'none', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 150, 0.1)'; }}
                                            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                </div>

                                <div style={{ padding: '1rem', background: 'var(--bg-muted-light)', borderRadius: '8px', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem', alignItems: 'start' }}>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Perfil de Acesso</label>
                                            <select 
                                                className="farmacia-filter-select" 
                                                style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', transition: 'all 0.2s', backgroundColor: '#fff' }}
                                                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 150, 0.1)'; }}
                                                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                                                value={formData.profile}
                                                onChange={e => {
                                                    const prof = e.target.value;
                                                    setFormData({
                                                        ...formData, 
                                                        profile: prof,
                                                        // Fallback para OPERADOR forçar apenas 1 unidade
                                                        units: prof === 'OPERADOR' && formData.units.length > 1 ? [formData.units[0]] : formData.units
                                                    });
                                                }}
                                            >
                                                <option value="GESTOR">GESTOR (Farmacêutico Chefe)</option>
                                                <option value="OPERADOR">OPERADOR (Auxiliar de Farmácia)</option>
                                            </select>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Unidade Operacional</label>
                                            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                                                {['UPA', 'UMSJ'].map(unit => (
                                                    <label key={unit} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', opacity: 0.9 }}>
                                                        <input 
                                                            type={formData.profile === 'GESTOR' ? 'checkbox' : 'radio'}
                                                            name={formData.profile === 'OPERADOR' ? "unit_radio" : `unit_${unit}`}
                                                            checked={formData.units.includes(unit)}
                                                            onChange={(e) => {
                                                                if (formData.profile === 'GESTOR') {
                                                                    const checked = e.target.checked;
                                                                    setFormData(prev => ({
                                                                        ...prev, 
                                                                        units: checked ? [...prev.units, unit] : prev.units.filter(u => u !== unit)
                                                                    }));
                                                                } else {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        units: [unit]
                                                                    }));
                                                                }
                                                            }}
                                                            style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                                        />
                                                        {unit}
                                                    </label>
                                                ))}
                                            </div>
                                            {formData.profile === 'GESTOR' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Múltipla seleção permitida.</span>}
                                        </div>
                                    </div>

                                    {/* Resumo Dinâmico de Acessos */}
                                    <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ShieldAlert size={14} /> Direitos da Categoria
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {formData.profile === 'GESTOR' ? (
                                                <>
                                                    <li><strong>Acesso completo ao dashboard</strong></li>
                                                    <li><strong>Visualização total do estoque</strong></li>
                                                    <li>Registro de entradas e saídas</li>
                                                    <li>Acompanhamento de movimentações</li>
                                                    <li>Acesso a relatórios e inventário</li>
                                                    <li>Controle de ajustes administrativos</li>
                                                </>
                                            ) : (
                                                <>
                                                    <li><strong>Visualização do dashboard</strong></li>
                                                    <li>Registro de saídas de medicamentos</li>
                                                    <li>Consulta de movimentações da unidade</li>
                                                </>
                                            )}
                                        </ul>
                                    </div>

                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status da Conta</label>
                                    <select 
                                        className="farmacia-filter-select"
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                        style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', transition: 'all 0.2s', backgroundColor: '#fff' }}
                                        onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 180, 150, 0.1)'; }}
                                        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                                    >
                                        <option value="ATIVO">Conta Ativada e Permitida</option>
                                        <option value="INATIVO">Conta Inativa (Acesso Suspenso)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button" 
                                    onClick={closeModal} 
                                    disabled={isSaving}
                                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, padding: '10px 16px', borderRadius: '8px', cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isSaving ? 0.5 : 1 }}
                                    onMouseEnter={e => !isSaving && (e.target.style.color = '#334155')}
                                    onMouseLeave={e => !isSaving && (e.target.style.color = '#64748b')}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    style={{ background: isSaving ? '#64748b' : '#0f4a44', color: '#fff', border: 'none', fontWeight: 700, padding: '10px 24px', borderRadius: '8px', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)', boxShadow: isSaving ? 'none' : '0 4px 12px rgba(15, 74, 68, 0.2)' }}
                                    onMouseEnter={e => { if (!isSaving) { e.currentTarget.style.background = '#135c55'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 74, 68, 0.3)'; } }}
                                    onMouseLeave={e => { if (!isSaving) { e.currentTarget.style.background = '#0f4a44'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 74, 68, 0.2)'; } }}
                                    onMouseDown={e => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 74, 68, 0.2)'; } }}
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast de Sucesso Mocando Ação Salvar */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', background: '#059669', color: '#fff',
                    padding: '12px 20px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(5, 150, 105, 0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600,
                    animation: 'slideUp 0.3s ease-out', zIndex: 9999
                }}>
                    <Check size={20} /> {typeof toast === 'string' ? toast : 'Usuário salvo com sucesso!'}
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {isDeleteModalOpen && (
                <div className="farmacia-modal-confirm-overlay">
                    <div className="farmacia-modal-confirm-card">
                        <div className="farmacia-modal-confirm-header">
                            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex' }}>
                                <AlertTriangle size={20} />
                            </div>
                            <h2 className="farmacia-modal-confirm-title">Excluir usuário</h2>
                        </div>
                        <div className="farmacia-modal-confirm-body">
                            <p className="farmacia-modal-confirm-msg">
                                Deseja realmente excluir o usuário <strong>{userToDelete?.name}</strong>?
                            </p>
                            <p className="farmacia-modal-confirm-warning">
                                Essa ação não poderá ser desfeita.
                            </p>
                        </div>
                        <div className="farmacia-modal-confirm-footer">
                            <button 
                                className="btn-confirm-cancel" 
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setUserToDelete(null);
                                }}
                                disabled={deletingId}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn-confirm-delete" 
                                onClick={confirmDeletion}
                                disabled={deletingId}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {deletingId ? (
                                    <>
                                        <div className="spinner-border" style={{ width: '14px', height: '14px', border: '2px solid' }} /> Excluindo...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} /> Excluir
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FarmaciaUsuarios;
