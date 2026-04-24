import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, 
    Users, 
    ShieldCheck, 
    UserCheck, 
    UserX, 
    Plus, 
    Edit2, 
    Eye,
    ChevronDown, 
    Filter,
    MoreHorizontal,
    Briefcase,
    LayoutDashboard,
    Check
} from 'lucide-react';
import { 
    getCurrentTenantId, 
    fetchPlanejamentoUsers,
    updatePlanejamentoUser,
    togglePlanejamentoUserStatus,
    deletePlanejamentoUser
} from '../../services/planejamentoUsers.service';
import '../farmacia/FarmaciaPages.css';
import '../farmacia/FarmaciaModal.css';
import './PlanejamentoDashboard.css';

/* ── Helpers ──────────────────────────────────────────────────── */
const getScopeText = (profile, secretariatName) => {
    const sec = secretariatName ? ` (${secretariatName})` : '';
    if (profile === 'GESTOR')       return `Planejamento Estratégico Completo${sec}`;
    if (profile === 'OPERADOR')     return `Operação de Planejamento${sec}`;
    if (profile === 'VISUALIZADOR') return `Consulta de Planejamento${sec}`;
    return `Acesso ao Planejamento${sec}`;
};

const extractLogin = (email) => {
    if (!email) return '';
    return email.split('@')[0].toLowerCase();
};

