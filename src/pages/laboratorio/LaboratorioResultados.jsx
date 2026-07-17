import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { formatCpf } from '../../utils/formatters';
import { 
    TriangleAlert, Search, CheckCircle2, Clock, ChevronLeft, ChevronRight, Save, Activity, User, FileText,
    History, AlertCircle, Info, Loader2
} from 'lucide-react';
import './LaboratorioResultados.css';
import { laboratorioResultadosService } from '../../services/api/laboratorioResultados.service';
import { ATTENDANCE_ORIGINS, formatAttendanceOrigin } from '../../utils/laboratorioHelpers';

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const EXAM_STATUS_CONFIG = {
  PENDENTE: {
    label: 'PENDENTE',
    className: 'status-pendente'
  },
  DIGITADO: {
    label: 'DIGITADO',
    className: 'status-digitado'
  },
  CONFERIDO: {
    label: 'CONFERIDO',
    className: 'status-conferido'
  },
  LIBERADO: {
    label: 'LIBERADO',
    className: 'status-liberado'
  },
  CANCELADO: {
    label: 'CANCELADO',
    className: 'status-cancelado'
  }
};

const LaboratorioResultados = () => {
    const [loading, setLoading] = useState(true);
    const [attendances, setAttendances] = useState([]); // This stores the full data when an attendance is selected
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [initialFormValues, setInitialFormValues] = useState({});
    const [pendingNavigation, setPendingNavigation] = useState(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'success' | 'error'
    const [feedbackMsg, setFeedbackMsg] = useState(null);
    const inputRefs = useRef([]);

    const location = useLocation();
    
    // New workflow states
    const [searchFilters, setSearchFilters] = useState({
        date: location.state?.attendanceDate || getLocalDateInputValue(),
        protocol: location.state?.protocolNumber || '',
        patient: '',
        status: 'TODOS',
        sector: '',
        attendance_origin: ''
    });
    const [searchResults, setSearchResults] = useState(null);
    const [selectedAttendance, setSelectedAttendance] = useState(null);

    useEffect(() => {
        if (location.state?.protocolNumber) {
            handleSearch(location.state.attendanceDate, location.state.protocolNumber);
        } else {
            handleSearch();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilterKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSearch();
        }
    };

    const handleSearch = async (overrideDate, overrideProtocol) => {
        try {
            setLoading(true);
            
            // Impede que overrideDate receba o objeto de evento do onClick do React
            const isEvent = overrideDate && typeof overrideDate === 'object' && 'nativeEvent' in overrideDate;
            const finalDate = (overrideDate !== undefined && !isEvent) ? overrideDate : searchFilters.date;
            const finalProtocol = (overrideProtocol !== undefined && typeof overrideProtocol === 'string') ? overrideProtocol : searchFilters.protocol;

            const filtros = {
                dataInicial: finalDate,
                protocolo: finalProtocol,
                paciente: searchFilters.patient,
                status: searchFilters.status,
                attendance_origin: searchFilters.attendance_origin
            };

            console.debug('[LAB][RESULTADOS] Filtros enviados', {
              dataInicial: filtros.dataInicial,
              dataInicialTipo: typeof filtros.dataInicial,
              protocolo: filtros.protocolo,
              paciente: filtros.paciente,
              status: filtros.status,
            });

            const results = await laboratorioResultadosService.buscarAtendimentos(filtros);
            setSearchResults(results);
            setSelectedAttendance(null);
            setAttendances([]);
            setSelectedExamId(null);
            setFormValues({});
        } catch (error) {
            console.error("Erro ao buscar atendimentos", error);
            setFeedbackMsg({ type: 'error', text: 'Não foi possível buscar os atendimentos. Tente novamente.' });
            setTimeout(() => setFeedbackMsg(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAttendance = async (att) => {
        setSelectedAttendance(att);
        await carregarDados(att.protocol_number);
    };

    const carregarDados = async (protocol, currentSelectedId = selectedExamId) => {
        try {
            setLoading(true);
            const data = await laboratorioResultadosService.getResultadosPendentes(protocol || searchProtocol);
            setAttendances(data);
            
            // Se já tem um selecionado e ele existe, mantém. Se não, pega o primeiro.
            if (data.length > 0 && data[0].resultados.length > 0) {
                let toSelect = data[0].resultados[0];
                if (currentSelectedId) {
                    const found = data[0].resultados.find(r => r.id === currentSelectedId);
                    if (found) toSelect = found;
                }
                selecionarExame(toSelect);
            }
        } catch (error) {
            console.error("Erro ao buscar exames", error);
        } finally {
            setLoading(false);
        }
    };

        const selecionarExame = (result) => {
        setSelectedExamId(result.id);
        
        const initialForm = {};
        if (result && result.structuredValues) {
            result.structuredValues.forEach(v => {
                initialForm[v.parameter_id] = { ...v };
            });
        }
        setFormValues(initialForm);
        setInitialFormValues(initialForm);
    };

    
    const checkUnsavedChanges = () => {
        return JSON.stringify(formValues) !== JSON.stringify(initialFormValues);
    };

    const handleSelectExamWithCheck = (result) => {
        if (!result) return;
        if (checkUnsavedChanges()) {
            setPendingNavigation(result);
            setShowUnsavedModal(true);
        } else {
            selecionarExame(result);
        }
    };

    const confirmNavigation = () => {
        if (pendingNavigation) {
            selecionarExame(pendingNavigation);
        }
        setShowUnsavedModal(false);
        setPendingNavigation(null);
    };

    const cancelNavigation = () => {
        setShowUnsavedModal(false);
        setPendingNavigation(null);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && showUnsavedModal) {
                cancelNavigation();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showUnsavedModal]);


    const currentAttendance = attendances[0] || {};
    const attendanceExams = currentAttendance ? currentAttendance.resultados || [] : [];
    const currentExamIndex = attendanceExams.findIndex(exam => exam.id === selectedExamId);

    const goToPreviousExam = () => {
        if (currentExamIndex <= 0) return;
        handleSelectExamWithCheck(attendanceExams[currentExamIndex - 1]);
    };

    const goToNextExam = () => {
        if (currentExamIndex < 0 || currentExamIndex >= attendanceExams.length - 1) return;
        handleSelectExamWithCheck(attendanceExams[currentExamIndex + 1]);
    };

    const handleValueChange = (paramId, field, value) => {
        setFormValues(prev => ({
            ...prev,
            [paramId]: {
                ...prev[paramId],
                [field]: value
            }
        }));
    };

    const salvarExameAtual = async () => {
        try {
            setSaving(true);
            setSaveStatus('saving');
            setFeedbackMsg(null);
            
            const valuesToSave = Object.values(formValues);
            
            // Validate mandatory
            const isEmpty = valuesToSave.some(v => (v.value_numeric === null || v.value_numeric === '') && (!v.value_text || String(v.value_text).trim() === ''));
            if (isEmpty) {
                setFeedbackMsg({ type: 'error', text: 'Preencha todos os resultados obrigatórios antes de salvar.' });
                setTimeout(() => setFeedbackMsg(null), 4000);
                setSaveStatus('error');
                return false;
            }

            console.log('[DEBUG] result_id selecionado:', selectedExamId);
            console.log('[DEBUG] parâmetros enviados:', valuesToSave);

            await laboratorioResultadosService.salvarResultados(selectedExamId, valuesToSave);
            
            await carregarDados(selectedAttendance ? selectedAttendance.protocol_number : searchFilters.protocol, selectedExamId);
            setSaveStatus('success');
            setFeedbackMsg({ type: 'success', text: 'Resultado salvo com sucesso.' });
            
            setTimeout(() => {
                setFeedbackMsg(null);
                setSaveStatus('idle');
            }, 3000);
            return true;
        } catch (err) {
            console.error('[DEBUG] erro ao salvar:', err);
            setSaveStatus('error');
            setFeedbackMsg({ type: 'error', text: 'Erro ao salvar resultado. Tente novamente.' });
            
            setTimeout(() => {
                setSaveStatus('idle');
            }, 3000);
            return false;
        } finally {
            setSaving(false);
        }
    };

    
    
    
        
    const handleResultKeyDown = async (event, index) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
            nextInput.focus();
            if (nextInput.select) nextInput.select();
            return;
        }
        
        await salvarExameAtual();
    };

    const getSaveButtonText = (defaultText) => {
        if (saveStatus === 'saving') return 'Salvando...';
        if (saveStatus === 'success') return 'Salvo com sucesso';
        if (saveStatus === 'error') return 'Erro ao salvar';
        return defaultText;
    };

    const getSaveButtonIcon = () => {
        if (saveStatus === 'saving') return <Loader2 className="animate-spin" size={16} />;
        if (saveStatus === 'success') return <CheckCircle2 size={16} />;
        if (saveStatus === 'error') return <AlertCircle size={16} />;
        return <Save size={16} />;
    };

    const resultados = currentAttendance.resultados || [];
    const selectedResult = resultados.find(r => r.id === selectedExamId) || {};
    const statusSelectedResult = String(selectedResult.status || '').toUpperCase();
    
    const isPendente = statusSelectedResult === 'PENDENTE';
    const isDigitado = statusSelectedResult === 'DIGITADO';
    const isConferido = statusSelectedResult === 'CONFERIDO';
    const isLiberado = statusSelectedResult === 'LIBERADO';
    
    const isReadOnly = isDigitado || isConferido || isLiberado;

    // Ação de Enviar para conferência só fica bloqueada se TODOS estiverem liberados/conferidos ou cancelados
    const resultadosAtivosParaConferencia = resultados.filter(item => String(item.status).toUpperCase() !== 'CANCELADO');
    const isEnvioConferenciaDisabled = resultadosAtivosParaConferencia.length === 0 || 
        resultadosAtivosParaConferencia.every(item => ['CONFERIDO', 'LIBERADO'].includes(String(item.status).toUpperCase()));

    const getStatusGeralAtendimento = (exames) => {
        if (!exames || exames.length === 0) return { label: 'Sem exames', cssClass: 'status-warning' };
        
        const allLiberado = exames.every(e => String(e.status).toUpperCase() === 'LIBERADO');
        if (allLiberado) return { label: 'Liberado', cssClass: EXAM_STATUS_CONFIG['LIBERADO'].className };
        
        const hasPendente = exames.some(e => String(e.status).toUpperCase() === 'PENDENTE');
        if (hasPendente) return { label: 'Em digitação', cssClass: EXAM_STATUS_CONFIG['PENDENTE'].className };
        
        const hasDigitadoWaitingConf = exames.some(e => String(e.status).toUpperCase() === 'DIGITADO' && e.requires_conference === true);
        if (hasDigitadoWaitingConf) return { label: 'Aguardando conferência', cssClass: EXAM_STATUS_CONFIG['DIGITADO'].className };
        
        // If it got here:
        // - Not all are LIBERADO
        // - No exam is PENDENTE
        // - No exam is DIGITADO and requires conference
        // It means the remaining exams are either CONFERIDO, LIBERADO, or DIGITADO (without requiring conference).
        // Therefore, they are all ready for release.
        return { label: 'Aguardando liberação', cssClass: EXAM_STATUS_CONFIG['CONFERIDO'].className };
    };

    const renderExamsSummary = (att) => {
        const parts = [];
        if (att.examesLiberados > 0) parts.push(<span key="lib" style={{ color: '#059669', fontWeight: 500 }}>{att.examesLiberados} liberados</span>);
        if (att.examesConferidos > 0) parts.push(<span key="conf" style={{ color: '#2563eb', fontWeight: 500 }}>{att.examesConferidos} conferidos</span>);
        if (att.examesDigitados > 0) parts.push(<span key="dig" style={{ color: '#0284c7', fontWeight: 500 }}>{att.examesDigitados} digitados</span>);
        if (att.examesPendentes > 0) parts.push(<span key="pend" style={{ color: '#d97706', fontWeight: 500 }}>{att.examesPendentes} pendentes</span>);

        return (
            <span>
                Exames: <strong style={{ color: '#334155', fontWeight: 500 }}>{att.examesTotal}</strong> 
                {parts.length > 0 && (
                    <> (
                        {parts.map((part, index) => (
                            <React.Fragment key={index}>
                                {part}
                                {index < parts.length - 1 ? ' / ' : ''}
                            </React.Fragment>
                        ))}
                    )</>
                )}
            </span>
        );
    };

    const statusGeral = getStatusGeralAtendimento(resultados);

    return (
        <div className="lab-res-container" style={{ paddingTop: '1.25rem', paddingBottom: '1.25rem' }}>
            {/* Header */}
            <header className="lab-res-header">
                <div>
                    <h1 className="lab-title">Resultados</h1>
                    <p className="lab-subtitle">Busca e digitação dos resultados de exames</p>
                </div>
            </header>

            {/* Filtros */}
            <div className={`lab-filters-card ${selectedAttendance ? 'compact' : ''}`}>
                <div className="lab-filters-grid">
                    <div className="lab-filter-group">
                        <label>Data Inicial</label>
                        <input type="date" className="lab-input" value={searchFilters.date} onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})} onKeyDown={handleFilterKeyDown} />
                    </div>
                    <div className="lab-filter-group">
                        <label>Protocolo</label>
                        <input type="text" className="lab-input" placeholder="Ex: TESTE-LAB-001" value={searchFilters.protocol} onChange={(e) => setSearchFilters({...searchFilters, protocol: e.target.value})} onKeyDown={handleFilterKeyDown} />
                    </div>
                    <div className="lab-filter-group">
                        <label>Paciente</label>
                        <input type="text" className="lab-input" placeholder="Nome do paciente..." value={searchFilters.patient} onChange={(e) => setSearchFilters({...searchFilters, patient: e.target.value})} onKeyDown={handleFilterKeyDown} />
                    </div>
                    <div className="lab-filter-group">
                        <label>Status</label>
                        <select className="lab-select" value={searchFilters.status} onChange={(e) => setSearchFilters({...searchFilters, status: e.target.value})}>
                            <option value="TODOS">Todos</option>
                            <option value="PENDENTE">Pendentes</option>
                            <option value="DIGITADO">Digitados</option>
                        </select>
                    </div>
                    <div className="lab-filter-group">
                        <label>Origem</label>
                        <select className="lab-select" value={searchFilters.attendance_origin} onChange={(e) => setSearchFilters({...searchFilters, attendance_origin: e.target.value})}>
                            <option value="">Todos</option>
                            {ATTENDANCE_ORIGINS.map(origin => (
                                <option key={origin.value} value={origin.value}>{origin.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="lab-filter-group lab-filter-actions">
                        <label className="filter-label-spacer" aria-hidden="true">Ação</label>
                        <button className="lab-btn lab-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSearch} disabled={loading}>
                            {loading && !selectedAttendance ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                            Buscar
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {!selectedAttendance && searchResults === null && !loading && (
                <div className="lab-empty-state" style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '12px', marginTop: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <Search size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                    <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '0.5rem', fontWeight: '700' }}>Nenhum atendimento selecionado</h3>
                    <p style={{ color: '#64748b' }}>Busque um atendimento para iniciar a digitação dos resultados.</p>
                </div>
            )}

            {/* Loading geral */}
            {!selectedAttendance && loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <Loader2 className="animate-spin" size={32} color="#3b82f6" />
                </div>
            )}

            {/* Lista de Resultados da Busca */}
            {!selectedAttendance && searchResults !== null && !loading && (
                <div className="lab-search-results" style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '1rem', fontWeight: '700' }}>Atendimentos Encontrados ({searchResults.length})</h3>
                    {searchResults.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Search size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                            <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '0.5rem', fontWeight: '700' }}>
                                {searchFilters.date === getLocalDateInputValue()
                                    ? "Nenhum atendimento encontrado para hoje."
                                    : "Nenhum atendimento encontrado para os filtros informados."}
                            </h3>
                            <p style={{ color: '#64748b' }}>Altere os filtros de pesquisa para localizar outros atendimentos.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {searchResults.map(att => (
                                <div key={att.id} className="lab-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.4rem' }}>
                                            <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{att.pacienteNome}</strong>
                                            <span style={{ fontSize: '0.8rem', color: '#475569', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: '600', border: '1px solid #e2e8f0' }}>Prot: {att.protocol_number}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><User size={14} /> Idade: <strong style={{ color: '#334155', fontWeight: 500 }}>{att.pacienteIdade}</strong></span>
                                            <span>Sexo: <strong style={{ color: '#334155', fontWeight: 500 }}>{att.pacienteSexo}</strong></span>
                                            <span>CNS: <strong style={{ color: '#334155', fontWeight: 500 }}>{att.pacienteCns || '---'}</strong></span>
                                            <span>CPF: <strong style={{ color: '#334155', fontWeight: 500 }}>{formatCpf(att.pacienteCpf)}</strong></span>
                                            {renderExamsSummary(att)}
                                            <span style={{ marginLeft: 'auto', borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>Status: <strong style={{ color: att.statusGeral === 'Laudo liberado' ? '#059669' : '#d97706' }}>{att.statusGeral}</strong></span>
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: '1rem' }}>
                                        <button className="lab-btn lab-btn-primary" onClick={() => handleSelectAttendance(att)} style={{ whiteSpace: 'nowrap' }}>
                                            <Activity size={16} /> Abrir Atendimento
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tela de Digitação e Resumo (Sempre condicionado a um atendimento selecionado) */}
            {selectedAttendance && attendances.length > 0 && (
                <div style={{ marginTop: '0.25rem' }}>
                    
                    {/* Resumo do Paciente com Ações Integradas */}
                    <div className="lab-card lab-patient-summary" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                            <button 
                                onClick={() => { setSelectedAttendance(null); setSelectedExamId(null); setAttendances([]); }} 
                                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: '0' }}
                            >
                                <ChevronLeft size={16} /> Voltar para busca
                            </button>
                            
                            <div className="lab-header-actions" style={{ position: 'relative', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {feedbackMsg && (
                                    <div style={{
                                        position: 'absolute', top: '50%', right: '100%', 
                                        transform: 'translateY(-50%)', marginRight: '1rem',
                                        background: feedbackMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                                        color: feedbackMsg.type === 'success' ? '#047857' : '#b91c1c',
                                        border: `1px solid ${feedbackMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
                                        padding: '0.4rem 0.8rem', borderRadius: '6px',
                                        fontWeight: '600', fontSize: '0.85rem', zIndex: 10,
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}>
                                        {feedbackMsg.text}
                                    </div>
                                )}

                                
                                
                            </div>
                        </div>

                        <div className="lab-patient-summary-grid" style={{ gap: '0.5rem 1.25rem' }}>
                            <div className="lab-ps-item"><span className="lab-ps-label">Protocolo:</span> <span className="lab-ps-val font-semibold">{currentAttendance.protocol_number || currentAttendance.protocol}</span></div>
                            <div className="lab-ps-item"><span className="lab-ps-label">Paciente:</span> <span className="lab-ps-val font-bold text-primary">{currentAttendance.pacienteNome}</span></div>
                            <div className="lab-ps-item"><span className="lab-ps-label">Idade:</span> <span className="lab-ps-val">{currentAttendance.pacienteIdade}</span></div>
                            <div className="lab-ps-item"><span className="lab-ps-label">Sexo:</span> <span className="lab-ps-val">{currentAttendance.pacienteSexo}</span></div>
                            <div className="lab-ps-item"><span className="lab-ps-label">Origem do Atendimento:</span> <span className="lab-ps-val">{formatAttendanceOrigin(currentAttendance.attendance_origin)}</span></div>
                            <div className="lab-ps-item"><span className="lab-ps-label">Convênio:</span> <span className="lab-ps-val">{currentAttendance.convenio || 'SUS'}</span></div>
                            <div className="lab-ps-item"><span className="lab-ps-label">Local:</span> <span className="lab-ps-val">{currentAttendance.local_entrega || 'CENTRAL'}</span></div>
                            <div className="lab-ps-item"><span className="lab-ps-label">Médico:</span> <span className="lab-ps-val">{currentAttendance.requesting_doctor || 'Não informado'}</span></div>
                            <div className="lab-ps-item" style={{ marginLeft: 'auto' }}>
                                <span className={`lab-status-tag ${statusGeral.cssClass}`}>{statusGeral.label}</span>
                            </div>
                        </div>
                    </div>

                    {/* Layout Principal */}
                    <div className="lab-res-layout">
                
                {/* Coluna Esquerda: Exames & Ações Finais */}
                <div className="lab-res-sidebar">
                    <div className="lab-card lab-exams-list-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><Activity size={18} /> Exames do Atendimento</h3>
                        </div>
                        <div className="lab-exams-list">
                            {resultados.map((res) => (
                                <div 
                                    key={res.id} 
                                    className={`lab-exam-item ${selectedExamId === res.id ? 'active' : ''}`}
                                    onClick={() => handleSelectExamWithCheck(res)}
                                >
                                    <div className="lab-exam-item-header">
                                        <span className="lab-exam-code">{res.exameCodigo}</span>
                                        <span className={`lab-status-tag ${EXAM_STATUS_CONFIG[String(res.status || 'PENDENTE').toUpperCase()]?.className || 'status-pendente'}`}>
                                            {res.status || 'PENDENTE'}
                                        </span>
                                    </div>
                                    <div className="lab-exam-name">{res.exameNome}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    </div>

                {/* Coluna Direita: Digitação e Histórico */}
                <div className="lab-res-main">
                    {/* Painel de Digitação */}
                    {selectedResult.id && (
                        <div className="lab-card lab-typing-card" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                            <div className="lab-typing-header">
                                <div className="lab-typing-title">
                                    <h2>{selectedResult.exameCodigo} — {selectedResult.exameNome}</h2>
                                    <div className="lab-typing-badges">
                                        <span className="lab-badge lab-badge-gray">Parâmetros: {selectedResult.structuredValues?.length || 0}</span>
                                    </div>
                                </div>
                                <div className="lab-typing-status">
                                    <span className={`lab-status-tag ${EXAM_STATUS_CONFIG[String(selectedResult.status || 'PENDENTE').toUpperCase()]?.className || 'status-pendente'}`}>
                                        {selectedResult.status}
                                    </span>
                                </div>
                            </div>

                            <div className="lab-typing-body">

                                {isReadOnly && (
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af', fontSize: '0.9rem', fontWeight: 500 }}>
                                        <Info size={18} />
                                        <span>Este exame já foi conferido e não pode mais ser alterado.</span>
                                    </div>
                                )}

                                {(selectedResult.structuredValues || []).map((param, index) => {
                                    const formState = formValues[param.id] || {};
                                    const isNumeric = param.result_type === 'NUMERICO';
                                    
                                    return (
                                        <div key={param.id} className="lab-typing-parameter-block" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                            <div className="lab-typing-result-row" style={{ alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <div className="lab-typing-input-group" style={{ minWidth: '300px', flex: 1 }}>
                                                    <label>{param.name || 'Parâmetro'}</label>
                                                    <div className="lab-input-wrapper" style={{ display: 'flex', alignItems: 'stretch' }}>
                                                        <input 
                                                            type={isNumeric ? "number" : "text"} 
                                                            className={`lab-input-field ${isNumeric ? 'lab-result-number-input' : ''}`} 
                                                            style={{ 
                                                                flex: 1, 
                                                                padding: '0.5rem 0.75rem', 
                                                                border: '1px solid #cbd5e1', 
                                                                borderRadius: '8px',
                                                                fontSize: '1.1rem',
                                                                outline: 'none'
                                                            }}
                                                            placeholder="Digite o resultado..." 
                                                            value={isNumeric ? (formState.value_numeric ?? '') : (formState.value_text || '')}
                                                            onChange={(e) => handleValueChange(param.id, isNumeric ? 'value_numeric' : 'value_text', e.target.value)}
                                                            disabled={isReadOnly || saving}
                                                            onKeyDown={(e) => handleResultKeyDown(e, index)}
                                                            onWheel={isNumeric ? (e) => e.currentTarget.blur() : undefined}
                                                            ref={(el) => inputRefs.current[index] = el}
                                                        />
                                                    </div>
                                                </div>

                                                {param.reference_text && (
                                                    <div className="lab-typing-ref-box" style={{ flex: 1, minWidth: '250px', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                        <span className="lab-ref-label" style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600 }}>VALOR DE REFERÊNCIA:</span>
                                                        <div className="lab-ref-value" style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                                            {param.reference_text}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Observação específica do parâmetro (opcional) */}
                                            {/* Se quiser liberar obs para todos, só descomentar ou adicionar um botão 'add obs' */}
                                        </div>
                                    );
                                })}

                                <div className="lab-typing-text-row" style={{ marginTop: '0.5rem' }}>
                                    <div className="lab-text-group" style={{ gridColumn: 'span 2' }}>
                                        <label>Observação Geral do Exame</label>
                                        <textarea placeholder="Adicionar comentário ao laudo (apenas para suporte, gravado no primeiro parâmetro se necessário)..." disabled={isReadOnly || saving}></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="lab-typing-footer">
                                <div className="lab-nav-buttons">
                                    <button className="lab-btn lab-btn-outline" disabled={currentExamIndex <= 0 || saving} onClick={goToPreviousExam}><ChevronLeft size={16} /> Anterior</button>
                                    <button className="lab-btn lab-btn-outline" disabled={currentExamIndex < 0 || currentExamIndex >= attendanceExams.length - 1} onClick={goToNextExam}>{'Pr\u00f3ximo'} <ChevronRight size={16} /></button>
                                </div>
                                <div className="lab-save-buttons">
                                    <button 
                                        className={`lab-btn ${saveStatus === 'success' ? 'lab-btn-success' : saveStatus === 'error' ? 'lab-btn-outline' : 'lab-btn-primary'}`} 
                                        onClick={salvarExameAtual} 
                                        disabled={saving || saveStatus === 'success'}
                                    >
                                        {getSaveButtonIcon()}
                                        {getSaveButtonText('Salvar este exame')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Histórico do Paciente */}
                    <div className="lab-card lab-history-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><History size={18} /> Histórico do Paciente</h3>
                        </div>
                        <div className="lab-history-list">
                            <div className="lab-history-empty text-center" style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>Histórico disponível após integração/migração dos dados anteriores.</p>
                            </div>
                        </div>
                    </div>
                    </div>
                    </div>
                </div>
            )}
        
            
            {/* Modal Unsaved Changes */}
            {showUnsavedModal && (
                <div 
                    className="unsaved-result-modal-overlay" 
                    role="dialog" 
                    aria-modal="true" 
                    aria-labelledby="unsaved-modal-title"
                >
                    <div className="unsaved-result-modal">
                        <div className="unsaved-result-modal-header">
                            <div className="unsaved-result-modal-icon">
                                <TriangleAlert size={24} />
                            </div>
                            <div>
                                <h2 id="unsaved-modal-title" className="unsaved-result-modal-title">{'Resultado n\u00e3o salvo'}</h2>
                                <p className="unsaved-result-modal-subtitle">{'Existem altera\u00e7\u00f5es n\u00e3o salvas neste exame.'}</p>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-body">
                            Deseja sair sem salvar?
                        </div>
                        <div className="unsaved-result-modal-footer">
                            <button className="unsaved-btn-neutral" onClick={cancelNavigation} autoFocus>Continuar editando</button>
                            <button className="unsaved-btn-destructive" onClick={confirmNavigation}>Sair sem salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default LaboratorioResultados;
