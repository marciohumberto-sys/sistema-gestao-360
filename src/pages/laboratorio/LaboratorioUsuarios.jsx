import React, { useState, useMemo } from 'react';
import { Search, Users, ShieldCheck, UserCheck, UserX, Plus, Edit2, XCircle, ShieldAlert, Check, ChevronDown, AlertTriangle, Activity } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessLaboratorio, canManageLaboratorioUsers } from '../../utils/laboratorioAcl';
import { getCurrentTenantId, fetchLaboratorioUsers, createLaboratorioUser, updateLaboratorioUser, toggleLaboratorioUserStatus, deleteLaboratorioUser } from '../../services/laboratorioUsers.service';
import './LaboratorioUsuarios.css';

const LaboratorioUsuarios = () => {
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const hasAccess = canAccessLaboratorio(role, '/laboratorio/usuarios');

    const [busca, setBusca] = useState('');
    const [perfilFiltro, setPerfilFiltro] = useState('Todos');
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
    const [alertConfig, setAlertConfig] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        type: 'info' 
    });

    const showAlert = (title, message, type = 'info') => {
        setAlertConfig({ isOpen: true, title, message, type });
        alert(`${title}: ${message}`);
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        login: '',
        profile: 'VISUALIZADOR',
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
                profile: 'RECEPCAO',
                units: ['Sede'],
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
            const data = await fetchLaboratorioUsers(tenantId);
            setUsuarios(data || []);
        } catch (e) {
            console.error('Erro na carga dos usuários do laboratório:', e);
            setUsuarios([]); // Fallback para lista vazia
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        carregarUsuarios();
    }, []);

    const toggleStatusHandler = async (user) => {
        if (!canManageLaboratorioUsers(role)) {
            showAlert('Acesso restrito', 'Seu perfil possui acesso apenas para visualização. Esta ação não está disponível.', 'error');
            return;
        }

        const tenantLinkId = user.user_tenant_id || user.id;
        const novoStatus = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
        const novoIsActive = novoStatus === 'ATIVO';

        setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, status: novoStatus } : u));
        
        try {
            await toggleLaboratorioUserStatus(tenantLinkId, novoIsActive);
        } catch (e) {   
            console.error(e);
            showAlert('Erro de Conexão', 'Falha ao atualizar o status na nuvem.', 'error');
            setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, status: user.status } : u));
        }
    };

    const handleDeleteUser = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDeletion = async () => {
        if (!userToDelete || deletingId) return;
        
        if (!canManageLaboratorioUsers(role)) {
            showAlert('Acesso restrito', 'Seu perfil possui acesso apenas para visualização. Esta ação não está disponível.', 'error');
            return;
        }

        setDeletingId(userToDelete.id);
        try {
            await deleteLaboratorioUser(userToDelete);
            setToast('Usuário excluído com sucesso!');
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            await carregarUsuarios();
        } catch (e) {
            console.error(e);
            showAlert('Erro na Exclusão', 'Erro ao excluir o usuário: ' + (e.message || 'Falha na comunicação com o servidor.'), 'error');
        } finally {
            setDeletingId(null);
            setTimeout(() => setToast(false), 3000);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (!canManageLaboratorioUsers(role)) {
            showAlert('Acesso restrito', 'Seu perfil possui acesso apenas para visualização. Esta ação não está disponível.', 'error');
            return;
        }

        if (isSaving) return;
        setIsSaving(true);

        const trimmedLogin = formData.login.trim().toLowerCase();
        const emailParsed = trimmedLogin === 'marcio.humberto' ? 'marcio.humberto@gmail.com' : `${trimmedLogin}@laboratorio.local`;
        
        const payload = { ...formData, email: emailParsed };
        delete payload.login;

        try {
            const tenantId = await getCurrentTenantId();
            
            if (editingUser) {
                const targetId = editingUser.user_tenant_id || editingUser.id;
                await updateLaboratorioUser(targetId, payload);
            } else {
                await createLaboratorioUser(tenantId, payload);
            }
            
            await carregarUsuarios();
            closeModal();
            setToast('Usuário salvo com sucesso!');
        } catch (e) {
            console.error(e);
            showAlert('Erro ao Salvar', 'Erro ao salvar o usuário: ' + (e.message || 'Falha de comunicação BD.'), 'error');
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
            const mStatus = statusFiltro === 'Todos' || u.status === statusFiltro;
            return mBusca && mPerfil && mStatus;
        });
    }, [busca, perfilFiltro, statusFiltro, usuarios]);

    const kpis = useMemo(() => {
        return {
            total: usuarios.length,
            biomedicos: usuarios.filter(u => u.profile === 'BIOMEDICO').length,
            tecnicos: usuarios.filter(u => u.profile === 'TECNICO' || u.profile === 'COLETA').length,
            recepcao: usuarios.filter(u => u.profile === 'RECEPCAO').length,
        };
    }, [usuarios]);

    if (!hasAccess) {
        return <Navigate to="/laboratorio/dashboard" replace />;
    }

    return (
        <div className="lab-users-container">
            <header className="lab-users-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="lab-users-title">Usuários do Laboratório</h1>
                    <p className="lab-users-subtitle">Gerencie perfis e permissões dos profissionais do laboratório.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="lab-btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0ea5e9', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                        <Plus size={18} /> Novo Usuário
                    </button>
                </div>
            </header>

            {/* KPIs */}
            <div className="lab-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="lab-mini-card">
                    <span className="premium-card-label">TOTAL DE USUÁRIOS</span>
                    <span className="premium-card-value text-secondary">{kpis.total}</span>
                    <span className="premium-card-desc">acessos registrados</span>
                    <div className="premium-card-icon-box"><Users size={20} /></div>
                </div>
                <div className="lab-mini-card">
                    <span className="premium-card-label">BIOMÉDICOS</span>
                    <span className="premium-card-value" style={{ color: '#0ea5e9' }}>{kpis.biomedicos}</span>
                    <span className="premium-card-desc">perfil avançado</span>
                    <div className="premium-card-icon-box"><ShieldCheck size={20} /></div>
                </div>
                <div className="lab-mini-card">
                    <span className="premium-card-label">TÉCNICOS/COLETA</span>
                    <span className="premium-card-value" style={{ color: '#f59e0b' }}>{kpis.tecnicos}</span>
                    <span className="premium-card-desc">operação técnica</span>
                    <div className="premium-card-icon-box"><Activity size={20} /></div>
                </div>
                <div className="lab-mini-card">
                    <span className="premium-card-label">RECEPÇÃO</span>
                    <span className="premium-card-value" style={{ color: '#10b981' }}>{kpis.recepcao}</span>
                    <span className="premium-card-desc">atendimento primário</span>
                    <div className="premium-card-icon-box"><UserCheck size={20} /></div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="lab-mini-card" style={{ padding: '1rem', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
                <div className="lab-search-box">
                    <Search size={16} className="lab-search-icon" />
                    <input
                        type="text"
                        className="lab-search-input"
                        placeholder="Buscar por nome ou usuário..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                    />
                </div>
                
                <select className="lab-filter-select" value={perfilFiltro} onChange={e => setPerfilFiltro(e.target.value)}>
                    <option value="Todos">Perfil: Todos</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="BIOMEDICO">Biomédico</option>
                    <option value="TECNICO">Técnico/Bancada</option>
                    <option value="COLETA">Coleta</option>
                    <option value="RECEPCAO">Recepção</option>
                    <option value="VISUALIZADOR">Visualizador</option>
                </select>

                <select className="lab-filter-select" value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
                    <option value="Todos">Status: Todos</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                </select>

                <div style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                    {usuariosFiltrados.length} resultados
                </div>
            </div>

            {/* Listagem */}
            <div className="lab-mini-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="lab-table-wrapper">
                    <table className="lab-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '25%' }}>Nome e Usuário</th>
                                <th style={{ width: '20%' }}>Perfil de Acesso</th>
                                <th style={{ width: '25%' }}>Escopo de Permissões</th>
                                <th style={{ width: '10%', textAlign: 'center' }}>Situação</th>
                                <th style={{ width: '10%', textAlign: 'center' }}>Acesso</th>
                                <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                        Buscando usuários...
                                    </td>
                                </tr>
                            ) : usuariosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                usuariosFiltrados.map(user => (
                                    <tr key={user.id} className="lab-table-row-interactive" style={{ opacity: user.status === 'INATIVO' ? 0.65 : 1 }}>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.name}</span>
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{user.email ? (user.email === 'marcio.humberto@gmail.com' ? 'marcio.humberto' : user.email.split('@')[0]) : ''}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0ea5e9' }}>
                                                {user.profile}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                {user.profile === 'ADMINISTRADOR' ? 'Acesso total ao módulo' :
                                                 user.profile === 'BIOMEDICO' ? 'Conferência e liberação de laudos' :
                                                 user.profile === 'TECNICO' ? 'Lançamento de resultados, Mapas' :
                                                 user.profile === 'COLETA' ? 'Mapas, Atendimento e Coleta' :
                                                 user.profile === 'RECEPCAO' ? 'Pacientes, Atendimento e Visualização' : 'Apenas leitura'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ 
                                                display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                                background: user.status === 'ATIVO' ? '#dcfce7' : '#fee2e2',
                                                color: user.status === 'ATIVO' ? '#166534' : '#991b1b'
                                            }}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div 
                                                onClick={() => toggleStatusHandler(user)}
                                                style={{
                                                    width: '44px', height: '24px', borderRadius: '12px', display: 'inline-flex',
                                                    background: user.status === 'ATIVO' ? '#0ea5e9' : '#cbd5e1',
                                                    cursor: 'pointer', position: 'relative', transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{
                                                    width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                                                    position: 'absolute', top: '2px', left: user.status === 'ATIVO' ? '22px' : '2px',
                                                    transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                }} />
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="lab-action-icon" onClick={() => openModal(user)} title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="lab-action-icon" onClick={() => handleDeleteUser(user)} title="Excluir" style={{ color: '#ef4444' }}>
                                                <UserX size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Novo/Editar */}
            {isModalOpen && (
                <div className="lab-modal-overlay">
                    <div className="lab-modal-content" style={{ width: '560px' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="lab-modal-title">{editingUser ? 'Editar Usuário' : 'Novo Usuário do Laboratório'}</h2>
                            <button className="lab-modal-close" onClick={closeModal}><XCircle size={20} /></button>
                        </div>

                        <form onSubmit={handleSave} style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Nome Completo *</label>
                                    <input 
                                        type="text" required value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="lab-search-input" placeholder="Ex: Ana Maria"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Usuário *</label>
                                    <input 
                                        type="text" required value={formData.login} 
                                        onChange={e => setFormData({...formData, login: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                                        className="lab-search-input" placeholder="Ex: ana.maria"
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Perfil de Acesso</label>
                                <select 
                                    className="lab-filter-select" style={{ width: '100%' }}
                                    value={formData.profile}
                                    onChange={e => setFormData({...formData, profile: e.target.value})}
                                >
                                    <option value="ADMINISTRADOR">ADMINISTRADOR (Acesso Total)</option>
                                    <option value="BIOMEDICO">BIOMÉDICO (Conferência e Liberação)</option>
                                    <option value="TECNICO">TÉCNICO/BANCADA (Resultados)</option>
                                    <option value="COLETA">COLETA (Atendimento e Mapas)</option>
                                    <option value="RECEPCAO">RECEPÇÃO (Pacientes e Atendimento)</option>
                                    <option value="VISUALIZADOR">VISUALIZADOR (Somente Leitura)</option>
                                </select>
                            </div>
                            
                            <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ShieldAlert size={14} /> Permissões Concedidas:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#64748b' }}>
                                    {formData.profile === 'ADMINISTRADOR' && <li>Acesso total, incluindo configurações e usuários.</li>}
                                    {formData.profile === 'BIOMEDICO' && <li>Acesso a Dashboard, Conferência, Laudos e Relatórios.</li>}
                                    {formData.profile === 'TECNICO' && <li>Acesso a Dashboard, Mapas e Lançamento de Resultados.</li>}
                                    {formData.profile === 'COLETA' && <li>Acesso a Dashboard, Coleta de amostras e Mapas.</li>}
                                    {formData.profile === 'RECEPCAO' && <li>Acesso a Dashboard, Cadastro de Pacientes e Atendimento.</li>}
                                    {formData.profile === 'VISUALIZADOR' && <li>Acesso somente leitura aos dados.</li>}
                                </ul>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Status da Conta</label>
                                <select 
                                    className="lab-filter-select" style={{ width: '100%' }}
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="ATIVO">Ativo (Acesso Permitido)</option>
                                    <option value="INATIVO">Inativo (Acesso Suspenso)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                                <button type="button" onClick={closeModal} style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" disabled={isSaving} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                                    {isSaving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, zIndex: 9999 }}>
                    <Check size={20} /> {toast}
                </div>
            )}

            {/* Modal Exclusão */}
            {isDeleteModalOpen && (
                <div className="lab-modal-overlay">
                    <div className="lab-modal-content" style={{ width: '400px', padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ background: '#fee2e2', color: '#ef4444', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Excluir Usuário</h3>
                        <p style={{ color: '#64748b', margin: '0 0 1.5rem' }}>Deseja realmente excluir <strong>{userToDelete?.name}</strong>? Esta ação removerá o acesso ao módulo Laboratório.</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setIsDeleteModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={confirmDeletion} disabled={deletingId} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                                {deletingId ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaboratorioUsuarios;
