import React, { useState, useMemo } from 'react';
import {
    Search, Users, ShieldCheck, UserCheck, Eye, Plus, Edit2, XCircle,
    ShieldAlert, Check, ChevronDown, AlertTriangle, Trash2, UserX, Briefcase
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessComprasUsuarios } from '../utils/comprasAcl';
import {
    getCurrentTenantId,
    fetchComprasUsers,
    createComprasUser,
    updateComprasUser,
    toggleComprasUserStatus,
    deleteComprasUser
} from '../services/comprasUsers.service';
import './farmacia/FarmaciaPages.css';
import './farmacia/FarmaciaModal.css';

/* ── Helpers ──────────────────────────────────────────────────── */
const getScopeText = (profile, secretariatName) => {
    const sec = secretariatName ? ` (${secretariatName})` : '';
    if (profile === 'GESTOR')       return `Compras Completo${sec}`;
    if (profile === 'OPERADOR')     return `Operação de Compras${sec}`;
    if (profile === 'VISUALIZADOR') return `Consulta de Compras${sec}`;
    return `Acesso Básico${sec}`;
};

const extractLogin = (email) => {
    if (!email) return '';
    if (email === 'marcio.humberto@gmail.com') return 'marcio.humberto';
    return email.split('@')[0];
};

/* ── Component ────────────────────────────────────────────────── */
const ComprasUsuarios = () => {
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const hasAccess = canAccessComprasUsuarios(role);

    // ── Filters
    const [busca, setBusca]                     = useState('');
    const [perfilFiltro, setPerfilFiltro]       = useState('Todos');
    const [secretariaFiltro, setSecretaria]     = useState('Todas');
    const [statusFiltro, setStatusFiltro]       = useState('Todos');

    // ── Data
    const [usuarios, setUsuarios]       = useState([]);
    const [isLoading, setIsLoading]     = useState(true);

    // ── Modal: create / edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isSaving, setIsSaving]       = useState(false);

    // ── Modal: delete
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete]           = useState(null);
    const [deletingId, setDeletingId]               = useState(null);

    // ── Toast
    const [toast, setToast] = useState(false);

    // ── Form state
    const [formData, setFormData] = useState({
        name: '',
        login: '',
        profile: 'OPERADOR',
        status: 'ATIVO'
    });

    /* ── Data loading ─────────────────────────────────────────── */
    const carregarDados = async () => {
        setIsLoading(true);
        try {
            const tenantId = await getCurrentTenantId();
            const data = await fetchComprasUsers(tenantId);
            setUsuarios(data || []);
        } catch (e) {
            console.error('Erro ao carregar dados do Compras:', e);
            setUsuarios([]);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        carregarDados();
    }, []);

    /* ── Modal helpers ────────────────────────────────────────── */
    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                ...user,
                login: extractLogin(user.email)
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                login: '',
                profile: 'OPERADOR',
                status: 'ATIVO'
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    /* ── Toggle status ────────────────────────────────────────── */
    const toggleStatusHandler = async (user) => {
        const tenantLinkId = user.user_tenant_id || user.id;
        const novoStatus   = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
        const novoIsActive = novoStatus === 'ATIVO';

        // Optimistic update
        setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, status: novoStatus } : u));

        try {
            await toggleComprasUserStatus(tenantLinkId, novoIsActive);
        } catch (e) {
            console.error(e);
            alert('Falha ao atualizar o status na nuvem.');
            setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, status: user.status } : u));
        }
    };

    /* ── Delete ───────────────────────────────────────────────── */
    const handleDeleteUser = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDeletion = async () => {
        if (!userToDelete || deletingId) return;
        setDeletingId(userToDelete.id);
        try {
            await deleteComprasUser(userToDelete);
            setToast('Usuário excluído com sucesso!');
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            await carregarDados();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir o usuário: ' + (e.message || 'Falha na comunicação com o servidor.'));
        } finally {
            setDeletingId(null);
            setTimeout(() => setToast(false), 3000);
        }
    };

    /* ── Save ─────────────────────────────────────────────────── */
    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);

        const trimmedLogin  = formData.login.trim().toLowerCase();
        const emailParsed   = trimmedLogin === 'marcio.humberto'
            ? 'marcio.humberto@gmail.com'
            : `${trimmedLogin}@compras.local`;

        const payload = { ...formData, email: emailParsed };
        delete payload.login;

        try {
            const tenantId = await getCurrentTenantId();
            if (editingUser) {
                const targetId = editingUser.user_tenant_id || editingUser.id;
                await updateComprasUser(targetId, payload);
            } else {
                await createComprasUser(tenantId, payload);
            }
            await carregarDados();
            closeModal();
            setToast('Usuário salvo com sucesso!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar o usuário: ' + (e.message || 'Falha de comunicação.'));
        } finally {
            setIsSaving(false);
            setTimeout(() => setToast(false), 3000);
        }
    };

    /* ── Derived data ─────────────────────────────────────────── */
    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter(u => {
            const searchVal     = busca.toLowerCase();
            const loginDisplay  = extractLogin(u.email).toLowerCase();
            const mBusca        = busca === '' || u.name.toLowerCase().includes(searchVal) || loginDisplay.includes(searchVal);
            const mPerfil       = perfilFiltro === 'Todos' || u.profile === perfilFiltro;
            const mSec          = secretariaFiltro === 'Todas' || u.secretariat_name === secretariaFiltro;
            const mStatus       = statusFiltro === 'Todos' || u.status === statusFiltro;
            return mBusca && mPerfil && mSec && mStatus;
        });
    }, [busca, perfilFiltro, secretariaFiltro, statusFiltro, usuarios]);

    const kpis = useMemo(() => ({
        total:    usuarios.length,
        gestores: usuarios.filter(u => u.profile === 'GESTOR').length,
        operadores: usuarios.filter(u => u.profile === 'OPERADOR').length,
        ativos:   usuarios.filter(u => u.status === 'ATIVO').length,
    }), [usuarios]);

    /* ── Profile badge helpers ────────────────────────────────── */
    const profileBadgeStyle = (profile) => {
        if (profile === 'GESTOR')       return { background: 'rgba(5,150,105,0.1)',   color: '#059669' };
        if (profile === 'OPERADOR')     return { background: 'rgba(59,130,246,0.1)',  color: '#3b82f6' };
        if (profile === 'VISUALIZADOR') return { background: 'rgba(124,58,237,0.1)', color: '#7c3aed' };
        return {};
    };

    const ProfileIcon = ({ profile }) => {
        if (profile === 'GESTOR')       return <ShieldCheck size={14} />;
        if (profile === 'OPERADOR')     return <UserCheck size={14} />;
        if (profile === 'VISUALIZADOR') return <Eye size={14} />;
        return null;
    };

    /* ── Guard ────────────────────────────────────────────────── */
    if (!hasAccess) return <Navigate to="/compras/dashboard" replace />;

    /* ── Render ───────────────────────────────────────────────── */
    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>

            {/* Header */}
            <header className="farmacia-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="farmacia-page-title">Usuários do Compras</h1>
                    <p className="farmacia-page-subtitle">Gerencie perfis, secretarias e acessos operacionais do módulo.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                    <span className="premium-card-label">GESTORES</span>
                    <span className="premium-card-value" style={{ color: '#059669' }}>{kpis.gestores}</span>
                    <span className="premium-card-desc">perfil gestor completo</span>
                    <div className="premium-card-icon-box bg-itens"><ShieldCheck size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">OPERADORES</span>
                    <span className="premium-card-value color-blue">{kpis.operadores}</span>
                    <span className="premium-card-desc">perfil operacional</span>
                    <div className="premium-card-icon-box bg-unidade"><UserCheck size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">USUÁRIOS ATIVOS</span>
                    <span className="premium-card-value" style={{ color: '#059669' }}>{kpis.ativos}</span>
                    <span className="premium-card-desc">acessos liberados</span>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}><Check size={20} /></div>
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
                            <option value="VISUALIZADOR">Visualizador</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '150px', position: 'relative' }}>
                        <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }} value={secretariaFiltro} onChange={e => setSecretaria(e.target.value)}>
                            <option value="Todas">Secretaria: Todas</option>
                            <option value="Administração">Administração</option>
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

            {/* Table */}
            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1.1rem 1.5rem 0.9rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted-light)' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Contas de Acesso</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                    <table className="farmacia-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '26%' }} />
                            <col style={{ width: '9%' }} />
                            <col style={{ width: '7%' }} />
                            <col style={{ width: '6%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Nome e Usuário</th>
                                <th>Perfil Administrativo</th>
                                <th>Secretaria</th>
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
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Buscando base de usuários...</h3>
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
                                        {/* Nome e usuário */}
                                        <td className="farmacia-td-primary">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{user.name}</span>
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>{extractLogin(user.email)}</span>
                                            </div>
                                        </td>
                                        {/* Perfil */}
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                fontSize: '0.8rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px',
                                                ...profileBadgeStyle(user.profile)
                                            }}>
                                                <ProfileIcon profile={user.profile} />
                                                {user.profile}
                                            </span>
                                        </td>
                                        {/* Secretaria */}
                                        <td>
                                            {user.secretariat_name ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    <Briefcase size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                                                    {user.secretariat_name}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Não definida</span>
                                            )}
                                        </td>
                                        {/* Escopo */}
                                        <td>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                                {getScopeText(user.profile, user.secretariat_name)}
                                            </div>
                                        </td>
                                        {/* Situação */}
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
                                        {/* Toggle acesso */}
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
                                                        transition: 'all 0.25s ease-in-out', boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                                    }} />
                                                </div>
                                            </div>
                                        </td>
                                        {/* Ações */}
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
                                                    style={{ opacity: deletingId === user.id ? 0.5 : 1, cursor: deletingId === user.id ? 'not-allowed' : 'pointer' }}
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

            {/* ── Modal: Criar / Editar ─────────────────────────────── */}
            {isModalOpen && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal-content" style={{ width: '520px', maxWidth: '90vw' }}>
                        <div className="farmacia-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 className="farmacia-modal-title">{editingUser ? 'Editar Usuário' : 'Novo Usuário do Compras'}</h2>
                            <button type="button" className="farmacia-modal-close" onClick={closeModal}>
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.25rem' }}>

                                {/* Nome + Usuário */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome Completo *</label>
                                        <input
                                            type="text" required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="farmacia-input"
                                            placeholder="Ex: João da Silva"
                                            style={{ height: '42px', padding: '0 14px', border: '1px solid var(--border)', borderRadius: '8px', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,180,150,0.1)'; }}
                                            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>USUÁRIO *</label>
                                        <input
                                            type="text" required
                                            value={formData.login}
                                            onChange={e => {
                                                const val = e.target.value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9.]/g, '');
                                                setFormData({ ...formData, login: val });
                                            }}
                                            className="farmacia-input"
                                            placeholder="Ex: joao.silva"
                                            style={{ height: '42px', padding: '0 14px', border: '1px solid var(--border)', borderRadius: '8px', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,180,150,0.1)'; }}
                                            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                </div>

                                {/* Perfil + Secretaria + Resumo */}
                                <div style={{ padding: '1rem', background: 'var(--bg-muted-light)', borderRadius: '8px', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem', alignItems: 'start' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* Perfil */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Perfil de Acesso</label>
                                            <select
                                                className="farmacia-filter-select"
                                                style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', backgroundColor: '#fff' }}
                                                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,180,150,0.1)'; }}
                                                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                                                value={formData.profile}
                                                onChange={e => setFormData({ ...formData, profile: e.target.value })}
                                            >
                                                <option value="GESTOR">GESTOR (Coordenador de Compras)</option>
                                                <option value="OPERADOR">OPERADOR (Analista de Compras)</option>
                                                <option value="VISUALIZADOR">VISUALIZADOR (Consulta)</option>
                                            </select>
                                        </div>
                                        {/* Secretaria — fixa em Administração */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Secretaria</label>
                                            <div style={{
                                                height: '42px', padding: '0 14px', border: '1px solid var(--border)',
                                                borderRadius: '8px', background: 'var(--bg-muted)', display: 'flex',
                                                alignItems: 'center', gap: '8px', fontSize: '0.9rem',
                                                color: 'var(--text-muted)', fontWeight: 600
                                            }}>
                                                <Briefcase size={14} />
                                                Administração
                                            </div>
                                        </div>
                                    </div>

                                    {/* Resumo de direitos */}
                                    <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ShieldAlert size={14} /> Direitos da Categoria
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {formData.profile === 'GESTOR' ? (
                                                <>
                                                    <li><strong>Acesso completo ao módulo</strong></li>
                                                    <li>Gestão de contratos e empenhos</li>
                                                    <li>Aprovação de ordens de fornecimento</li>
                                                    <li>Acesso a relatórios gerenciais</li>
                                                    <li>Gestão de usuários</li>
                                                </>
                                            ) : formData.profile === 'OPERADOR' ? (
                                                <>
                                                    <li><strong>Operação de compras</strong></li>
                                                    <li>Registro de ordens de fornecimento</li>
                                                    <li>Inserção de notas fiscais</li>
                                                    <li>Consulta de contratos e empenhos</li>
                                                </>
                                            ) : (
                                                <>
                                                    <li><strong>Acesso somente leitura</strong></li>
                                                    <li>Consulta de dashboard</li>
                                                    <li>Visualização de contratos</li>
                                                    <li>Relatórios disponíveis</li>
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                {/* Status */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status da Conta</label>
                                    <select
                                        className="farmacia-filter-select"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', backgroundColor: '#fff' }}
                                        onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,180,150,0.1)'; }}
                                        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                                    >
                                        <option value="ATIVO">Conta Ativada e Permitida</option>
                                        <option value="INATIVO">Conta Inativa (Acesso Suspenso)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Footer do form */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button" onClick={closeModal} disabled={isSaving}
                                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, padding: '10px 16px', borderRadius: '8px', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.5 : 1 }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit" disabled={isSaving}
                                    style={{ background: isSaving ? '#64748b' : '#0f4a44', color: '#fff', border: 'none', fontWeight: 700, padding: '10px 24px', borderRadius: '8px', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: isSaving ? 'none' : '0 4px 12px rgba(15,74,68,0.2)' }}
                                    onMouseEnter={e => { if (!isSaving) { e.currentTarget.style.background = '#135c55'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                    onMouseLeave={e => { if (!isSaving) { e.currentTarget.style.background = '#0f4a44'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Toast ──────────────────────────────────────────────── */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', background: '#059669', color: '#fff',
                    padding: '12px 20px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(5,150,105,0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600,
                    animation: 'slideUp 0.3s ease-out', zIndex: 9999
                }}>
                    <Check size={20} /> {typeof toast === 'string' ? toast : 'Usuário salvo com sucesso!'}
                </div>
            )}

            {/* ── Modal de Confirmação de Exclusão ───────────────────── */}
            {isDeleteModalOpen && (
                <div className="farmacia-modal-confirm-overlay">
                    <div className="farmacia-modal-confirm-card">
                        <div className="farmacia-modal-confirm-header">
                            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex' }}>
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
                                onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
                                disabled={!!deletingId}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn-confirm-delete"
                                onClick={confirmDeletion}
                                disabled={!!deletingId}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {deletingId ? (
                                    <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Excluindo...</>
                                ) : (
                                    <><Trash2 size={16} /> Excluir</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComprasUsuarios;
