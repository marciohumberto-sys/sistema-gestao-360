import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { formatCpf } from '../../utils/formatters';
import { 
    TriangleAlert, Search, CheckCircle2, Clock, ChevronLeft, ChevronRight, Save, Activity, User, FileText,
    History, AlertCircle, Info, Loader2
} from 'lucide-react';
import './LaboratorioResultados.css';
import { laboratorioResultadosService } from '../../services/api/laboratorioResultados.service';
import { ATTENDANCE_ORIGINS, formatAttendanceOrigin, normalizeLabNumericInput, isLabValueEmpty, HEMO_INTEGER_COUNT_CODES, normalizeIntegerCountInput, formatLabValue, resolveHemoReference, parseHemoNumber, formatHemoResultValue } from '../../utils/laboratorioHelpers';

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const LabRefTooltip = ({ isOpen, anchorEl, paramName, applicableRefText, allRefText, onClose }) => {
    const [style, setStyle] = useState({});

    useEffect(() => {
        if (!isOpen || !anchorEl) return;
        const updatePosition = () => {
            const rect = anchorEl.getBoundingClientRect();
            const tooltipWidth = 255; 
            
            let left = rect.left + rect.width / 2 - tooltipWidth / 2;
            
            if (left < 10) {
                left = 10;
            } else if (left + tooltipWidth > window.innerWidth - 10) {
                left = window.innerWidth - tooltipWidth - 10;
            }
            
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            if (spaceBelow > 200 || spaceBelow > spaceAbove) {
                setStyle({
                    top: `${rect.bottom + 10 + window.scrollY}px`,
                    left: `${left + window.scrollX}px`,
                    position: 'absolute',
                    zIndex: 99999
                });
            } else {
                setStyle({
                    top: `${rect.top - 10 + window.scrollY}px`,
                    left: `${left + window.scrollX}px`,
                    position: 'absolute',
                    zIndex: 99999,
                    transform: 'translateY(-100%)'
                });
            }
        };
        
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, anchorEl]);

    if (!isOpen || !anchorEl || !style.top) return null;

    const safeParamName = (paramName || '').trim().toLowerCase();
    const lines = (allRefText || '').split('\n').filter(l => {
        const trimmed = l.trim();
        return trimmed !== '' && trimmed.toLowerCase() !== safeParamName;
    });
    
    const applicableTrimmed = (applicableRefText || '').trim();

    return createPortal(
        <div 
            className="lab-custom-tooltip-portal"
            style={{
                ...style,
                width: '255px',
                backgroundColor: '#e2e8f0',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                color: '#334155',
                fontSize: '10px',
                pointerEvents: 'none'
            }}
        >
            <div style={{ padding: '10px 10px 4px 10px', fontWeight: 600, fontSize: '11px', color: '#1e293b' }}>
                {paramName || 'REFERÊNCIA'}
            </div>
            
            <div style={{ padding: '4px 10px 10px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {lines.map((line, idx) => {
                    const isApplicable = line.trim() === applicableTrimmed && applicableTrimmed !== '';
                    return (
                        <div key={idx} style={{ 
                            display: 'flex', 
                            gap: '6px',
                            fontWeight: isApplicable ? 600 : 400,
                            color: isApplicable ? '#1e293b' : '#475569',
                            lineHeight: '1.3'
                        }}>
                            {isApplicable ? <span>•</span> : <span style={{ opacity: 0 }}>•</span>}
                            <span>{line}</span>
                        </div>
                    );
                })}
            </div>
        </div>,
        document.body
    );
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
    const [activeTooltip, setActiveTooltip] = useState(null);
    const tooltipTimeoutRef = useRef(null);
    const [missingFields, setMissingFields] = useState([]);
    const inputRefs = useRef([]);
    const lastFocusedExamRef = useRef(null);
    const shouldScrollToTopRef = useRef(false);
    const examTopRef = useRef(null);

    const location = useLocation();
    
    const [searchFilters, setSearchFilters] = useState({
        date: location.state?.attendanceDate || '',
        patient: '',
        patient_code: '',
        status: 'Em digitação',
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

            const filtros = {
                dataInicial: finalDate,
                paciente: searchFilters.patient,
                patient_code: searchFilters.patient_code ? searchFilters.patient_code.trim() : undefined,
                status: searchFilters.status,
                attendance_origin: searchFilters.attendance_origin
            };

            console.debug('[LAB][RESULTADOS] Filtros enviados', {
              dataInicial: filtros.dataInicial,
              dataInicialTipo: typeof filtros.dataInicial,
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

    const carregarDados = async (protocol, currentSelectedId = selectedExamId, targetExamCode = null) => {
        try {
            setLoading(true);
            const data = await laboratorioResultadosService.getResultadosPendentes(protocol || searchProtocol);
            setAttendances(data);
            
            // Se já tem um selecionado e ele existe, mantém. Se não, pega o primeiro.
            if (data.length > 0 && data[0].resultados.length > 0) {
                let toSelect = data[0].resultados[0];
                if (targetExamCode) {
                    const found = data[0].resultados.find(r => r.exameCodigo === targetExamCode);
                    if (found) toSelect = found;
                } else if (currentSelectedId) {
                    const found = data[0].resultados.find(r => r.id === currentSelectedId);
                    if (found) toSelect = found;
                }
                selecionarExame(toSelect);
            }
            
            return data;
        } catch (error) {
            console.error("Erro ao buscar exames", error);
        } finally {
            setLoading(false);
        }
    };

    const applyHemoCalculations = (formState) => {
        const next = { ...formState };
        
        const paramsByCode = {};
        const paramIdsByCode = {};
        
        Object.values(next).forEach(p => {
            const code = String(p.parameter_code || p.code || '').toUpperCase();
            paramsByCode[code] = p;
            paramIdsByCode[code] = p.parameter_id || p.id || p.parameterId;
        });
        
        const hema = paramsByCode['HEMACIAS'];
        const hemo = paramsByCode['HEMOGLOBINA'];
        const hemt = paramsByCode['HEMATOCRITO'];
        
        const vcmId = paramIdsByCode['VCM'];
        const hcmId = paramIdsByCode['HCM'];
        const chcmId = paramIdsByCode['CHCM'];
        
        if (vcmId || hcmId || chcmId) {
            const parseNum = (val) => {
                if (val === null || val === undefined || val === '') return null;
                const parsed = parseHemoNumber(val);
                return parsed !== null && !isNaN(parsed) ? parsed : null;
            };
            
            const valHema = parseNum(hema?.value_numeric);
            const valHemo = parseNum(hemo?.value_numeric);
            const valHemt = parseNum(hemt?.value_numeric);
            
            const formatResult = (val) => {
                if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return '';
                return val.toFixed(1).replace('.', ',');
            };
            
            if (vcmId) {
                let vcmVal = null;
                if (valHemt !== null && valHema !== null && valHema !== 0) {
                    vcmVal = (valHemt / valHema) * 10;
                }
                next[vcmId] = {
                    ...next[vcmId],
                    value_numeric: vcmVal !== null ? formatResult(vcmVal) : ''
                };
            }
            
            if (hcmId) {
                let hcmVal = null;
                if (valHemo !== null && valHema !== null && valHema !== 0) {
                    hcmVal = (valHemo / valHema) * 10;
                }
                next[hcmId] = {
                    ...next[hcmId],
                    value_numeric: hcmVal !== null ? formatResult(hcmVal) : ''
                };
            }
            
            if (chcmId) {
                let chcmVal = null;
                if (valHemo !== null && valHemt !== null && valHemt !== 0) {
                    chcmVal = (valHemo / valHemt) * 100;
                }
                next[chcmId] = {
                    ...next[chcmId],
                    value_numeric: chcmVal !== null ? formatResult(chcmVal) : ''
                };
            }
        }
        
        return next;
    };

    const selecionarExame = (result) => {
        setSelectedExamId(result.id);
        
        const initialForm = {};
        if (result && result.structuredValues) {
            result.structuredValues.forEach(v => {
                let vNum = v.value_numeric;
                const code = String(v.parameter_code || v.code || '').toUpperCase();
                if (v.result_type === 'NUMERICO' && vNum !== null && vNum !== undefined) {
                    if (HEMO_INTEGER_COUNT_CODES.has(code)) {
                        vNum = String(vNum).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    }
                }
                initialForm[v.parameter_id] = { ...v, value_numeric: vNum };
            });
        }
        
        let activeForm = { ...initialForm };
        if (String(result?.exameCodigo || '').toUpperCase() === 'HEMO') {
            activeForm = applyHemoCalculations(activeForm);
        }
        
        setFormValues(activeForm);
        setInitialFormValues(activeForm);
    };

    
    const checkUnsavedChanges = () => {
        return JSON.stringify(formValues) !== JSON.stringify(initialFormValues);
    };

    const executePatientNavigation = async (targetAttendance, targetExamCode) => {
        setSelectedAttendance(targetAttendance);
        shouldScrollToTopRef.current = true;
        await carregarDados(targetAttendance.protocol_number, null, targetExamCode);
    };

    const handleNavigatePatient = async (direction) => {
        if (!searchResults || !selectedAttendance || loading || saving) return;
        
        const currentIndex = searchResults.findIndex(a => a.id === selectedAttendance.id);
        if (currentIndex === -1) return;
        
        let targetAttendance;
        if (direction === 'prev' && currentIndex > 0) {
            targetAttendance = searchResults[currentIndex - 1];
        } else if (direction === 'next' && currentIndex < searchResults.length - 1) {
            targetAttendance = searchResults[currentIndex + 1];
        } else {
            return;
        }

        if (checkUnsavedChanges()) {
            setPendingNavigation({ type: 'patient', direction, targetAttendance, targetExamCode: selectedResult?.exameCodigo });
            setShowUnsavedModal(true);
            return;
        }

        executePatientNavigation(targetAttendance, selectedResult?.exameCodigo);
    };

    const handleSelectExamWithCheck = (result, skipUnsavedCheck = false) => {
        if (!result) return;
        if (!skipUnsavedCheck && checkUnsavedChanges()) {
            setPendingNavigation(result);
            setShowUnsavedModal(true);
        } else {
            selecionarExame(result);
        }
    };

    const handleBackToSearch = () => {
        if (checkUnsavedChanges()) {
            setPendingNavigation('back_to_search');
            setShowUnsavedModal(true);
        } else {
            handleSearch();
        }
    };

    const confirmNavigation = () => {
        if (pendingNavigation === 'back_to_search') {
            handleSearch();
        } else if (pendingNavigation?.type === 'patient') {
            executePatientNavigation(pendingNavigation.targetAttendance, pendingNavigation.targetExamCode);
        } else if (pendingNavigation) {
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
        if (!selectedExamId || loading || saving) return;
        
        if (lastFocusedExamRef.current === selectedExamId) return;

        requestAnimationFrame(() => {
            setTimeout(() => {
                const el = document.getElementById(`exam-item-${selectedExamId}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                if (shouldScrollToTopRef.current && examTopRef.current) {
                    examTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    shouldScrollToTopRef.current = false;
                }

                const firstInput = inputRefs.current[0];
                if (firstInput && !firstInput.disabled && !firstInput.readOnly) {
                    firstInput.focus();
                    if (firstInput.select) firstInput.select();
                    lastFocusedExamRef.current = selectedExamId;
                }
            }, 100);
        });
    }, [selectedExamId, loading, saving]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && showUnsavedModal) {
                cancelNavigation();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showUnsavedModal]);

    const handleTooltipEnter = (e, paramName, applicableRefText, allRefText) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setActiveTooltip({
            anchorEl: e.currentTarget,
            paramName,
            applicableRefText,
            allRefText
        });
    };

    const handleTooltipLeave = () => {
        tooltipTimeoutRef.current = setTimeout(() => {
            setActiveTooltip(null);
        }, 200);
    };

    useEffect(() => {
        const handleKeyDownTooltip = (e) => {
            if (e.key === 'Escape' && activeTooltip) {
                setActiveTooltip(null);
            }
        };
        window.addEventListener('keydown', handleKeyDownTooltip);
        return () => window.removeEventListener('keydown', handleKeyDownTooltip);
    }, [activeTooltip]);

    const currentAttendance = attendances[0] || {};
    const attendanceExams = currentAttendance ? currentAttendance.resultados || [] : [];
    const currentExamIndex = attendanceExams.findIndex(exam => exam.id === selectedExamId);

    const goToPreviousExam = () => {
        if (currentExamIndex <= 0) return;
        handleSelectExamWithCheck(attendanceExams[currentExamIndex - 1]);
    };

    const goToNextExam = (options = {}) => {
        if (currentExamIndex < 0 || currentExamIndex >= attendanceExams.length - 1) return;
        handleSelectExamWithCheck(attendanceExams[currentExamIndex + 1], options?.skipUnsavedCheck);
    };

    const handleValueChange = (paramId, field, value) => {
        setFormValues(prev => {
            let next = {
                ...prev,
                [paramId]: {
                    ...prev[paramId],
                    [field]: value
                }
            };
            
            const isHemo = String(selectedResult?.exameCodigo || '').toUpperCase() === 'HEMO';
            if (isHemo && field === 'value_numeric') {
                next = applyHemoCalculations(next);
            }
            
            return next;
        });
    };

    const salvarExameAtual = async () => {
        try {
            const wasDigitado = String(selectedResult?.status || '').trim().toUpperCase() === 'DIGITADO';
            
            setSaving(true);
            setSaveStatus('saving');
            setFeedbackMsg(null);
            
            let hasInvalidNumeric = false;
            let hasInvalidInteger = false;
            const valuesToSave = Object.values(formValues).map(v => {
                if (v.result_type === 'NUMERICO' && v.value_numeric !== null && v.value_numeric !== undefined && v.value_numeric !== '') {
                    const str = String(v.value_numeric);
                    const code = String(v.parameter_code || v.code || '').toUpperCase();
                    
                    let normalized = null;
                    if (HEMO_INTEGER_COUNT_CODES.has(code)) {
                        normalized = normalizeIntegerCountInput(str);
                        if (normalized === null) {
                            hasInvalidInteger = true;
                        }
                    } else {
                        normalized = normalizeLabNumericInput(str);
                        if (normalized === null) {
                            hasInvalidNumeric = true;
                        }
                    }
                    
                    // Mantém o valor original se for inválido, para que o erro seja reportado
                    return { ...v, value_numeric: normalized !== null ? normalized : v.value_numeric };
                }
                return v;
            });
            
            if (hasInvalidInteger) {
                setFeedbackMsg({ type: 'error', text: 'Informe uma quantidade inteira válida.' });
                setTimeout(() => setFeedbackMsg(null), 4000);
                setSaveStatus('error');
                return false;
            }
            if (hasInvalidNumeric) {
                setFeedbackMsg({ type: 'error', text: 'Informe um resultado numérico válido.' });
                setTimeout(() => setFeedbackMsg(null), 4000);
                setSaveStatus('error');
                return false;
            }

            // Validate mandatory
            const OPCIONAIS_HEMO = ['OBS_ERITROGRAMA', 'SERIE_ERITROCITARIA', 'SERIE_LEUCOCITARIA', 'SERIE_PLAQUETARIA', 'OBS_GERAL'];
            
            const missingRequiredParameters = valuesToSave.filter(v => {
                const code = v.parameter_code || v.code || '';
                
                if (OPCIONAIS_HEMO.includes(code)) return false;
                
                if (v.result_type === 'TEXTO' && (v.name || '').toUpperCase().includes('OBSERVA')) return false;

                if (v.result_type === 'NUMERICO') {
                    return isLabValueEmpty(v.value_numeric);
                } else {
                    return isLabValueEmpty(v.value_text);
                }
            });

            if (missingRequiredParameters.length > 0) {
                const missingIds = missingRequiredParameters.map(p => p.parameter_id || p.id);
                setMissingFields(missingIds);
                
                const count = missingRequiredParameters.length;
                setFeedbackMsg({ type: 'error', text: `Preencha os ${count} resultados obrigatórios antes de salvar o Hemograma.` });
                
                setTimeout(() => setFeedbackMsg(null), 5000);
                setSaveStatus('idle'); // Restores the button
                setSaving(false);
                
                // Foco e rolagem para o primeiro campo vazio
                const firstMissingId = missingIds[0];
                const index = selectedResult.structuredValues?.findIndex(p => p.id === firstMissingId);
                if (index !== undefined && index >= 0 && inputRefs.current[index]) {
                    inputRefs.current[index].focus();
                    inputRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                return false;
            }

            setMissingFields([]);

            await laboratorioResultadosService.salvarResultados(selectedExamId, valuesToSave);
            
            const updatedData = await carregarDados(selectedAttendance ? selectedAttendance.protocol_number : searchFilters.protocol, selectedExamId);
            
            // Sincronizar estado após sucesso
            setInitialFormValues({ ...formValues });
            
            setSaveStatus('success');

            const results = updatedData && updatedData.length > 0 && updatedData[0].resultados ? updatedData[0].resultados : [];
            const hasPendente = results.some(r => String(r.status || 'PENDENTE').toUpperCase() === 'PENDENTE');
            const shouldRemoveFromView = searchFilters.status === 'Em digitação' && !hasPendente;

            if (shouldRemoveFromView) {
                 setFeedbackMsg({ type: 'success', text: 'Todos os exames deste atendimento foram digitados.' });
                 setSearchResults(prev => (prev || []).filter(att => att.id !== selectedAttendance?.id));
                 setSelectedAttendance(null);
                 setSelectedExamId(null);
                 setAttendances([]);
            } else {
                 if (wasDigitado) {
                     setFeedbackMsg({ type: 'success', text: 'Alterações salvas com sucesso.' });
                 } else {
                     setFeedbackMsg({ type: 'success', text: 'Resultado salvo com sucesso.' });
                 }
                 shouldScrollToTopRef.current = true;
                 goToNextExam({ skipUnsavedCheck: true });
            }

            setTimeout(() => {
                setFeedbackMsg(null);
                setSaveStatus('idle');
            }, 3000);
            return true;
        } catch (err) {
            console.error('[LaboratorioResultados] Erro ao salvar:', err);
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
        if (saving) return;
        event.preventDefault();
        
        let nextInputIndex = index + 1;
        while (nextInputIndex < inputRefs.current.length) {
            const nextInput = inputRefs.current[nextInputIndex];
            if (nextInput && !nextInput.readOnly && !nextInput.disabled) {
                nextInput.focus({ preventScroll: true });
                if (nextInput.select) nextInput.select();
                
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        nextInput.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    }, 10);
                });
                return;
            }
            nextInputIndex++;
        }
        
        await salvarExameAtual();
    };

    const getSaveButtonText = (defaultText) => {
        if (saveStatus === 'saving') return 'Salvando...';
        if (saveStatus === 'success') return 'Salvo com sucesso';
        if (saveStatus === 'error') return 'Erro ao salvar';
        
        const currentStatus = String(selectedResult?.status || '').trim().toUpperCase();
        return currentStatus === 'DIGITADO' ? 'Salvar alterações' : defaultText;
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
    
    const normalizedStatus = String(selectedResult.status || '').trim().toUpperCase();
    const isPendente = normalizedStatus === 'PENDENTE';
    const isDigitado = normalizedStatus === 'DIGITADO';
    
    const canEditResult = isPendente || isDigitado;
    const isReadOnly = !canEditResult;

    const getReadOnlyMessage = (status) => {
        if (status === 'CONFERIDO' || status === 'AGUARDANDO_LIBERACAO' || status === 'AGUARDANDO LIBERACAO') {
            return 'Este exame já foi conferido e está aguardando a liberação do laudo.';
        }
        if (status === 'LIBERADO' || status === 'LAUDO LIBERADO') {
            return 'Este exame já foi conferido e o laudo foi liberado.';
        }
        if (status === 'CANCELADO') {
            return 'Este exame foi cancelado.';
        }
        return 'Este exame não pode mais ser alterado.';
    };

    // Ação de Enviar para conferência só fica bloqueada se TODOS estiverem liberados/conferidos ou cancelados
    const resultadosAtivosParaConferencia = resultados.filter(item => String(item.status).toUpperCase() !== 'CANCELADO');
    const isEnvioConferenciaDisabled = resultadosAtivosParaConferencia.length === 0 || 
        resultadosAtivosParaConferencia.every(item => ['CONFERIDO', 'LIBERADO'].includes(String(item.status).toUpperCase()));

    const ATTENDANCE_STATUS_VISUALS = {
        'Sem exames': { cssClass: 'status-warning', border: '#94a3b8', text: '#475569' },
        'Laudo liberado': { cssClass: EXAM_STATUS_CONFIG['LIBERADO'].className, border: '#10b981', text: '#047857' },
        'Liberado': { cssClass: EXAM_STATUS_CONFIG['LIBERADO'].className, border: '#10b981', text: '#047857' },
        'Em digitação': { cssClass: EXAM_STATUS_CONFIG['PENDENTE'].className, border: '#f59e0b', text: '#b45309' },
        'Aguardando conferência': { cssClass: EXAM_STATUS_CONFIG['CONFERIDO'].className, border: '#3b82f6', text: '#1e40af' },
        'Aguardando liberação': { cssClass: 'status-aguardando-lib', border: '#8b5cf6', text: '#5b21b6' },
        'Cancelado': { cssClass: EXAM_STATUS_CONFIG['CANCELADO'].className, border: '#ef4444', text: '#b91c1c' }
    };

    const getStatusGeralAtendimento = (exames) => {
        if (!exames || exames.length === 0) return { label: 'Sem exames', cssClass: ATTENDANCE_STATUS_VISUALS['Sem exames'].cssClass };
        
        const allLiberado = exames.every(e => String(e.status).toUpperCase() === 'LIBERADO');
        if (allLiberado) return { label: 'Laudo liberado', cssClass: ATTENDANCE_STATUS_VISUALS['Laudo liberado'].cssClass };
        
        const hasPendente = exames.some(e => String(e.status).toUpperCase() === 'PENDENTE');
        if (hasPendente) return { label: 'Em digitação', cssClass: ATTENDANCE_STATUS_VISUALS['Em digitação'].cssClass };
        
        const hasDigitadoWaitingConf = exames.some(e => String(e.status).toUpperCase() === 'DIGITADO' && e.requires_conference === true);
        if (hasDigitadoWaitingConf) return { label: 'Aguardando conferência', cssClass: ATTENDANCE_STATUS_VISUALS['Aguardando conferência'].cssClass };
        
        return { label: 'Aguardando liberação', cssClass: ATTENDANCE_STATUS_VISUALS['Aguardando liberação'].cssClass };
    };

    const renderExamsSummary = (att) => {
        const parts = [];
        if (att.examesLiberados > 0) parts.push(<span key="lib" style={{ color: '#059669', fontWeight: 500 }}>{att.examesLiberados} liberados</span>);
        if (att.examesConferidos > 0) parts.push(<span key="conf" style={{ color: '#2563eb', fontWeight: 500 }}>{att.examesConferidos} conferidos</span>);
        if (att.examesDigitados > 0) parts.push(<span key="dig" style={{ color: '#0284c7', fontWeight: 500 }}>{att.examesDigitados} digitados</span>);
        if (att.examesPendentes > 0) parts.push(<span key="pend" style={{ color: '#d97706', fontWeight: 500 }}>{att.examesPendentes} pendentes</span>);
        if (att.examesCancelados > 0) parts.push(<span key="canc" style={{ color: '#ef4444', fontWeight: 500 }}>{att.examesCancelados} cancelado(s)</span>);

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
                <div className="lab-filters-grid" style={{ gridTemplateColumns: '130px 145px minmax(200px, 1fr) 160px 160px 120px' }}>
                    <div className="lab-filter-group">
                        <label>Data Inicial</label>
                        <input type="date" className="lab-input" value={searchFilters.date} onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})} onKeyDown={handleFilterKeyDown} />
                    </div>
                    <div className="lab-filter-group">
                        <label>CÓD. PACIENTE</label>
                        <input type="text" className="lab-input" placeholder="Ex.: 115003" value={searchFilters.patient_code} onChange={(e) => setSearchFilters({...searchFilters, patient_code: e.target.value})} onKeyDown={handleFilterKeyDown} />
                    </div>
                    <div className="lab-filter-group">
                        <label>Paciente</label>
                        <input type="text" className="lab-input" placeholder="Nome do paciente..." value={searchFilters.patient} onChange={(e) => setSearchFilters({...searchFilters, patient: e.target.value})} onKeyDown={handleFilterKeyDown} />
                    </div>
                    <div className="lab-filter-group">
                        <label>Status</label>
                        <select className="lab-select" value={searchFilters.status} onChange={(e) => setSearchFilters({...searchFilters, status: e.target.value})}>
                            <option value="Todos">Todos</option>
                            <option value="Em digitação">Em digitação</option>
                            <option value="Aguardando conferência">Aguardando conferência</option>
                            <option value="Conferidos">Conferidos</option>
                            <option value="Liberados">Liberados</option>
                            <option value="Cancelados">Cancelados</option>
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
                    <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '0.5rem', fontWeight: '700' }}>Nenhum exame em digitação.</h3>
                    <p style={{ color: '#64748b' }}>Os exames aparecerão aqui após a abertura de um novo atendimento.</p>
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
                        <div className="lab-empty-state" style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Search size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                            <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '0.5rem', fontWeight: '700' }}>
                                Nenhum exame em digitação.
                            </h3>
                            <p style={{ color: '#64748b' }}>Os exames aparecerão aqui após a abertura de um novo atendimento.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {searchResults.map(att => {
                                const visuals = ATTENDANCE_STATUS_VISUALS[att.statusGeral] || ATTENDANCE_STATUS_VISUALS['Sem exames'];
                                return (
                                <div key={att.id} className="lab-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '1rem 1.25rem', borderLeft: `3px solid ${visuals.border}` }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: att.attendance_date ? 'minmax(0, 1fr) auto auto auto' : 'minmax(0, 1fr) auto auto', gap: '1rem', alignItems: 'center' }}>
                                        <strong title={att.pacienteNome} style={{ fontSize: '1.15rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.pacienteNome}</strong>
                                        <span style={{ fontSize: '0.8rem', color: '#475569', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: '600', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Cód. Paciente: {att.pacienteCodigo}</span>
                                        {att.attendance_date && (
                                            <span style={{ fontSize: '0.8rem', color: '#475569', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: '600', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Data: {att.attendance_date.split('-').reverse().join('/')}</span>
                                        )}
                                        <button className="lab-btn lab-btn-primary" onClick={() => handleSelectAttendance(att)} style={{ whiteSpace: 'nowrap' }}>
                                            <Activity size={16} /> Abrir Atendimento
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><User size={14} /> Idade: <strong style={{ color: '#334155', fontWeight: 500 }}>{att.pacienteIdade}</strong></span>
                                        <span>Sexo: <strong style={{ color: '#334155', fontWeight: 500 }}>{att.pacienteSexo}</strong></span>
                                        <span>CNS: <strong style={{ color: '#334155', fontWeight: 500 }}>{att.pacienteCns || '---'}</strong></span>
                                        <span>CPF: <strong style={{ color: '#334155', fontWeight: 500 }}>{formatCpf(att.pacienteCpf)}</strong></span>
                                        {renderExamsSummary(att)}
                                        <span style={{ marginLeft: 'auto', borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>Status: <strong style={{ color: visuals.text }}>{att.statusGeral}</strong></span>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tela de Digitação e Resumo (Sempre condicionado a um atendimento selecionado) */}
            {selectedAttendance && attendances.length > 0 && (
                <div style={{ marginTop: '0.25rem' }}>
                    
                    {/* Resumo do Paciente com Ações Integradas */}
                    <div ref={examTopRef} className="lab-card lab-patient-summary" style={{ marginBottom: '1rem', padding: '0.5rem 1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
                            <button 
                                onClick={handleBackToSearch} 
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

                                {searchResults && selectedAttendance && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '1rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginRight: '0.5rem' }}>
                                            {searchResults.findIndex(a => a.id === selectedAttendance.id) + 1} de {searchResults.length}
                                        </span>
                                        <button 
                                            className="lab-btn" 
                                            style={{ padding: '0.4rem', border: '1px solid #e2e8f0', background: searchResults.findIndex(a => a.id === selectedAttendance.id) > 0 ? '#fff' : '#f8fafc', borderRadius: '6px', color: searchResults.findIndex(a => a.id === selectedAttendance.id) > 0 ? '#334155' : '#cbd5e1', cursor: searchResults.findIndex(a => a.id === selectedAttendance.id) > 0 ? 'pointer' : 'not-allowed' }}
                                            onClick={() => handleNavigatePatient('prev')}
                                            disabled={loading || saving || searchResults.findIndex(a => a.id === selectedAttendance.id) <= 0}
                                            title={searchResults.findIndex(a => a.id === selectedAttendance.id) <= 0 ? 'Primeiro atendimento da lista' : 'Paciente anterior'}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button 
                                            className="lab-btn" 
                                            style={{ padding: '0.4rem', border: '1px solid #e2e8f0', background: searchResults.findIndex(a => a.id === selectedAttendance.id) < searchResults.length - 1 ? '#fff' : '#f8fafc', borderRadius: '6px', color: searchResults.findIndex(a => a.id === selectedAttendance.id) < searchResults.length - 1 ? '#334155' : '#cbd5e1', cursor: searchResults.findIndex(a => a.id === selectedAttendance.id) < searchResults.length - 1 ? 'pointer' : 'not-allowed' }}
                                            onClick={() => handleNavigatePatient('next')}
                                            disabled={loading || saving || searchResults.findIndex(a => a.id === selectedAttendance.id) >= searchResults.length - 1}
                                            title={searchResults.findIndex(a => a.id === selectedAttendance.id) >= searchResults.length - 1 ? 'Último atendimento da lista' : 'Próximo paciente'}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                                <div className="lab-ps-item" style={{ borderRight: '1px solid #e2e8f0', paddingRight: '1.25rem' }}><span className="lab-ps-label">Cód. Paciente:</span> <span className="lab-ps-val font-semibold">{currentAttendance.pacienteCodigo}</span></div>
                                <div className="lab-ps-item" style={{ flex: 1 }}><span className="lab-ps-label">Paciente:</span> <span className="lab-ps-val text-primary" style={{ fontSize: '1.15rem', fontWeight: '600' }}>{currentAttendance.pacienteNome}</span></div>
                            </div>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                                <div className="lab-ps-item"><span className="lab-ps-label">Idade:</span> <span className="lab-ps-val">{currentAttendance.pacienteIdade}</span></div>
                                <div className="lab-ps-item"><span className="lab-ps-label">Sexo:</span> <span className="lab-ps-val">{currentAttendance.pacienteSexo}</span></div>
                                <div className="lab-ps-item"><span className="lab-ps-label">Origem:</span> <span className="lab-ps-val">{formatAttendanceOrigin(currentAttendance.attendance_origin)}</span></div>
                                <div className="lab-ps-item"><span className="lab-ps-label">Médico:</span> <span className="lab-ps-val">{currentAttendance.requesting_doctor || 'Não informado'}</span></div>
                                <div className="lab-ps-item" style={{ marginLeft: 'auto' }}>
                                    <span className={`lab-status-tag ${statusGeral.cssClass}`}>{statusGeral.label}</span>
                                </div>
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
                                    id={`exam-item-${res.id}`}
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
                                        <span>{getReadOnlyMessage(normalizedStatus)}</span>
                                    </div>
                                )}
                                
                                {!isReadOnly && isDigitado && (
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
                                        <Info size={18} />
                                        <span>Este exame já foi digitado e está aguardando conferência. Os resultados ainda podem ser corrigidos.</span>
                                    </div>
                                )}

                                {(() => {
                                    let patientAgeDays = -1;
                                    if (currentAttendance?.pacienteNascimento) {
                                        const bDate = new Date(currentAttendance.pacienteNascimento);
                                        const aDate = new Date();
                                        if (!isNaN(bDate)) {
                                            patientAgeDays = Math.floor((aDate - bDate) / (1000 * 60 * 60 * 24));
                                        }
                                    }
                                    let pSex = String(currentAttendance?.pacienteSexo || '').toUpperCase();
                                    let patientSexGroup = pSex.startsWith('M') ? 'MALE' : pSex.startsWith('F') ? 'FEMALE' : 'UNKNOWN';
                                    const isHemo = String(selectedResult?.exameCodigo || '').toUpperCase() === 'HEMO';
                                    const obsCodes = new Set(['OBSERVACOES_ERITROGRAMA', 'OBS_ERITROGRAMA', 'SERIE_ERITROCITARIA', 'S_ERITROCITARIA', 'SERIE_LEUCOCITARIA', 'S_LEUCOCITARIA', 'SERIE_PLAQUETARIA', 'S_PLAQUETARIA']);

                                    return (selectedResult.structuredValues || []).map((param, index) => {
                                        const formState = formValues[param.id] || {};
                                        const isNumeric = param.result_type === 'NUMERICO';
                                        const isMissing = missingFields.includes(param.id);
                                        const code = String(param.parameter_code || param.code || '').toUpperCase();
                                        
                                        let refObj = null;
                                        let isCompactRef = false;
                                        let compactRefText = '';
                                        let isObservation = false;
                                        let isCalculatedIndex = false;

                                        if (isHemo) {
                                            if (obsCodes.has(code) || param.result_type === 'TEXTO') {
                                                isObservation = true;
                                            } else if (param.reference_text) {
                                                refObj = resolveHemoReference(code, param.reference_text, patientAgeDays, patientSexGroup);
                                                
                                                if (refObj && refObj.valid) {
                                                    isCompactRef = true;
                                                    compactRefText = refObj.text;

                                                    if (refObj.displayLines) {
                                                        const maleLine = refObj.displayLines.find(l => l.isMale);
                                                        const femaleLine = refObj.displayLines.find(l => l.isFemale);
                                                        
                                                        if (maleLine && femaleLine && maleLine.text === femaleLine.text) {
                                                            // As referências são idênticas, não adicionar prefixo
                                                            compactRefText = refObj.text;
                                                        } else {
                                                            const highlightedLine = refObj.displayLines.find(l => l.highlight);
                                                            if (highlightedLine) {
                                                                if (highlightedLine.isMale) compactRefText = `Homens: ${refObj.text}`;
                                                                else if (highlightedLine.isFemale) compactRefText = `Mulheres: ${refObj.text}`;
                                                            } else if (refObj.displayLines.some(l => l.isRel || l.isAbs)) {
                                                                compactRefText = refObj.displayLines.map(l => l.text).join(' | ');
                                                            }
                                                        }
                                                    }
                                                } else if (code === 'MIELOCITOS' || code === 'PLASMOCITOS' || code === 'METAMIELOCITOS') {
                                                    const lines = param.reference_text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                                                    if (lines.length > 0) {
                                                        isCompactRef = true;
                                                        compactRefText = lines.join(' | ');
                                                    }
                                                }
                                            }
                                            if (code === 'VCM' || code === 'HCM' || code === 'CHCM') {
                                                isCalculatedIndex = true;
                                            }
                                        }

                                        let sectionHeader = null;
                                        if (isHemo) {
                                            if (code === 'HEMACIAS') sectionHeader = 'ERITROGRAMA';
                                            else if (code === 'LEUCOCITOS') sectionHeader = 'LEUCOGRAMA';
                                            else if (code === 'PLAQUETAS') sectionHeader = 'SÉRIE PLAQUETÁRIA';
                                            else if (code === 'SERIE_ERITROCITARIA' || code === 'S_ERITROCITARIA') sectionHeader = 'OBSERVAÇÕES MORFOLÓGICAS';
                                        }

                                        const renderContainerPadding = isCompactRef || isObservation ? '0.25rem' : '0.75rem';

                                        return (
                                            <React.Fragment key={param.id}>
                                                {sectionHeader && (
                                                    <div style={{ marginTop: '1.25rem', marginBottom: '0.75rem', paddingBottom: '0.25rem', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
                                                        {sectionHeader}
                                                    </div>
                                                )}
                                                <div className="lab-typing-parameter-block" style={{ marginBottom: renderContainerPadding, paddingBottom: renderContainerPadding, borderBottom: '1px solid #f1f5f9' }}>
                                                    <div className="lab-typing-result-row" style={{ alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', display: 'flex' }}>
                                                        <div className="lab-typing-input-group" style={{ flex: isCompactRef ? '0 0 58%' : 1, minWidth: isCompactRef ? '300px' : '300px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <label style={{ color: isMissing ? '#ef4444' : undefined, flex: isCompactRef ? '0 0 35%' : 'none', minWidth: isCompactRef ? '120px' : undefined, margin: 0, fontSize: isCompactRef ? '0.9rem' : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={param.name || 'Parâmetro'}>
                                                                {param.name || 'Parâmetro'}
                                                            </label>
                                                            <div className="lab-input-wrapper" style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
                                                                {isObservation && !isNumeric ? (
                                                                    <textarea
                                                                        className="lab-input-field"
                                                                        style={{
                                                                            flex: 1,
                                                                            padding: '0.5rem 0.75rem',
                                                                            border: isMissing ? '2px solid #ef4444' : '1px solid #cbd5e1',
                                                                            borderRadius: '8px',
                                                                            fontSize: '1rem',
                                                                            outline: 'none',
                                                                            backgroundColor: isMissing ? '#fef2f2' : undefined,
                                                                            minHeight: '60px',
                                                                            resize: 'vertical'
                                                                        }}
                                                                        placeholder="Observações..."
                                                                        value={formState.value_text || ''}
                                                                        onChange={(e) => handleValueChange(param.id, 'value_text', e.target.value)}
                                                                        disabled={isReadOnly || saving}
                                                                    />
                                                                ) : (
                                                                    <input 
                                                                        type="text"
                                                                        inputMode={isNumeric ? (HEMO_INTEGER_COUNT_CODES.has(code) ? "numeric" : "decimal") : undefined}
                                                                        className={`lab-input-field ${isNumeric ? 'lab-result-number-input' : ''} ${isCalculatedIndex ? 'lab-hemo-calculated' : ''}`} 
                                                                        style={{ 
                                                                            flex: 1, 
                                                                            padding: isCompactRef ? '0.35rem 0.5rem' : '0.5rem 0.75rem', 
                                                                            border: isMissing ? '2px solid #ef4444' : '1px solid #cbd5e1', 
                                                                            borderRadius: '8px',
                                                                            fontSize: isCompactRef ? '1rem' : '1.1rem',
                                                                            outline: 'none',
                                                                            backgroundColor: isMissing ? '#fef2f2' : (isCalculatedIndex ? '#f8fafc' : undefined),
                                                                            height: isCompactRef ? '36px' : 'auto',
                                                                            cursor: isCalculatedIndex ? 'default' : undefined,
                                                                            fontStyle: isCalculatedIndex ? 'italic' : undefined
                                                                        }}
                                                                        placeholder={isCalculatedIndex ? 'Calculado automaticamente' : 'Resultado...'} 
                                                                        value={isNumeric ? (formState.value_numeric ?? '') : (formState.value_text || '')}
                                                                        onChange={(e) => {
                                                                            if (isCalculatedIndex) return;
                                                                            let val = e.target.value;
                                                                            if (isNumeric && HEMO_INTEGER_COUNT_CODES.has(code)) {
                                                                                if (/^[\d.]+$/.test(val)) {
                                                                                    const digits = val.replace(/\./g, '');
                                                                                    val = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                                                }
                                                                            }
                                                                            handleValueChange(param.id, isNumeric ? 'value_numeric' : 'value_text', val);
                                                                        }}
                                                                        disabled={isReadOnly || saving}
                                                                        readOnly={isCalculatedIndex}
                                                                        aria-readonly={isCalculatedIndex ? 'true' : undefined}
                                                                        tabIndex={isCalculatedIndex ? -1 : 0}
                                                                        onKeyDown={(e) => {
                                                                            if (isCalculatedIndex) return;
                                                                            handleResultKeyDown(e, index);
                                                                        }}
                                                                        ref={(el) => inputRefs.current[index] = el}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {param.reference_text && !isCompactRef && !isObservation && (
                                                            <div className="lab-typing-ref-box" style={{ flex: 1, minWidth: '250px', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                <span className="lab-ref-label" style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600 }}>VALOR DE REFERÊNCIA:</span>
                                                                <div className="lab-ref-value" style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                                                    {param.reference_text}
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {isCompactRef && !isObservation && (
                                                            <div 
                                                                className="lab-typing-ref-compact lab-ref-tooltip-trigger" 
                                                                onMouseEnter={(e) => handleTooltipEnter(e, param.name, compactRefText, param.reference_text)}
                                                                onMouseLeave={handleTooltipLeave}
                                                                onFocus={(e) => handleTooltipEnter(e, param.name, compactRefText, param.reference_text)}
                                                                onBlur={handleTooltipLeave}
                                                                tabIndex={0}
                                                                style={{ flex: '1 1 40%', minWidth: '150px', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', height: '36px', cursor: 'help', outline: 'none', transition: 'all 0.2s' }}
                                                            >
                                                                <span style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {compactRefText}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    });
                                })()}

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
            
            <LabRefTooltip 
                isOpen={!!activeTooltip} 
                anchorEl={activeTooltip?.anchorEl} 
                paramName={activeTooltip?.paramName} 
                applicableRefText={activeTooltip?.applicableRefText} 
                allRefText={activeTooltip?.allRefText} 
                onClose={handleTooltipLeave} 
            />
        </div>
    );
};


export default LaboratorioResultados;
