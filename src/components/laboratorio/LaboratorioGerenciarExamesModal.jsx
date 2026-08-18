import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    X, 
    Layers, 
    Loader2, 
    RotateCcw, 
    AlertCircle, 
    AlertTriangle, 
    ChevronDown, 
    ChevronRight, 
    CheckCircle2, 
    Clock, 
    Ban, 
    Printer,
    Search,
    PlusCircle,
    Info
} from 'lucide-react';
import { 
    laboratorioGerenciarExamesService, 
    MAP_STATUS 
} from '../../services/api/laboratorioGerenciarExames.service';
import { formatAttendanceOrigin } from '../../utils/laboratorioHelpers';
import { useAuth } from '../../context/AuthContext';
import { canWriteLaboratorio } from '../../utils/laboratorioAcl';
import './LaboratorioGerenciarExamesModal.css';

/**
 * Modal para Gerenciamento de Exames do Atendimento.
 * Permite inclusão de novos exames via RPC e visualização de exames ativos, cancelados e legados.
 */
const LaboratorioGerenciarExamesModal = ({
    isOpen,
    attendanceId,
    tenantId,
    attendance = {},
    onClose,
    onChanged
}) => {
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeExams, setActiveExams] = useState([]);
    const [cancelledExams, setCancelledExams] = useState([]);
    const [legacyIssues, setLegacyIssues] = useState([]);
    const [availableExams, setAvailableExams] = useState([]);
    const [counts, setCounts] = useState({ active: 0, cancelled: 0, legacyIssues: 0 });

    // Accordions
    const [showAddSection, setShowAddSection] = useState(true);
    const [showCancelled, setShowCancelled] = useState(false);
    const [showLegacy, setShowLegacy] = useState(false);

    // Inclusão de exames
    const [searchInput, setSearchInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [selectedExams, setSelectedExams] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState(null);
    const [successFeedback, setSuccessFeedback] = useState(null);

    // Cancelamento de exames
    const [cancellingExam, setCancellingExam] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelError, setCancelError] = useState(null);
    const [cancelHint, setCancelHint] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // Restauração de exames
    const [restoringExam, setRestoringExam] = useState(null);
    const [restoreError, setRestoreError] = useState(null);
    const [restoreHint, setRestoreHint] = useState(null);
    const [isRestoring, setIsRestoring] = useState(false);

    const searchInputRef = useRef(null);
    const cancelReasonRef = useRef(null);

    const carregarDados = useCallback(async () => {
        if (!attendanceId || !tenantId) {
            setError('Identificador do atendimento ou do tenant não informado.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const [atendimentoData, disponiveisData] = await Promise.all([
                laboratorioGerenciarExamesService.listarExamesDoAtendimento(attendanceId, tenantId),
                laboratorioGerenciarExamesService.listarExamesDisponiveis(tenantId)
            ]);

            setActiveExams(atendimentoData.activeExams || []);
            setCancelledExams(atendimentoData.cancelledExams || []);
            setLegacyIssues(atendimentoData.legacyIssues || []);
            setCounts(atendimentoData.counts || {
                active: (atendimentoData.activeExams || []).length,
                cancelled: (atendimentoData.cancelledExams || []).length,
                legacyIssues: (atendimentoData.legacyIssues || []).length,
            });
            setAvailableExams(disponiveisData || []);
        } catch (err) {
            console.error('[LaboratorioGerenciarExamesModal] Erro ao listar exames:', err);
            setError(err.message || 'Falha ao consultar exames do atendimento.');
        } finally {
            setLoading(false);
        }
    }, [attendanceId, tenantId]);

    useEffect(() => {
        if (isOpen) {
            setShowAddSection(true);
            setShowCancelled(false);
            setShowLegacy(false);
            setSelectedExams([]);
            setSearchInput('');
            setSuggestions([]);
            setHighlightedIndex(-1);
            setAddError(null);
            setSuccessFeedback(null);
            setIsAdding(false);
            setCancellingExam(null);
            setCancelReason('');
            setCancelError(null);
            setCancelHint(null);
            setIsCancelling(false);
            setRestoringExam(null);
            setRestoreError(null);
            setRestoreHint(null);
            setIsRestoring(false);
            carregarDados();
        } else {
            setShowAddSection(true);
            setActiveExams([]);
            setCancelledExams([]);
            setLegacyIssues([]);
            setAvailableExams([]);
            setSelectedExams([]);
            setSuggestions([]);
            setCounts({ active: 0, cancelled: 0, legacyIssues: 0 });
            setError(null);
            setAddError(null);
            setSuccessFeedback(null);
            setCancellingExam(null);
            setCancelReason('');
            setCancelError(null);
            setCancelHint(null);
            setIsCancelling(false);
            setRestoringExam(null);
            setRestoreError(null);
            setRestoreHint(null);
            setIsRestoring(false);
        }
    }, [isOpen, carregarDados]);

    // Auto-focus no campo de motivo quando o diálogo de confirmação de cancelamento é aberto
    useEffect(() => {
        if (cancellingExam && cancelReasonRef.current) {
            const timer = setTimeout(() => {
                cancelReasonRef.current?.focus();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [cancellingExam]);

    // Fechar ao pressionar ESC respeitando confirmação de cancelamento, restauração, busca e inclusão
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isAdding || isCancelling || isRestoring) return;
                if (cancellingExam) {
                    e.preventDefault();
                    e.stopPropagation();
                    setCancellingExam(null);
                    setCancelReason('');
                    setCancelError(null);
                    setCancelHint(null);
                    return;
                }
                if (restoringExam) {
                    e.preventDefault();
                    e.stopPropagation();
                    setRestoringExam(null);
                    setRestoreError(null);
                    setRestoreHint(null);
                    return;
                }
                if (suggestions.length > 0) return; // tratado no handleSearchKeyDown
                if (searchInput.trim().length > 0) return; // tratado no handleSearchKeyDown
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isAdding, isCancelling, isRestoring, cancellingExam, restoringExam, suggestions.length, searchInput, onClose]);

    // Situação de disponibilidade do exame cruzando com o atendimento e a seleção temporária
    const getExamAvailability = useCallback((examId) => {
        if (activeExams.some(a => a.examId === examId)) {
            return { available: false, label: 'Já adicionado', type: 'active' };
        }
        if (cancelledExams.some(c => c.examId === examId)) {
            return { available: false, label: 'Cancelado — use Restaurar', type: 'cancelled' };
        }
        if (legacyIssues.some(l => l.examId === examId)) {
            return { available: false, label: 'Revisão necessária', type: 'legacy' };
        }
        if (selectedExams.some(s => s.id === examId)) {
            return { available: false, label: 'Selecionado', type: 'selected' };
        }
        return { available: true, label: 'Disponível', type: 'available' };
    }, [activeExams, cancelledExams, legacyIssues, selectedExams]);

    // Busca rápida com ordenação e cruzamento de status
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchInput(val);
        setHighlightedIndex(-1);
        setAddError(null);

        const term = val.trim().toLowerCase();
        if (term.length === 0) {
            setSuggestions([]);
            return;
        }

        const matches = availableExams.filter(ex => {
            const code = (ex.code || '').toLowerCase();
            const name = (ex.name || '').toLowerCase();
            return code.includes(term) || name.includes(term);
        }).map(ex => ({
            ...ex,
            availability: getExamAvailability(ex.id)
        })).sort((a, b) => {
            const codeA = (a.code || '').toLowerCase();
            const codeB = (b.code || '').toLowerCase();
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();

            // 1. Código exato
            if (codeA === term && codeB !== term) return -1;
            if (codeB === term && codeA !== term) return 1;

            // 2. Código iniciando
            const codeAStarts = codeA.startsWith(term);
            const codeBStarts = codeB.startsWith(term);
            if (codeAStarts && !codeBStarts) return -1;
            if (codeBStarts && !codeAStarts) return 1;

            // 3. Código contendo
            const codeAHas = codeA.includes(term);
            const codeBHas = codeB.includes(term);
            if (codeAHas && !codeBHas) return -1;
            if (codeBHas && !codeAHas) return 1;

            // 4. Nome iniciando
            const nameAStarts = nameA.startsWith(term);
            const nameBStarts = nameB.startsWith(term);
            if (nameAStarts && !nameBStarts) return -1;
            if (nameBStarts && !nameAStarts) return 1;

            // 5. Ordem alfabética de nome
            return nameA.localeCompare(nameB, 'pt-BR');
        }).slice(0, 10);

        setSuggestions(matches);
    };

    // Seleção de um exame disponível
    const handleSelectExam = (exam) => {
        if (isAdding) return;
        const avail = exam.availability || getExamAvailability(exam.id);
        if (!avail.available) return;

        setSelectedExams(prev => [...prev, exam]);
        setSearchInput('');
        setSuggestions([]);
        setHighlightedIndex(-1);
        setAddError(null);
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    // Navegação por teclado no campo de busca
    const handleSearchKeyDown = (e) => {
        if (isAdding) return;

        if (e.key === 'Escape') {
            if (suggestions.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                setSuggestions([]);
                setHighlightedIndex(-1);
                return;
            }
            if (searchInput.trim().length > 0) {
                e.preventDefault();
                e.stopPropagation();
                setSearchInput('');
                return;
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            if (suggestions.length > 0) {
                e.preventDefault();
                setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
            }
            return;
        }

        if (e.key === 'ArrowUp') {
            if (suggestions.length > 0) {
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
            }
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions.length > 0) {
                let targetExam = null;
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    targetExam = suggestions[highlightedIndex];
                } else if (suggestions.length === 1) {
                    targetExam = suggestions[0];
                } else {
                    const exactMatch = suggestions.find(s => (s.code || '').toLowerCase() === searchInput.trim().toLowerCase());
                    if (exactMatch) targetExam = exactMatch;
                }

                if (targetExam) {
                    handleSelectExam(targetExam);
                }
            }
        }
    };

    // Remoção de exame da lista temporária
    const handleRemoveSelectedExam = (examId) => {
        if (isAdding) return;
        setSelectedExams(prev => prev.filter(e => e.id !== examId));
        setAddError(null);
    };

    // Execução da adição de exames via RPC
    const handleAdicionarExames = async () => {
        if (!canWriteLaboratorio(role)) return;
        if (isAdding || selectedExams.length === 0 || !attendanceId) return;

        try {
            setIsAdding(true);
            setAddError(null);
            setSuccessFeedback(null);

            const examIds = selectedExams.map(e => e.id);
            const result = await laboratorioGerenciarExamesService.adicionarExamesAoAtendimento(
                attendanceId,
                examIds
            );

            const successMsg = result?.message || (
                selectedExams.length === 1 
                    ? 'Exame adicionado com sucesso!' 
                    : `${selectedExams.length} exames adicionados com sucesso!`
            );
            setSuccessFeedback(successMsg);
            setSelectedExams([]);
            setSearchInput('');
            setSuggestions([]);
            setHighlightedIndex(-1);
            setShowAddSection(false); // Recolhe automaticamente a seção após inclusão com sucesso

            // Recarrega os dados do modal
            await carregarDados();

            // Notifica a página Resultados para atualizar o atendimento aberto
            if (typeof onChanged === 'function') {
                try {
                    await onChanged();
                } catch (err) {
                    console.error('[LaboratorioGerenciarExamesModal] Erro ao notificar onChanged:', err);
                }
            }

            setTimeout(() => {
                setSuccessFeedback(null);
            }, 5000);
        } catch (err) {
            console.error('[LaboratorioGerenciarExamesModal] Erro ao adicionar exames:', err);
            setAddError(err.message || 'Falha ao adicionar exames ao atendimento.');
        } finally {
            setIsAdding(false);
        }
    };

    // Abertura do diálogo de confirmação de cancelamento
    const handleOpenCancelConfirmation = (exam) => {
        if (isAdding || isCancelling) return;
        setCancellingExam(exam);
        setCancelReason('');
        setCancelError(null);
        setCancelHint(null);
    };

    // Fechamento do diálogo de confirmação de cancelamento
    const handleCloseCancelConfirmation = () => {
        if (isCancelling) return;
        setCancellingExam(null);
        setCancelReason('');
        setCancelError(null);
        setCancelHint(null);
    };

    // Execução do cancelamento de exame via RPC segura
    const handleConfirmCancelExam = async () => {
        if (!canWriteLaboratorio(role)) return;
        if (!cancellingExam || isCancelling || !attendanceId) return;

        const trimmedReason = (cancelReason || '').trim();
        if (!trimmedReason) {
            setCancelError('O motivo do cancelamento é obrigatório.');
            return;
        }
        if (trimmedReason.length < 5) {
            setCancelError('O motivo do cancelamento deve conter no mínimo 5 caracteres.');
            return;
        }
        if (trimmedReason.length > 500) {
            setCancelError('O motivo do cancelamento não pode exceder 500 caracteres.');
            return;
        }

        try {
            setIsCancelling(true);
            setCancelError(null);
            setCancelHint(null);

            const result = await laboratorioGerenciarExamesService.cancelarExameDoAtendimento(
                cancellingExam.attendanceExamId,
                trimmedReason
            );

            let successMsg = result?.message || `Exame ${cancellingExam.examName || cancellingExam.examCode || ''} cancelado com sucesso!`;
            if (result?.map?.warning) {
                successMsg += ` (${result.map.warning})`;
            }

            // Fecha a confirmação e limpa estados locais
            setCancellingExam(null);
            setCancelReason('');
            setCancelError(null);
            setCancelHint(null);

            // Exibe mensagem de sucesso
            setSuccessFeedback(successMsg);

            // Recarrega os dados do modal e exames disponíveis
            await carregarDados();

            // Notifica a página Resultados para atualizar o atendimento aberto
            if (typeof onChanged === 'function') {
                try {
                    await onChanged();
                } catch (err) {
                    console.error('[LaboratorioGerenciarExamesModal] Erro ao notificar onChanged:', err);
                }
            }

            setTimeout(() => {
                setSuccessFeedback(null);
            }, 5000);
        } catch (err) {
            console.error('[LaboratorioGerenciarExamesModal] Erro ao cancelar exame:', err);
            setCancelError(err.message || 'Falha ao cancelar exame.');
            if (err.hint) {
                setCancelHint(err.hint);
            }
        } finally {
            setIsCancelling(false);
        }
    };

    // Abertura do diálogo de confirmação de restauração
    const handleOpenRestoreConfirmation = (exam) => {
        if (!exam || !exam.canRestore || isAdding || isCancelling || isRestoring) return;
        setRestoringExam(exam);
        setRestoreError(null);
        setRestoreHint(null);
    };

    // Fechamento do diálogo de confirmação de restauração
    const handleCloseRestoreConfirmation = () => {
        if (isRestoring) return;
        setRestoringExam(null);
        setRestoreError(null);
        setRestoreHint(null);
    };

    // Execução da restauração de exame via RPC segura
    const handleConfirmRestoreExam = async () => {
        if (!canWriteLaboratorio(role)) return;
        if (!restoringExam || isRestoring || !attendanceId) return;

        try {
            setIsRestoring(true);
            setRestoreError(null);
            setRestoreHint(null);

            const result = await laboratorioGerenciarExamesService.restaurarExameDoAtendimento(
                restoringExam.attendanceExamId
            );

            let successMsg = result?.message || `Exame ${restoringExam.examCode ? `${restoringExam.examCode} — ` : ''}${restoringExam.examName || ''} restaurado com sucesso!`;
            if (result?.map?.warning) {
                successMsg += ` (${result.map.warning})`;
            }

            // Fecha a confirmação e limpa estados locais
            setRestoringExam(null);
            setRestoreError(null);
            setRestoreHint(null);

            // Exibe mensagem de sucesso
            setSuccessFeedback(successMsg);

            // Recarrega os dados do modal e exames disponíveis
            await carregarDados();

            // Notifica a página Resultados para atualizar o atendimento aberto
            if (typeof onChanged === 'function') {
                try {
                    await onChanged();
                } catch (err) {
                    console.error('[LaboratorioGerenciarExamesModal] Erro ao notificar onChanged:', err);
                }
            }

            setTimeout(() => {
                setSuccessFeedback(null);
            }, 5000);
        } catch (err) {
            console.error('[LaboratorioGerenciarExamesModal] Erro ao restaurar exame:', err);
            setRestoreError(err.message || 'Falha ao restaurar exame.');
            if (err.hint) {
                setRestoreHint(err.hint);
            }
        } finally {
            setIsRestoring(false);
        }
    };

    if (!isOpen) return null;

    const formatarData = (dataStr) => {
        if (!dataStr) return '---';
        try {
            if (dataStr.includes('T') || dataStr.includes(' ')) {
                const d = new Date(dataStr);
                if (!isNaN(d.getTime())) {
                    return d.toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
                return dataStr.split('-').reverse().join('/');
            }
            return dataStr;
        } catch {
            return dataStr;
        }
    };

    const renderMapBadge = (mapStatus) => {
        switch (mapStatus) {
            case MAP_STATUS.MAPA_IMPRESSO:
                return (
                    <span className="lab-map-badge impresso" title="Exame impresso em mapa de trabalho">
                        <Printer size={12} />
                        Mapa impresso
                    </span>
                );
            case MAP_STATUS.MAPA_PENDENTE:
                return (
                    <span className="lab-map-badge pendente" title="Exame em lote de mapa aguardando impressão">
                        <Clock size={12} />
                        Mapa pendente
                    </span>
                );
            case MAP_STATUS.SEM_MAPA:
            default:
                return (
                    <span className="lab-map-badge sem-mapa" title="Exame não vinculado a lote de mapa">
                        Sem mapa
                    </span>
                );
        }
    };

    const renderStatusBadge = (status) => {
        const s = String(status || 'PENDENTE').trim().toUpperCase();
        let cssClass = 'status-pendente';
        if (s === 'DIGITADO') cssClass = 'status-digitado';
        else if (s === 'CONFERIDO') cssClass = 'status-conferido';
        else if (s === 'LIBERADO') cssClass = 'status-liberado';
        else if (s === 'CANCELADO') cssClass = 'status-cancelado';

        return (
            <span className={`lab-status-tag ${cssClass}`}>
                {s}
            </span>
        );
    };

    const renderCancelSituation = (exam) => {
        if (exam.canCancel) {
            const examLabel = exam.examCode 
                ? `${exam.examCode} — ${exam.examName || ''}` 
                : (exam.examName || 'exame');

            return (
                <button
                    type="button"
                    className="lab-gerenciar-btn-cancel-action"
                    onClick={() => handleOpenCancelConfirmation(exam)}
                    disabled={isAdding || isCancelling}
                    title="Cancelar exame"
                    aria-label={`Cancelar exame ${examLabel}`}
                >
                    <Ban size={13} />
                    <span>Cancelar</span>
                </button>
            );
        }

        const rawReason = exam.cancelBlockedReason || 'Bloqueado';
        const isMapaPendente = exam.mapStatus === MAP_STATUS.MAPA_PENDENTE || 
            rawReason.toLowerCase().includes('mapa pendente');

        if (isMapaPendente) {
            return (
                <span 
                    className="lab-situation-badge warning" 
                    title="Cancele primeiro o lote pendente na página Mapas."
                >
                    Mapa pendente
                </span>
            );
        }

        // Resumo amigável para texto compacto na tabela
        let shortText = rawReason;
        const lowerReason = rawReason.toLowerCase();
        if (lowerReason.includes('liberado')) shortText = 'Liberado';
        else if (lowerReason.includes('conferido')) shortText = 'Conferido';
        else if (lowerReason.includes('digitado')) shortText = 'Digitado';
        else if (lowerReason.includes('valores preenchidos')) shortText = 'Valores preenchidos';
        else if (lowerReason.includes('observação geral')) shortText = 'Obs. preenchida';
        else if (lowerReason.includes('iniciado por um digitador')) shortText = 'Em digitação';
        else if (lowerReason.includes('cancelado')) shortText = 'Já cancelado';
        else if (lowerReason.includes('incompatível')) shortText = 'Status incompatível';

        return (
            <span 
                className="lab-situation-badge blocked" 
                title={rawReason}
            >
                {shortText}
            </span>
        );
    };

    const renderRestoreSituation = (exam) => {
        if (exam.canRestore) {
            const examLabel = exam.examCode 
                ? `${exam.examCode} — ${exam.examName || ''}` 
                : (exam.examName || 'exame');

            return (
                <button
                    type="button"
                    className="lab-gerenciar-btn-restore-action"
                    onClick={() => handleOpenRestoreConfirmation(exam)}
                    disabled={isAdding || isCancelling || isRestoring}
                    title="Restaurar exame"
                    aria-label={`Restaurar exame ${examLabel}`}
                >
                    <RotateCcw size={13} />
                    <span>Restaurar</span>
                </button>
            );
        }

        const rawReason = exam.restoreBlockedReason || 'Bloqueado';
        const isMapaPendente = exam.mapStatus === MAP_STATUS.MAPA_PENDENTE || 
            rawReason.toLowerCase().includes('mapa pendente');

        if (isMapaPendente) {
            return (
                <span 
                    className="lab-situation-badge warning" 
                    title="O vínculo com o mapa pendente exige revisão antes da restauração."
                >
                    Mapa pendente
                </span>
            );
        }

        let shortText = rawReason;
        const lowerReason = rawReason.toLowerCase();
        if (lowerReason.includes('revisão')) shortText = 'Exige revisão';
        else if (lowerReason.includes('auditoria')) shortText = 'Auditoria incompleta';
        else if (lowerReason.includes('valores preenchidos')) shortText = 'Valores preenchidos';
        else if (lowerReason.includes('inativo')) shortText = 'Exame inativo';
        else if (lowerReason.includes('incompatível')) shortText = 'Status incompatível';

        return (
            <span 
                className="lab-situation-badge blocked" 
                title={rawReason}
            >
                {shortText}
            </span>
        );
    };

    const pacienteNome = attendance.pacienteNome || attendance.full_name || 'Não informado';
    const pacienteCodigo = attendance.pacienteCodigo || attendance.code || '---';
    const protocolo = attendance.protocol_number || '---';
    const dataAtendimento = attendance.attendance_date ? formatarData(attendance.attendance_date) : 'Não informada';
    const origemAtendimento = formatAttendanceOrigin(attendance.attendance_origin) || attendance.attendance_origin || 'Não informada';
    const hasCancelled = cancelledExams.length > 0;

    return (
        <div className="lab-gerenciar-modal-overlay" onClick={(isAdding || isCancelling || isRestoring) ? undefined : onClose}>
            <div 
                className="lab-gerenciar-modal-container" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="lab-gerenciar-modal-header">
                    <div className="lab-gerenciar-header-top">
                        <h2 className="lab-gerenciar-header-title">
                            <Layers size={20} />
                            <span>Gerenciar exames</span>
                        </h2>
                        <button 
                            type="button" 
                            className="lab-gerenciar-close-btn" 
                            onClick={(isAdding || isCancelling || isRestoring) ? undefined : onClose}
                            disabled={isAdding || isCancelling || isRestoring}
                            title="Fechar modal (Esc)"
                            aria-label="Fechar modal"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Dados do Atendimento */}
                    <div className="lab-gerenciar-patient-bar">
                        <div className="lab-gerenciar-patient-item highlight" title={pacienteNome}>
                            <span className="lab-gerenciar-patient-label">Paciente:</span>
                            <span className="lab-gerenciar-patient-name">{pacienteNome}</span>
                        </div>
                        <div className="lab-gerenciar-patient-item">
                            <span className="lab-gerenciar-patient-label">Cód.:</span>
                            <span className="lab-gerenciar-patient-val">{pacienteCodigo}</span>
                        </div>
                        <div className="lab-gerenciar-patient-item">
                            <span className="lab-gerenciar-patient-label">Protocolo:</span>
                            <span className="lab-gerenciar-patient-val">{protocolo}</span>
                        </div>
                        <div className="lab-gerenciar-patient-item">
                            <span className="lab-gerenciar-patient-label">Data:</span>
                            <span className="lab-gerenciar-patient-val">{dataAtendimento}</span>
                        </div>
                        <div className="lab-gerenciar-patient-item">
                            <span className="lab-gerenciar-patient-label">Origem:</span>
                            <span className="lab-gerenciar-patient-val">{origemAtendimento}</span>
                        </div>
                    </div>
                </div>

                {/* Contadores Compactos */}
                {!loading && !error && (
                    <div className="lab-gerenciar-counters">
                        <div className="lab-gerenciar-counter-card active" title={`${counts.active} exames ativos`}>
                            <span>Ativos</span>
                            <span className="lab-gerenciar-counter-badge">{counts.active}</span>
                        </div>
                        <div className="lab-gerenciar-counter-card cancelled" title={`${counts.cancelled} exames cancelados`}>
                            <span>Cancelados</span>
                            <span className="lab-gerenciar-counter-badge">{counts.cancelled}</span>
                        </div>
                        {counts.legacyIssues > 0 && (
                            <div className="lab-gerenciar-counter-card legacy" title={`${counts.legacyIssues} registros para revisão`}>
                                <span>Revisão</span>
                                <span className="lab-gerenciar-counter-badge">{counts.legacyIssues}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Corpo do Modal */}
                <div className="lab-gerenciar-modal-body">
                    {/* Loading State */}
                    {loading && (
                        <div className="lab-gerenciar-state-box">
                            <Loader2 className="animate-spin" size={28} color="#3b82f6" />
                            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                                Carregando exames do atendimento...
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="lab-gerenciar-error-box">
                            <AlertCircle size={32} color="#dc2626" />
                            <h3 className="lab-gerenciar-error-title">Erro ao carregar exames</h3>
                            <p className="lab-gerenciar-error-msg">{error}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <button 
                                    type="button" 
                                    className="lab-btn lab-btn-outline" 
                                    onClick={onClose}
                                    style={{ borderColor: '#fca5a5', color: '#991b1b', height: '30px', padding: '0 0.75rem', fontSize: '0.8rem' }}
                                >
                                    Fechar
                                </button>
                                <button 
                                    type="button" 
                                    className="lab-btn lab-btn-primary" 
                                    onClick={carregarDados}
                                    style={{ background: '#dc2626', borderColor: '#dc2626', height: '30px', padding: '0 0.75rem', fontSize: '0.8rem' }}
                                >
                                    <RotateCcw size={14} />
                                    Tentar novamente
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    {!loading && !error && (
                        <>
                            {/* Feedback de Sucesso Global */}
                            {successFeedback && (
                                <div className="lab-gerenciar-banner success">
                                    <CheckCircle2 size={16} />
                                    <span>{successFeedback}</span>
                                </div>
                            )}

                            {/* SEÇÃO 0: Adicionar Exames (Recolhível) */}
                            <div className="lab-gerenciar-section lab-gerenciar-add-section">
                                <div 
                                    className="lab-gerenciar-section-header"
                                    onClick={() => setShowAddSection(!showAddSection)}
                                    title={showAddSection ? "Clique para recolher a seção Adicionar exames" : "Clique para expandir a seção Adicionar exames"}
                                >
                                    <h3 className="lab-gerenciar-section-title">
                                        {showAddSection ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <PlusCircle size={15} color="#3b82f6" />
                                        <span>Adicionar exames</span>
                                        {!showAddSection && selectedExams.length > 0 && (
                                            <span className="lab-gerenciar-counter-badge" style={{ marginLeft: '0.35rem' }}>
                                                {selectedExams.length} selecionado(s)
                                            </span>
                                        )}
                                    </h3>
                                    <span className="lab-gerenciar-toggle-text">
                                        {showAddSection ? 'Recolher' : 'Expandir'}
                                    </span>
                                </div>

                                {showAddSection && (
                                    <div className="lab-gerenciar-section-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                        
                                        {/* Feedback de Erro na Inclusão */}
                                        {addError && (
                                            <div className="lab-gerenciar-banner error">
                                                <AlertCircle size={16} />
                                                <span>{addError}</span>
                                            </div>
                                        )}

                                        {/* Campo de Busca Rápida */}
                                        <div className="lab-gerenciar-search-container">
                                            <div className="lab-gerenciar-search-box">
                                                <Search size={15} className="lab-gerenciar-search-icon" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    className="lab-gerenciar-search-input"
                                                    placeholder="Buscar exame por código ou nome..."
                                                    value={searchInput}
                                                    onChange={handleSearchChange}
                                                    onKeyDown={handleSearchKeyDown}
                                                    disabled={isAdding}
                                                    aria-label="Buscar exames por código ou nome"
                                                    aria-expanded={suggestions.length > 0}
                                                    aria-autocomplete="list"
                                                    role="combobox"
                                                />
                                                {searchInput && (
                                                    <button
                                                        type="button"
                                                        className="lab-gerenciar-search-clear"
                                                        onClick={() => {
                                                            setSearchInput('');
                                                            setSuggestions([]);
                                                            setHighlightedIndex(-1);
                                                            if (searchInputRef.current) searchInputRef.current.focus();
                                                        }}
                                                        disabled={isAdding}
                                                        aria-label="Limpar busca"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Dropdown de Sugestões */}
                                            {suggestions.length > 0 && (
                                                <ul 
                                                    className="lab-gerenciar-suggestions-list"
                                                    role="listbox"
                                                >
                                                    {suggestions.map((exam, idx) => {
                                                        const isAvailable = exam.availability?.available;
                                                        const isHighlighted = idx === highlightedIndex;

                                                        return (
                                                            <li
                                                                key={exam.id}
                                                                role="option"
                                                                aria-selected={isHighlighted}
                                                                aria-disabled={!isAvailable}
                                                                className={`lab-gerenciar-suggestion-item ${!isAvailable ? 'disabled' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                                                                onClick={() => isAvailable && handleSelectExam(exam)}
                                                                onMouseEnter={() => setHighlightedIndex(idx)}
                                                            >
                                                                <div className="lab-suggestion-main">
                                                                    <span className="lab-code-badge">{exam.code || '---'}</span>
                                                                    <span className="lab-suggestion-name">{exam.name}</span>
                                                                    <span className="lab-suggestion-sector">{exam.sectorName || exam.sectorCode || 'Sem setor'}</span>
                                                                </div>
                                                                <div className="lab-suggestion-status">
                                                                    <span className={`lab-suggestion-badge ${exam.availability?.type || 'available'}`}>
                                                                        {exam.availability?.label || 'Disponível'}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>

                                        {/* Lista de Exames Selecionados Temporariamente */}
                                        <div className="lab-gerenciar-selected-wrapper">
                                            <div className="lab-gerenciar-selected-header">
                                                <span className="lab-gerenciar-selected-title">
                                                    Exames selecionados ({selectedExams.length})
                                                </span>
                                                {selectedExams.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="lab-gerenciar-btn-clear-all"
                                                        onClick={() => {
                                                            if (!isAdding) setSelectedExams([]);
                                                        }}
                                                        disabled={isAdding}
                                                        aria-label="Limpar todos os exames selecionados"
                                                    >
                                                        Limpar lista
                                                    </button>
                                                )}
                                            </div>

                                            {selectedExams.length === 0 ? (
                                                <div className="lab-gerenciar-selected-empty">
                                                    Nenhum exame selecionado.
                                                </div>
                                            ) : (
                                                <div className="lab-gerenciar-selected-chips">
                                                    {selectedExams.map((ex) => (
                                                        <div key={ex.id} className="lab-gerenciar-chip">
                                                            <span className="lab-code-badge">{ex.code || '---'}</span>
                                                            <span className="lab-chip-name">{ex.name}</span>
                                                            <span className="lab-chip-sector">{ex.sectorName || ex.sectorCode || '---'}</span>
                                                            <button
                                                                type="button"
                                                                className="lab-chip-remove"
                                                                onClick={() => handleRemoveSelectedExam(ex.id)}
                                                                disabled={isAdding || isCancelling}
                                                                aria-label={`Remover exame ${ex.name} da seleção`}
                                                                title="Remover da seleção"
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Botão de Adicionar */}
                                        <div className="lab-gerenciar-add-footer">
                                            <button
                                                type="button"
                                                className="lab-btn lab-btn-primary lab-gerenciar-btn-add"
                                                onClick={handleAdicionarExames}
                                                disabled={selectedExams.length === 0 || isAdding || isCancelling || loading || !attendanceId}
                                            >
                                                {isAdding ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={14} />
                                                        <span>Adicionando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PlusCircle size={14} />
                                                        <span>Adicionar exames {selectedExams.length > 0 ? `(${selectedExams.length})` : ''}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                    </div>
                                )}
                            </div>

                            {/* SEÇÃO 1: Exames Atuais */}
                            <div className="lab-gerenciar-section">
                                <div className="lab-gerenciar-section-header" style={{ cursor: 'default' }}>
                                    <h3 className="lab-gerenciar-section-title">
                                        <CheckCircle2 size={16} color="#059669" />
                                        <span>Exames atuais ({activeExams.length})</span>
                                    </h3>
                                </div>
                                <div className="lab-gerenciar-section-content">
                                    {activeExams.length === 0 ? (
                                        <div className="lab-gerenciar-empty">
                                            Nenhum exame ativo neste atendimento.
                                        </div>
                                    ) : (
                                        <div className="lab-gerenciar-table-container">
                                            <table className="lab-gerenciar-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '85px' }}>Código</th>
                                                        <th>Exame</th>
                                                        <th style={{ width: '120px' }}>Setor</th>
                                                        <th style={{ width: '105px' }}>Status</th>
                                                        <th style={{ width: '125px' }}>Mapa</th>
                                                        <th style={{ width: '130px', textAlign: 'center' }}>Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activeExams.map((exam) => (
                                                        <tr key={exam.attendanceExamId}>
                                                            <td>
                                                                <span className="lab-code-badge">
                                                                    {exam.examCode || '---'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <strong style={{ color: '#0f172a' }}>
                                                                    {exam.examName || '---'}
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                <span style={{ color: '#475569' }}>
                                                                    {exam.sectorName || exam.sectorCode || 'Não inf.'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {renderStatusBadge(exam.resultStatus || exam.requestStatus)}
                                                            </td>
                                                            <td>
                                                                {renderMapBadge(exam.mapStatus)}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {renderCancelSituation(exam)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SEÇÃO 2: Exames Cancelados (Recolhida por padrão) */}
                            <div className="lab-gerenciar-section">
                                <div 
                                    className={`lab-gerenciar-section-header ${!hasCancelled ? 'disabled-header' : ''}`}
                                    onClick={hasCancelled ? () => setShowCancelled(!showCancelled) : undefined}
                                    title={hasCancelled ? "Clique para expandir/recolher exames cancelados" : undefined}
                                    style={!hasCancelled ? { cursor: 'default' } : undefined}
                                >
                                    <h3 className="lab-gerenciar-section-title">
                                        {hasCancelled && (showCancelled ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                                        <Ban size={15} color={hasCancelled ? "#dc2626" : "#94a3b8"} />
                                        <span>Exames cancelados ({cancelledExams.length})</span>
                                    </h3>
                                    {hasCancelled && (
                                        <span className="lab-gerenciar-toggle-text">
                                            {showCancelled ? 'Recolher' : 'Expandir'}
                                        </span>
                                    )}
                                </div>
                                {hasCancelled && showCancelled && (
                                    <div className="lab-gerenciar-section-content">
                                        <div className="lab-gerenciar-table-container">
                                            <table className="lab-gerenciar-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '85px' }}>Código</th>
                                                        <th>Exame</th>
                                                        <th style={{ width: '115px' }}>Setor</th>
                                                        <th style={{ minWidth: '140px' }}>Motivo</th>
                                                        <th style={{ width: '130px' }}>Data Canc.</th>
                                                        <th style={{ width: '120px' }}>Mapa</th>
                                                        <th style={{ width: '130px', textAlign: 'center' }}>Restauração</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {cancelledExams.map((exam) => (
                                                        <tr key={exam.attendanceExamId}>
                                                            <td>
                                                                <span className="lab-code-badge">
                                                                    {exam.examCode || '---'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <strong style={{ color: '#0f172a' }}>
                                                                    {exam.examName || '---'}
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                <span style={{ color: '#475569' }}>
                                                                    {exam.sectorName || exam.sectorCode || 'Não inf.'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span style={{ color: '#991b1b', fontSize: '0.78rem' }}>
                                                                    {exam.cancellationReason || 'Não informado'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span style={{ color: '#64748b', fontSize: '0.76rem' }}>
                                                                    {formatarData(exam.cancelledAt)}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {renderMapBadge(exam.mapStatus)}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {renderRestoreSituation(exam)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SEÇÃO 3: Registros Antigos para Revisão (Somente se houver) */}
                            {legacyIssues.length > 0 && (
                                <div className="lab-gerenciar-section legacy-section">
                                    <div 
                                        className="lab-gerenciar-section-header"
                                        onClick={() => setShowLegacy(!showLegacy)}
                                        title="Clique para expandir/recolher registros para revisão"
                                    >
                                        <h3 className="lab-gerenciar-section-title">
                                            {showLegacy ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            <AlertTriangle size={15} color="#d97706" />
                                            <span>Registros antigos para revisão ({legacyIssues.length})</span>
                                            <span className="lab-legacy-badge">Revisão Necessária</span>
                                        </h3>
                                        <span className="lab-gerenciar-toggle-text">
                                            {showLegacy ? 'Recolher' : 'Expandir'}
                                        </span>
                                    </div>
                                    {showLegacy && (
                                        <div className="lab-gerenciar-section-content">
                                            <div className="lab-gerenciar-table-container">
                                                <table className="lab-gerenciar-table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '85px' }}>Código</th>
                                                            <th>Exame</th>
                                                            <th style={{ width: '120px' }}>Status Solicitação</th>
                                                            <th style={{ width: '120px' }}>Status Resultado</th>
                                                            <th style={{ minWidth: '220px' }}>Inconsistência</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {legacyIssues.map((exam) => (
                                                            <tr key={exam.attendanceExamId}>
                                                                <td>
                                                                    <span className="lab-code-badge">
                                                                        {exam.examCode || '---'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <strong style={{ color: '#0f172a' }}>
                                                                        {exam.examName || '---'}
                                                                    </strong>
                                                                </td>
                                                                <td>
                                                                    {renderStatusBadge(exam.requestStatus)}
                                                                </td>
                                                                <td>
                                                                    {renderStatusBadge(exam.resultStatus || 'Sem resultado')}
                                                                </td>
                                                                <td>
                                                                    <span 
                                                                        className="lab-situation-badge warning"
                                                                        title={exam.issueReason}
                                                                    >
                                                                        <AlertTriangle size={12} />
                                                                        {exam.issueReason}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="lab-gerenciar-modal-footer">
                    <button 
                        type="button" 
                        className="lab-gerenciar-btn-close" 
                        onClick={(isAdding || isCancelling || isRestoring) ? undefined : onClose}
                        disabled={isAdding || isCancelling || isRestoring}
                    >
                        Fechar
                    </button>
                </div>

                {/* Diálogo de Confirmação de Cancelamento de Exame */}
                {cancellingExam && (
                    <div 
                        className="lab-gerenciar-confirm-overlay"
                        onClick={isCancelling ? undefined : handleCloseCancelConfirmation}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cancel-dialog-title"
                    >
                        <div 
                            className="lab-gerenciar-confirm-card"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="lab-gerenciar-confirm-header">
                                <div className="lab-gerenciar-confirm-title-box">
                                    <AlertTriangle size={18} className="lab-cancel-warning-icon" />
                                    <h3 id="cancel-dialog-title" className="lab-gerenciar-confirm-title">
                                        Cancelar exame
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    className="lab-gerenciar-confirm-close-btn"
                                    onClick={handleCloseCancelConfirmation}
                                    disabled={isCancelling}
                                    aria-label="Fechar confirmação"
                                    title="Voltar"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="lab-gerenciar-confirm-body">
                                <p className="lab-gerenciar-confirm-target">
                                    Cancelar <strong>{cancellingExam.examCode || '---'} — {cancellingExam.examName || '---'}</strong>?
                                </p>

                                <div className="lab-gerenciar-confirm-notes">
                                    <p>• O exame será retirado da lista ativa deste atendimento.</p>
                                    <p>• O registro e o histórico serão preservados.</p>
                                </div>

                                {cancellingExam.mapStatus === MAP_STATUS.MAPA_IMPRESSO && (
                                    <div className="lab-gerenciar-confirm-map-alert">
                                        <Info size={15} className="lab-confirm-map-icon" />
                                        <div>
                                            Este exame consta em um mapa já impresso. O documento histórico será preservado.
                                        </div>
                                    </div>
                                )}

                                {cancelError && (
                                    <div className="lab-gerenciar-banner error" style={{ marginTop: '0.45rem' }}>
                                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                                        <div>
                                            <span>{cancelError}</span>
                                            {cancelHint && (
                                                <div style={{ fontSize: '0.72rem', marginTop: '2px', opacity: 0.9 }}>
                                                    Orientação: {cancelHint}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="lab-gerenciar-form-group" style={{ marginTop: '0.6rem' }}>
                                    <label htmlFor="cancel-exam-reason-input" className="lab-gerenciar-label">
                                        Motivo do cancelamento <span className="lab-required">*</span>
                                    </label>
                                    <textarea
                                        id="cancel-exam-reason-input"
                                        ref={cancelReasonRef}
                                        className="lab-gerenciar-textarea"
                                        rows={3}
                                        placeholder="Informe por que este exame está sendo cancelado..."
                                        value={cancelReason}
                                        onChange={(e) => {
                                            setCancelReason(e.target.value);
                                            if (cancelError) setCancelError(null);
                                        }}
                                        disabled={isCancelling}
                                        maxLength={500}
                                    />
                                    <div className="lab-gerenciar-char-counter">
                                        <span className={cancelReason.trim().length > 0 && cancelReason.trim().length < 5 ? 'char-warning' : ''}>
                                            {cancelReason.length}/500 caracteres (mínimo 5)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="lab-gerenciar-confirm-footer">
                                <button
                                    type="button"
                                    className="lab-btn lab-btn-secondary"
                                    onClick={handleCloseCancelConfirmation}
                                    disabled={isCancelling}
                                >
                                    Voltar
                                </button>
                                <button
                                    type="button"
                                    className="lab-btn lab-btn-danger"
                                    onClick={handleConfirmCancelExam}
                                    disabled={isCancelling || cancelReason.trim().length < 5 || cancelReason.trim().length > 500}
                                >
                                    {isCancelling ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} />
                                            <span>Cancelando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Ban size={14} />
                                            <span>Confirmar cancelamento</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Diálogo de Confirmação de Restauração de Exame */}
                {restoringExam && (
                    <div 
                        className="lab-gerenciar-confirm-overlay"
                        onClick={isRestoring ? undefined : handleCloseRestoreConfirmation}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="restore-dialog-title"
                    >
                        <div 
                            className="lab-gerenciar-confirm-card"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="lab-gerenciar-confirm-header restore-header">
                                <div className="lab-gerenciar-confirm-title-box">
                                    <RotateCcw size={18} className="lab-restore-title-icon" />
                                    <h3 id="restore-dialog-title" className="lab-gerenciar-confirm-title restore-title">
                                        Restaurar exame
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    className="lab-gerenciar-confirm-close-btn restore-close"
                                    onClick={handleCloseRestoreConfirmation}
                                    disabled={isRestoring}
                                    aria-label="Fechar confirmação"
                                    title="Voltar"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="lab-gerenciar-confirm-body">
                                <p className="lab-gerenciar-confirm-target">
                                    Restaurar <strong>{restoringExam.examCode || '---'} — {restoringExam.examName || '---'}</strong>?
                                </p>

                                <p className="lab-gerenciar-confirm-desc">
                                    O exame voltará ao status <strong>PENDENTE</strong> e ficará novamente disponível para lançamento de resultado.
                                </p>

                                <div className="lab-gerenciar-confirm-notes">
                                    <p>• A solicitação original será reutilizada.</p>
                                    <p>• O histórico do cancelamento será preservado.</p>
                                    <p>• Nenhum novo exame será criado.</p>
                                </div>

                                {restoringExam.mapStatus === MAP_STATUS.MAPA_IMPRESSO && (
                                    <div className="lab-gerenciar-confirm-map-alert">
                                        <Info size={15} className="lab-confirm-map-icon" />
                                        <div>
                                            Este exame consta em um mapa já impresso. O documento histórico não será alterado.
                                        </div>
                                    </div>
                                )}

                                {restoreError && (
                                    <div className="lab-gerenciar-banner error" style={{ marginTop: '0.45rem' }}>
                                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                                        <div>
                                            <span>{restoreError}</span>
                                            {restoreHint && (
                                                <div style={{ fontSize: '0.72rem', marginTop: '2px', opacity: 0.9 }}>
                                                    Orientação: {restoreHint}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="lab-gerenciar-confirm-footer">
                                <button
                                    type="button"
                                    className="lab-btn lab-btn-secondary"
                                    onClick={handleCloseRestoreConfirmation}
                                    disabled={isRestoring}
                                >
                                    Voltar
                                </button>
                                <button
                                    type="button"
                                    className="lab-btn lab-btn-success"
                                    onClick={handleConfirmRestoreExam}
                                    disabled={isRestoring}
                                    autoFocus
                                >
                                    {isRestoring ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} />
                                            <span>Restaurando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw size={14} />
                                            <span>Confirmar restauração</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LaboratorioGerenciarExamesModal;
