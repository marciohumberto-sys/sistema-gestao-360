import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Search, UserPlus, Save, User, 
    FileText, Plus, X, Beaker, 
    CheckCircle2, Activity, FlaskConical, Loader2, AlertCircle, UserSearch, ChevronDown, AlertTriangle
} from 'lucide-react';
import { laboratorioAtendimentoService } from '../../services/api/laboratorioAtendimento.service';
import { ATTENDANCE_ORIGINS } from '../../utils/laboratorioHelpers';
import PacienteFormModal from '../../components/laboratorio/PacienteFormModal';
import './LaboratorioAtendimento.css';

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getLocalTimeInputValue = (date = new Date()) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const LaboratorioAtendimento = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Estados gerais
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Pacientes
    const [searchTerm, setSearchTerm] = useState('');
    const [pacientesResult, setPacientesResult] = useState([]);
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);
    const [hasSearchedPatient, setHasSearchedPatient] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // Exames
    const [examesAtivos, setExamesAtivos] = useState([]);
    const [exameSearch, setExameSearch] = useState('');
    const [selectedSetor, setSelectedSetor] = useState('Todos');
    const [examesSolicitados, setExamesSolicitados] = useState([]);
    const [setoresDisponiveis, setSetoresDisponiveis] = useState(['Todos']);

    // Estados de Modais
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [tempSelectedExams, setTempSelectedExams] = useState([]);
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    
    const [confirmModal, setConfirmModal] = useState({ 
        open: false, 
        type: '', 
        title: '', 
        message: '', 
        onConfirm: null 
    });

    // Dados do Atendimento
    const [attendanceData, setAttendanceData] = useState({
        attendance_date: getLocalDateInputValue(),
        attendance_time: getLocalTimeInputValue(),
        attendance_origin: '',
        requesting_doctor: '',
        expected_delivery_date: '',
        fasting: '',
        dum: '',
        diagnosis: '',
        medications: '',
        observations: ''
    });

    const [isOriginDropdownOpen, setIsOriginDropdownOpen] = useState(false);
    
    // Refs
    const initialData = useRef({ date: getLocalDateInputValue(), time: getLocalTimeInputValue() });
    const savingRef = useRef(false);
    const dateRef = useRef(null);
    const timeRef = useRef(null);
    const originRef = useRef(null);
    const searchRef = useRef(null);
    const examSectionRef = useRef(null);

    useEffect(() => {
        carregarExames();
    }, []);

    useEffect(() => {
        if (location.state && location.state.openNewAttendance && location.state.patient) {
            const { patient } = location.state;
            handleSelectPatient(patient);
            
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.state, navigate, location.pathname]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isExamModalOpen && !isSaving) {
                setIsExamModalOpen(false);
                setTempSelectedExams([]);
            }
        };
        const handleClickOutside = (e) => {
            if (originRef.current && !originRef.current.contains(e.target)) {
                setIsOriginDropdownOpen(false);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExamModalOpen, isSaving]);

    const carregarExames = async () => {
        try {
            const exames = await laboratorioAtendimentoService.buscarExamesAtivos();
            setExamesAtivos(exames);
            const setores = [...new Set(exames.map(e => e.sector_name))].filter(Boolean);
            setSetoresDisponiveis(['Todos', ...setores]);
        } catch (error) {
            console.error('Erro ao buscar exames:', error);
        }
    };

    const handleSearchTermChange = (e) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        setHasSearchedPatient(false);
        setSearchError(null);
        setPacientesResult([]);
    };

    const handleSearchPatient = async () => {
        const termoLimpo = searchTerm.trim();
        
        if (!termoLimpo) {
            setPacientesResult([]);
            setHasSearchedPatient(false);
            setSearchError(null);
            return;
        }
        
        if (termoLimpo.length < 3) return;

        setIsSearchingPatient(true);
        setSearchError(null);
        setHasSearchedPatient(false);
        try {
            const pacientesEncontrados = await laboratorioAtendimentoService.buscarPacientes(termoLimpo);
            setPacientesResult(Array.isArray(pacientesEncontrados) ? pacientesEncontrados : []);
            setHasSearchedPatient(true);
        } catch (error) {
            console.error(error);
            setPacientesResult([]);
            setSearchError('Não foi possível consultar os pacientes. Tente novamente.');
            setHasSearchedPatient(false);
        } finally {
            setIsSearchingPatient(false);
        }
    };

    const handleSelectPatient = (paciente) => {
        if (paciente.is_active === false) {
            setFeedback({ type: 'error', text: 'Este paciente está inativo e não pode receber novo atendimento.' });
            return;
        }
        
        setSelectedPatient(paciente);
        setPacientesResult([]);
        setSearchTerm('');
        setHasSearchedPatient(false);
        setSearchError(null);
        setFeedback(null);
        
        setTimeout(() => {
            const patientDataSection = document.getElementById('patient-data-section');
            if (patientDataSection) {
                patientDataSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    const removerExame = (id) => {
        setExamesSolicitados(examesSolicitados.filter(e => e.id !== id));
    };

    const examesFiltrados = examesAtivos.filter(e => {
        const matchSearch = e.name.toLowerCase().includes(exameSearch.toLowerCase()) || e.code.toLowerCase().includes(exameSearch.toLowerCase());
        const matchSetor = selectedSetor === 'Todos' || e.sector_name === selectedSetor;
        return matchSearch && matchSetor;
    });

    const examesDisponiveis = examesFiltrados.filter(
        exame => !examesSolicitados.some(selecionado => selecionado.id === exame.id)
    );

    const handleOpenExamModal = () => {
        setExameSearch('');
        setSelectedSetor('Todos');
        setTempSelectedExams([]);
        setIsExamModalOpen(true);
    };

    const handleCloseExamModal = () => {
        setIsExamModalOpen(false);
        setTempSelectedExams([]);
    };

    const toggleTempExamSelection = (exameId) => {
        setTempSelectedExams(prev => {
            if (prev.includes(exameId)) return prev.filter(id => id !== exameId);
            return [...prev, exameId];
        });
    };

    const confirmExamSelection = () => {
        const novos = examesAtivos.filter(e => tempSelectedExams.includes(e.id));
        
        let dupCount = 0;
        const validNovos = novos.filter(n => {
            if (examesSolicitados.some(s => s.id === n.id)) {
                dupCount++;
                return false;
            }
            return true;
        }).map(e => ({ ...e, status: 'Pendente inclusão' }));
        
        if (validNovos.length > 0) {
            setExamesSolicitados(prev => [...prev, ...validNovos]);
        }
        
        if (dupCount > 0) {
            setFeedback({ type: 'success', text: 'Este exame já foi adicionado.' }); // Mensagem discreta pedida
            setTimeout(() => setFeedback(null), 3000);
        }
        
        handleCloseExamModal();
    };

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

    const temAlteracoes = () => {
        return (
            selectedPatient !== null ||
            examesSolicitados.length > 0 ||
            attendanceData.attendance_origin !== '' ||
            attendanceData.requesting_doctor !== '' ||
            attendanceData.expected_delivery_date !== '' ||
            attendanceData.fasting !== '' ||
            attendanceData.dum !== '' ||
            attendanceData.diagnosis !== '' ||
            attendanceData.medications !== '' ||
            attendanceData.observations !== '' ||
            attendanceData.attendance_date !== initialData.current.date ||
            attendanceData.attendance_time !== initialData.current.time
        );
    };

    const handleLimpar = () => {
        if (temAlteracoes()) {
            setConfirmModal({
                open: true,
                type: 'cancel',
                title: 'Cancelar atendimento?',
                message: 'Os dados preenchidos e os exames adicionados serão descartados.',
                onConfirm: limparTudo
            });
        } else {
            limparTudo();
        }
    };

    const limparTudo = () => {
        setSelectedPatient(null);
        setExamesSolicitados([]);
        setAttendanceData({
            attendance_date: getLocalDateInputValue(),
            attendance_time: getLocalTimeInputValue(),
            attendance_origin: '',
            requesting_doctor: '',
            expected_delivery_date: '',
            fasting: '',
            dum: '',
            diagnosis: '',
            medications: '',
            observations: ''
        });
        setFeedback(null);
        setSearchTerm('');
        setPacientesResult([]);
        setHasSearchedPatient(false);
        setSearchError(null);
        setConfirmModal({ open: false });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const prepararSalvamento = () => {
        setFeedback(null);
        
        if (!selectedPatient) {
            setFeedback({ type: 'error', text: 'Selecione um paciente para iniciar o atendimento.' });
            if (searchRef.current) searchRef.current.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (!attendanceData.attendance_date) {
            setFeedback({ type: 'error', text: 'Informe uma data válida para o atendimento.' });
            if (dateRef.current) dateRef.current.focus();
            return;
        }
        if (!attendanceData.attendance_time) {
            setFeedback({ type: 'error', text: 'Informe um horário válido para o atendimento.' });
            if (timeRef.current) timeRef.current.focus();
            return;
        }
        if (!attendanceData.attendance_origin) {
            setFeedback({ type: 'error', text: 'Informe a Origem do Atendimento.' });
            if (originRef.current) originRef.current.focus();
            return;
        }
        if (examesSolicitados.length === 0) {
            setFeedback({ type: 'error', text: 'Adicione pelo menos um exame ao atendimento.' });
            if (examSectionRef.current) examSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Validação de data futura
        const dataInformada = new Date(`${attendanceData.attendance_date}T00:00:00`);
        const dataAtual = new Date(`${getLocalDateInputValue()}T00:00:00`);
        
        if (dataInformada > dataAtual) {
            setConfirmModal({
                open: true,
                type: 'future_date',
                title: 'Data futura',
                message: 'A data do atendimento é posterior à data atual. Deseja prosseguir mesmo assim?',
                onConfirm: abrirModalDeConfirmacaoSave
            });
        } else {
            abrirModalDeConfirmacaoSave();
        }
    };

    const abrirModalDeConfirmacaoSave = () => {
        setConfirmModal({
            open: true,
            type: 'save',
            title: 'Confirmar atendimento',
            message: 'Confirme os dados antes de gerar o atendimento e o protocolo.',
            onConfirm: executeSave
        });
    };

    const executeSave = async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        setIsSaving(true);
        setConfirmModal({ open: false });
        setFeedback(null);

        try {
            // Validar paciente ativo
            const pacienteCheck = await laboratorioAtendimentoService.verificarPacienteAtivo(selectedPatient.id);
            if (pacienteCheck.error) {
                throw new Error('Não foi possível validar o paciente. Verifique sua conexão e tente novamente.');
            }
            if (!pacienteCheck.active) {
                throw new Error('Este paciente foi inativado e não pode receber novo atendimento.');
            }

            // Validar exames inativos
            const idsExames = examesSolicitados.map(e => e.id);
            const examesInativos = await laboratorioAtendimentoService.verificarExamesAtivos(idsExames);
            if (examesInativos.length > 0) {
                const nomes = examesInativos.map(e => `${e.code} - ${e.name}`).join(', ');
                throw new Error(`O exame ${nomes} não está mais disponível. Remova-o para continuar.`);
            }

            const payload = {
                patient_id: selectedPatient.id,
                attendance_date: attendanceData.attendance_date,
                attendance_time: attendanceData.attendance_time,
                attendance_origin: attendanceData.attendance_origin,
                requesting_doctor: attendanceData.requesting_doctor || null,
                expected_delivery_date: attendanceData.expected_delivery_date || null,
                fasting: attendanceData.fasting || null,
                dum: attendanceData.dum || null,
                diagnosis: attendanceData.diagnosis || null,
                medications: attendanceData.medications || null,
                observations: attendanceData.observations || null,
            };

            const result = await laboratorioAtendimentoService.salvarAtendimentoTransacional(payload, examesSolicitados);
            
            // Limpeza real após sucesso
            limparTudo();
            setFeedback({ type: 'success', text: `Atendimento salvo com sucesso. Protocolo: ${result.protocolo}` });

        } catch (error) {
            setFeedback({ type: 'error', text: error.message || 'Não foi possível salvar o atendimento. Revise os dados e tente novamente.' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setIsSaving(false);
            savingRef.current = false;
        }
    };

    const totalSetoresUnicos = [...new Set(examesSolicitados.map(e => e.sector_name))].length;

    return (
        <div className="lab-atend-container">
            <header className="lab-atend-header">
                <div>
                    <h1 className="lab-title">Atendimento / Coleta</h1>
                    <p className="lab-subtitle">Cadastro do paciente, abertura do atendimento e solicitação de exames</p>
                </div>
                <div className="lab-header-actions">
                    {temAlteracoes() && !isSaving && (
                        <button className="lab-btn lab-btn-outline" onClick={handleLimpar} disabled={isSaving}>
                            <X size={16} /> Limpar
                        </button>
                    )}
                </div>
            </header>

            {feedback && (
                <div style={{ padding: '1.25rem', marginBottom: '1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`, color: feedback.type === 'success' ? '#047857' : '#b91c1c', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    {feedback.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                    <span style={{ fontWeight: 600, fontSize: '1.05rem', whiteSpace: 'pre-line' }}>{feedback.text}</span>
                </div>
            )}

            <div className="lab-atend-layout" style={{ gridTemplateColumns: selectedPatient ? '1fr 320px' : '1fr' }}>
                {/* Coluna Principal */}
                <div className="lab-atend-main" style={{ width: selectedPatient ? 'auto' : '100%', transition: 'all 0.3s ease' }}>
                    
                    {/* Busca de Paciente */}
                    <div className="lab-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><Search size={18} /> Localizar Paciente</h3>
                        </div>
                        <div className="lab-search-row">
                            <div className="lab-search-input-group">
                                <Search size={16} className="lab-search-icon" />
                                <input 
                                    ref={searchRef}
                                    type="text" 
                                    placeholder="Buscar por nome, CNS ou CPF..." 
                                    value={searchTerm}
                                    onChange={handleSearchTermChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSearchPatient();
                                        }
                                    }}
                                    disabled={isSaving}
                                />
                            </div>
                            <button className="lab-btn lab-btn-primary" onClick={handleSearchPatient} disabled={isSearchingPatient || isSaving || searchTerm.length < 3}>
                                {isSearchingPatient ? <Loader2 size={16} className="spin" /> : 'Buscar'}
                            </button>
                            <button className="lab-btn lab-btn-outline" disabled={isSaving} onClick={() => setIsPatientModalOpen(true)}>
                                <UserPlus size={16} /> Novo paciente
                            </button>
                        </div>

                        {hasSearchedPatient && !isSearchingPatient && !searchError && Array.isArray(pacientesResult) && pacientesResult.length === 0 && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
                                Nenhum paciente encontrado para a busca atual. Verifique a digitação ou cadastre um novo.
                            </div>
                        )}

                        {searchError && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', border: '1px dashed #ef4444', borderRadius: '8px', textAlign: 'center', color: '#b91c1c' }}>
                                {searchError}
                            </div>
                        )}

                        {pacientesResult.length > 0 && (
                            <div style={{ marginTop: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                <table className="lab-table">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>CNS</th>
                                            <th>CPF</th>
                                            <th>Data Nasc.</th>
                                            <th style={{ textAlign: 'center', width: '130px' }}>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pacientesResult.map(pac => (
                                            <tr key={pac.id} style={{ opacity: pac.is_active === false ? 0.6 : 1 }}>
                                                <td className="font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {pac.name || pac.full_name}
                                                    {pac.is_active === false && <span className="lab-badge lab-badge-gray" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Inativo</span>}
                                                </td>
                                                <td>{pac.cns || '---'}</td>
                                                <td>{formatCpf(pac.cpf)}</td>
                                                <td>{pac.birth_date ? new Date(pac.birth_date).toLocaleDateString('pt-BR') : '---'}</td>
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <button 
                                                        className="lab-btn lab-btn-secondary" 
                                                        style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-block', opacity: pac.is_active === false ? 0.5 : 1 }} 
                                                        onClick={() => handleSelectPatient(pac)}
                                                    >
                                                        Selecionar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {!selectedPatient && (
                        <div style={{ 
                            margin: '1rem auto 0', padding: '2rem 1.5rem', minHeight: '260px', maxWidth: '500px',
                            textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem'
                        }}>
                            <div style={{ background: '#e2e8f0', padding: '0.85rem', borderRadius: '50%', color: '#64748b', marginBottom: '0.5rem' }}>
                                <UserSearch size={32} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#334155' }}>Selecione um paciente para iniciar</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: '1.4' }}>
                                Localize um paciente existente ou cadastre um novo paciente para continuar o atendimento.
                            </p>
                        </div>
                    )}

                    {selectedPatient && (
                        <div className="lab-info-grid fade-in" id="patient-data-section">
                            
                            <div className="lab-card">
                                <div className="lab-card-header">
                                    <h3 className="lab-card-title"><User size={18} /> Dados do Paciente</h3>
                                    {selectedPatient && <span className="lab-badge lab-badge-success">Selecionado</span>}
                                </div>
                                <div className="lab-data-grid">
                                    <div className="lab-data-item full-width">
                                        <label>Nome do paciente</label>
                                        <div className="lab-data-value highlighted">{selectedPatient.name || selectedPatient.full_name || '---'}</div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>CNS / Cartão SUS</label>
                                        <div className="lab-data-value">{selectedPatient.cns || '---'}</div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>CPF</label>
                                        <div className="lab-data-value">{formatCpf(selectedPatient.cpf)}</div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>RG</label>
                                        <div className="lab-data-value">{selectedPatient.rg || '---'}</div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>Nascimento / Idade</label>
                                        <div className="lab-data-value">{selectedPatient.birth_date ? `${new Date(selectedPatient.birth_date).toLocaleDateString('pt-BR')} (${calculateAge(selectedPatient.birth_date)})` : '---'}</div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>Sexo</label>
                                        <div className="lab-data-value">{selectedPatient.gender || selectedPatient.sex || '---'}</div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>Celular</label>
                                        <div className="lab-data-value">{selectedPatient.phone_number || selectedPatient.mobile || '---'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="lab-card fade-in">
                                <div className="lab-card-header">
                                    <h3 className="lab-card-title"><FileText size={18} /> Dados do Atendimento</h3>
                                    <span className="lab-badge lab-badge-warning">Novo</span>
                                </div>
                                <div className="lab-data-grid">
                                    <div className="lab-data-item">
                                        <label>Data <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div className="lab-data-value" style={{ padding: '0.2rem', border: feedback?.text?.includes('data válida') ? '1px solid #ef4444' : 'none', borderRadius: '6px' }}>
                                            <input ref={dateRef} type="date" value={attendanceData.attendance_date} onChange={e => setAttendanceData({...attendanceData, attendance_date: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                        </div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>Hora <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div className="lab-data-value" style={{ padding: '0.2rem', border: feedback?.text?.includes('horário válido') ? '1px solid #ef4444' : 'none', borderRadius: '6px' }}>
                                            <input ref={timeRef} type="time" value={attendanceData.attendance_time} onChange={e => setAttendanceData({...attendanceData, attendance_time: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                        </div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>ORIGEM <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div 
                                            ref={originRef}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setIsOriginDropdownOpen(!isOriginDropdownOpen);
                                                }
                                            }}
                                            className="lab-data-value" 
                                            style={{ 
                                                padding: '0.35rem 0.6rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                cursor: isSaving ? 'not-allowed' : 'pointer', border: feedback?.text === 'Informe a Origem do Atendimento.' ? '1px solid #ef4444' : '1px solid #f1f5f9',
                                                outline: 'none', boxShadow: feedback?.text === 'Informe a Origem do Atendimento.' ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
                                                minHeight: '36px'
                                            }}
                                            onClick={() => { if (!isSaving) setIsOriginDropdownOpen(!isOriginDropdownOpen); }}
                                        >
                                            <span style={{ color: attendanceData.attendance_origin ? '#0f172a' : '#64748b', fontSize: '0.9rem' }}>
                                                {attendanceData.attendance_origin ? ATTENDANCE_ORIGINS.find(o => o.value === attendanceData.attendance_origin)?.label : 'Selecione a origem...'}
                                            </span>
                                            <ChevronDown size={16} color="#64748b" style={{ transform: isOriginDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}/>
                                            
                                            {isOriginDropdownOpen && !isSaving && (
                                                <div style={{
                                                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                                                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, overflow: 'hidden',
                                                    animation: 'slideDownDropdown 200ms ease-out forwards', transformOrigin: 'top center'
                                                }}>
                                                    {ATTENDANCE_ORIGINS.map(origin => (
                                                        <div 
                                                            key={origin.value}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAttendanceData({...attendanceData, attendance_origin: origin.value});
                                                                setIsOriginDropdownOpen(false);
                                                                if (feedback?.text === 'Informe a Origem do Atendimento.') setFeedback(null);
                                                            }}
                                                            style={{
                                                                padding: '0.5rem 0.75rem', cursor: 'pointer',
                                                                background: attendanceData.attendance_origin === origin.value ? '#eff6ff' : 'transparent',
                                                                color: attendanceData.attendance_origin === origin.value ? '#1d4ed8' : '#334155',
                                                                fontWeight: attendanceData.attendance_origin === origin.value ? '600' : '500',
                                                                fontSize: '0.9rem', transition: 'background 150ms'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.background = attendanceData.attendance_origin === origin.value ? '#eff6ff' : '#f8fafc'}
                                                            onMouseLeave={(e) => e.target.style.background = attendanceData.attendance_origin === origin.value ? '#eff6ff' : 'transparent'}
                                                        >
                                                            {origin.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>Médico solicitante (Opcional)</label>
                                        <div className="lab-data-value" style={{ padding: '0.2rem' }}>
                                            <input type="text" placeholder="Nome do médico..." value={attendanceData.requesting_doctor} onChange={e => setAttendanceData({...attendanceData, requesting_doctor: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                        </div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>Previsão de entrega (Opcional)</label>
                                        <div className="lab-data-value" style={{ padding: '0.2rem' }}>
                                            <input type="date" value={attendanceData.expected_delivery_date} onChange={e => setAttendanceData({...attendanceData, expected_delivery_date: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                        </div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>Jejum (Opcional)</label>
                                        <div className="lab-data-value" style={{ padding: '0.2rem' }}>
                                            <input type="text" placeholder="Ex: 12 horas" value={attendanceData.fasting} onChange={e => setAttendanceData({...attendanceData, fasting: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                        </div>
                                    </div>
                                    <div className="lab-data-item">
                                        <label>DUM (Opcional)</label>
                                        <div className="lab-data-value" style={{ padding: '0.2rem' }}>
                                            <input type="date" value={attendanceData.dum} onChange={e => setAttendanceData({...attendanceData, dum: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                        </div>
                                    </div>
                                    <div className="lab-data-item full-width">
                                        <label>Diagnóstico (Opcional)</label>
                                        <div className="lab-data-value" style={{ padding: '0.2rem' }}>
                                            <input type="text" placeholder="Suspeitas clínicas..." value={attendanceData.diagnosis} onChange={e => setAttendanceData({...attendanceData, diagnosis: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                        </div>
                                    </div>
                                    <div className="lab-data-item full-width">
                                        <label>Medicamentos em uso (Opcional)</label>
                                        <div className="lab-data-value" style={{ padding: '0.2rem' }}>
                                            <input type="text" placeholder="Relacionar medicamentos..." value={attendanceData.medications} onChange={e => setAttendanceData({...attendanceData, medications: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                        </div>
                                    </div>
                                    <div className="lab-data-item full-width">
                                        <label>Observações</label>
                                        <div className="lab-data-value" style={{ padding: '0.2rem' }}>
                                            <input type="text" placeholder="Notas internas..." value={attendanceData.observations} onChange={e => setAttendanceData({...attendanceData, observations: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedPatient && (
                        <div className="lab-card fade-in" ref={examSectionRef}>
                            <div className="lab-card-header">
                                <h3 className="lab-card-title"><Beaker size={18} /> Adicionar Exames</h3>
                            </div>
                            <div className="lab-exam-search-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '1.5rem' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>Catálogo de Exames</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Pesquise e adicione múltiplos exames ao atendimento de uma só vez.</p>
                                </div>
                                <button type="button" className="lab-btn lab-btn-primary" onClick={handleOpenExamModal} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Search size={16} /> Pesquisar e adicionar exames
                                </button>
                            </div>

                            <div className="lab-table-container">
                                <table className="lab-table" style={{ tableLayout: 'fixed', width: '100%', maxWidth: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '10%' }}>Código</th>
                                            <th style={{ width: '34%' }}>Exame</th>
                                            <th style={{ width: '16%' }}>Setor</th>
                                            <th style={{ width: '15%' }}>Material</th>
                                            <th style={{ width: '18%' }}>Status</th>
                                            <th className="text-right" style={{ width: '7%' }}>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {examesSolicitados.map((exame) => (
                                            <tr key={exame.id}>
                                                <td className="font-semibold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exame.code}</td>
                                                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exame.name}>{exame.name}</td>
                                                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span className="lab-sector-tag">{exame.sector_name}</span></td>
                                                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exame.material || 'Não inf.'}</td>
                                                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span className="lab-status-tag status-warning">{exame.status}</span></td>
                                                <td className="text-right">
                                                    <button className="lab-icon-btn lab-text-red" data-tooltip="Remover exame" onClick={() => removerExame(exame.id)} disabled={isSaving}>
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {examesSolicitados.length === 0 && (
                                            <tr><td colSpan="6" className="text-center py-8" style={{ color: feedback?.text?.includes('Adicione pelo') ? '#ef4444' : '#64748b' }}>Nenhum exame adicionado ao atendimento.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>

                {selectedPatient && (
                    <div className="lab-atend-sidebar fade-in" style={{ display: 'block' }}>
                        <div className="lab-card lab-summary-card" style={{ position: 'sticky', top: '2rem' }}>
                            <div className="lab-card-header">
                                <h3 className="lab-card-title"><Activity size={18} /> Resumo do Atendimento</h3>
                            </div>
                            
                            <div className="lab-summary-stats">
                                <div className="lab-summary-item">
                                    <div className="lab-summary-icon"><FlaskConical size={20} /></div>
                                    <div className="lab-summary-info">
                                        <span className="lab-summary-label">Total de Exames</span>
                                        <span className="lab-summary-value">{examesSolicitados.length}</span>
                                    </div>
                                </div>
                                <div className="lab-summary-item">
                                    <div className="lab-summary-icon"><Beaker size={20} /></div>
                                    <div className="lab-summary-info">
                                        <span className="lab-summary-label">Setores Envolvidos</span>
                                        <span className="lab-summary-value">{totalSetoresUnicos}</span>
                                    </div>
                                </div>
                                <div className="lab-summary-item">
                                    <div className="lab-summary-icon"><FileText size={20} /></div>
                                    <div className="lab-summary-info">
                                        <span className="lab-summary-label">Status Previsto</span>
                                        <span className="lab-summary-value" style={{ color: '#b45309', fontSize: '1.1rem' }}>Em Aberto</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lab-summary-actions">
                                <button className="lab-btn lab-btn-success lab-btn-block" onClick={prepararSalvamento} disabled={isSaving}>
                                    {isSaving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} 
                                    {isSaving ? 'Salvando...' : 'Salvar Atendimento'}
                                </button>
                                <button className="lab-btn lab-btn-outline lab-btn-block" onClick={handleLimpar} disabled={isSaving}>
                                    <X size={18} /> Cancelar / Limpar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
            
            <style>{`
                .fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                [data-tooltip] { position: relative; cursor: pointer; }
                [data-tooltip]:hover::after {
                    content: attr(data-tooltip); position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%);
                    background: #1e293b; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px;
                    white-space: nowrap; pointer-events: none; z-index: 100;
                }
            `}</style>

            <PacienteFormModal 
                isOpen={isPatientModalOpen} mode="create" onClose={() => setIsPatientModalOpen(false)}
                onSuccess={(msg, newPatient) => {
                    setFeedback({ type: 'success', text: msg });
                    setIsPatientModalOpen(false);
                    if (newPatient) handleSelectPatient(newPatient);
                }}
                onError={(msg) => setFeedback({ type: 'error', text: msg })}
            />

            {isExamModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => { if(e.target === e.currentTarget && tempSelectedExams.length === 0) handleCloseExamModal(); }}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '960px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Beaker size={20} className="lab-text-primary" /> Adicionar exames</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>Pesquise e selecione os exames deste atendimento.</p>
                            </div>
                            <button type="button" onClick={handleCloseExamModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div className="lab-search-input-group" style={{ flex: '1', minWidth: '250px', background: '#fff' }}>
                                <Search size={16} className="lab-search-icon" />
                                <input type="text" placeholder="Pesquisar por código ou nome..." value={exameSearch} onChange={e => setExameSearch(e.target.value)} autoFocus />
                            </div>
                            <select className="lab-select" value={selectedSetor} onChange={(e) => setSelectedSetor(e.target.value)} style={{ width: '200px', background: '#fff' }}>
                                {setoresDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0', background: '#f8fafc' }}>
                            {examesDisponiveis.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Nenhum exame encontrado para os filtros informados.</div>
                            ) : (
                                <table className="lab-table" style={{ margin: 0, border: 'none' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 10 }}>
                                        <tr><th style={{ width: '40px', textAlign: 'center' }}></th><th>Código</th><th>Nome do Exame</th><th>Setor</th><th>Material</th></tr>
                                    </thead>
                                    <tbody>
                                        {examesDisponiveis.map(ex => {
                                            const isChecked = tempSelectedExams.includes(ex.id);
                                            return (
                                                <tr key={ex.id} onClick={() => toggleTempExamSelection(ex.id)} style={{ cursor: 'pointer', background: isChecked ? '#eff6ff' : '#fff' }}>
                                                    <td style={{ textAlign: 'center' }}><input type="checkbox" checked={isChecked} onChange={() => {}} style={{ cursor: 'pointer', width: '16px', height: '16px' }} /></td>
                                                    <td className="font-semibold" style={{ color: '#3b82f6' }}>{ex.code}</td>
                                                    <td style={{ fontWeight: 500, color: '#0f172a' }}>{ex.name}</td>
                                                    <td><span className="lab-sector-tag">{ex.sector_name}</span></td>
                                                    <td style={{ color: '#64748b' }}>{ex.material || '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                            <div style={{ fontSize: '0.95rem', color: tempSelectedExams.length > 0 ? '#0f172a' : '#64748b', fontWeight: tempSelectedExams.length > 0 ? 600 : 400 }}>
                                {tempSelectedExams.length === 0 ? 'Nenhum exame selecionado' : `${tempSelectedExams.length} exame${tempSelectedExams.length > 1 ? 's' : ''} selecionado${tempSelectedExams.length > 1 ? 's' : ''}`}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="lab-btn lab-btn-secondary" onClick={handleCloseExamModal}>Cancelar</button>
                                <button type="button" className="lab-btn lab-btn-primary" onClick={confirmExamSelection} disabled={tempSelectedExams.length === 0}>
                                    Adicionar selecionados {tempSelectedExams.length > 0 ? `(${tempSelectedExams.length})` : ''}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Customizado Unificado de Confirmação e Validação */}
            {confirmModal.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: confirmModal.type === 'cancel' ? '#ef4444' : confirmModal.type === 'future_date' ? '#f59e0b' : '#3b82f6' }}>
                            {confirmModal.type === 'cancel' ? <AlertTriangle size={28} /> : confirmModal.type === 'future_date' ? <AlertCircle size={28} /> : <FileText size={28} />}
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{confirmModal.title}</h3>
                        </div>
                        
                        <p style={{ margin: '0 0 1.5rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            {confirmModal.message}
                        </p>
                        
                        {confirmModal.type === 'save' && (
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                <div style={{ marginBottom: '0.5rem' }}><strong>Paciente:</strong> {selectedPatient?.name || selectedPatient?.full_name}</div>
                                <div style={{ marginBottom: '0.5rem' }}><strong>Origem:</strong> {ATTENDANCE_ORIGINS.find(o => o.value === attendanceData.attendance_origin)?.label}</div>
                                <div style={{ marginBottom: '0.5rem' }}><strong>Data/Hora:</strong> {new Date(`${attendanceData.attendance_date}T00:00:00`).toLocaleDateString('pt-BR')} às {attendanceData.attendance_time}</div>
                                <div style={{ marginBottom: '0.5rem' }}><strong>Qtd. Exames:</strong> {examesSolicitados.length}</div>
                                
                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Lista de Exames:</div>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#64748b' }}>
                                        {examesSolicitados.slice(0, 3).map(e => <li key={e.id}>{e.code} - {e.name}</li>)}
                                        {examesSolicitados.length > 3 && (
                                            <li style={{ color: '#94a3b8', fontStyle: 'italic', listStyleType: 'none', marginLeft: '-1.2rem', marginTop: '0.25rem' }}>
                                                + {examesSolicitados.length - 3} exame(s)...
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button 
                                className="lab-btn lab-btn-secondary" 
                                onClick={() => setConfirmModal({ open: false })}
                                disabled={isSaving}
                            >
                                {confirmModal.type === 'cancel' ? 'Continuar preenchendo' : confirmModal.type === 'future_date' ? 'Cancelar' : 'Voltar e revisar'}
                            </button>
                            <button 
                                className={`lab-btn ${confirmModal.type === 'cancel' ? 'lab-btn-danger' : 'lab-btn-success'}`}
                                style={confirmModal.type === 'cancel' ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : {}}
                                onClick={confirmModal.onConfirm}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 size={16} className="spin" /> : null}
                                {confirmModal.type === 'cancel' ? 'Descartar atendimento' : confirmModal.type === 'future_date' ? 'Confirmar data' : 'Confirmar e salvar'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default LaboratorioAtendimento;
