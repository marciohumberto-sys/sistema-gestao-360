import React, { useState, useEffect, useRef } from 'react';
import { 
    Loader2, X, Beaker, FileText, Activity, Save, AlertTriangle, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, User
} from 'lucide-react';
import { laboratorioPacientesService } from '../../services/api/laboratorioPacientes.service';
import { laboratorioAtendimentoService } from '../../services/api/laboratorioAtendimento.service';
import { ATTENDANCE_ORIGINS } from '../../utils/laboratorioHelpers';
import PacienteForm, { initialFormData, validatePacienteForm, handlePacienteChange, normalizePacienteDataForSave, applyCpfMask, applyPhoneMask, applyCepMask } from './PacienteForm';

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getLocalTimeInputValue = (date = new Date()) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

const LaboratorioOperacionalModal = ({ isOpen, onClose, initialPatient = null, onSuccess }) => {
    // --- ESTADOS DO PACIENTE ---
    const mode = initialPatient ? 'edit' : 'create';
    const [patientData, setPatientData] = useState(initialFormData);
    const [originalPatientData, setOriginalPatientData] = useState(initialFormData);
    const [patientFormErrors, setPatientFormErrors] = useState({});
    const [isPatientExpanded, setIsPatientExpanded] = useState(!initialPatient);
    const [internalPatientId, setInternalPatientId] = useState(initialPatient?.id || null);
    
    // --- ESTADOS DO ATENDIMENTO ---
    const [attendanceData, setAttendanceData] = useState({
        attendance_date: getLocalDateInputValue(),
        attendance_time: getLocalTimeInputValue(),
        attendance_origin: 'CENTRAL',
        requesting_doctor: '',
        expected_delivery_date: '',
        fasting: '',
        dum: '',
        diagnosis: '',
        medications: '',
        observations: ''
    });

    const [isOriginDropdownOpen, setIsOriginDropdownOpen] = useState(false);
    
    // --- EXAMES ---
    const [examesSolicitados, setExamesSolicitados] = useState([]);
    const [examesAtivos, setExamesAtivos] = useState([]);
    const [quickExamInput, setQuickExamInput] = useState('');
    const [examSuggestions, setExamSuggestions] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [exameSearch, setExameSearch] = useState('');
    const [selectedSetor, setSelectedSetor] = useState('Todos');
    const [setoresDisponiveis, setSetoresDisponiveis] = useState(['Todos']);
    const [tempSelectedExams, setTempSelectedExams] = useState([]);

    // --- CONTROLE GERAL ---
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, type: '', title: '', message: '', onConfirm: null, cancelText: 'Cancelar', confirmText: 'Confirmar' });

    // --- REFS ---
    const quickExamInputRef = useRef(null);
    const examsTableEndRef = useRef(null);
    const originRef = useRef(null);
    const dateRef = useRef(null);
    const timeRef = useRef(null);
    const prevExamsLengthRef = useRef(0);
    const savingRef = useRef(false);
    const isSuccessRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            carregarExames();
            setFeedback(null);
            setPatientFormErrors({});
            setIsPatientExpanded(!initialPatient);
            setInternalPatientId(initialPatient?.id || null);
            setExamesSolicitados([]);
            isSuccessRef.current = false;
            
            setAttendanceData({
                attendance_date: getLocalDateInputValue(),
                attendance_time: getLocalTimeInputValue(),
                attendance_origin: 'CENTRAL',
                requesting_doctor: '',
                expected_delivery_date: '',
                fasting: '',
                dum: '',
                diagnosis: '',
                medications: '',
                observations: ''
            });

            if (initialPatient) {
                loadPatientData(initialPatient.id);
            } else {
                setPatientData(initialFormData);
                setOriginalPatientData(initialFormData);
            }
        }
    }, [isOpen, initialPatient]);

    useEffect(() => {
        if (examesSolicitados.length > prevExamsLengthRef.current) {
            requestAnimationFrame(() => {
                if (examsTableEndRef.current) examsTableEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                if (quickExamInputRef.current) quickExamInputRef.current.focus();
            });
        }
        prevExamsLengthRef.current = examesSolicitados.length;
    }, [examesSolicitados]);

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

    const loadPatientData = async (id) => {
        try {
            setLoading(true);
            const data = await laboratorioPacientesService.buscarPacientePorId(id);
            const editData = {
                code: data.code || '',
                full_name: data.full_name || '',
                birth_date: data.birth_date || '',
                sex: data.sex || '',
                cpf: data.cpf ? applyCpfMask(data.cpf) : '',
                rg: data.rg || '',
                cns: data.cns || '',
                phone: data.phone ? applyPhoneMask(data.phone) : '',
                mobile: data.mobile ? applyPhoneMask(data.mobile) : '',
                mother_name: data.mother_name || '',
                father_name: data.father_name || '',
                zip_code: data.zip_code ? applyCepMask(data.zip_code) : '',
                street: data.street || '',
                number: data.number || '',
                complement: data.complement || '',
                district: data.district || '',
                city: data.city || '',
                state: data.state || '',
                notes: data.notes || '',
                is_active: data.is_active
            };
            setPatientData(editData);
            setOriginalPatientData(editData);
        } catch (err) {
            setFeedback({ type: 'error', text: 'Erro ao carregar dados do paciente.' });
        } finally {
            setLoading(false);
        }
    };

    const handlePatientChangeWrapper = (e) => handlePacienteChange(e, setPatientData, patientFormErrors, setPatientFormErrors);

    const hasPatientChanges = () => JSON.stringify(patientData) !== JSON.stringify(originalPatientData);
    
    const temAlteracoesReais = () => {
        return (
            hasPatientChanges() ||
            examesSolicitados.length > 0 ||
            attendanceData.attendance_origin !== 'CENTRAL' ||
            attendanceData.requesting_doctor !== '' ||
            attendanceData.expected_delivery_date !== '' ||
            attendanceData.fasting !== '' ||
            attendanceData.dum !== '' ||
            attendanceData.diagnosis !== '' ||
            attendanceData.medications !== '' ||
            attendanceData.observations !== '' ||
            attendanceData.attendance_date !== getLocalDateInputValue() ||
            attendanceData.attendance_time !== getLocalTimeInputValue()
        );
    };

    const handleCloseModal = () => {
        if (isSuccessRef.current) {
            onClose();
            return;
        }

        if (temAlteracoesReais() && !isSaving && !savingRef.current) {
            setConfirmModal({
                open: true,
                type: 'cancel',
                title: 'Descartar atendimento',
                message: 'Existem dados não salvos. Deseja descartar este atendimento e sair?',
                confirmText: 'Sair sem salvar',
                cancelText: 'Continuar preenchendo',
                onConfirm: () => {
                    setConfirmModal({ open: false });
                    onClose();
                }
            });
        } else {
            onClose();
        }
    };

    // --- QUICK EXAMS ---
    const handleQuickExamChange = (e) => {
        const val = e.target.value;
        setQuickExamInput(val);
        setHighlightedIndex(-1);
        if (val.trim().length === 0) {
            setExamSuggestions([]);
            return;
        }
        const searchLower = val.toLowerCase().trim();
        const results = examesAtivos.filter(ex => 
            ex.code.toLowerCase() === searchLower ||
            ex.code.toLowerCase().startsWith(searchLower) ||
            ex.name.toLowerCase().startsWith(searchLower) ||
            ex.name.toLowerCase().includes(searchLower)
        ).sort((a, b) => {
            if (a.code.toLowerCase() === searchLower) return -1;
            if (b.code.toLowerCase() === searchLower) return 1;
            if (a.code.toLowerCase().startsWith(searchLower) && !b.code.toLowerCase().startsWith(searchLower)) return -1;
            if (b.code.toLowerCase().startsWith(searchLower) && !a.code.toLowerCase().startsWith(searchLower)) return 1;
            return 0;
        }).slice(0, 8);
        setExamSuggestions(results);
    };

    const processQuickExamSelection = (exam) => {
        if (examesSolicitados.some(e => e.id === exam.id)) {
            setFeedback({ type: 'error', text: 'Este exame já foi incluído no atendimento.' });
            setQuickExamInput('');
            setExamSuggestions([]);
            setHighlightedIndex(-1);
            setTimeout(() => setFeedback(null), 3000);
            return;
        }
        setExamesSolicitados(prev => [...prev, { ...exam, status: 'Pendente inclusão' }]);
        setQuickExamInput('');
        setExamSuggestions([]);
        setHighlightedIndex(-1);
        setFeedback(null);
    };

    const handleQuickExamKeyDown = (e) => {
        if (!quickExamInput.trim()) return;
        if (e.key === 'Escape') {
            setExamSuggestions([]);
            setHighlightedIndex(-1);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < examSuggestions.length - 1 ? prev + 1 : prev));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            let selectedExam = null;
            if (highlightedIndex >= 0 && highlightedIndex < examSuggestions.length) {
                selectedExam = examSuggestions[highlightedIndex];
            } else if (examSuggestions.length === 1) {
                selectedExam = examSuggestions[0];
            } else {
                const exactMatch = examesAtivos.find(ex => ex.code.toLowerCase() === quickExamInput.trim().toLowerCase());
                if (exactMatch) selectedExam = exactMatch;
            }

            if (selectedExam) {
                processQuickExamSelection(selectedExam);
            } else if (examSuggestions.length === 0) {
                setFeedback({ type: 'error', text: 'Nenhum exame ativo encontrado.' });
                setTimeout(() => setFeedback(null), 3000);
            }
        }
    };

    const removerExame = (id) => {
        setExamesSolicitados(examesSolicitados.filter(e => e.id !== id));
    };

    // --- EXAM MODAL ---
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
        setTempSelectedExams(prev => prev.includes(exameId) ? prev.filter(id => id !== exameId) : [...prev, exameId]);
    };
    const confirmExamSelection = () => {
        const novos = examesAtivos.filter(e => tempSelectedExams.includes(e.id));
        let dupCount = 0;
        const validNovos = novos.filter(n => {
            if (examesSolicitados.some(s => s.id === n.id)) { dupCount++; return false; }
            return true;
        }).map(e => ({ ...e, status: 'Pendente inclusão' }));
        if (validNovos.length > 0) setExamesSolicitados(prev => [...prev, ...validNovos]);
        if (dupCount > 0) {
            setFeedback({ type: 'success', text: 'Este exame já foi adicionado.' });
            setTimeout(() => setFeedback(null), 3000);
        }
        handleCloseExamModal();
    };

    const examesFiltrados = examesAtivos.filter(e => {
        const matchSearch = e.name.toLowerCase().includes(exameSearch.toLowerCase()) || e.code.toLowerCase().includes(exameSearch.toLowerCase());
        const matchSetor = selectedSetor === 'Todos' || e.sector_name === selectedSetor;
        return matchSearch && matchSetor;
    });
    const examesDisponiveis = examesFiltrados.filter(ex => !examesSolicitados.some(s => s.id === ex.id));

    // --- SAVE FLOW ---
    const prepararSalvamento = () => {
        setFeedback(null);
        
        if (!validatePacienteForm(patientData, setPatientFormErrors)) {
            setFeedback({ type: 'error', text: 'Verifique os campos obrigatórios do paciente.' });
            setIsPatientExpanded(true);
            const section = document.getElementById('patient-section-top');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            if (quickExamInputRef.current) quickExamInputRef.current.focus();
            return;
        }

        const dataInformada = new Date(`${attendanceData.attendance_date}T00:00:00`);
        const dataAtual = new Date(`${getLocalDateInputValue()}T00:00:00`);
        
        if (dataInformada > dataAtual) {
            setConfirmModal({
                open: true,
                type: 'future_date',
                title: 'Data futura',
                message: 'A data do atendimento é posterior à data atual. Deseja prosseguir mesmo assim?',
                confirmText: 'Confirmar data',
                cancelText: 'Cancelar',
                onConfirm: () => checkPatientDuplicityAndSave()
            });
        } else {
            checkPatientDuplicityAndSave();
        }
    };

    const checkPatientDuplicityAndSave = async (forceSave = false) => {
        if (!forceSave && hasPatientChanges()) {
            setIsSaving(true);
            try {
                const cleanData = normalizePacienteDataForSave(patientData);
                const dupCheck = await laboratorioPacientesService.verificarDuplicidadePaciente(cleanData, internalPatientId);
                
                if (dupCheck.duplicadoForte) {
                    setFeedback({ type: 'error', text: dupCheck.motivo });
                    setIsSaving(false);
                    return;
                }
                if (dupCheck.alerta) {
                    setConfirmModal({
                        open: true,
                        type: 'duplicate',
                        title: 'Possível duplicidade',
                        message: dupCheck.motivo,
                        confirmText: 'Salvar mesmo assim',
                        cancelText: 'Revisar',
                        onConfirm: () => {
                            setConfirmModal({ open: false });
                            abrirModalDeConfirmacaoSave(true);
                        }
                    });
                    setIsSaving(false);
                    return;
                }
            } catch (err) {
                setFeedback({ type: 'error', text: 'Erro ao verificar duplicidade.' });
                setIsSaving(false);
                return;
            }
            
            // Fim do fluxo assíncrono de checagem. Devemos liberar o loading visual
            setIsSaving(false);
        }
        
        abrirModalDeConfirmacaoSave(forceSave);
    };

    const abrirModalDeConfirmacaoSave = (forcePatientSave = false) => {
        setConfirmModal({
            open: true,
            type: 'save',
            title: 'Confirmar atendimento',
            message: 'Confirme os dados antes de gerar o atendimento e o protocolo.',
            confirmText: 'Confirmar e salvar',
            cancelText: 'Voltar e revisar',
            onConfirm: () => executeSequentialSave(forcePatientSave)
        });
    };

    const executeSequentialSave = async (forcePatientSave = false) => {
        if (savingRef.current) return;
        savingRef.current = true;
        setIsSaving(true);
        setConfirmModal({ open: false });
        setFeedback(null);

        try {
            // STEP 1: Salvar Paciente (novo ou atualização se houver mudança)
            let finalPatientId = internalPatientId;
            let currentPatientData = patientData;
            
            if (hasPatientChanges() || !finalPatientId) {
                const cleanPatientData = normalizePacienteDataForSave(patientData);
                if (!finalPatientId) {
                    // Novo paciente
                    const resultPatient = await laboratorioPacientesService.criarPaciente(cleanPatientData);
                    finalPatientId = resultPatient.id;
                    setInternalPatientId(finalPatientId); // Guardar para não recriar se o atendimento falhar!
                    currentPatientData = { ...patientData, ...resultPatient };
                    setOriginalPatientData(currentPatientData);
                    setPatientData(currentPatientData);
                } else {
                    // Atualizar paciente existente
                    const resultPatient = await laboratorioPacientesService.atualizarPaciente(finalPatientId, cleanPatientData);
                    currentPatientData = { ...patientData, ...resultPatient };
                    setOriginalPatientData(currentPatientData);
                    setPatientData(currentPatientData);
                }
            }
            
            // Validar paciente ativo (por precaução)
            if (!currentPatientData.is_active) {
                throw new Error('Este paciente está inativado e não pode receber novo atendimento.');
            }

            // Validar exames inativos
            const idsExames = examesSolicitados.map(e => e.id);
            const examesInativos = await laboratorioAtendimentoService.verificarExamesAtivos(idsExames);
            if (examesInativos.length > 0) {
                const nomes = examesInativos.map(e => `${e.code} - ${e.name}`).join(', ');
                throw new Error(`O exame ${nomes} não está mais disponível. Remova-o para continuar.`);
            }

            // STEP 2: Salvar Atendimento
            const payload = {
                patient_id: finalPatientId,
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
            
            if (onSuccess) {
                isSuccessRef.current = true;
                onSuccess(`Atendimento salvo com sucesso. Protocolo: ${result.protocolo}`);
            }
            
        } catch (error) {
            setFeedback({ type: 'error', text: error.message || 'Não foi possível salvar o atendimento. Revise os dados e tente novamente.' });
            const modalContent = document.getElementById('operacional-modal-content');
            if (modalContent) modalContent.scrollTop = 0;
        } finally {
            setIsSaving(false);
            savingRef.current = false;
        }
    };

    // --- ATALHOS DE TECLADO ---
    useEffect(() => {
        if (!isOpen) return;

        const handleGlobalKeyDown = (e) => {
            // Ignorar atalhos durante o salvamento
            if (isSaving || savingRef.current) return;

            // Ctrl + Enter
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (confirmModal.open) {
                    if (confirmModal.type === 'save' && confirmModal.onConfirm) {
                        confirmModal.onConfirm();
                    }
                } else if (!isExamModalOpen) {
                    prepararSalvamento();
                }
                return;
            }

            // Alt + E (Focar Inclusão Rápida)
            if (e.altKey && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                if (!confirmModal.open && !isExamModalOpen && quickExamInputRef.current) {
                    quickExamInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => quickExamInputRef.current.focus(), 300);
                }
                return;
            }

            // Alt + O (Focar Origem)
            if (e.altKey && e.key.toLowerCase() === 'o') {
                e.preventDefault();
                if (!confirmModal.open && !isExamModalOpen && originRef.current) {
                    originRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => originRef.current.focus(), 300);
                }
                return;
            }

            // Alt + P (Focar Paciente)
            if (e.altKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                if (!confirmModal.open && !isExamModalOpen) {
                    setIsPatientExpanded(true);
                    const section = document.getElementById('patient-section-top');
                    if (section) {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setTimeout(() => {
                            const nameInput = document.getElementsByName('full_name')[0];
                            if (nameInput) nameInput.focus();
                        }, 300);
                    }
                }
                return;
            }

            // Enter (Avançar para o próximo campo apenas na sequência rápida)
            if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                if (e.defaultPrevented) return;
                if (examSuggestions.length > 0) return;
                
                const activeEl = document.activeElement;
                if (!activeEl) return;
                
                const tag = activeEl.tagName.toLowerCase();
                if (tag === 'button' || tag === 'textarea') return;
                
                const elName = activeEl.name;
                const isOrigin = originRef.current && (activeEl === originRef.current || originRef.current.contains(activeEl));
                
                // Verifica se está num dos campos da sequência principal
                const isMainSequence = (elName === 'full_name' || elName === 'birth_date' || elName === 'sex' || isOrigin);
                
                if (!isMainSequence) {
                    // Campos fora da sequência rápida (Data, Hora, Médico, Obs, ou grupos opcionais)
                    // são ignorados pelo Enter (não avançam foco). O usuário usará Tab.
                    return;
                }
                
                // Em selects nativos, precisamos permitir que a seleção (abrir/confirmar) do navegador ocorra
                // antes de mover o foco. Por isso, não fazemos e.preventDefault() para selects.
                if (tag !== 'select') {
                    e.preventDefault();
                }

                // Usamos setTimeout para permitir que blur/change e comportamentos nativos (como fechar select) processem
                setTimeout(() => {
                    let nextEl = null;
                    
                    if (elName === 'full_name') {
                        nextEl = document.getElementsByName('birth_date')[0];
                    } else if (elName === 'birth_date') {
                        nextEl = document.getElementsByName('sex')[0];
                    } else if (elName === 'sex') {
                        nextEl = originRef.current;
                    } else if (isOrigin) {
                        nextEl = quickExamInputRef.current;
                    }

                    if (nextEl) {
                        nextEl.focus();
                        if (nextEl.tagName.toLowerCase() === 'input' && ['text', 'number', 'tel', 'email'].includes(nextEl.type)) {
                            try { nextEl.select(); } catch (err) {}
                        }
                        nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 10);
                return;
            }

            // Esc
            if (e.key === 'Escape') {
                // Se pressionar Esc, evitar fechar o navegador nativamente se aplicável, 
                // mas a prioridade de fechamento é:
                // 1. Sugestões de exame
                if (examSuggestions.length > 0) {
                    e.preventDefault();
                    setExamSuggestions([]);
                    setHighlightedIndex(-1);
                    return;
                }
                // 2. Busca avançada
                if (isExamModalOpen) {
                    e.preventDefault();
                    handleCloseExamModal();
                    return;
                }
                // 3. Modal de Confirmação (qualquer um)
                if (confirmModal.open) {
                    e.preventDefault();
                    if (confirmModal.type === 'cancel') {
                        // Confirmação de descarte: Esc equivale a "Continuar preenchendo"
                        setConfirmModal({ open: false });
                    } else {
                        // Confirmação de salvamento, duplicidade, data futura
                        setConfirmModal({ open: false });
                    }
                    return;
                }
                // 4. Modal Operacional principal
                e.preventDefault();
                handleCloseModal();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isOpen, isSaving, confirmModal, isExamModalOpen, examSuggestions.length, patientData, attendanceData, examesSolicitados, internalPatientId]);

    if (!isOpen) return null;

    return (
        <div className="lab-modal-overlay" onClick={handleCloseModal} tabIndex={-1} style={{ zIndex: 9000 }}>
            <div className="lab-pac-modal-content" id="operacional-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95vw', maxHeight: '95vh' }}>
                <div className="lab-pac-modal-header">
                    <h2 className="lab-pac-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={24} className="lab-text-primary" />
                        {mode === 'create' && !internalPatientId ? 'Novo Paciente e Atendimento' : 'Novo Atendimento'}
                    </h2>
                    <button className="lab-modal-close" data-tooltip="Esc" onClick={handleCloseModal} disabled={isSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="lab-pac-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#f1f5f9', padding: '1.5rem' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                            <Loader2 size={32} className="spin" style={{ color: '#3b82f6' }} />
                        </div>
                    ) : (
                        <>
                            {feedback && (
                                <div style={{ padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`, color: feedback.type === 'success' ? '#047857' : '#b91c1c', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                    {feedback.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                    <span style={{ fontWeight: 600, fontSize: '1.05rem', whiteSpace: 'pre-line' }}>{feedback.text}</span>
                                </div>
                            )}

                            {/* SEÇÃO DO PACIENTE */}
                            <div className="lab-card" id="patient-section-top">
                                <div 
                                    className="lab-card-header" 
                                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
                                    onClick={() => setIsPatientExpanded(!isPatientExpanded)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={18} />
                                        <h3 className="lab-card-title" style={{ margin: 0 }}>Dados do Paciente</h3>
                                        {!isPatientExpanded && hasPatientChanges() && <span className="lab-badge lab-badge-warning">Alterado</span>}
                                        {internalPatientId && !hasPatientChanges() && <span className="lab-badge lab-badge-success">Cadastrado</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                        {!isPatientExpanded && <span style={{ fontSize: '0.85rem' }}>Alt + P para expandir</span>}
                                        {isPatientExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </div>
                                </div>
                                
                                {!isPatientExpanded && patientData.full_name && (
                                    <div style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                        <div><strong style={{ color: '#0f172a' }}>{patientData.full_name}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>Idade: </span><strong style={{ color: '#334155' }}>{calculateAge(patientData.birth_date)}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>Sexo: </span><strong style={{ color: '#334155' }}>{patientData.sex || '---'}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>CPF: </span><strong style={{ color: '#334155' }}>{formatCpf(patientData.cpf)}</strong></div>
                                    </div>
                                )}

                                {isPatientExpanded && (
                                    <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                        <PacienteForm 
                                            formData={patientData} 
                                            formErrors={patientFormErrors} 
                                            onChange={handlePatientChangeWrapper} 
                                            isSaving={isSaving}
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
                                {/* COLUNA PRINCIPAL - EXAMES */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="lab-card fade-in" style={{ position: 'relative', zIndex: 10 }}>
                                        <div className="lab-card-header">
                                            <h3 className="lab-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Dados do Atendimento</h3>
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
                                            <div className="lab-data-item" data-tooltip="Alt + O para focar Origem">
                                                <label>ORIGEM <span style={{ color: '#ef4444' }}>*</span></label>
                                                <div 
                                                    ref={originRef}
                                                    tabIndex={0}
                                                    onKeyDown={(e) => { 
                                                        if (e.key === ' ' || e.key === 'ArrowDown') { 
                                                            e.preventDefault(); 
                                                            setIsOriginDropdownOpen(true); 
                                                        } else if (e.key === 'Enter' && isOriginDropdownOpen) {
                                                            e.preventDefault();
                                                            setIsOriginDropdownOpen(false);
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
                                                        {attendanceData.attendance_origin ? ATTENDANCE_ORIGINS.find(o => o.value === attendanceData.attendance_origin)?.label : 'Selecione...'}
                                                    </span>
                                                    <ChevronDown size={16} color="#64748b" style={{ transform: isOriginDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}/>
                                                    
                                                    {isOriginDropdownOpen && !isSaving && (
                                                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, overflow: 'hidden', animation: 'slideDownDropdown 200ms ease-out forwards', transformOrigin: 'top center' }}>
                                                            {ATTENDANCE_ORIGINS.map(origin => (
                                                                <div 
                                                                    key={origin.value}
                                                                    onClick={(e) => { e.stopPropagation(); setAttendanceData({...attendanceData, attendance_origin: origin.value}); setIsOriginDropdownOpen(false); if (feedback?.text === 'Informe a Origem do Atendimento.') setFeedback(null); }}
                                                                    style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', background: attendanceData.attendance_origin === origin.value ? '#eff6ff' : 'transparent', color: attendanceData.attendance_origin === origin.value ? '#1d4ed8' : '#334155', fontWeight: attendanceData.attendance_origin === origin.value ? '600' : '500', fontSize: '0.9rem', transition: 'background 150ms' }}
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
                                            <div className="lab-data-item full-width">
                                                <label>Observações</label>
                                                <div className="lab-data-value" style={{ padding: '0.2rem' }}>
                                                    <input type="text" placeholder="Notas internas..." value={attendanceData.observations} onChange={e => setAttendanceData({...attendanceData, observations: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0f172a' }} disabled={isSaving}/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lab-card fade-in">
                                        <div className="lab-card-header">
                                            <h3 className="lab-card-title"><Beaker size={18} /> Adicionar Exames</h3>
                                        </div>
                                        <div className="lab-exam-search-area" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '1.5rem', position: 'relative' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>Inclusão Rápida</h4>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Digite o código ou nome e pressione Enter. <span style={{ opacity: 0.7 }}>(Alt + E)</span></p>
                                                </div>
                                                <button type="button" className="lab-btn lab-btn-secondary" onClick={handleOpenExamModal} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                                                    Busca avançada
                                                </button>
                                            </div>
                                            
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    ref={quickExamInputRef}
                                                    type="text"
                                                    className="lab-input"
                                                    style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                                                    placeholder="Ex: GLI ou Glicose..."
                                                    value={quickExamInput}
                                                    onChange={handleQuickExamChange}
                                                    onKeyDown={handleQuickExamKeyDown}
                                                    disabled={isSaving}
                                                />
                                                {examSuggestions.length > 0 && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 100, overflow: 'hidden' }}>
                                                        {examSuggestions.map((ex, idx) => (
                                                            <div 
                                                                key={ex.id}
                                                                onClick={() => processQuickExamSelection(ex)}
                                                                style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', background: highlightedIndex === idx ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}
                                                                onMouseEnter={() => setHighlightedIndex(idx)}
                                                            >
                                                                <span style={{ fontWeight: 600, color: '#3b82f6', width: '60px' }}>{ex.code}</span>
                                                                <span style={{ color: '#0f172a', flex: 1 }}>{ex.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="lab-table-container">
                                            {(() => {
                                                const hasMaterial = examesSolicitados.some(e => e.material && e.material.trim() !== '');
                                                return (
                                                    <table className="lab-table" style={{ tableLayout: 'fixed', width: '100%', maxWidth: '100%' }}>
                                                        <thead>
                                                            <tr>
                                                                <th style={{ width: '10%' }}>Seq.</th>
                                                                <th style={{ width: '15%' }}>Código</th>
                                                                <th style={{ width: hasMaterial ? '45%' : '65%' }}>Exame</th>
                                                                {hasMaterial && <th style={{ width: '20%' }}>Material</th>}
                                                                <th className="text-right" style={{ width: '10%' }}>Ação</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {examesSolicitados.map((exame, idx) => (
                                                                <tr key={exame.id}>
                                                                    <td style={{ color: '#64748b' }}>{String(idx + 1).padStart(2, '0')}</td>
                                                                    <td className="font-semibold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#3b82f6' }}>{exame.code}</td>
                                                                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={exame.name}>{exame.name}</td>
                                                                    {hasMaterial && <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>{exame.material || '-'}</td>}
                                                                    <td className="text-right">
                                                                        <button className="lab-icon-btn lab-text-red" data-tooltip="Remover exame" onClick={() => removerExame(exame.id)} disabled={isSaving}>
                                                                            <X size={16} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {examesSolicitados.length === 0 && (
                                                                <tr><td colSpan={hasMaterial ? "5" : "4"} className="text-center py-8" style={{ color: feedback?.text?.includes('Adicione pelo') ? '#ef4444' : '#64748b' }}>Nenhum exame adicionado ao atendimento.</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                );
                                            })()}
                                            <div ref={examsTableEndRef} />
                                        </div>
                                    </div>
                                </div>

                                {/* BARRA LATERAL - SUMÁRIO */}
                                <div className="lab-card lab-summary-card" style={{ position: 'sticky', top: '2rem' }}>
                                    <div className="lab-card-header">
                                        <h3 className="lab-card-title"><Activity size={18} /> Resumo</h3>
                                    </div>
                                    <div className="lab-summary-stats">
                                        <div className="lab-summary-item">
                                            <div className="lab-summary-info">
                                                <span className="lab-summary-label">Total de Exames</span>
                                                <span className="lab-summary-value">{examesSolicitados.length}</span>
                                            </div>
                                        </div>
                                        <div className="lab-summary-item">
                                            <div className="lab-summary-info">
                                                <span className="lab-summary-label">Paciente</span>
                                                <span className="lab-summary-value" style={{ fontSize: '1rem', color: hasPatientChanges() ? '#f59e0b' : '#334155' }}>
                                                    {internalPatientId ? (hasPatientChanges() ? 'Editado' : 'Cadastrado') : 'Novo Cadastro'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="lab-summary-actions" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <button className="lab-btn lab-btn-success lab-btn-block" onClick={prepararSalvamento} disabled={isSaving} style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                {isSaving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} 
                                                {isSaving ? 'Salvando...' : 'Salvar Tudo'}
                                            </div>
                                            {!isSaving && <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 400 }}>Ctrl + Enter</span>}
                                        </button>
                                        <button className="lab-btn lab-btn-outline lab-btn-block" data-tooltip="Esc" onClick={handleCloseModal} disabled={isSaving}>
                                            <X size={18} /> Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal de Busca Avançada de Exames */}
            {isExamModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => { if(e.target === e.currentTarget && tempSelectedExams.length === 0) handleCloseExamModal(); }}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '960px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Beaker size={20} className="lab-text-primary" /> Adicionar exames</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>Pesquise e selecione os exames deste atendimento.</p>
                            </div>
                            <button type="button" onClick={handleCloseExamModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div className="lab-search-input-group" style={{ flex: '1', minWidth: '250px', background: '#fff' }}>
                                <input type="text" placeholder="Pesquisar por código ou nome..." value={exameSearch} onChange={e => setExameSearch(e.target.value)} autoFocus style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}/>
                            </div>
                            <select className="lab-select" value={selectedSetor} onChange={(e) => setSelectedSetor(e.target.value)} style={{ width: '200px', background: '#fff', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
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

            {/* Modal de Confirmação */}
            {confirmModal.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: confirmModal.type === 'cancel' ? '#ef4444' : confirmModal.type === 'future_date' || confirmModal.type === 'duplicate' ? '#f59e0b' : '#3b82f6' }}>
                            {confirmModal.type === 'cancel' ? <AlertTriangle size={28} /> : confirmModal.type === 'future_date' || confirmModal.type === 'duplicate' ? <AlertCircle size={28} /> : <FileText size={28} />}
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{confirmModal.title}</h3>
                        </div>
                        
                        <p style={{ margin: '0 0 1.5rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            {confirmModal.message}
                        </p>
                        
                        {confirmModal.type === 'save' && (
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                <div style={{ marginBottom: '0.5rem' }}><strong>Paciente:</strong> {patientData.full_name || 'Novo Paciente'}</div>
                                <div style={{ marginBottom: '0.5rem' }}><strong>Origem:</strong> {ATTENDANCE_ORIGINS.find(o => o.value === attendanceData.attendance_origin)?.label}</div>
                                <div style={{ marginBottom: '0.5rem' }}><strong>Data/Hora:</strong> {new Date(`${attendanceData.attendance_date}T00:00:00`).toLocaleDateString('pt-BR')} às {attendanceData.attendance_time}</div>
                                <div style={{ marginBottom: '0.5rem' }}><strong>Qtd. Exames:</strong> {examesSolicitados.length}</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="lab-btn lab-btn-secondary" onClick={() => setConfirmModal({ open: false })} disabled={isSaving}>
                                {confirmModal.cancelText}
                            </button>
                            <button 
                                className={`lab-btn ${confirmModal.type === 'cancel' ? 'lab-btn-danger' : confirmModal.type === 'duplicate' ? 'lab-btn-warning' : 'lab-btn-success'}`}
                                style={confirmModal.type === 'cancel' ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : confirmModal.type === 'duplicate' ? { background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' } : {}}
                                onClick={confirmModal.onConfirm}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 size={16} className="spin" /> : null}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span>{confirmModal.confirmText}</span>
                                    {!isSaving && confirmModal.type === 'save' && <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 400, marginTop: '-2px' }}>Ctrl + Enter</span>}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
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
        </div>
    );
};

export default LaboratorioOperacionalModal;
