import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatCpf } from '../../utils/formatters';
import { 
    CheckCircle2, AlertTriangle, Search, RefreshCw, 
    Activity, Clock, ShieldCheck, User, Eye, 
    ChevronLeft, ChevronRight, ArrowLeft, Info, ListChecks, Loader2,
    Edit2, Save, X, FileText
} from 'lucide-react';
import './LaboratorioConferencia.css';
import { laboratorioConferenciaService } from '../../services/api/laboratorioConferencia.service';
import { useAuth } from '../../context/AuthContext';
import { canWriteLaboratorio } from '../../utils/laboratorioAcl';
import { laboratorioResultadosService } from '../../services/api/laboratorioResultados.service';
import { 
    ATTENDANCE_ORIGINS, 
    formatAttendanceOrigin, 
    formatLabValue, 
    isHemoExam, 
    isHemoMorphologyParameter, 
    expandHemogramaMorphologyAbbreviations, 
    resolveHemoReference, 
    formatHemoReferenceText, 
    expandRcText 
} from '../../utils/laboratorioHelpers';
import { 
    isUriExam, 
    getUriParameterKey, 
    getUriParameterDisplayName, 
    URI_PARAM_CANONICAL_KEYS, 
    expandUriFieldValue 
} from '../../utils/uriHelpers';

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getPatientAgeDays = (protocol) => {
    if (!protocol) return 365 * 30;
    if (protocol.pacienteDataNasc) {
        const diff = Date.now() - new Date(protocol.pacienteDataNasc).getTime();
        return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }
    if (protocol.pacienteIdade) {
        const str = String(protocol.pacienteIdade).toLowerCase();
        if (str.includes('ano')) {
            const y = parseInt(str, 10);
            if (!isNaN(y)) return Math.floor(y * 365.25);
        }
        if (str.includes('mês') || str.includes('mes')) {
            const m = parseInt(str, 10);
            if (!isNaN(m)) return Math.floor(m * 30.4);
        }
        if (str.includes('dia')) {
            const d = parseInt(str, 10);
            if (!isNaN(d)) return d;
        }
    }
    return 365 * 30;
};

const getPatientSexGroup = (protocol) => {
    if (!protocol) return 'UNKNOWN';
    const sex = String(protocol.pacienteSexo || protocol.pacienteSexoRaw || '').trim().toUpperCase();
    if (sex === 'M' || sex.startsWith('MASC')) return 'MALE';
    if (sex === 'F' || sex.startsWith('FEM')) return 'FEMALE';
    return 'UNKNOWN';
};

