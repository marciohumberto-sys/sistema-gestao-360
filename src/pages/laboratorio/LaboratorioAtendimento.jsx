import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Activity, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { laboratorioAtendimentoService } from '../../services/api/laboratorioAtendimento.service';
import { laboratorioPacientesService } from '../../services/api/laboratorioPacientes.service';
import LaboratorioOperacionalModal from '../../components/laboratorio/LaboratorioOperacionalModal';
import './LaboratorioAtendimento.css';

const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return '';
    const today = new Date();
    const birthDate = new Date(birthDateStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return `${age} anos`;
};

const formatCpf = (cpf) => {
    if (!cpf) return '---';
    const num = cpf.replace(/\D/g, '');
    if (num.length !== 11) return cpf;
    return num.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const LaboratorioAtendimento = () => {
    // --- ESTADOS DE BUSCA E LISTAGEM ---
    const [searchTerm, setSearchTerm] = useState('');
    const [pacientesResult, setPacientesResult] = useState([]);
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);
    const [hasSearchedPatient, setHasSearchedPatient] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [recentPatients, setRecentPatients] = useState([]);
    const [isLoadingRecent, setIsLoadingRecent] = useState(false);

    // --- ESTADOS DO MODAL OPERACIONAL ---
    const [isOperacionalModalOpen, setIsOperacionalModalOpen] = useState(false);
    const [selectedPatientForModal, setSelectedPatientForModal] = useState(null);

    const [successMessage, setSuccessMessage] = useState(null);

    const searchRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const latestSearchTermRef = useRef('');

    useEffect(() => {
        carregarPacientesRecentes();
        if (searchRef.current) {
            searchRef.current.focus();
        }
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []);

    const carregarPacientesRecentes = async () => {
        try {
            setIsLoadingRecent(true);
            const pacientes = await laboratorioAtendimentoService.buscarPacientesRecentes(10);
            setRecentPatients(Array.isArray(pacientes) ? pacientes : []);
        } catch (error) {
            console.error('Erro ao buscar pacientes recentes:', error);
            setRecentPatients([]);
        } finally {
            setIsLoadingRecent(false);
        }
    };

    const runSearch = async (termoLimpo) => {
        if (!termoLimpo || termoLimpo.length < 3) return;

        setIsSearchingPatient(true);
        setSearchError(null);
        setSuccessMessage(null);
        setHasSearchedPatient(false);
        try {
            const resultado = await laboratorioPacientesService.buscarPacientes({
                termo: termoLimpo,
                status: 'Ativos',
                porPagina: 15
            });
            // Prevenir sobreposição de requisições antigas
            if (latestSearchTermRef.current === termoLimpo) {
                setPacientesResult(resultado.pacientes || []);
                setHasSearchedPatient(true);
            }
        } catch (error) {
            console.error(error);
            if (latestSearchTermRef.current === termoLimpo) {
                setPacientesResult([]);
                setSearchError('Não foi possível consultar os pacientes. Tente novamente.');
                setHasSearchedPatient(false);
            }
        } finally {
            if (latestSearchTermRef.current === termoLimpo) {
                setIsSearchingPatient(false);
            }
        }
    };

    const handleSearchTermChange = (e) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        setSuccessMessage(null);
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        const termoLimpo = newValue.trim();
        latestSearchTermRef.current = termoLimpo;

        if (termoLimpo.length === 0) {
            setHasSearchedPatient(false);
            setSearchError(null);
            setPacientesResult([]);
            setIsSearchingPatient(false);
            return;
        }

        if (termoLimpo.length >= 3) {
            // Iniciar busca automática com debounce de 400ms
            typingTimeoutRef.current = setTimeout(() => {
                runSearch(termoLimpo);
            }, 400);
        } else {
            setHasSearchedPatient(false);
            setSearchError(null);
            setPacientesResult([]);
            setIsSearchingPatient(false);
        }
    };

    const handleOpenModalForNewPatient = () => {
        setSelectedPatientForModal(null);
        setSuccessMessage(null);
        setIsOperacionalModalOpen(true);
    };

    const handleSelectPatientForModal = (paciente) => {
        if (paciente.is_active === false) {
            setSearchError('Este paciente está inativo e não pode receber novo atendimento.');
            return;
        }
        setSelectedPatientForModal(paciente);
        setSuccessMessage(null);
        setIsOperacionalModalOpen(true);
    };

    const handleCloseOperacionalModal = () => {
        setIsOperacionalModalOpen(false);
        setSelectedPatientForModal(null);
    };

    const handleModalSuccess = (msg) => {
        setIsOperacionalModalOpen(false);
        setSelectedPatientForModal(null);
        setSuccessMessage(msg);
        setSearchTerm('');
        setPacientesResult([]);
        setHasSearchedPatient(false);
        carregarPacientesRecentes();
        if (searchRef.current) searchRef.current.focus();
        
        // Limpar a mensagem de sucesso após 5 segundos
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    const renderPatientList = (patients, title, subTitle, emptyDescription, isSearch) => (
        <div style={{ marginTop: '1rem' }}>
            {patients.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#1e293b', margin: 0, fontWeight: '700' }}>
                        {title}
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 400 }}>
                        {subTitle}
                    </p>
                </div>
            )}

            {patients.length === 0 ? (
                <div className="lab-card" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: '#fff' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: '600' }}>
                            {isSearch ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
                        </p>
                        <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>
                            {emptyDescription}
                        </p>
                    </div>
                    <button className="lab-btn lab-btn-primary" onClick={handleOpenModalForNewPatient} style={{ marginTop: '0.5rem', padding: '0.6rem 1rem' }}>
                        <UserPlus size={16} /> Cadastrar Novo Paciente
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {patients.map((paciente) => (
                        <div key={paciente.id} className="lab-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderLeft: '3px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', opacity: paciente.is_active === false ? 0.65 : 1 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                                        {paciente.name || paciente.full_name || '---'}
                                    </strong>
                                    {paciente.is_active === false && (
                                        <span className="lab-badge lab-badge-gray" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Inativo</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
                                    <span>Idade: <strong style={{ color: '#334155', fontWeight: 500 }}>{paciente.birth_date ? calculateAge(paciente.birth_date) : '---'}</strong></span>
                                    <span>Sexo: <strong style={{ color: '#334155', fontWeight: 500 }}>{paciente.gender || paciente.sex || '---'}</strong></span>
                                    <span>CPF: <strong style={{ color: '#334155', fontWeight: 500 }}>{formatCpf(paciente.cpf)}</strong></span>
                                </div>
                            </div>
                            <div style={{ marginLeft: '1rem', flexShrink: 0 }}>
                                <button
                                    className="lab-btn lab-btn-primary"
                                    style={{ whiteSpace: 'nowrap', minWidth: '170px', justifyContent: 'center' }}
                                    disabled={paciente.is_active === false}
                                    onClick={() => handleSelectPatientForModal(paciente)}
                                >
                                    <Activity size={16} /> Atender Paciente
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="lab-atend-container" style={{ margin: '0 auto', padding: '2rem 32px', width: '100%', maxWidth: 'none' }}>
            <header className="lab-atend-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <div>
                    <h1 className="lab-title">Atendimento / Coleta</h1>
                    <p className="lab-subtitle">Busque ou cadastre um paciente para iniciar</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-primary" onClick={handleOpenModalForNewPatient}>
                        <UserPlus size={16} /> Novo Paciente
                    </button>
                </div>
            </header>

            <div className="lab-filters-card" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', marginBottom: '1.5rem' }}>
                <div className="lab-filter-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Localizar Paciente</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={18} className="lab-search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input 
                            ref={searchRef}
                            type="text" 
                            placeholder="Digite o nome, código, CNS ou CPF..." 
                            value={searchTerm}
                            onChange={handleSearchTermChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    // Enter não faz mais a busca manual, apenas previne submissões indevidas
                                }
                            }}
                            style={{ width: '100%', padding: '0.85rem 2.5rem 0.85rem 2.5rem', fontSize: '1.05rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                        />
                        {isSearchingPatient && (
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 500 }}>
                                <span>Buscando...</span>
                                <Loader2 size={16} className="spin" />
                            </div>
                        )}
                    </div>
                </div>

                {searchError && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', border: '1px dashed #ef4444', borderRadius: '8px', textAlign: 'center', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={18} /> {searchError}
                    </div>
                )}
                
                {successMessage && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#ecfdf5', border: '1px dashed #10b981', borderRadius: '8px', textAlign: 'center', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <CheckCircle2 size={18} /> {successMessage}
                    </div>
                )}
            </div>

            <div>
                {!searchTerm.trim() && !hasSearchedPatient ? (
                    isLoadingRecent ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                            <Loader2 className="animate-spin text-primary" size={24} />
                        </div>
                    ) : (
                        renderPatientList(
                            recentPatients,
                            `Pacientes recentes (${recentPatients.length})`,
                            "Selecione um paciente para iniciar o atendimento ou cadastre um novo.",
                            "Cadastre um paciente para iniciar.",
                            false
                        )
                    )
                ) : hasSearchedPatient && !searchError ? (
                    renderPatientList(
                        pacientesResult,
                        `Pacientes encontrados (${pacientesResult.length})`,
                        "Selecione um paciente para iniciar o atendimento.",
                        "Verifique o nome, código, CPF, RG ou CNS informado.",
                        true
                    )
                ) : null}
            </div>

            {/* Modal Operacional */}
            {isOperacionalModalOpen && (
                <LaboratorioOperacionalModal
                    isOpen={isOperacionalModalOpen}
                    initialPatient={selectedPatientForModal}
                    onClose={handleCloseOperacionalModal}
                    onSuccess={handleModalSuccess}
                />
            )}
            
            <style>{`
                .fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default LaboratorioAtendimento;