const PlanejamentoUsuarios = () => {
    const [busca, setBusca] = useState('');
    const [perfilFiltro, setPerfilFiltro] = useState('Todos');
    const [secretariaFiltro, setSecretariaFiltro] = useState('Todas');
    const [statusFiltro, setStatusFiltro] = useState('Todos');
    const [isLoading, setIsLoading] = useState(true);

    // Data State
    const [usuarios, setUsuarios] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [toast, setToast] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        login: '',
        profile: 'OPERADOR',
        status: 'ATIVO',
        secretariat_name: ''
    });

    const carregarDados = async () => {
        setIsLoading(true);
        try {
            const tenantId = await getCurrentTenantId();
            const data = await fetchPlanejamentoUsers(tenantId);
            setUsuarios(data || []);
        } catch (err) {
            console.error("Erro ao carregar usuários do planejamento:", err);
            setUsuarios([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    const secretariasUnicas = useMemo(() => {
        const secs = new Set(usuarios.map(u => u.secretariat_name).filter(Boolean));
        return Array.from(secs).sort();
    }, [usuarios]);

    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter(u => {
            const cleanLogin = extractLogin(u.email);
            const mBusca = busca === '' || 
                u.name.toLowerCase().includes(busca.toLowerCase()) || 
                cleanLogin.includes(busca.toLowerCase());
            const mPerfil = perfilFiltro === 'Todos' || u.profile === perfilFiltro;
            const mSec = secretariaFiltro === 'Todas' || u.secretariat_name === secretariaFiltro;
            const mStatus = statusFiltro === 'Todos' || u.status === statusFiltro;
            return mBusca && mPerfil && mSec && mStatus;
        });
    }, [busca, perfilFiltro, secretariaFiltro, statusFiltro, usuarios]);

    const kpis = useMemo(() => {
        return {
            total: usuarios.length,
            gestores: usuarios.filter(u => u.profile === 'GESTOR').length,
            operadores: usuarios.filter(u => u.profile === 'OPERADOR').length,
            ativos: usuarios.filter(u => u.status === 'ATIVO').length,
        };
    }, [usuarios]);

    /* ── Handlers ─────────────────────────────────────────────── */
    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                login: extractLogin(user.email),
                profile: user.profile,
                status: user.status,
                secretariat_name: user.secretariat_name
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                login: '',
                profile: 'OPERADOR',
                status: 'ATIVO',
                secretariat_name: 'Planejamento e Inovação'
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);

        try {
            const loginParsed = formData.login.trim().toLowerCase();
            const emailParsed = `${loginParsed}@planejamento.local`;
            
            const payload = { 
                ...formData, 
                email: emailParsed 
            };

            const targetId = editingUser.user_tenant_id || editingUser.id;
            await updatePlanejamentoUser(targetId, payload);
            
            await carregarDados();
            setToast('Usuário atualizado com sucesso!');
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar usuário: ' + (err.message || 'Falha na comunicação.'));
        } finally {
            setIsSaving(false);
            setTimeout(() => setToast(false), 3000);
        }
    };

    const toggleStatusHandler = async (user) => {
        const tenantLinkId = user.user_tenant_id || user.id;
        const novoStatus = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
        const novoIsActive = novoStatus === 'ATIVO';

        // Optimistic update
        setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, status: novoStatus } : u));

        try {
            await togglePlanejamentoUserStatus(tenantLinkId, novoIsActive);
        } catch (e) {
            console.error(e);
            alert('Falha ao atualizar status.');
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
            await deletePlanejamentoUser(userToDelete);
            setToast('Usuário removido com sucesso!');
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            await carregarDados();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir usuário.');
        } finally {
            setDeletingId(null);
            setTimeout(() => setToast(false), 3000);
        }
    };

    const profileBadgeStyle = (profile) => {
        if (profile === 'GESTOR')       return { background: 'rgba(5, 150, 105, 0.1)', color: '#059669' };
        if (profile === 'OPERADOR')     return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
        if (profile === 'VISUALIZADOR') return { background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' };
        return { background: 'rgba(148, 163, 184, 0.1)', color: '#64748b' };
    };

    const ProfileIcon = ({ profile }) => {
        if (profile === 'GESTOR')       return <ShieldCheck size={14} />;
        if (profile === 'OPERADOR')     return <UserCheck size={14} />;
        if (profile === 'VISUALIZADOR') return <Eye size={14} />;
        return null;
    };

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            {/* Cabeçalho */}
            <header className="farmacia-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="farmacia-page-title">Usuários do Planejamento</h1>
                    <p className="farmacia-page-subtitle">Gerencie as contas de acesso e permissões do módulo estratégico.</p>
                </div>
                <button className="farmacia-btn-primary" onClick={() => openModal()}>
                    <Plus size={18} /> Novo Usuário
                </button>
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
                    <span className="premium-card-desc">perfil estratégico completo</span>
                    <div className="premium-card-icon-box bg-itens"><ShieldCheck size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">OPERADORES</span>
                    <span className="premium-card-value color-blue">{kpis.operadores}</span>
                    <span className="premium-card-desc">analistas de monitoramento</span>
                    <div className="premium-card-icon-box bg-unidade"><UserCheck size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">USUÁRIOS ATIVOS</span>
                    <span className="premium-card-value" style={{ color: '#059669' }}>{kpis.ativos}</span>
                    <span className="premium-card-desc">contas com acesso liberado</span>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}><Check size={20} /></div>
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

                    <div className="farmacia-select-wrapper" style={{ minWidth: '160px', position: 'relative' }}>
                        <select className="farmacia-filter-select" style={{ width: '100%' }} value={perfilFiltro} onChange={e => setPerfilFiltro(e.target.value)}>
                            <option value="Todos">Perfil: Todos</option>
                            <option value="GESTOR">Gestor</option>
                            <option value="OPERADOR">Operador</option>
                            <option value="VISUALIZADOR">Visualizador</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '180px', position: 'relative' }}>
                        <select className="farmacia-filter-select" style={{ width: '100%' }} value={secretariaFiltro} onChange={e => setSecretariaFiltro(e.target.value)}>
                            <option value="Todas">Secretaria: Todas</option>
                            {secretariasUnicas.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div className="farmacia-select-wrapper" style={{ minWidth: '160px', position: 'relative' }}>
                        <select className="farmacia-filter-select" style={{ width: '100%' }} value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
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

            {/* Tabela */}
            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1.1rem 1.5rem 0.9rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted-light)' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Contas de Acesso</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none' }}>
                    <table className="farmacia-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '10%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Nome e Usuário</th>
                                <th>Perfil Estratégico</th>
                                <th>Secretaria</th>
                                <th>Escopo de Acesso</th>
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
                                            <div className="spinner-border" style={{ width: '30px', height: '30px', color: 'var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', border: '3px solid' }} />
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
                                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nenhum usuário encontrado</h3>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                usuariosFiltrados.map(user => (
                                    <tr key={user.id} className="farmacia-table-row-interactive">
                                        <td className="farmacia-td-primary">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{user.name}</span>
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>{extractLogin(user.email)}</span>
                                            </div>
                                        </td>
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
                                        <td>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                <Briefcase size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                                                {user.secretariat_name}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                                {getScopeText(user.profile, user.secretariat_name)}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`farmacia-badge badge-${user.status === 'ATIVO' ? 'normal' : 'abaixo_minimo'}`} style={{ minWidth: '70px' }}>
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
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button className="farmacia-action-icon" onClick={() => openModal(user)}>
                                                    <Edit2 size={16} />
                                                    <span className="premium-tooltip">Editar Usuário</span>
                                                </button>
                                                <button className="farmacia-action-icon" onClick={() => handleDeleteUser(user)}>
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
                            <h2 className="farmacia-modal-title">{editingUser ? 'Editar Usuário' : 'Novo Usuário do Planejamento'}</h2>
                            <button type="button" className="farmacia-modal-close" onClick={closeModal}>
                                <UserX size={20} />
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
                                            placeholder="Ex: Carmem Ferreira"
                                            style={{ height: '42px', padding: '0 14px', border: '1px solid var(--border)', borderRadius: '8px', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>USUÁRIO *</label>
                                        <input
                                            type="text" required
                                            disabled={!!editingUser}
                                            value={formData.login}
                                            onChange={e => {
                                                const val = e.target.value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9.]/g, '');
                                                setFormData({ ...formData, login: val });
                                            }}
                                            className="farmacia-input"
                                            placeholder="Ex: carmem.ferreira"
                                            style={{ height: '42px', padding: '0 14px', border: '1px solid var(--border)', borderRadius: '8px', background: editingUser ? 'var(--bg-muted)' : '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                {/* Perfil + Secretaria */}
                                <div style={{ padding: '1rem', background: 'var(--bg-muted-light)', borderRadius: '8px', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Perfil de Acesso</label>
                                            <select
                                                className="farmacia-filter-select"
                                                style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', backgroundColor: '#fff' }}
                                                value={formData.profile}
                                                onChange={e => setFormData({ ...formData, profile: e.target.value })}
                                            >
                                                <option value="GESTOR">GESTOR (Estratégico)</option>
                                                <option value="OPERADOR">OPERADOR (Analista)</option>
                                                <option value="VISUALIZADOR">VISUALIZADOR (Consulta)</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Secretaria</label>
                                            <input
                                                type="text"
                                                value={formData.secretariat_name}
                                                onChange={e => setFormData({ ...formData, secretariat_name: e.target.value })}
                                                className="farmacia-input"
                                                placeholder="Ex: Planejamento"
                                                style={{ height: '42px', padding: '0 14px', border: '1px solid var(--border)', borderRadius: '8px', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                            />
                                        </div>
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
                                    >
                                        <option value="ATIVO">Conta Ativada</option>
                                        <option value="INATIVO">Conta Suspensa</option>
                                    </select>
                                </div>
                            </div>

                            {/* Footer do form */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                                <button
                                    type="button" onClick={closeModal} disabled={isSaving}
                                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit" disabled={isSaving}
                                    className="farmacia-btn-primary"
                                    style={{ height: '42px', padding: '0 24px' }}
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal de Confirmação de Exclusão ───────────────────── */}
            {isDeleteModalOpen && (
                <div className="farmacia-modal-confirm-overlay">
                    <div className="farmacia-modal-confirm-card">
                        <div className="farmacia-modal-confirm-header">
                            <h2 className="farmacia-modal-confirm-title">Excluir usuário</h2>
                        </div>
                        <div className="farmacia-modal-confirm-body">
                            <p className="farmacia-modal-confirm-msg">
                                Deseja realmente excluir o usuário <strong>{userToDelete?.name}</strong>?
                            </p>
                            <p className="farmacia-modal-confirm-warning">
                                Essa ação removerá o acesso deste usuário ao módulo Planejamento.
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
                            >
                                {deletingId ? 'Excluindo...' : 'Confirmar Exclusão'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ──────────────────────────────────────────────── */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', background: '#059669', color: '#fff',
                    padding: '12px 20px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(5,150,105,0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600,
                    zIndex: 9999
                }}>
                    <Check size={20} /> {toast}
                </div>
            )}
        </div>
    );
};

export default PlanejamentoUsuarios;