const LaboratorioConferencia = () => {
    const [searchFilters, setSearchFilters] = useState({
        date: '',
        patient: '',
        patientCode: '',
        attendance_origin: '',
        status: 'DIGITADO'
    });

    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    
    const [localSearch, setLocalSearch] = useState('');
    const [selectedProtocol, setSelectedProtocol] = useState(null);
    
    const queueListRef = useRef(null);
    const queueScrollPosRef = useRef(0);
    const sentinelRef = useRef(null);

    const PAGE_SIZE = 25;
    const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE);

    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    
    const [selectedExam, setSelectedExam] = useState(null);
    const [examDetails, setExamDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    const [saving, setSaving] = useState(false);
    const [returning, setReturning] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);

    const [editingParam, setEditingParam] = useState(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const activeExamTabRef = useRef(null);
    const handleConfirmarConferenciaRef = useRef(null);
    const examTabsRef = useRef(null);
    const [tabScrollState, setTabScrollState] = useState({
        hasOverflow: false,
        canScrollLeft: false,
        canScrollRight: false
    });

    const checkTabsScroll = () => {
        const el = examTabsRef.current;
        if (!el) return;
        const hasOverflow = el.scrollWidth > el.clientWidth + 2;
        const canScrollLeft = hasOverflow && el.scrollLeft > 5;
        const canScrollRight = hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 5;
        setTabScrollState({
            hasOverflow,
            canScrollLeft,
            canScrollRight
        });
    };

    const handleScrollTabs = (direction) => {
        const el = examTabsRef.current;
        if (!el) return;
        el.scrollBy({
            left: direction * 250,
            behavior: 'smooth'
        });
    };

    // Initial load
    useEffect(() => {
        handleSearch();
    }, []);

    // Atalhos de teclado globais
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (editingParam) {
                    setEditingParam(null);
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (showUnsavedModal) return;
                if (!selectedExam || saving || returning || loadingDetails) return;
                e.preventDefault();
                handleConfirmarConferenciaRef.current?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showUnsavedModal, selectedExam, saving, returning, loadingDetails, editingParam]);

    // Scroll listeners das abas de exames no modo de conferência
    useEffect(() => {
        const el = examTabsRef.current;
        if (!el) return;

        checkTabsScroll();

        const onScroll = () => checkTabsScroll();
        el.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);

        let ro = null;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => checkTabsScroll());
            ro.observe(el);
        }

        return () => {
            el.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (ro) ro.disconnect();
        };
    }, [selectedProtocol?.protocolo, selectedProtocol?.exams]);

    useEffect(() => {
        if (activeExamTabRef.current) {
            activeExamTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            const timer = setTimeout(checkTabsScroll, 350);
            return () => clearTimeout(timer);
        }
    }, [selectedExam?.id]);

    // Restauração da posição de scroll ao voltar para a Fila
    useEffect(() => {
        if (!selectedProtocol && queueListRef.current) {
            const timer = setTimeout(() => {
                if (queueListRef.current) {
                    queueListRef.current.scrollTop = queueScrollPosRef.current;
                }
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [selectedProtocol]);

    const handleFilterKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSearch();
        }
    };

    const filteredResults = useMemo(() => {
        if (!localSearch) return searchResults;
        const lower = localSearch.toLowerCase().trim();
        const removeAccents = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const term = removeAccents(lower);

        return searchResults.filter(item => {
            const p = removeAccents((item.protocolo || '').toLowerCase());
            const n = removeAccents((item.pacienteNome || '').toLowerCase());
            const ec = removeAccents((item.exameCodigo || '').toLowerCase());
            const en = removeAccents((item.exameNome || '').toLowerCase());
            const cns = removeAccents((item.pacienteCns || '').toLowerCase());
            const cpf = removeAccents((item.pacienteCpf || '').toLowerCase());

            return p.includes(term) || n.includes(term) || ec.includes(term) || en.includes(term) || cns.includes(term) || cpf.includes(term);
        });
    }, [searchResults, localSearch]);

    const groupedProtocols = useMemo(() => {
        const groups = {};
        filteredResults.forEach(ex => {
            if (!groups[ex.protocolo]) {
                groups[ex.protocolo] = {
                    protocolo: ex.protocolo,
                    dataAtendimento: ex.dataAtendimento,
                    pacienteNome: ex.pacienteNome,
                    pacienteIdade: ex.pacienteIdade,
                    pacienteSexo: ex.pacienteSexo,
                    pacienteCns: ex.pacienteCns,
                    pacienteCpf: ex.pacienteCpf,
                    pacienteCode: ex.pacienteCode,
                    pacienteDataNasc: ex.pacienteDataNasc,
                    pacienteSexoRaw: ex.pacienteSexoRaw,
                    convenio: ex.convenio,
                    medico: ex.medico,
                    local_entrega: ex.local_entrega,
                    attendance_origin: ex.attendance_origin,
                    exams: []
                };
            }
            groups[ex.protocolo].exams.push(ex);
        });
        return Object.values(groups).sort((a, b) => {
            const parseDate = (dStr) => {
                if (!dStr) return 0;
                if (dStr.includes('/')) {
                    const [d, m, y] = dStr.split('/');
                    return new Date(`${y}-${m}-${d}`).getTime();
                }
                return new Date(dStr).getTime();
            };
            
            const dateA = parseDate(a.dataAtendimento);
            const dateB = parseDate(b.dataAtendimento);
            
            if (dateA !== dateB) {
                return dateA - dateB;
            }
            
            const codeA = parseInt(a.pacienteCode) || 0;
            const codeB = parseInt(b.pacienteCode) || 0;
            return codeA - codeB;
        });
    }, [filteredResults]);

    // Lista paginada progressivamente (50 em 50)
    const displayedProtocols = useMemo(() => {
        return groupedProtocols.slice(0, displayedCount);
    }, [groupedProtocols, displayedCount]);

    // Reset da paginação ao filtrar localmente
    useEffect(() => {
        setDisplayedCount(PAGE_SIZE);
    }, [localSearch]);

    // Rolagem progressiva da fila (infinite scroll)
    const handleQueueScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        queueScrollPosRef.current = scrollTop;
        if (scrollHeight - scrollTop - clientHeight < 280) {
            if (displayedCount < groupedProtocols.length) {
                setDisplayedCount(prev => Math.min(prev + PAGE_SIZE, groupedProtocols.length));
            }
        }
    };

    // Observer na sentinela para carregamento contínuo ao chegar ao fim da lista
    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setDisplayedCount(prev => Math.min(prev + PAGE_SIZE, groupedProtocols.length));
            }
        }, {
            root: queueListRef.current,
            rootMargin: '200px',
            threshold: 0.1
        });
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [groupedProtocols.length, displayedCount]);

    // Atualização do protocolo selecionado se os dados mudarem
    useEffect(() => {
        if (selectedProtocol) {
            const found = groupedProtocols.find(g => g.protocolo === selectedProtocol.protocolo);
            if (found) {
                setSelectedProtocol(found);
                if (selectedExam && !found.exams.find(e => e.id === selectedExam.id)) {
                    if (found.exams.length > 0) {
                        handleSelectExam(found.exams[0]);
                    } else {
                        setSelectedExam(null);
                        setExamDetails([]);
                    }
                }
            } else {
                setSelectedProtocol(null);
                setSelectedExam(null);
                setExamDetails([]);
            }
        }
    }, [groupedProtocols]);

    const handleSearch = async () => {
        try {
            setLoading(true);
            setDisplayedCount(PAGE_SIZE);
            queueScrollPosRef.current = 0;
            if (queueListRef.current) {
                queueListRef.current.scrollTop = 0;
            }
            const data = await laboratorioConferenciaService.buscarExamesParaConferencia({
                ...searchFilters,
                dataInicial: searchFilters.date
            });
            setSearchResults(data);
            setSelectedProtocol(null);
            setSelectedExam(null);
            setExamDetails([]);
            setFeedbackMsg(null);
        } catch (error) {
            console.error('Erro na busca', error);
            setFeedbackMsg({ type: 'error', text: 'Erro ao buscar exames para conferência.' });
            setTimeout(() => setFeedbackMsg(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectExam = async (exam) => {
        try {
            setSelectedExam(exam);
            setLoadingDetails(true);
            setEditingParam(null);
            const detalhes = await laboratorioConferenciaService.carregarDetalhesResultado(exam.id);
            setExamDetails(detalhes);
            setFeedbackMsg(null);
        } catch (error) {
            console.error('Erro ao carregar detalhes', error);
            setFeedbackMsg({ type: 'error', text: 'Erro ao carregar os parâmetros do exame.' });
            setTimeout(() => setFeedbackMsg(null), 3000);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSelectExamWithCheck = (exam) => {
        if (editingParam) {
            setPendingAction(() => () => handleSelectExam(exam));
            setShowUnsavedModal(true);
        } else {
            handleSelectExam(exam);
        }
    };

    const handleOpenConference = (group) => {
        if (editingParam) {
            setPendingAction(() => () => handleOpenConference(group));
            setShowUnsavedModal(true);
            return;
        }

        // Salvar a posição atual de scroll da fila
        if (queueListRef.current) {
            queueScrollPosRef.current = queueListRef.current.scrollTop;
        }

        setSelectedProtocol(group);
        if (group.exams && group.exams.length > 0) {
            handleSelectExam(group.exams[0]);
        } else {
            setSelectedExam(null);
            setExamDetails([]);
        }
    };

    const handleNavigateProtocol = (direction) => {
        if (!selectedProtocol) return;

        const currentIndex = groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo);
        if (currentIndex === -1) return;

        let targetProtocol;
        if (direction === 'prev' && currentIndex > 0) {
            targetProtocol = groupedProtocols[currentIndex - 1];
        } else if (direction === 'next' && currentIndex < groupedProtocols.length - 1) {
            targetProtocol = groupedProtocols[currentIndex + 1];
        } else {
            return;
        }

        if (editingParam) {
            setPendingAction(() => () => handleNavigateProtocol(direction));
            setShowUnsavedModal(true);
            return;
        }

        handleOpenConference(targetProtocol);
    };

    const handleBackToQueue = () => {
        if (editingParam) {
            setPendingAction(() => handleBackToQueue);
            setShowUnsavedModal(true);
            return;
        }

        setSelectedProtocol(null);
        setSelectedExam(null);
        setExamDetails([]);
        setEditingParam(null);
    };

    const handleSearchWithCheck = () => {
        if (editingParam) {
            setPendingAction(() => handleSearch);
            setShowUnsavedModal(true);
        } else {
            handleSearch();
        }
    };

    const handleSaveParam = async (param) => {
        if (!canWriteLaboratorio(role)) return;
        if (!editingParam || !selectedExam) return;
        
        if (!param.id) {
            setFeedbackMsg({ type: 'error', text: 'Não foi possível identificar o registro deste resultado.' });
            setTimeout(() => setFeedbackMsg(null), 4000);
            return;
        }

        try {
            setSaving(true);
            const rawVal = editingParam.value;
            const updatedParam = { ...param, value_id: param.id };
            
            if (typeof rawVal === 'string') {
                const normalizedStr = rawVal.trim().replace(',', '.');
                const parsedNum = Number(normalizedStr);

                if (rawVal.trim() !== '' && !isNaN(parsedNum) && isFinite(parsedNum) && !editingParam.isText) {
                    updatedParam.value_numeric = parsedNum;
                    updatedParam.value_text = null;
                } else {
                    updatedParam.value_text = rawVal;
                    updatedParam.value_numeric = null;
                }
            } else if (rawVal !== null && rawVal !== undefined && !isNaN(rawVal)) {
                updatedParam.value_numeric = Number(rawVal);
                updatedParam.value_text = null;
            } else {
                updatedParam.value_text = rawVal || '';
                updatedParam.value_numeric = null;
            }
            
            await laboratorioResultadosService.salvarResultados(selectedExam.id, [updatedParam]);
            
            setExamDetails(prev => prev.map(p => p.id === param.id ? { 
                ...p, 
                value_numeric: updatedParam.value_numeric, 
                value_text: updatedParam.value_text 
            } : p));
            setEditingParam(null);
            setFeedbackMsg({ type: 'success', text: 'Valor atualizado com sucesso.' });
            setTimeout(() => setFeedbackMsg(null), 3000);
        } catch (error) {
            console.error('Erro ao salvar parâmetro', error);
            setFeedbackMsg({ type: 'error', text: 'Não foi possível atualizar o valor.' });
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmarConferencia = async () => {
        if (!canWriteLaboratorio(role)) return;
        if (!selectedExam || saving || returning) return;
        
        if (editingParam) {
            setPendingAction(() => handleConfirmarConferencia);
            setShowUnsavedModal(true);
            return;
        }

        const confirmedId = selectedExam.id;

        try {
            setSaving(true);
            await laboratorioConferenciaService.confirmarConferencia(confirmedId);
            setFeedbackMsg({ type: 'success', text: 'Exame conferido com sucesso.' });

            const updatedSearchResults = searchResults.filter(ex => ex.id !== confirmedId);
            setSearchResults(updatedSearchResults);

            const remainingExamsInProtocol = updatedSearchResults.filter(
                ex => ex.protocolo === selectedProtocol?.protocolo && ex.status === 'DIGITADO'
            );

            if (remainingExamsInProtocol.length > 0) {
                const nextExam = remainingExamsInProtocol[0];
                handleSelectExam(nextExam);
            } else {
                setSelectedProtocol(null);
                setSelectedExam(null);
                setExamDetails([]);
            }

            setTimeout(() => {
                setFeedbackMsg(null);
            }, 3000);
        } catch (error) {
            console.error('[Conferência] Erro ao confirmar exame:', error);
            const errorMsg = error?.message || 'Não foi possível confirmar o exame.';
            setFeedbackMsg({ type: 'error', text: errorMsg });
            setTimeout(() => setFeedbackMsg(null), 6000);
        } finally {
            setSaving(false);
        }
    };
    handleConfirmarConferenciaRef.current = handleConfirmarConferencia;

    const isAbnormal = (val_num, min, max) => {
        if (val_num === null || val_num === undefined || val_num === '') return false;
        const num = parseFloat(val_num);
        if (isNaN(num)) return false;
        
        if (min !== null && min !== undefined && num < parseFloat(min)) return 'below';
        if (max !== null && max !== undefined && num > parseFloat(max)) return 'above';
        return 'normal';
    };

    const isHemo = isHemoExam(selectedExam?.exameCodigo);
    const isUri = isUriExam(selectedExam?.exameCodigo);

    return (
        <div className="lab-conf-container">
            {/* ============================================================== */}
            {/* ESTADO 1: FILA DE CONFERÊNCIA (Quando nenhum atendimento está aberto) */}
            {/* ============================================================== */}
            {!selectedProtocol ? (
                <>
                    {/* Header da Página */}
                    <header className="lab-conf-header">
                        <div className="lab-conf-title-group">
                            <h1 className="lab-title">
                                <ListChecks size={20} className="text-primary" />
                                Conferência
                            </h1>
                            <p className="lab-subtitle">Revisão técnica dos resultados antes da liberação do laudo</p>
                        </div>
                    </header>

                    {/* Filtros da Fila - Padrão Resultados */}
                    <div className="lab-filters-card lab-conf-filters-card">
                        <div className="lab-filters-grid lab-conf-filters-grid">
                            <div className="lab-filter-group">
                                <label>Data</label>
                                <input 
                                    type="date" 
                                    className="lab-input"
                                    value={searchFilters.date}
                                    onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})}
                                    onKeyDown={handleFilterKeyDown}
                                />
                            </div>

                            <div className="lab-filter-group">
                                <label>CÓD. PACIENTE</label>
                                <input 
                                    type="text" 
                                    className="lab-input"
                                    placeholder="Ex.: 115003"
                                    value={searchFilters.patientCode}
                                    onChange={(e) => {
                                        const onlyNums = e.target.value.replace(/\D/g, '');
                                        setSearchFilters({...searchFilters, patientCode: onlyNums});
                                    }}
                                    onKeyDown={handleFilterKeyDown}
                                />
                            </div>

                            <div className="lab-filter-group">
                                <label>Paciente</label>
                                <input 
                                    type="text" 
                                    className="lab-input"
                                    placeholder="Nome do paciente..."
                                    value={searchFilters.patient}
                                    onChange={(e) => setSearchFilters({...searchFilters, patient: e.target.value})}
                                    onKeyDown={handleFilterKeyDown}
                                />
                            </div>

                            <div className="lab-filter-group">
                                <label>Origem</label>
                                <select 
                                    className="lab-select"
                                    value={searchFilters.attendance_origin}
                                    onChange={(e) => setSearchFilters({...searchFilters, attendance_origin: e.target.value})}
                                >
                                    <option value="">Todos</option>
                                    {ATTENDANCE_ORIGINS.map(origin => (
                                        <option key={origin.value} value={origin.value}>{origin.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="lab-filter-group">
                                <label>Status</label>
                                <select 
                                    className="lab-select"
                                    value={searchFilters.status}
                                    onChange={(e) => setSearchFilters({...searchFilters, status: e.target.value})}
                                >
                                    <option value="DIGITADO">Aguardando conferência</option>
                                    <option value="LIBERADO">Liberados</option>
                                    <option value="TODOS">Todos</option>
                                </select>
                            </div>

                            <div className="lab-filter-group lab-filter-actions">
                                <label className="filter-label-spacer" aria-hidden="true">Ação</label>
                                <button 
                                    className="lab-btn lab-btn-primary" 
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={handleSearchWithCheck} 
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                                    Buscar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Fila de Atendimentos */}
                    <div className="lab-conf-queue-view">
                        <div className="lab-conf-queue-topbar">
                            <div className="lab-conf-queue-title-box">
                                <h3 className="lab-conf-queue-title">
                                    {searchFilters.status === 'DIGITADO' ? 'Atendimentos para Conferência' : 
                                     searchFilters.status === 'LIBERADO' ? 'Atendimentos Liberados' : 
                                     'Todos os Atendimentos'}
                                </h3>
                                <span className="lab-conf-queue-count-badge">
                                    {groupedProtocols.length} {groupedProtocols.length === 1 ? 'atendimento' : 'atendimentos'} • {filteredResults.length} {filteredResults.length === 1 ? (searchFilters.status === 'DIGITADO' ? 'exame pendente' : searchFilters.status === 'LIBERADO' ? 'exame liberado' : 'exame') : (searchFilters.status === 'DIGITADO' ? 'exames pendentes' : searchFilters.status === 'LIBERADO' ? 'exames liberados' : 'exames')}
                                    {groupedProtocols.length > 0 && (
                                        <span className="lab-conf-queue-loaded-tag">
                                            ({displayedProtocols.length} carregados)
                                        </span>
                                    )}
                                </span>
                            </div>

                            <div className="lab-conf-queue-search-box">
                                <Search size={14} className="lab-conf-queue-search-icon" />
                                <input 
                                    type="text" 
                                    className="lab-conf-queue-search-input"
                                    placeholder="Filtrar nesta fila (paciente, código, protocolo)..." 
                                    value={localSearch}
                                    onChange={(e) => setLocalSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div 
                            className="lab-conf-queue-list-scroll" 
                            ref={queueListRef}
                            onScroll={handleQueueScroll}
                        >
                            {loading ? (
                                <div className="lab-conf-empty">
                                    <Loader2 size={26} className="spin text-primary" />
                                    <p>Carregando fila de exames...</p>
                                </div>
                            ) : groupedProtocols.length === 0 ? (
                                <div className="lab-conf-empty">
                                    <Activity size={36} className="lab-conf-empty-icon" />
                                    <h3>{searchFilters.status === 'DIGITADO' ? 'Nenhum exame pendente de conferência' : 'Nenhum exame encontrado'}</h3>
                                    <p>Não foram encontrados atendimentos para os filtros aplicados.</p>
                                </div>
                            ) : (
                                <div className="lab-conf-queue-cards-wrapper">
                                    {displayedProtocols.map((group) => {
                                        const totalExames = group.exams.length;
                                        const liberadosCount = group.exams.filter(e => e.status === 'LIBERADO').length;
                                        const pendentesCount = totalExames - liberadosCount;
                                        const isAllLiberados = pendentesCount === 0 && liberadosCount > 0;
                                        const displayProtocolo = group.protocolo ? String(group.protocolo).replace(/^LAB-/i, '') : '';
                                        return (
                                            <div 
                                                key={group.protocolo} 
                                                className="lab-card lab-conf-attendance-card"
                                                onClick={() => handleOpenConference(group)}
                                            >
                                                {/* Linha Superior: Nome do Paciente (Esq) + Badges e Botão (Dir) */}
                                                <div className="lab-conf-card-top-row">
                                                    <strong 
                                                        title={group.pacienteNome} 
                                                        className="lab-conf-card-patient-name"
                                                    >
                                                        {group.pacienteNome}
                                                    </strong>

                                                    <div className="lab-conf-card-right-group">
                                                        <span className="lab-conf-card-badge">
                                                            Cód. Paciente: {group.pacienteCode || 'N/I'}
                                                        </span>
                                                        <span className="lab-conf-card-badge">
                                                            Protocolo: {displayProtocolo}
                                                        </span>
                                                        <span className="lab-conf-card-badge">
                                                            Data: {group.dataAtendimento}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            className="lab-btn lab-btn-primary lab-conf-btn-open-attendance" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenConference(group);
                                                            }}
                                                            title="Abrir conferência dos exames deste atendimento"
                                                        >
                                                            <Activity size={16} /> Abrir Conferência
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Linha Inferior: Informações Demográficas/Clínicas (Esq) + Resumo dos Exames (Dir, abaixo do botão) */}
                                                <div className="lab-conf-card-bottom-row">
                                                    <div className="lab-conf-card-patient-details">
                                                        <span className="lab-conf-info-item">
                                                            <User size={14} className="lab-conf-info-icon" />
                                                            Idade: <strong>{group.pacienteIdade || 'Não informada'}</strong>
                                                        </span>
                                                        <span className="lab-conf-info-item">
                                                            Sexo: <strong>{group.pacienteSexo || 'Não informado'}</strong>
                                                        </span>
                                                        <span className="lab-conf-info-item">
                                                            Origem: <strong>{formatAttendanceOrigin(group.attendance_origin) || 'Não informada'}</strong>
                                                        </span>
                                                        {group.medico && (
                                                            <span className="lab-conf-info-item">
                                                                Médico: <strong>Dr(a) {group.medico}</strong>
                                                            </span>
                                                        )}
                                                        <span className="lab-conf-info-item">
                                                            CPF: <strong>{formatCpf(group.pacienteCpf)}</strong>
                                                        </span>
                                                        {group.pacienteCns && (
                                                            <span className="lab-conf-info-item">
                                                                CNS: <strong>{group.pacienteCns}</strong>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="lab-conf-card-exams-summary">
                                                        <span className="lab-conf-info-item lab-conf-info-exams">
                                                            Exames: <strong>{totalExames}</strong>{' '}
                                                            {isAllLiberados ? (
                                                                <span style={{ color: '#16a34a', fontWeight: 600 }}>
                                                                    ({liberadosCount} {liberadosCount === 1 ? 'liberado' : 'liberados'})
                                                                </span>
                                                            ) : (
                                                                <span className="lab-conf-exams-pending-text">
                                                                    ({pendentesCount} {pendentesCount === 1 ? 'pendente' : 'pendentes'})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {displayedCount < groupedProtocols.length ? (
                                        <div ref={sentinelRef} className="lab-conf-load-more-indicator">
                                            <Loader2 size={16} className="spin text-primary" />
                                            <span>Carregando mais atendimentos ({displayedProtocols.length} de {groupedProtocols.length})...</span>
                                        </div>
                                    ) : (
                                        groupedProtocols.length > PAGE_SIZE && (
                                            <div className="lab-conf-load-finished-indicator">
                                                Todos os atendimentos foram carregados ({groupedProtocols.length}).
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                /* ============================================================== */
                /* ESTADO 2: MODO DE CONFERÊNCIA DO ATENDIMENTO (Área Ampla)     */
                /* ============================================================== */
                <div className="lab-conf-conference-view">
                    {/* Cabeçalho Compacto e Organizado do Atendimento */}
                    <div className="lab-conf-conference-header">
                        <div className="lab-conf-top-action-bar">
                            <div className="lab-conf-patient-identity">
                                <button 
                                    className="lab-conf-btn-back"
                                    onClick={handleBackToQueue}
                                    title="Voltar para a fila de atendimentos"
                                >
                                    <ArrowLeft size={14} />
                                    Voltar para fila
                                </button>
                                <span className="lab-conf-patient-code-tag">
                                    CÓD. {selectedProtocol.pacienteCode || 'N/I'}
                                </span>
                                <span className="lab-conf-patient-fullname" title={selectedProtocol.pacienteNome}>
                                    {selectedProtocol.pacienteNome}
                                </span>
                            </div>

                            <div className="lab-conf-header-actions">
                                {feedbackMsg && (
                                    <div className={`lab-conf-feedback-inline ${feedbackMsg.type}`}>
                                        {feedbackMsg.text}
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
                                    <button 
                                        className="lab-btn" 
                                        style={{ padding: '0.4rem', border: '1px solid #e2e8f0', background: groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) > 0 ? '#fff' : '#f8fafc', borderRadius: '6px', color: groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) > 0 ? '#334155' : '#cbd5e1', cursor: groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) > 0 ? 'pointer' : 'not-allowed' }}
                                        onClick={() => handleNavigateProtocol('prev')}
                                        disabled={loading || saving || returning || groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) <= 0}
                                        title={groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) <= 0 ? 'Primeiro atendimento da fila' : 'Paciente anterior'}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', minWidth: '60px', textAlign: 'center' }}>
                                        {groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) + 1} de {groupedProtocols.length}
                                    </span>
                                    <button 
                                        className="lab-btn" 
                                        style={{ padding: '0.4rem', border: '1px solid #e2e8f0', background: groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) < groupedProtocols.length - 1 ? '#fff' : '#f8fafc', borderRadius: '6px', color: groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) < groupedProtocols.length - 1 ? '#334155' : '#cbd5e1', cursor: groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) < groupedProtocols.length - 1 ? 'pointer' : 'not-allowed' }}
                                        onClick={() => handleNavigateProtocol('next')}
                                        disabled={loading || saving || returning || groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) >= groupedProtocols.length - 1}
                                        title={groupedProtocols.findIndex(p => p.protocolo === selectedProtocol.protocolo) >= groupedProtocols.length - 1 ? 'Último atendimento da fila' : 'Próximo paciente'}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                {canWriteLaboratorio(role) && (
                                    <button 
                                        className="lab-conf-btn-confirm" 
                                        onClick={handleConfirmarConferencia} 
                                        disabled={saving || returning || !selectedExam}
                                        title="Confirmar conferência deste exame (Ctrl + Enter)"
                                    >
                                        {saving ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                                        {saving ? 'Confirmando...' : 'Confirmar'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Linha 2 de Metadados Clínicos */}
                        <div className="lab-conf-patient-row-meta">
                            <span className="lab-conf-meta-item">{selectedProtocol.pacienteIdade || 'Idade N/I'}</span>
                            <span className="lab-conf-meta-dot">•</span>
                            <span className="lab-conf-meta-item">{selectedProtocol.pacienteSexo || 'Sexo N/I'}</span>
                            <span className="lab-conf-meta-dot">•</span>
                            <span className="lab-conf-meta-item"><strong>Origem:</strong> {formatAttendanceOrigin(selectedProtocol.attendance_origin)}</span>
                            <span className="lab-conf-meta-dot">•</span>
                            <span className="lab-conf-meta-item"><strong>Protocolo:</strong> {selectedProtocol.protocolo}</span>
                            <span className="lab-conf-meta-dot">•</span>
                            <span className="lab-conf-meta-item"><strong>Médico:</strong> {selectedProtocol.medico || 'Não informado'}</span>
                            {selectedProtocol.pacienteCpf && (
                                <>
                                    <span className="lab-conf-meta-dot">•</span>
                                    <span className="lab-conf-meta-item"><strong>CPF:</strong> {formatCpf(selectedProtocol.pacienteCpf)}</span>
                                </>
                            )}
                            {selectedProtocol.pacienteCns && selectedProtocol.pacienteCns !== '---' && (
                                <>
                                    <span className="lab-conf-meta-dot">•</span>
                                    <span className="lab-conf-meta-item"><strong>CNS:</strong> {selectedProtocol.pacienteCns}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Faixa de Abas dos Exames (Largura Completa) */}
                    <div className="lab-conf-tabs-strip">
                        {tabScrollState.hasOverflow && tabScrollState.canScrollLeft && (
                            <button 
                                type="button" 
                                className="lab-conf-tab-nav-btn" 
                                onClick={() => handleScrollTabs(-1)}
                                title="Rolar exames para a esquerda"
                            >
                                <ChevronLeft size={14} />
                            </button>
                        )}

                        <div className="lab-conf-tabs-scroll" ref={examTabsRef}>
                            {selectedProtocol.exams.map(ex => {
                                const isActive = selectedExam?.id === ex.id;
                                return (
                                    <button 
                                        key={ex.id}
                                        ref={isActive ? activeExamTabRef : null}
                                        className={`lab-conf-tab-btn ${isActive ? 'active' : ''}`}
                                        onClick={() => handleSelectExamWithCheck(ex)}
                                    >
                                        {ex.exameCodigo}
                                    </button>
                                );
                            })}
                        </div>

                        {tabScrollState.hasOverflow && tabScrollState.canScrollRight && (
                            <button 
                                type="button" 
                                className="lab-conf-tab-nav-btn" 
                                onClick={() => handleScrollTabs(1)}
                                title="Rolar exames para a direita"
                            >
                                <ChevronRight size={14} />
                            </button>
                        )}
                    </div>

                    {/* Sub-cabeçalho do Exame */}
                    {selectedExam && (
                        <div className="lab-conf-exam-subbar">
                            <div className="lab-conf-exam-title-box">
                                <span className="lab-conf-exam-name">
                                    {selectedExam.exameCodigo} — {selectedExam.exameNome}
                                </span>
                                <span className="lab-conf-exam-metainfo">
                                    (Material: {selectedExam.exameMaterial || 'Não inf.'} • Método: {selectedExam.exameMetodo || 'Não inf.'})
                                </span>
                            </div>
                            <span className="lab-conf-status-tag digitado">
                                {selectedExam.status}
                            </span>
                        </div>
                    )}

                    {/* Área do Corpo / Revisão (Largura Completa) */}
                    <div className="lab-conf-body">
                        {loadingDetails ? (
                            <div className="lab-conf-empty">
                                <Loader2 size={24} className="spin text-primary" />
                                <p>Carregando parâmetros do exame...</p>
                            </div>
                        ) : examDetails.length === 0 ? (
                            <div className="lab-conf-empty">
                                <p>Nenhum parâmetro encontrado para este exame.</p>
                            </div>
                        ) : isHemo ? (
                            <HemoExamView 
                                examDetails={examDetails}
                                selectedExam={selectedExam}
                                selectedProtocol={selectedProtocol}
                                editingParam={editingParam}
                                setEditingParam={setEditingParam}
                                handleSaveParam={handleSaveParam}
                                saving={saving}
                                isAbnormal={isAbnormal}
                                canWrite={canWriteLaboratorio(role)}
                            />
                        ) : isUri ? (
                            <UriExamView 
                                examDetails={examDetails}
                                selectedExam={selectedExam}
                                selectedProtocol={selectedProtocol}
                                editingParam={editingParam}
                                setEditingParam={setEditingParam}
                                handleSaveParam={handleSaveParam}
                                saving={saving}
                                isAbnormal={isAbnormal}
                                canWrite={canWriteLaboratorio(role)}
                            />
                        ) : (
                            <SimpleExamView 
                                examDetails={examDetails}
                                selectedExam={selectedExam}
                                editingParam={editingParam}
                                setEditingParam={setEditingParam}
                                handleSaveParam={handleSaveParam}
                                saving={saving}
                                isAbnormal={isAbnormal}
                                canWrite={canWriteLaboratorio(role)}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Modal Alteração Não Salva */}
            {showUnsavedModal && (
                <div className="unsaved-result-modal-overlay" role="dialog" aria-modal="true">
                    <div className="unsaved-result-modal" style={{ maxWidth: '440px' }}>
                        <div className="unsaved-result-modal-header" style={{ paddingBottom: '10px' }}>
                            <div className="unsaved-result-modal-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                                <AlertTriangle size={22} />
                            </div>
                            <div>
                                <h2 className="unsaved-result-modal-title" style={{ fontSize: '1.05rem' }}>Alteração não salva</h2>
                                <p className="unsaved-result-modal-subtitle" style={{ fontSize: '0.82rem' }}>
                                    Existe uma edição de parâmetro pendente. Deseja descartar a edição para continuar?
                                </p>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-footer" style={{ marginTop: '12px' }}>
                            <button className="unsaved-btn-neutral" onClick={() => {
                                setShowUnsavedModal(false);
                                setPendingAction(null);
                            }}>Continuar editando</button>
                            <button className="lab-btn-danger" style={{ height: '38px', padding: '0 16px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem' }} onClick={() => {
                                setShowUnsavedModal(false);
                                setEditingParam(null);
                                if (pendingAction) {
                                    pendingAction();
                                    setPendingAction(null);
                                }
                            }}>
                                Descartar alteração
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ==========================================================================
   SUB-COMPONENTE: EXAMES SIMPLES (Grade 4 Colunas com Geometria Travada)
   ========================================================================== */
const SimpleExamView = ({ examDetails, selectedExam, editingParam, setEditingParam, handleSaveParam, saving, isAbnormal, canWrite }) => {
    return (
        <div className="conf-simple-card">
            {/* Header da Grade Compartilhada */}
            <div className="conf-simple-grid-header">
                <div className="conf-simple-th col-param">PARÂMETRO</div>
                <div className="conf-simple-th col-result">RESULTADO</div>
                <div className="conf-simple-th col-ref">VALOR DE REFERÊNCIA</div>
                <div className="conf-simple-th col-action">AÇÃO</div>
            </div>

            {/* Linhas da Grade Compartilhada */}
            <div className="conf-simple-grid-body">
                {examDetails.map((param) => {
                    const displayValue = formatLabValue(
                        param.parameter_code || param.code,
                        param.result_type,
                        param.value_numeric,
                        param.value_text,
                        selectedExam?.exameCodigo,
                        param.parameter_name
                    );
                    const rawParamValue = param.value_text !== null && param.value_text !== undefined 
                        ? param.value_text 
                        : (param.value_numeric !== null && param.value_numeric !== undefined ? String(param.value_numeric) : (displayValue || ''));
                    
                    const abnormalStatus = isAbnormal(param.value_numeric, param.min_value, param.max_value);
                    const isEditing = editingParam?.id === param.id;

                    let refDisplay = param.reference_text;
                    if (!refDisplay && (param.min_value !== null || param.max_value !== null)) {
                        refDisplay = `${param.min_value !== null ? String(param.min_value).replace('.', ',') : '0'} a ${param.max_value !== null ? String(param.max_value).replace('.', ',') : '∞'}`;
                    }
                    if (!refDisplay) refDisplay = 'Não cadastrada';

                    return (
                        <div key={param.id} className="conf-simple-grid-row">
                            {/* PARÂMETRO */}
                            <div className="conf-simple-td col-param">
                                <span className="conf-param-name">
                                    {param.parameter_name || param.parameter_code}
                                </span>
                                {param.observation && (
                                    <div className="conf-param-obs-sub">
                                        Obs: {param.observation}
                                    </div>
                                )}
                            </div>

                            {/* RESULTADO (220px fixo, cabeçalho centralizado, grid interno 90px + auto) */}
                            <div className="conf-simple-td col-result">
                                {isEditing ? (
                                    <div className="conf-inline-edit-box">
                                        <input 
                                            type="text"
                                            className="conf-inline-edit-input"
                                            value={editingParam.value}
                                            onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                                            autoFocus
                                            onFocus={(e) => e.target.select()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveParam(param);
                                                if (e.key === 'Escape') setEditingParam(null);
                                            }}
                                            disabled={saving}
                                        />
                                        <button className="conf-btn-save-mini" onClick={() => handleSaveParam(param)} disabled={saving} title="Salvar alteração">
                                            <Save size={12} /> Salvar
                                        </button>
                                        <button className="conf-btn-cancel-mini" onClick={() => setEditingParam(null)} disabled={saving} title="Cancelar edição">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="conf-result-inner-grid">
                                        <div className="conf-result-val-col">
                                            <span 
                                                className="conf-result-val-text"
                                                style={{ color: abnormalStatus === 'above' || abnormalStatus === 'below' ? '#dc2626' : '#0f172a' }}
                                            >
                                                {displayValue}
                                            </span>
                                            {abnormalStatus === 'below' && (
                                                <span className="lab-conf-badge-abnormal">Abaixo</span>
                                            )}
                                            {abnormalStatus === 'above' && (
                                                <span className="lab-conf-badge-abnormal">Acima</span>
                                            )}
                                            {abnormalStatus === 'normal' && param.min_value !== null && (
                                                <span className="lab-conf-badge-normal">Normal</span>
                                            )}
                                        </div>
                                        <div className="conf-result-unit-col">
                                            {param.unit || ''}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* VALOR DE REFERÊNCIA (1fr) */}
                            <div className="conf-simple-td col-ref">
                                <span className="conf-ref-text">
                                    {refDisplay}
                                </span>
                            </div>

                            {/* AÇÃO (100px fixo, centralizado) */}
                            <div className="conf-simple-td col-action">
                                {!isEditing && canWrite && (
                                    <button 
                                        className="conf-btn-edit" 
                                        onClick={() => setEditingParam({ id: param.id, value: rawParamValue, isText: param.result_type === 'TEXTO' })}
                                        disabled={saving || !!editingParam}
                                        title="Editar valor deste parâmetro"
                                    >
                                        <Edit2 size={13} />
                                        <span>Editar</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ==========================================================================
   SUB-COMPONENTE: HEMO - HEMOGRAMA COMPLETO (Layout Reorganizado)
   Estrutura:
   1. Linha Superior: Eritrograma (~44%) | Leucograma (~56%)
   2. Faixa Intermediária: Plaquetas (Horizontal)
   3. Linha Inferior: Série Eritrocitária | Série Leucocitária | Série Plaquetária (3 colunas)
   ========================================================================== */
const HemoExamView = ({ examDetails, selectedExam, selectedProtocol, editingParam, setEditingParam, handleSaveParam, saving, isAbnormal, canWrite }) => {
    const ageDays = getPatientAgeDays(selectedProtocol);
    const sexGroup = getPatientSexGroup(selectedProtocol);

    const eritroCodes = new Set(['HEMACIAS', 'HEMOGLOBINA', 'HEMATOCRITO', 'HCM', 'VCM', 'CHCM', 'RDW']);
    const leucTotalCode = 'LEUCOCITOS';
    const leucDiffCodes = new Set([
        'BASTONETES', 'SEGMENTADOS', 'EOSINOFILOS', 'BASOFILOS', 
        'LINFOCITOS_TIPICOS', 'LINFOCITOS_ATIPICOS', 'MONOCITOS', 
        'MIELOCITOS', 'METAMIELOCITOS', 'PLASMOCITOS'
    ]);
    const plaqCodes = new Set(['PLAQUETAS']);
    const obsCodes = new Set([
        'OBS_ERITROGRAMA', 'OBSERVACOES_ERITROGRAMA', 'SERIE_ERITROCITARIA', 'S_ERITROCITARIA',
        'SERIE_LEUCOCITARIA', 'S_LEUCOCITARIA', 'OBS_LEUCOGRAMA', 'OBSERVACOES_LEUCOGRAMA',
        'SERIE_PLAQUETARIA', 'S_PLAQUETARIA', 'OBS_PLAQUETAS', 'OBSERVACOES_PLAQUETAS',
        'OBS_MORFOLOGICAS', 'OBSERVACOES_MORFOLOGICAS', 'OBS_MORFOLOGIA', 'MORFOLOGIA',
        'OBS_GERAL', 'OBSERVACAO_GERAL', 'OBS_GERAIS', 'OBSERVACOES_GERAIS', 'OBS_EXAME', 'OBSERVACOES', 'OBS'
    ]);

    const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');

    const eritroParams = [];
    let leucTotalParam = null;
    const leucDiffParams = [];
    let plaquetasParam = null;
    const morphologyParams = [];
    const otherParams = [];

    examDetails.forEach(param => {
        const code = normalizeCode(param.parameter_code || param.code);
        if (eritroCodes.has(code)) {
            eritroParams.push(param);
        } else if (code === leucTotalCode) {
            leucTotalParam = param;
        } else if (leucDiffCodes.has(code)) {
            leucDiffParams.push(param);
        } else if (plaqCodes.has(code)) {
            plaquetasParam = param;
        } else if (obsCodes.has(code) || isHemoMorphologyParameter(code, param.parameter_name) || param.result_type === 'TEXTO') {
            morphologyParams.push(param);
        } else {
            otherParams.push(param);
        }
    });

    // Mapeamento canônico das 3 Séries de Morfologia + Observação Geral
    let morphEritro = null;
    let morphLeuco = null;
    let morphPlaq = null;
    let obsGeralParam = null;

    morphologyParams.forEach(param => {
        const code = normalizeCode(param.parameter_code || param.code);
        const name = String(param.parameter_name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        
        const isEritro = code.includes('ERITRO') || name.includes('ERITRO');
        const isLeuco = (code.includes('LEUCO') || name.includes('LEUCO')) && !code.includes('TOTAL') && !code.includes('DIF');
        const isPlaq = code.includes('PLAQUET') || name.includes('PLAQUET');
        const isGeral = code.includes('GERAL') || code.includes('GERAIS') || name.includes('GERAL') || code === 'OBS' || code === 'OBSERVACOES' || code === 'OBS_EXAME';

        if (isEritro) {
            if (!morphEritro) {
                morphEritro = param;
            } else if ((param.value_text && param.value_text.trim()) && (!morphEritro.value_text || !morphEritro.value_text.trim())) {
                morphEritro = param;
            }
        } else if (isLeuco) {
            if (!morphLeuco) {
                morphLeuco = param;
            } else if ((param.value_text && param.value_text.trim()) && (!morphLeuco.value_text || !morphLeuco.value_text.trim())) {
                morphLeuco = param;
            }
        } else if (isPlaq) {
            if (!morphPlaq) {
                morphPlaq = param;
            } else if ((param.value_text && param.value_text.trim()) && (!morphPlaq.value_text || !morphPlaq.value_text.trim())) {
                morphPlaq = param;
            }
        } else if (isGeral) {
            if (!obsGeralParam) {
                obsGeralParam = param;
            } else if ((param.value_text && param.value_text.trim()) && (!obsGeralParam.value_text || !obsGeralParam.value_text.trim())) {
                obsGeralParam = param;
            }
        } else {
            // Outro parâmetro textual restante vira observação geral
            if (!obsGeralParam) {
                obsGeralParam = param;
            }
        }
    });

    const renderHemoRef = (param) => {
        const code = normalizeCode(param.parameter_code || param.code);
        const resolved = resolveHemoReference(code, param.reference_text, ageDays, sexGroup);
        if (resolved && resolved.valid && resolved.text) {
            return `Ref: ${formatHemoReferenceText(resolved.text, code)}`;
        }
        if (param.reference_text) {
            return `Ref: ${formatHemoReferenceText(param.reference_text, code, false)}`;
        }
        if (param.min_value !== null || param.max_value !== null) {
            return `Ref: ${param.min_value ?? 0} – ${param.max_value ?? '∞'}`;
        }
        return '';
    };

    const renderMorphologyCard = (title, param, defaultPlaceholder) => {
        const rawVal = param ? (param.value_text || '') : '';
        const expandedText = (rawVal && expandHemogramaMorphologyAbbreviations(rawVal)) || defaultPlaceholder;
        const isEditing = param && editingParam?.id === param.id;

        return (
            <div className="conf-morph-card">
                <div className="conf-morph-card-header">
                    <span className="conf-morph-card-title">{title}</span>
                    {param && !isEditing && canWrite && (
                        <button 
                            className="conf-compact-edit-btn" 
                            onClick={() => setEditingParam({ id: param.id, value: rawVal, isText: true })}
                            disabled={saving || !!editingParam}
                            title="Editar observação"
                        >
                            <Edit2 size={11} />
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <div className="conf-morph-edit-area">
                        <textarea 
                            className="conf-morph-textarea"
                            value={editingParam.value}
                            onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                            autoFocus
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    handleSaveParam(param);
                                }
                                if (e.key === 'Escape') setEditingParam(null);
                            }}
                            disabled={saving}
                        />
                        <div className="conf-morph-actions">
                            <button className="conf-btn-save-mini" onClick={() => handleSaveParam(param)} disabled={saving}>
                                <Save size={10} /> Salvar
                            </button>
                            <button className="conf-btn-cancel-mini" onClick={() => setEditingParam(null)} disabled={saving}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="conf-morph-text-body">
                        {expandedText}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="conf-hemo-layout-wrapper">
            {/* 1. LINHA PRINCIPAL: ERITROGRAMA & LEUCOGRAMA */}
            <div className="conf-hemo-top-grid">
                {/* ERITROGRAMA (Esquerda) */}
                <div className="conf-hemo-box eritro-box">
                    <div className="conf-hemo-box-header">
                        <span className="conf-hemo-box-title">ERITROGRAMA</span>
                        <span className="conf-hemo-box-count">{eritroParams.length} parâmetros</span>
                    </div>

                    <div className="conf-hemo-col-headers eritro-grid">
                        <span>PARÂMETRO</span>
                        <span style={{ textAlign: 'center' }}>RESULTADO</span>
                        <span>REFERÊNCIA</span>
                        <span></span>
                    </div>

                    <div className="conf-hemo-box-rows">
                        {eritroParams.map(param => {
                            const code = normalizeCode(param.parameter_code || param.code);
                            const displayVal = formatLabValue(code, param.result_type, param.value_numeric, param.value_text, 'HEMO', param.parameter_name);
                            const rawParamValue = param.value_text !== null && param.value_text !== undefined 
                                ? param.value_text 
                                : (param.value_numeric !== null && param.value_numeric !== undefined ? String(param.value_numeric) : (displayVal || ''));
                            const abnormal = isAbnormal(param.value_numeric, param.min_value, param.max_value);
                            const isEditing = editingParam?.id === param.id;
                            const refText = renderHemoRef(param);

                            return (
                                <div key={param.id} className="conf-hemo-row eritro-grid">
                                    <div className="conf-hemo-col-param-name" title={param.parameter_name || param.parameter_code}>
                                        {param.parameter_name || param.parameter_code}
                                    </div>

                                    {isEditing ? (
                                        <div className="conf-inline-edit-box conf-hemo-edit-span">
                                            <input 
                                                type="text"
                                                className="conf-inline-edit-input"
                                                style={{ width: '85px', height: '22px', fontSize: '0.78rem' }}
                                                value={editingParam.value}
                                                onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                                                autoFocus
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveParam(param);
                                                    if (e.key === 'Escape') setEditingParam(null);
                                                }}
                                                disabled={saving}
                                            />
                                            <button className="conf-btn-save-mini" onClick={() => handleSaveParam(param)} disabled={saving} title="Salvar">
                                                <Save size={10} />
                                            </button>
                                            <button className="conf-btn-cancel-mini" onClick={() => setEditingParam(null)} disabled={saving} title="Cancelar">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="conf-hemo-col-val">
                                                <span className="conf-hemo-val-number" style={{ color: abnormal === 'above' || abnormal === 'below' ? '#dc2626' : '#0f172a' }}>
                                                    {displayVal}
                                                </span>
                                                {param.unit && <span className="conf-hemo-unit-text">{param.unit}</span>}
                                            </div>

                                            <div className="conf-hemo-col-ref" title={refText}>
                                                {refText}
                                            </div>

                                            <div className="conf-hemo-col-action">
                                                {canWrite && (
                                                    <button 
                                                        className="conf-compact-edit-btn" 
                                                        onClick={() => setEditingParam({ id: param.id, value: rawParamValue, isText: false })}
                                                        disabled={saving || !!editingParam}
                                                        title="Editar parâmetro"
                                                    >
                                                        <Edit2 size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* LEUCOGRAMA (Direita) */}
                <div className="conf-hemo-box leuco-box">
                    <div className="conf-hemo-box-header">
                        <span className="conf-hemo-box-title">LEUCOGRAMA</span>
                        <span className="conf-hemo-box-count">{leucDiffParams.length + (leucTotalParam ? 1 : 0)} parâmetros</span>
                    </div>

                    <div className="conf-hemo-col-headers leuco-grid">
                        <span>PARÂMETRO</span>
                        <span style={{ textAlign: 'center' }}>RESULTADO</span>
                        <span>REFERÊNCIA</span>
                        <span></span>
                    </div>

                    <div className="conf-hemo-box-rows">
                        {/* Linha Destacada: Leucócitos Totais */}
                        {leucTotalParam && (
                            <div className="conf-hemo-row leuco-grid conf-leuc-total-row">
                                <div className="conf-hemo-col-param-name conf-leuc-total-name">
                                    LEUCÓCITOS TOTAIS
                                </div>

                                {editingParam?.id === leucTotalParam.id ? (
                                    <div className="conf-inline-edit-box conf-hemo-edit-span">
                                        <input 
                                            type="text"
                                            className="conf-inline-edit-input"
                                            style={{ width: '90px', height: '22px', fontSize: '0.78rem' }}
                                            value={editingParam.value}
                                            onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                                            autoFocus
                                            onFocus={(e) => e.target.select()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveParam(leucTotalParam);
                                                if (e.key === 'Escape') setEditingParam(null);
                                            }}
                                            disabled={saving}
                                        />
                                        <button className="conf-btn-save-mini" onClick={() => handleSaveParam(leucTotalParam)} disabled={saving} title="Salvar">
                                            <Save size={10} />
                                        </button>
                                        <button className="conf-btn-cancel-mini" onClick={() => setEditingParam(null)} disabled={saving} title="Cancelar">
                                            <X size={10} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="conf-hemo-col-val">
                                            <span className="conf-hemo-val-number conf-leuc-total-number">
                                                {formatLabValue('LEUCOCITOS', 'NUMERICO', leucTotalParam.value_numeric, leucTotalParam.value_text, 'HEMO')}
                                            </span>
                                            <span className="conf-hemo-unit-text">/mm³</span>
                                        </div>

                                        <div className="conf-hemo-col-ref" title={renderHemoRef(leucTotalParam) || 'Ref: 4.000 a 10.000 /mm³'}>
                                            {renderHemoRef(leucTotalParam) || 'Ref: 4.000 a 10.000 /mm³'}
                                        </div>

                                        <div className="conf-hemo-col-action">
                                            {canWrite && (
                                                <button 
                                                    className="conf-compact-edit-btn" 
                                                    onClick={() => setEditingParam({ 
                                                        id: leucTotalParam.id, 
                                                        value: leucTotalParam.value_numeric !== null ? String(leucTotalParam.value_numeric) : (leucTotalParam.value_text || ''),
                                                        isText: false
                                                    })}
                                                    disabled={saving || !!editingParam}
                                                    title="Editar Leucócitos Totais"
                                                >
                                                    <Edit2 size={11} />
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Parâmetros do Diferencial */}
                        {leucDiffParams.map(param => {
                            const code = normalizeCode(param.parameter_code || param.code);
                            const displayVal = formatLabValue(code, param.result_type, param.value_numeric, param.value_text, 'HEMO', param.parameter_name);
                            const rawParamValue = param.value_text !== null && param.value_text !== undefined 
                                ? param.value_text 
                                : (param.value_numeric !== null && param.value_numeric !== undefined ? String(param.value_numeric) : (displayVal || ''));
                            const isEditing = editingParam?.id === param.id;
                            const refText = renderHemoRef(param);

                            return (
                                <div key={param.id} className="conf-hemo-row leuco-grid">
                                    <div className="conf-hemo-col-param-name" title={param.parameter_name || param.parameter_code}>
                                        {param.parameter_name || param.parameter_code}
                                    </div>

                                    {isEditing ? (
                                        <div className="conf-inline-edit-box conf-hemo-edit-span">
                                            <input 
                                                type="text"
                                                className="conf-inline-edit-input"
                                                style={{ width: '75px', height: '22px', fontSize: '0.78rem' }}
                                                value={editingParam.value}
                                                onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                                                autoFocus
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveParam(param);
                                                    if (e.key === 'Escape') setEditingParam(null);
                                                }}
                                                disabled={saving}
                                            />
                                            <button className="conf-btn-save-mini" onClick={() => handleSaveParam(param)} disabled={saving} title="Salvar">
                                                <Save size={10} />
                                            </button>
                                            <button className="conf-btn-cancel-mini" onClick={() => setEditingParam(null)} disabled={saving} title="Cancelar">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="conf-hemo-col-val">
                                                <span className="conf-hemo-val-number">
                                                    {displayVal}
                                                </span>
                                                <span className="conf-hemo-unit-text">%</span>
                                            </div>

                                            <div className="conf-hemo-col-ref" title={refText}>
                                                {refText}
                                            </div>

                                            <div className="conf-hemo-col-action">
                                                {canWrite && (
                                                    <button 
                                                        className="conf-compact-edit-btn" 
                                                        onClick={() => setEditingParam({ id: param.id, value: rawParamValue, isText: false })}
                                                        disabled={saving || !!editingParam}
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 2. FAIXA INTERMEDIÁRIA: PLAQUETAS */}
            {plaquetasParam && (
                <div className="conf-hemo-plaq-banner">
                    <div className="conf-hemo-plaq-label">PLAQUETAS</div>

                    {editingParam?.id === plaquetasParam.id ? (
                        <div className="conf-inline-edit-box conf-hemo-edit-span">
                            <input 
                                type="text"
                                className="conf-inline-edit-input"
                                style={{ width: '100px', height: '22px', fontSize: '0.80rem' }}
                                value={editingParam.value}
                                onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveParam(plaquetasParam);
                                    if (e.key === 'Escape') setEditingParam(null);
                                }}
                                disabled={saving}
                            />
                            <button className="conf-btn-save-mini" onClick={() => handleSaveParam(plaquetasParam)} disabled={saving} title="Salvar">
                                <Save size={10} />
                            </button>
                            <button className="conf-btn-cancel-mini" onClick={() => setEditingParam(null)} disabled={saving} title="Cancelar">
                                <X size={10} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="conf-hemo-col-val">
                                <span className="conf-hemo-val-number conf-hemo-plaq-value">
                                    {formatLabValue('PLAQUETAS', 'NUMERICO', plaquetasParam.value_numeric, plaquetasParam.value_text, 'HEMO')}
                                </span>
                                <span className="conf-hemo-unit-text">/mm³</span>
                            </div>

                            <div className="conf-hemo-col-ref conf-hemo-plaq-ref" title={renderHemoRef(plaquetasParam) || 'Ref: 150.000 – 450.000 /mm³'}>
                                {renderHemoRef(plaquetasParam) || 'Ref: 150.000 – 450.000 /mm³'}
                            </div>

                            <div className="conf-hemo-col-action">
                                <button 
                                    className="conf-compact-edit-btn" 
                                    onClick={() => setEditingParam({ 
                                        id: plaquetasParam.id, 
                                        value: plaquetasParam.value_numeric !== null ? String(plaquetasParam.value_numeric) : (plaquetasParam.value_text || ''),
                                        isText: false
                                    })}
                                    disabled={saving || !!editingParam}
                                    title="Editar Plaquetas"
                                >
                                    <Edit2 size={11} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* 3. LINHA INFERIOR: MORFOLOGIA EM 3 BLOCOS HORIZONTAIS */}
            <div className="conf-hemo-morph-grid">
                {renderMorphologyCard(
                    'SÉRIE ERITROCITÁRIA', 
                    morphEritro, 
                    'Hemácias normocíticas e normocrômicas.'
                )}
                {renderMorphologyCard(
                    'SÉRIE LEUCOCITÁRIA', 
                    morphLeuco, 
                    'Leucócitos com morfologia preservada.'
                )}
                {renderMorphologyCard(
                    'SÉRIE PLAQUETÁRIA', 
                    morphPlaq, 
                    'Plaquetas morfologicamente normais.'
                )}
            </div>

            {/* 4. OBSERVAÇÃO GERAL DO HEMO */}
            {obsGeralParam && (
                <div className="conf-hemo-obs-bar">
                    <div className="conf-hemo-obs-content">
                        <Info size={14} className="text-primary" />
                        <strong>Observação Geral:</strong>
                        {editingParam?.id === obsGeralParam.id ? (
                            <div className="conf-inline-edit-box" style={{ flex: 1, marginLeft: '6px' }}>
                                <input 
                                    type="text"
                                    className="conf-inline-edit-input"
                                    style={{ flex: 1, height: '24px' }}
                                    value={editingParam.value}
                                    onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveParam(obsGeralParam);
                                        if (e.key === 'Escape') setEditingParam(null);
                                    }}
                                    disabled={saving}
                                />
                                <button className="conf-btn-save-mini" onClick={() => handleSaveParam(obsGeralParam)} disabled={saving}>
                                    <Save size={11} /> Salvar
                                </button>
                                <button className="conf-btn-cancel-mini" onClick={() => setEditingParam(null)} disabled={saving}>
                                    <X size={11} />
                                </button>
                            </div>
                        ) : (
                            <span>{obsGeralParam.value_text || 'Sem observações gerais'}</span>
                        )}
                    </div>

                    {editingParam?.id !== obsGeralParam.id && canWrite && (
                        <button 
                            className="conf-compact-edit-btn" 
                            onClick={() => setEditingParam({ id: obsGeralParam.id, value: obsGeralParam.value_text || '', isText: true })}
                            disabled={saving || !!editingParam}
                            title="Editar Observação Geral"
                        >
                            <Edit2 size={11} />
                        </button>
                    )}
                </div>
            )}

            {otherParams.length > 0 && (
                <div className="conf-hemo-other-params">
                    {otherParams.map(param => {
                        const displayVal = formatLabValue(param.parameter_code, param.result_type, param.value_numeric, param.value_text, 'HEMO', param.parameter_name);
                        return (
                            <div key={param.id} className="conf-hemo-row eritro-grid">
                                <div className="conf-hemo-col-param-name">{param.parameter_name || param.parameter_code}</div>
                                <div className="conf-hemo-col-val">
                                    <span className="conf-hemo-val-number">{displayVal}</span>
                                </div>
                                <div className="conf-hemo-col-ref"></div>
                                <div className="conf-hemo-col-action"></div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ==========================================================================
   SUB-COMPONENTE: URI - URINA TIPO I (Linha 1: Físico + Químico | Linha 2: Sedimentoscopia 100%)
   ========================================================================== */
const UriExamView = ({ examDetails, selectedExam, selectedProtocol, editingParam, setEditingParam, handleSaveParam, saving, isAbnormal, canWrite }) => {
    const fisicoKeys = new Set([
        URI_PARAM_CANONICAL_KEYS.VOLUME,
        URI_PARAM_CANONICAL_KEYS.COR,
        URI_PARAM_CANONICAL_KEYS.ASPECTO,
        URI_PARAM_CANONICAL_KEYS.DENSIDADE,
        URI_PARAM_CANONICAL_KEYS.PH
    ]);

    const quimicoKeys = new Set([
        URI_PARAM_CANONICAL_KEYS.PROTEINAS,
        URI_PARAM_CANONICAL_KEYS.CORPOS_CETONICOS,
        URI_PARAM_CANONICAL_KEYS.GLICOSE,
        URI_PARAM_CANONICAL_KEYS.UROBILINOGENIO,
        URI_PARAM_CANONICAL_KEYS.BILIRRUBINA,
        URI_PARAM_CANONICAL_KEYS.SANGUE_HEMOGLOBINA,
        URI_PARAM_CANONICAL_KEYS.NITRITO
    ]);

    const sedimentoKeys = new Set([
        URI_PARAM_CANONICAL_KEYS.CELULAS_EPITELIAIS,
        URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO,
        URI_PARAM_CANONICAL_KEYS.LEUCOCITOS,
        URI_PARAM_CANONICAL_KEYS.HEMACIAS,
        URI_PARAM_CANONICAL_KEYS.BACTERIAS,
        URI_PARAM_CANONICAL_KEYS.CILINDROS,
        URI_PARAM_CANONICAL_KEYS.CRISTAIS,
        URI_PARAM_CANONICAL_KEYS.ESTRUTURAS_LEVEDURIFORMES
    ]);

    const fisicoParams = [];
    const quimicoParams = [];
    const sedimentoParams = [];
    let obsParam = null;

    examDetails.forEach(param => {
        const canonicalKey = getUriParameterKey(param);
        if (canonicalKey === URI_PARAM_CANONICAL_KEYS.OBSERVACAO) {
            obsParam = param;
        } else if (fisicoKeys.has(canonicalKey)) {
            fisicoParams.push(param);
        } else if (quimicoKeys.has(canonicalKey)) {
            quimicoParams.push(param);
        } else if (sedimentoKeys.has(canonicalKey)) {
            sedimentoParams.push(param);
        } else {
            const name = (param.parameter_name || param.parameter_code || '').toUpperCase();
            if (name.includes('VOL') || name.includes('COR') || name.includes('ASP') || name.includes('DENS') || name.includes('PH')) {
                fisicoParams.push(param);
            } else if (name.includes('PROT') || name.includes('GLIC') || name.includes('NIT') || name.includes('BIL') || name.includes('URO')) {
                quimicoParams.push(param);
            } else {
                sedimentoParams.push(param);
            }
        }
    });

    const renderUriValueAndUnit = (valStr, unitStr) => {
        const val = (valStr !== null && valStr !== undefined) ? String(valStr).trim() : '';
        const unit = (unitStr !== null && unitStr !== undefined) ? String(unitStr).trim() : '';

        // Identifica se "por campo" está no valor ou na unidade
        const valHasPorCampo = /por\s*campo|\/campo|p\/\s*campo/i.test(val);
        const unitHasPorCampo = /por\s*campo|\/campo|p\/\s*campo/i.test(unit);

        if (valHasPorCampo) {
            const mainVal = val.replace(/\s*(?:\(?por\s*campo\)?|\(?\/campo\)?|\(?p\/\s*campo\)?)\s*$/i, '').trim();
            return (
                <>
                    <span className="conf-uri-val-number">{mainVal || val}</span>
                    <span className="conf-uri-field-subtext"> (por campo)</span>
                </>
            );
        }

        if (unitHasPorCampo) {
            return (
                <>
                    <span className="conf-uri-val-number">{val || 'Não informado'}</span>
                    <span className="conf-uri-field-subtext"> (por campo)</span>
                </>
            );
        }

        return (
            <>
                <span className="conf-uri-val-number">{val || 'Não informado'}</span>
                {unit && <span className="conf-uri-unit-text">{unit}</span>}
            </>
        );
    };

    const renderUriRow = (param, gridClass = 'uri-fisico-grid') => {
        const displayName = getUriParameterDisplayName(param) || param.parameter_name || param.parameter_code;
        const rawVal = param.value_text !== null && param.value_text !== undefined 
            ? param.value_text 
            : (param.value_numeric !== null && param.value_numeric !== undefined ? String(param.value_numeric) : '');
        
        const expandedVal = expandUriFieldValue(param, rawVal) || 'Não informado';
        const isEditing = editingParam?.id === param.id;
        const refText = param.reference_text || (param.min_value !== null ? `${param.min_value} – ${param.max_value || ''}` : '');

        return (
            <div key={param.id} className={`conf-uri-row ${gridClass}`}>
                <div className="conf-uri-col-name" title={displayName}>
                    {displayName}
                </div>

                {isEditing ? (
                    <div className="conf-inline-edit-box conf-uri-edit-span">
                        <input 
                            type="text"
                            className="conf-inline-edit-input"
                            style={{ width: '110px', height: '22px', fontSize: '0.78rem' }}
                            value={editingParam.value}
                            onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveParam(param);
                                if (e.key === 'Escape') setEditingParam(null);
                            }}
                            disabled={saving}
                        />
                        <button className="conf-btn-save-mini" onClick={() => handleSaveParam(param)} disabled={saving} title="Salvar">
                            <Save size={10} />
                        </button>
                        <button className="conf-btn-cancel-mini" onClick={() => setEditingParam(null)} disabled={saving} title="Cancelar">
                            <X size={10} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="conf-uri-col-val">
                            {renderUriValueAndUnit(expandedVal, param.unit)}
                        </div>

                        <div className="conf-uri-col-ref" title={refText ? `Ref: ${refText}` : ''}>
                            {refText ? `Ref: ${refText}` : ''}
                        </div>

                        <div className="conf-uri-col-action">
                            {canWrite && (
                                <button 
                                    className="conf-compact-edit-btn" 
                                    onClick={() => setEditingParam({ id: param.id, value: rawVal, isText: true })}
                                    disabled={saving || !!editingParam}
                                    title="Editar"
                                >
                                    <Edit2 size={11} />
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const obsText = obsParam ? (obsParam.value_text || obsParam.observation || '') : '';
    const expandedObs = expandRcText(obsText);

    return (
        <div className="conf-uri-wrapper">
            {/* LINHA 1: EXAME FÍSICO & EXAME QUÍMICO */}
            <div className="conf-uri-top-grid">
                {/* EXAME FÍSICO */}
                <div className="conf-uri-box col-fisico">
                    <div className="conf-uri-box-header">
                        <span className="conf-uri-box-title">EXAME FÍSICO</span>
                        <span className="conf-uri-box-count">{fisicoParams.length} parâmetros</span>
                    </div>
                    <div className="conf-uri-col-headers uri-fisico-grid">
                        <span>PARÂMETRO</span>
                        <span style={{ textAlign: 'right' }}>RESULTADO</span>
                        <span>REFERÊNCIA</span>
                        <span></span>
                    </div>
                    <div className="conf-uri-box-rows">
                        {fisicoParams.map(p => renderUriRow(p, 'uri-fisico-grid'))}
                    </div>
                </div>

                {/* EXAME QUÍMICO */}
                <div className="conf-uri-box col-quimico">
                    <div className="conf-uri-box-header">
                        <span className="conf-uri-box-title">EXAME QUÍMICO</span>
                        <span className="conf-uri-box-count">{quimicoParams.length} parâmetros</span>
                    </div>
                    <div className="conf-uri-col-headers uri-quimico-grid">
                        <span>PARÂMETRO</span>
                        <span style={{ textAlign: 'right' }}>RESULTADO</span>
                        <span>REFERÊNCIA</span>
                        <span></span>
                    </div>
                    <div className="conf-uri-box-rows">
                        {quimicoParams.map(p => renderUriRow(p, 'uri-quimico-grid'))}
                    </div>
                </div>
            </div>

            {/* LINHA 2: SEDIMENTOSCOPIA (LARGURA TOTAL 100%) */}
            <div className="conf-uri-bottom-full">
                <div className="conf-uri-box col-sedimento-full">
                    <div className="conf-uri-box-header">
                        <span className="conf-uri-box-title">SEDIMENTOSCOPIA</span>
                        <span className="conf-uri-box-count">{sedimentoParams.length} parâmetros</span>
                    </div>
                    <div className="conf-uri-sedimento-header-row">
                        <div className="conf-uri-col-headers uri-sedimento-grid">
                            <span>PARÂMETRO</span>
                            <span style={{ textAlign: 'right' }}>RESULTADO</span>
                            <span>REFERÊNCIA</span>
                            <span></span>
                        </div>
                        <div className="conf-uri-col-headers uri-sedimento-grid">
                            <span>PARÂMETRO</span>
                            <span style={{ textAlign: 'right' }}>RESULTADO</span>
                            <span>REFERÊNCIA</span>
                            <span></span>
                        </div>
                    </div>
                    <div className="conf-uri-box-rows conf-uri-sedimento-grid-container">
                        {sedimentoParams.map(p => renderUriRow(p, 'uri-sedimento-grid'))}
                    </div>
                </div>
            </div>

            {/* LINHA 3: OBSERVAÇÃO GERAL DO URI */}
            {obsParam && (
                <div className="conf-uri-obs-bar">
                    <div className="conf-uri-obs-content">
                        <Info size={14} className="text-primary" />
                        <strong>Observação Geral:</strong>
                        {editingParam?.id === obsParam.id ? (
                            <div className="conf-inline-edit-box" style={{ flex: 1, marginLeft: '6px' }}>
                                <input 
                                    type="text"
                                    className="conf-inline-edit-input"
                                    style={{ flex: 1, height: '24px' }}
                                    value={editingParam.value}
                                    onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveParam(obsParam);
                                        if (e.key === 'Escape') setEditingParam(null);
                                    }}
                                    disabled={saving}
                                />
                                <button className="conf-btn-save-mini" onClick={() => handleSaveParam(obsParam)} disabled={saving}>
                                    <Save size={11} /> Salvar
                                </button>
                                <button className="conf-btn-cancel-mini" onClick={() => setEditingParam(null)} disabled={saving}>
                                    <X size={11} />
                                </button>
                            </div>
                        ) : (
                            <span>{expandedObs || 'Sem observações'}</span>
                        )}
                    </div>

                    {editingParam?.id !== obsParam.id && canWrite && (
                        <button 
                            className="conf-compact-edit-btn" 
                            onClick={() => setEditingParam({ id: obsParam.id, value: obsText, isText: true })}
                            disabled={saving || !!editingParam}
                            title="Editar Observação Geral"
                        >
                            <Edit2 size={11} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default LaboratorioConferencia;

