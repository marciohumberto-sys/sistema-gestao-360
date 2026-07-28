import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatCpf } from '../../utils/formatters';
import { 
    CheckCircle2, AlertTriangle, XCircle, Search, RefreshCw, 
    Activity, Clock, ShieldCheck, User, Eye, 
    ChevronLeft, ChevronRight, Info, ListChecks, Loader2
} from 'lucide-react';
import './LaboratorioConferencia.css';
import { laboratorioConferenciaService } from '../../services/api/laboratorioConferencia.service';
import { laboratorioResultadosService } from '../../services/api/laboratorioResultados.service';
import { ATTENDANCE_ORIGINS, formatAttendanceOrigin, formatLabValue } from '../../utils/laboratorioHelpers';

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const LaboratorioConferencia = () => {
    const [searchFilters, setSearchFilters] = useState({
        date: '',
        patient: '',
        patientCode: '',
        attendance_origin: ''
    });
    
    const [localSearch, setLocalSearch] = useState('');
    const [selectedProtocol, setSelectedProtocol] = useState(null);
    const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(-1);
    const listRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    
    const [selectedExam, setSelectedExam] = useState(null);
    const [examDetails, setExamDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    const [saving, setSaving] = useState(false);
    const [canceling, setCanceling] = useState(false);
    const [returning, setReturning] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);
    const [showReturnModal, setShowReturnModal] = useState(false); // Mantido apenas para ref se necessário
    const [returnReason, setReturnReason] = useState('');

    const [editingParam, setEditingParam] = useState(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Initial load
    useEffect(() => {
        handleSearch();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showReturnModal && !returning) setShowReturnModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showReturnModal, saving, returning]);

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
                    convenio: ex.convenio,
                    medico: ex.medico,
                    local_entrega: ex.local_entrega,
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

    useEffect(() => {
        if (groupedProtocols.length > 0 && selectedProtocol === null) {
            setSelectedProtocol(groupedProtocols[0]);
        } else if (groupedProtocols.length === 0) {
            setSelectedProtocol(null);
            setSelectedExam(null);
            setExamDetails([]);
        } else if (selectedProtocol) {
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
                setSelectedProtocol(groupedProtocols[0]);
                setSelectedExam(null);
                setExamDetails([]);
            }
        }
    }, [groupedProtocols, selectedProtocol, searchResults]); // depend on searchResults to force update

    useEffect(() => {
        if (selectedProtocol && selectedProtocol.exams.length > 0 && !selectedExam) {
            handleSelectExam(selectedProtocol.exams[0]);
        }
    }, [selectedProtocol]);

    const handleLocalSearchKeyDown = (e) => {
        if (groupedProtocols.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setKeyboardSelectedIndex(prev => Math.min(prev + 1, groupedProtocols.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setKeyboardSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (keyboardSelectedIndex >= 0 && keyboardSelectedIndex < groupedProtocols.length) {
                setSelectedProtocol(groupedProtocols[keyboardSelectedIndex]);
            } else if (groupedProtocols.length === 1) {
                setSelectedProtocol(groupedProtocols[0]);
            }
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const data = await laboratorioConferenciaService.buscarExamesParaConferencia({
                ...searchFilters,
                dataInicial: searchFilters.date
            });
            setSearchResults(data);
            setSelectedExam(null);
            setExamDetails([]);
            setFeedbackMsg(null);
        } catch (error) {
            console.error('Erro na busca', error);
            setFeedbackMsg({ type: 'error', text: 'Erro ao buscar exames para conferência. Verifique os filtros e tente novamente.' });
            setTimeout(() => setFeedbackMsg(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectExam = async (exam) => {
        try {
            setSelectedExam(exam);
            setLoadingDetails(true);
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

    const handleSelectProtocolWithCheck = (group, idx) => {
        if (editingParam) {
            setPendingAction(() => () => {
                setSelectedProtocol(group);
                setKeyboardSelectedIndex(idx);
            });
            setShowUnsavedModal(true);
        } else {
            setSelectedProtocol(group);
            setKeyboardSelectedIndex(idx);
        }
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
        if (!editingParam || !selectedExam) return;
        
        if (!param.id) {
            setFeedbackMsg({ type: 'error', text: 'Não foi possível identificar o registro deste resultado.' });
            setTimeout(() => setFeedbackMsg(null), 4000);
            return;
        }

        try {
            setSaving(true);
            const value = editingParam.value;
            const updatedParam = { ...param, value_id: param.id };
            
            if (param.value_numeric !== null || param.value_numeric !== undefined || !isNaN(value)) {
                updatedParam.value_numeric = isNaN(parseFloat(value)) ? null : parseFloat(value);
                updatedParam.value_text = isNaN(parseFloat(value)) ? value : null;
            } else {
                updatedParam.value_text = value;
                updatedParam.value_numeric = null;
            }
            
            await laboratorioResultadosService.salvarResultados(selectedExam.id, [updatedParam]);
            
            setExamDetails(prev => prev.map(p => p.id === param.id ? { ...p, value_numeric: updatedParam.value_numeric, value_text: updatedParam.value_text } : p));
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

            // 1. Remover o exame confirmado de searchResults (estado raiz que alimenta groupedProtocols)
            const updatedSearchResults = searchResults.filter(ex => ex.id !== confirmedId);
            setSearchResults(updatedSearchResults);

            // 2. Calcular os exames restantes deste protocolo (somente DIGITADO)
            const remainingExamsInProtocol = updatedSearchResults.filter(
                ex => ex.protocolo === selectedProtocol.protocolo && ex.status === 'DIGITADO'
            );

            if (remainingExamsInProtocol.length > 0) {
                // Ainda há exames neste atendimento: selecionar o primeiro
                const nextExam = remainingExamsInProtocol[0];
                handleSelectExam(nextExam);
                setTimeout(() => {
                    const el = document.querySelector('.lab-review-panel');
                    if (el) el.scrollTop = 0;
                }, 100);
            } else {
                // Último exame do atendimento confirmado: ir para o próximo paciente
                const otherProtocols = updatedSearchResults
                    .map(ex => ex.protocolo)
                    .filter((p, i, arr) => p !== selectedProtocol.protocolo && arr.indexOf(p) === i);

                if (otherProtocols.length > 0) {
                    // Não força seleção aqui — o useEffect de groupedProtocols vai selecionar o primeiro disponível
                    setSelectedProtocol(null);
                    setSelectedExam(null);
                    setExamDetails([]);
                } else {
                    setSelectedProtocol(null);
                    setSelectedExam(null);
                    setExamDetails([]);
                }
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

    const handleCancelar = () => {
        if (!selectedExam || saving) return;
        if (editingParam) {
            setPendingAction(() => () => setShowCancelModal(true));
            setShowUnsavedModal(true);
            return;
        }
        setShowCancelModal(true);
    };

    const confirmCancelAction = async () => {
        if (!selectedExam || canceling) return;
        
        try {
            setCanceling(true);
            await laboratorioConferenciaService.cancelarExame(selectedExam.id);
            setFeedbackMsg({ type: 'success', text: 'Exame cancelado com sucesso.' });
            
            const currentIndex = selectedProtocol.exams.findIndex(e => e.id === selectedExam.id);
            const updatedExams = selectedProtocol.exams.map(e => e.id === selectedExam.id ? { ...e, status: 'CANCELADO' } : e);
            setSelectedProtocol(prev => ({ ...prev, exams: updatedExams }));

            const nextExam = updatedExams.find((e, idx) => idx > currentIndex && e.status !== 'CONFIRMADO' && e.status !== 'CANCELADO');
            const fallbackExam = updatedExams.find(e => e.id !== selectedExam.id && e.status !== 'CONFIRMADO' && e.status !== 'CANCELADO');
            const targetExam = nextExam || fallbackExam;

            if (targetExam) {
                handleSelectExam(targetExam);
                setTimeout(() => {
                    const el = document.querySelector('.lab-review-panel');
                    if (el) el.scrollTop = 0;
                }, 100);
            } else {
                setSearchResults(prev => prev.filter(ex => ex.protocolo !== selectedProtocol.protocolo));
                setSelectedProtocol(null);
                setSelectedExam(null);
                setExamDetails([]);
            }

            setTimeout(() => {
                setFeedbackMsg(null);
            }, 3000);
        } catch (error) {
            console.error('[Conferência] Erro ao cancelar exame:', error);
            setFeedbackMsg({ type: 'error', text: 'Não foi possível cancelar o exame.' });
            setTimeout(() => setFeedbackMsg(null), 4000);
        } finally {
            setCanceling(false);
            setShowCancelModal(false);
        }
    };

    const isAbnormal = (val_num, min, max) => {
        if (val_num === null || val_num === undefined || val_num === '') return false;
        const num = parseFloat(val_num);
        if (isNaN(num)) return false;
        
        if (min !== null && num < parseFloat(min)) return 'below';
        if (max !== null && num > parseFloat(max)) return 'above';
        return 'normal';
    };

    return (
        <div className="lab-conf-container">
            {/* Header */}
            <header className="lab-conf-header">
                <div>
                    <h1 className="lab-title">Conferência</h1>
                    <p className="lab-subtitle">Revisão técnica dos resultados antes da liberação do laudo</p>
                </div>
                <div className="lab-header-actions" style={{ position: 'relative' }}>
                    {feedbackMsg && !selectedExam && (
                        <div style={{
                            position: 'absolute', top: '50%', right: '0', 
                            transform: 'translateY(-50%)',
                            background: feedbackMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                            color: feedbackMsg.type === 'success' ? '#047857' : '#b91c1c',
                            border: `1px solid ${feedbackMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            fontWeight: '600', fontSize: '0.85rem', zIndex: 10,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            {feedbackMsg.text}
                        </div>
                    )}
                </div>
            </header>

            {/* Filtros */}
            <div className={`lab-card lab-filters-card ${selectedExam ? 'compact' : ''}`}>
                <div className="lab-filters-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 4fr 1.5fr 1.5fr auto', gap: '1rem', alignItems: 'flex-end', width: '100%' }}>
                    <div className="lab-filter-item lab-filter-group">
                        <label>Data</label>
                        <input 
                            type="date" 
                            value={searchFilters.date}
                            onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})}
                            onKeyDown={handleFilterKeyDown}
                        />
                    </div>

                    <div className="lab-filter-item lab-filter-group">
                        <label>Paciente</label>
                        <input 
                            type="text" 
                            placeholder="Nome do paciente..."
                            value={searchFilters.patient}
                            onChange={(e) => setSearchFilters({...searchFilters, patient: e.target.value})}
                            onKeyDown={handleFilterKeyDown}
                        />
                    </div>
                    <div className="lab-filter-item lab-filter-group">
                        <label>Código do Paciente</label>
                        <input 
                            type="text" 
                            placeholder="Ex.: 115003"
                            value={searchFilters.patientCode}
                            onChange={(e) => {
                                const onlyNums = e.target.value.replace(/\D/g, '');
                                setSearchFilters({...searchFilters, patientCode: onlyNums});
                            }}
                            onKeyDown={handleFilterKeyDown}
                        />
                    </div>
                    <div className="lab-filter-item lab-filter-group">
                        <label>Origem</label>
                        <select 
                            value={searchFilters.attendance_origin}
                            onChange={(e) => setSearchFilters({...searchFilters, attendance_origin: e.target.value})}
                        >
                            <option value="">Todos</option>
                            {ATTENDANCE_ORIGINS.map(origin => (
                                <option key={origin.value} value={origin.value}>{origin.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="lab-filter-item lab-filter-group lab-filter-actions">
                        <label className="filter-label-spacer" aria-hidden="true">Ação</label>
                        <button className="lab-btn lab-btn-primary" onClick={handleSearchWithCheck} disabled={loading}>
                            {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                            Buscar
                        </button>
                    </div>
                </div>
            </div>

            {/* Layout Principal */}
            <div className="lab-conf-layout conferencia-workspace" style={{ height: 'calc(100vh - 210px)', minHeight: 0, overflow: 'hidden', alignItems: 'stretch' }}>
                
                {/* Coluna Esquerda: Fila */}
                <div className="lab-conf-sidebar" style={{ position: 'relative', top: 'auto', height: '100%', minHeight: '0' }}>
                    <div className="lab-card lab-queue-card" style={{ flex: 1, minHeight: '0', maxHeight: 'none', padding: '0.75rem' }}>
                        <div className="lab-card-header" style={{ paddingBottom: '0.5rem', marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="lab-card-title" style={{ fontSize: '1rem', margin: 0 }}><Clock size={16} style={{marginRight: '6px'}} /> Resultados</h3>
                            <span className="lab-badge lab-badge-primary" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>{groupedProtocols.length} atends / {filteredResults.length} exames</span>
                        </div>
                        <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', marginBottom: '0.5rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar nesta lista..." 
                                    value={localSearch}
                                    onChange={(e) => {
                                        setLocalSearch(e.target.value);
                                        setKeyboardSelectedIndex(-1);
                                    }}
                                    onKeyDown={handleLocalSearchKeyDown}
                                    style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                                />
                            </div>
                        </div>
                        <div className="lab-queue-list" ref={listRef} style={{ flex: 1, minHeight: '0', overflowY: 'auto' }}>
                            {groupedProtocols.length === 0 && !loading && (
                                <div className="text-center p-4 text-gray-500 text-sm">
                                    Nenhum item encontrado nesta lista.
                                </div>
                            )}
                            {groupedProtocols.map((group, idx) => {
                                const isSelected = selectedProtocol?.protocolo === group.protocolo;
                                const isKeyboardSelected = keyboardSelectedIndex === idx;
                                return (
                                    <div 
                                        key={group.protocolo} 
                                        className={`lab-queue-item ${isSelected ? 'active' : ''}`}
                                        style={{ 
                                            padding: '10px 12px', 
                                            borderLeft: isSelected ? '4px solid #3b82f6' : '4px solid #e2e8f0',
                                            borderTop: '1px solid #e2e8f0',
                                            borderRight: '1px solid #e2e8f0',
                                            borderBottom: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            background: isSelected ? '#eff6ff' : '#fff',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.background = '#f8fafc';
                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                                e.currentTarget.style.borderLeftColor = '#cbd5e1';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.background = '#fff';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                e.currentTarget.style.borderLeftColor = '#e2e8f0';
                                            }
                                        }}
                                        onClick={() => handleSelectProtocolWithCheck(group, idx)}
                                    >
                                        <div className="lab-qi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Cód. {group.pacienteCode || 'N/I'}</span>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>{group.dataAtendimento}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '5px', gap: '8px' }}>
                                            <div style={{ fontSize: '14.5px', fontWeight: '600', color: '#0f172a', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', minWidth: '0' }}>
                                                {group.pacienteNome}
                                            </div>
                                            <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', paddingTop: '1px' }}>
                                                {group.exams.length} {group.exams.length === 1 ? 'exame' : 'exames'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Painel de Revisão */}
                <div className="lab-conf-main" style={{ height: '100%', minHeight: '0' }}>
                    
                    {!selectedProtocol && (
                        <div className="lab-card flex flex-col items-center justify-center p-8 text-center h-full" style={{ minHeight: '400px' }}>
                            <Activity size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700">Não há exames pendentes para conferência.</h3>
                            <p className="text-gray-500 max-w-md mt-2">
                                Selecione um atendimento na lista lateral se desejar revisar exames novamente.
                            </p>
                        </div>
                    )}

                    {selectedExam && (
                            <div className="lab-card" style={{ padding: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', minHeight: '0', overflowY: 'auto' }}>
                                
                                {/* CABEÇALHO STICKY: ATENDIMENTO E ABAS */}
                                <div style={{ position: 'sticky', top: '-1px', zIndex: 10, background: '#fff', margin: 0, borderTop: 'none', borderBottom: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column' }}>
                                
                                {/* 1. CABEÇALHO COMPACTO DO ATENDIMENTO */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <User size={18} className="text-primary" /> CÓD. {selectedProtocol?.pacienteCode || 'Não informado'} — {selectedProtocol?.pacienteNome}
                                        </div>
                                        <div className="lab-header-actions" style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {feedbackMsg && (
                                                <div style={{ position: 'absolute', top: '50%', right: '100%', transform: 'translateY(-50%)', marginRight: '1rem', background: feedbackMsg.type === 'success' ? '#d1fae5' : '#fee2e2', color: feedbackMsg.type === 'success' ? '#047857' : '#b91c1c', border: `1px solid ${feedbackMsg.type === 'success' ? '#10b981' : '#ef4444'}`, padding: '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', zIndex: 10, whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                    {feedbackMsg.text}
                                                </div>
                                            )}
                                            <button className="lab-btn lab-btn-outline" onClick={handleCancelar} disabled={saving || returning} style={{ padding: '0 12px', height: '36px', fontSize: '14px', color: '#b91c1c', borderColor: '#fecaca', whiteSpace: 'nowrap' }}>
                                                <XCircle size={14} style={{ marginRight: '4px' }} />
                                                Cancelar
                                            </button>
                                            <button className="lab-btn lab-btn-success" onClick={handleConfirmarConferencia} disabled={saving || returning} style={{ padding: '0 12px', height: '36px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                                {saving ? <Loader2 size={14} className="spin" style={{ marginRight: '4px' }} /> : <CheckCircle2 size={14} style={{ marginRight: '4px' }} />}
                                                {saving ? 'Confirmando...' : 'Confirmar'}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '13.5px', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                        <span>{selectedProtocol?.pacienteIdade}</span>
                                        <span>• {selectedProtocol?.pacienteSexo}</span>
                                        <span>• Origem: {formatAttendanceOrigin(selectedProtocol?.attendance_origin)}</span>
                                        {selectedProtocol?.pacienteCpf && <span>• CPF: {formatCpf(selectedProtocol?.pacienteCpf)}</span>}
                                        {selectedProtocol?.pacienteCns && selectedProtocol?.pacienteCns !== '---' && <span>• CNS: {selectedProtocol?.pacienteCns}</span>}
                                        <span>• Médico: {selectedProtocol?.medico || 'Não informado'}</span>
                                    </div>
                                </div>

                                {/* 2. ABAS DOS EXAMES */}
                                <div style={{ padding: '10px 20px', display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '8px', background: '#fff' }}>
                                    {selectedProtocol?.exams.map(ex => (
                                        <button 
                                            key={ex.id}
                                            onClick={() => handleSelectExamWithCheck(ex)}
                                            style={{
                                                height: '36px',
                                                padding: '0 14px',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                border: selectedExam?.id === ex.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                                backgroundColor: selectedExam?.id === ex.id ? '#eff6ff' : '#fff',
                                                color: selectedExam?.id === ex.id ? '#1d4ed8' : '#475569',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0
                                            }}
                                        >
                                            {ex.exameCodigo}
                                        </button>
                                    ))}
                                </div>
                                </div>

                                {/* 3. CABEÇALHO DO EXAME */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 5px 0' }}>
                                                {selectedExam.exameCodigo} — {selectedExam.exameNome}
                                            </h2>
                                            <div style={{ fontSize: '13.5px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span>Material: {selectedExam.exameMaterial || 'Não inf.'}</span>
                                                <span>•</span>
                                                <span>Método: {selectedExam.exameMetodo || 'Não inf.'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="lab-status-tag status-success" style={{ fontWeight: 600, padding: '2px 8px', fontSize: '12px' }}>{selectedExam.status}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. RESULTADO E REFERÊNCIA */}
                                <div className="lab-review-body" style={{ padding: '16px 20px 20px', minHeight: '0' }}>
                                    {loadingDetails ? (
                                        <div className="flex justify-center py-8 text-gray-500">
                                            <Loader2 size={24} className="spin" />
                                            <span className="ml-2">Carregando parâmetros...</span>
                                        </div>
                                    ) : examDetails.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">Nenhum parâmetro encontrado para este exame.</div>
                                    ) : (
                                        <div className="lab-review-params-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {examDetails.map((param, index) => {
                                                const displayValue = formatLabValue(param.parameter_code || param.code, param.result_type, param.value_numeric, param.value_text);
                                                const abnormalStatus = isAbnormal(param.value_numeric, param.min_value, param.max_value);
                                                
                                                return (
                                                    <div key={param.id} style={{ display: 'flex', flexDirection: 'column', paddingBottom: index < examDetails.length - 1 ? '20px' : '0', borderBottom: index < examDetails.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                                                        {(param.parameter_name && examDetails.length > 1) ? (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                                                <strong style={{ color: '#1e293b', fontSize: '15px' }}>{param.parameter_name || param.parameter_code}</strong>
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    {abnormalStatus === 'below' && <span className="lab-badge lab-badge-danger"><AlertTriangle size={12}/> Abaixo da ref.</span>}
                                                                    {abnormalStatus === 'above' && <span className="lab-badge lab-badge-danger"><AlertTriangle size={12}/> Acima da ref.</span>}
                                                                    {abnormalStatus === 'normal' && param.min_value !== null && <span className="lab-badge lab-badge-success"><CheckCircle2 size={12}/> Normal</span>}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                        
                                                        <div className="lab-review-data-row" style={{ display: 'flex', gap: '0', flexWrap: 'nowrap' }}>
                                                            {/* Coluna Esquerda: Valor Digitado (Aprox 28%) */}
                                                            <div className="lab-review-result-box" style={{ width: '28%', paddingRight: '20px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <label style={{ fontSize: '12.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Valor Digitado</label>
                                                                    {(examDetails.length === 1 || !param.parameter_name) && (
                                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                                            {abnormalStatus === 'below' && <span className="lab-badge lab-badge-danger" style={{ padding: '2px 6px', fontSize: '11px' }}><AlertTriangle size={10}/> Abaixo da ref.</span>}
                                                                            {abnormalStatus === 'above' && <span className="lab-badge lab-badge-danger" style={{ padding: '2px 6px', fontSize: '11px' }}><AlertTriangle size={10}/> Acima da ref.</span>}
                                                                            {abnormalStatus === 'normal' && param.min_value !== null && <span className="lab-badge lab-badge-success" style={{ padding: '2px 6px', fontSize: '11px' }}><CheckCircle2 size={10}/> Normal</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="result-display" style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                                    {editingParam?.id === param.id ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', paddingTop: '2px', paddingBottom: '4px' }}>
                                                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                                <input 
                                                                                    type="text"
                                                                                    value={editingParam.value}
                                                                                    onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                                                                                    autoFocus
                                                                                    onFocus={e => e.target.select()}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') handleSaveParam(param);
                                                                                        if (e.key === 'Escape') setEditingParam(null);
                                                                                    }}
                                                                                    disabled={saving}
                                                                                    style={{ fontSize: '16px', fontWeight: '600', width: '80px', padding: '2px 6px', height: '28px', border: '1px solid #3b82f6', borderRadius: '4px', outline: 'none' }}
                                                                                />
                                                                                {param.unit && <span className="result-unit" style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>{param.unit}</span>}
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                                <button className="lab-btn lab-btn-success" onClick={() => handleSaveParam(param)} disabled={saving} style={{ padding: '0', height: '26px', fontSize: '11.5px', whiteSpace: 'nowrap', flex: 1, minWidth: '0', justifyContent: 'center' }}>Salvar</button>
                                                                                <button className="lab-btn lab-btn-outline" onClick={() => setEditingParam(null)} disabled={saving} style={{ padding: '0', height: '26px', fontSize: '11.5px', whiteSpace: 'nowrap', flex: 1, minWidth: '0', justifyContent: 'center' }}>Cancelar</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <span className={`result-value ${abnormalStatus !== 'normal' && abnormalStatus !== false ? 'text-danger font-bold' : 'font-semibold'}`} style={{ fontSize: '24px', color: abnormalStatus !== 'normal' && abnormalStatus !== false ? '#ef4444' : '#0f172a' }}>
                                                                                {displayValue}
                                                                            </span>
                                                                            {param.unit && <span className="result-unit" style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>{param.unit}</span>}
                                                                            <button 
                                                                                onClick={() => setEditingParam({ id: param.id, value: displayValue })}
                                                                                disabled={saving || editingParam}
                                                                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', marginLeft: '4px', borderRadius: '4px' }}
                                                                                title="Editar valor"
                                                                            >
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                                                <span style={{ fontSize: '12px', marginLeft: '4px', fontWeight: 500 }}>Editar</span>
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                {param.observation && (
                                                                    <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                                        <strong>Obs:</strong> {param.observation}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Coluna Direita: Referência (Aprox 72%) */}
                                                            <div className="lab-review-ref-box" style={{ width: '72%', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                                                                <label style={{ fontSize: '12.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Referência</label>
                                                                <div className="ref-line" style={{ marginTop: '6px', color: '#334155', fontSize: '14.5px', whiteSpace: 'pre-line', lineHeight: '1.45' }}>
                                                                    {param.reference_text || (param.min_value !== null || param.max_value !== null ? `${param.min_value || 0} a ${param.max_value || '∞'}` : 'Não cadastrada')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                    )}
                </div>
            </div>
            

            {/* Modal Cancelar Conferência */}
            {showCancelModal && (
                <div className="unsaved-result-modal-overlay" role="dialog" aria-modal="true">
                    <div className="unsaved-result-modal" style={{ maxWidth: '450px' }}>
                        <div className="unsaved-result-modal-header" style={{ paddingBottom: '12px' }}>
                            <div className="unsaved-result-modal-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="unsaved-result-modal-title">Cancelar conferência?</h2>
                                <p className="unsaved-result-modal-subtitle">A conferência deste atendimento será interrompida. Nenhum resultado será excluído ou confirmado.</p>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-footer">
                            <button className="unsaved-btn-neutral" onClick={() => setShowCancelModal(false)}>Continuar conferindo</button>
                            <button className="lab-btn-danger" style={{ height: '46px', padding: '0 20px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: canceling ? 0.7 : 1 }} onClick={confirmCancelAction} disabled={canceling}>
                                {canceling ? 'Cancelando...' : 'Cancelar conferência'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Alteração Não Salva */}
            {showUnsavedModal && (
                <div className="unsaved-result-modal-overlay" role="dialog" aria-modal="true">
                    <div className="unsaved-result-modal" style={{ maxWidth: '450px' }}>
                        <div className="unsaved-result-modal-header" style={{ paddingBottom: '12px' }}>
                            <div className="unsaved-result-modal-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="unsaved-result-modal-title">Alteração não salva</h2>
                                <p className="unsaved-result-modal-subtitle">Existe uma alteração de resultado não salva. Deseja descartar a alteração e continuar?</p>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-footer">
                            <button className="unsaved-btn-neutral" onClick={() => {
                                setShowUnsavedModal(false);
                                setPendingAction(null);
                            }}>Continuar editando</button>
                            <button className="lab-btn-danger" style={{ height: '46px', padding: '0 20px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => {
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

export default LaboratorioConferencia;
