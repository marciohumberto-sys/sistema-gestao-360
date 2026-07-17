import React, { useState, useEffect } from 'react';
import { 
    Users, UserPlus, RefreshCw, Search,
    AlertTriangle, Edit, Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import { formatCpf } from '../../utils/formatters';
import { laboratorioPacientesService } from '../../services/api/laboratorioPacientes.service';
import PacienteFormModal from '../../components/laboratorio/PacienteFormModal';
import './LaboratorioPacientes.css';

const calculateAge = (birthDateString) => {
    if (!birthDateString) return '---';
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return '---';
    const today = new Date();
    const parts = birthDateString.split('-');
    if (parts.length === 3) {
        const bd = new Date(parts[0], parts[1] - 1, parts[2]);
        let age = today.getFullYear() - bd.getFullYear();
        const m = today.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
            age--;
        }
        return age;
    }
    return '---';
};

const formatSex = (sex) => {
    if (!sex) return '---';
    const s = sex.toUpperCase();
    if (s === 'M' || s === 'MASCULINO') return 'Masculino';
    if (s === 'F' || s === 'FEMININO') return 'Feminino';
    return sex;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
};

const LaboratorioPacientes = () => {
    // Lista
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Ativos');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const ITEMS_PER_PAGE = 15;

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingId, setEditingId] = useState(null);
    
    // Toast global
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
    };

    const loadPatients = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await laboratorioPacientesService.buscarPacientes({
                termo: appliedSearchTerm,
                status: statusFilter,
                pagina: currentPage,
                porPagina: ITEMS_PER_PAGE,
                ordenacao: 'Nome — A a Z'
            });
            setPatients(res.pacientes);
            setTotalCount(res.total);
            setTotalPages(res.totalPaginas);
            if (currentPage > 1 && currentPage > res.totalPaginas && res.totalPaginas > 0) setCurrentPage(1);
        } catch (err) {
            setError('Não foi possível carregar os pacientes. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPatients(); }, [currentPage, statusFilter, appliedSearchTerm]);

    const openCreateModal = () => {
        setModalMode('create');
        setEditingId(null);
        setIsModalOpen(true);
    };

    const openEditModal = (p) => {
        setModalMode('edit');
        setEditingId(p.id);
        setIsModalOpen(true);
    };

    const handleSearchClick = () => {
        setAppliedSearchTerm(searchTerm);
        setCurrentPage(1);
    };

    return (
        <div className="lab-pac-container">
            <header className="lab-pac-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                        <h1 className="lab-title" style={{ margin: 0 }}>Pacientes</h1>
                        {!loading && (
                            <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 400, display: 'flex', alignItems: 'center' }}>
                                <span style={{ width: '4px', height: '4px', background: '#cbd5e1', borderRadius: '50%', margin: '0 0.75rem' }}></span>
                                {totalCount === 0 ? 'Nenhum paciente encontrado' : 
                                 totalCount === 1 ? '1 paciente encontrado' : 
                                 totalPages > 1 ? `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de ${totalCount} pacientes` :
                                 `${totalCount} pacientes encontrados`}
                            </span>
                        )}
                    </div>
                    <p className="lab-subtitle" style={{ marginTop: '0.25rem' }}>Cadastro e consulta de pacientes do laboratório</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline" onClick={loadPatients} disabled={loading}>
                        {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} Atualizar lista
                    </button>
                    <button className="lab-btn lab-btn-success" onClick={openCreateModal}>
                        <UserPlus size={16} /> Novo paciente
                    </button>
                </div>
            </header>

            <div className="lab-card lab-filters-card" style={{ marginBottom: '1.25rem', overflow: 'visible', boxSizing: 'border-box' }}>
                <div className="lab-filters-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 180px 145px', gap: '1rem', alignItems: 'flex-end', boxSizing: 'border-box' }}>
                    <div className="lab-filter-item" style={{ margin: 0, minWidth: 0 }}>
                        <label>Pesquisar paciente</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input type="text" placeholder="Buscar por nome, código, CPF, RG ou CNS..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                                style={{ paddingLeft: '38px', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                    <div className="lab-filter-item" style={{ margin: 0, minWidth: 0 }}>
                        <label>Status</label>
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} style={{ boxSizing: 'border-box', width: '100%' }}>
                            <option value="Ativos">Ativos</option>
                            <option value="Inativos">Inativos</option>
                            <option value="Todos">Todos</option>
                        </select>
                    </div>
                    <div className="lab-filter-actions" style={{ margin: 0, minWidth: 0 }}>
                        <button className="lab-btn lab-btn-primary" onClick={handleSearchClick} disabled={loading} style={{ width: '100%', boxSizing: 'border-box' }}>
                            {loading && appliedSearchTerm !== searchTerm ? <Loader2 size={16} className="spin" /> : <Search size={16} />} Buscar
                        </button>
                    </div>
                </div>
            </div>

            <div className="lab-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: '400px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {error ? (
                    <div className="lab-error-state" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#ef4444', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <AlertTriangle size={40} style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>{error}</h3>
                        <button className="lab-btn lab-btn-outline" onClick={loadPatients} style={{ marginTop: '1rem' }}>Tentar novamente</button>
                    </div>
                ) : loading && patients.length === 0 ? (
                    <div className="lab-loading-state" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <Loader2 size={40} className="spin" style={{ margin: '0 auto 1rem', color: '#3b82f6' }} />
                        <p style={{ fontSize: '1rem' }}>Carregando pacientes...</p>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="lab-empty-state" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#334155', margin: '0 0 0.5rem' }}>Nenhum paciente encontrado</h3>
                        <p style={{ fontSize: '0.95rem' }}>Ajuste os filtros ou realize uma nova busca.</p>
                    </div>
                ) : (
                    <>
                        <div className="lab-table-responsive" style={{ flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden', boxSizing: 'border-box' }}>
                            <table className="lab-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th>Código</th><th>Nome</th><th>Data Nasc.</th><th>Idade</th><th>Sexo</th><th>CPF</th><th>CNS</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th style={{ textAlign: 'center', width: '60px' }}>Ação</th>
                                    </tr>
                                </thead>
                                <tbody style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                                    {patients.map(p => {
                                        const ageVal = calculateAge(p.birth_date);
                                        const ageDisplay = ageVal === '---' ? '---' : `${ageVal} ${ageVal === 1 ? 'ano' : 'anos'}`;
                                        return (
                                        <tr key={p.id} onClick={() => openEditModal(p)} className="lab-clickable-row">
                                            <td style={{ overflowWrap: 'anywhere' }}><span className="lab-pac-code">{p.code || '---'}</span></td>
                                            <td className="font-semibold text-primary">{p.full_name}</td>
                                            <td>{formatDate(p.birth_date)}</td>
                                            <td>{ageDisplay}</td>
                                            <td>{formatSex(p.sex)}</td>
                                            <td style={{ overflowWrap: 'anywhere' }}>{p.cpf ? formatCpf(p.cpf) : '---'}</td>
                                            <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{p.cns || '---'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`lab-badge-modern ${p.is_active ? 'lab-badge-success' : 'lab-badge-gray'}`}>
                                                    {p.is_active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button className="lab-btn-icon-edit" data-tooltip="Editar paciente" onClick={(e) => { e.stopPropagation(); openEditModal(p); }}>
                                                    <Edit size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                        <div className="lab-pagination" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', minWidth: 0 }}>
                            <div className="lab-pagination-info" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {totalCount === 0 ? 'Nenhum paciente encontrado' : 
                                 totalCount === 1 ? '1 paciente encontrado' : 
                                 totalPages > 1 ? `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de ${totalCount} pacientes` :
                                 `${totalCount} pacientes encontrados`}
                            </div>
                            <div className="lab-pagination-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '0.5rem' }}>Página {currentPage} de {Math.max(1, totalPages)}</span>
                                <button className="lab-btn lab-btn-outline" disabled={currentPage === 1 || loading} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Anterior</button>
                                <button className="lab-btn lab-btn-outline" disabled={currentPage >= totalPages || loading || totalPages === 0} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Próxima</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <PacienteFormModal 
                isOpen={isModalOpen}
                mode={modalMode}
                patientId={editingId}
                onClose={() => setIsModalOpen(false)}
                onSuccess={(msg) => {
                    showToast(msg);
                    setIsModalOpen(false);
                    if (modalMode === 'create') {
                        setStatusFilter('Ativos');
                        setCurrentPage(1);
                    }
                    loadPatients();
                }}
                onError={(msg) => showToast(msg, 'error')}
            />

            {toast.visible && (
                <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 10000, background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default LaboratorioPacientes;
