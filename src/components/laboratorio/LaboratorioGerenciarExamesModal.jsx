import React, { useState, useEffect, useCallback } from 'react';
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
    Printer
} from 'lucide-react';
import { 
    laboratorioGerenciarExamesService, 
    MAP_STATUS 
} from '../../services/api/laboratorioGerenciarExames.service';
import { formatAttendanceOrigin } from '../../utils/laboratorioHelpers';
import './LaboratorioGerenciarExamesModal.css';

/**
 * Modal somente leitura para Gerenciamento de Exames do Atendimento.
 * Permite visualizar exames ativos, exames cancelados e inconsistências legadas.
 */
const LaboratorioGerenciarExamesModal = ({
    isOpen,
    attendanceId,
    tenantId,
    attendance = {},
    onClose
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeExams, setActiveExams] = useState([]);
    const [cancelledExams, setCancelledExams] = useState([]);
    const [legacyIssues, setLegacyIssues] = useState([]);
    const [counts, setCounts] = useState({ active: 0, cancelled: 0, legacyIssues: 0 });
    const [showCancelled, setShowCancelled] = useState(false);
    const [showLegacy, setShowLegacy] = useState(false);

    const carregarDados = useCallback(async () => {
        if (!attendanceId || !tenantId) {
            setError('Identificador do atendimento ou do tenant não informado.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const data = await laboratorioGerenciarExamesService.listarExamesDoAtendimento(
                attendanceId,
                tenantId
            );

            setActiveExams(data.activeExams || []);
            setCancelledExams(data.cancelledExams || []);
            setLegacyIssues(data.legacyIssues || []);
            setCounts(data.counts || {
                active: (data.activeExams || []).length,
                cancelled: (data.cancelledExams || []).length,
                legacyIssues: (data.legacyIssues || []).length,
            });
        } catch (err) {
            console.error('[LaboratorioGerenciarExamesModal] Erro ao listar exames:', err);
            setError(err.message || 'Falha ao consultar exames do atendimento.');
        } finally {
            setLoading(false);
        }
    }, [attendanceId, tenantId]);

    useEffect(() => {
        if (isOpen) {
            setShowCancelled(false);
            setShowLegacy(false);
            carregarDados();
        } else {
            setActiveExams([]);
            setCancelledExams([]);
            setLegacyIssues([]);
            setCounts({ active: 0, cancelled: 0, legacyIssues: 0 });
            setError(null);
        }
    }, [isOpen, carregarDados]);

    // Fechar ao pressionar ESC
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

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
            return (
                <span className="lab-situation-badge allowed" title="Exame atende a todos os critérios para cancelamento">
                    <CheckCircle2 size={12} />
                    Disponível
                </span>
            );
        }

        const isMapaPendente = exam.mapStatus === MAP_STATUS.MAPA_PENDENTE || 
            (exam.cancelBlockedReason && exam.cancelBlockedReason.toLowerCase().includes('mapa pendente'));

        if (isMapaPendente) {
            return (
                <span 
                    className="lab-situation-badge blocked" 
                    title="Cancele primeiro o lote pendente na página Mapas."
                >
                    <Ban size={12} />
                    Bloqueado — mapa pendente
                </span>
            );
        }

        return (
            <span 
                className="lab-situation-badge blocked" 
                title={exam.cancelBlockedReason || 'Cancelamento bloqueado'}
            >
                <Ban size={12} />
                {exam.cancelBlockedReason || 'Bloqueado'}
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
        <div className="lab-gerenciar-modal-overlay" onClick={onClose}>
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
                            onClick={onClose}
                            title="Fechar modal (Esc)"
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
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="lab-gerenciar-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '85px' }}>Código</th>
                                                        <th>Exame</th>
                                                        <th style={{ width: '120px' }}>Setor</th>
                                                        <th style={{ width: '105px' }}>Status</th>
                                                        <th style={{ width: '125px' }}>Mapa</th>
                                                        <th style={{ minWidth: '180px' }}>Cancelamento</th>
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
                                                            <td>
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
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="lab-gerenciar-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '85px' }}>Código</th>
                                                        <th>Exame</th>
                                                        <th style={{ width: '115px' }}>Setor</th>
                                                        <th style={{ minWidth: '140px' }}>Motivo</th>
                                                        <th style={{ width: '130px' }}>Data Canc.</th>
                                                        <th style={{ width: '120px' }}>Mapa</th>
                                                        <th style={{ minWidth: '160px' }}>Restauração</th>
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
                                                            <td>
                                                                {exam.canRestore ? (
                                                                    <span className="lab-situation-badge allowed" title="Exame apto para restauração">
                                                                        <CheckCircle2 size={12} />
                                                                        Disponível
                                                                    </span>
                                                                ) : (
                                                                    <span 
                                                                        className="lab-situation-badge blocked"
                                                                        title={exam.restoreBlockedReason || 'Restauração bloqueada'}
                                                                    >
                                                                        <Ban size={12} />
                                                                        {exam.restoreBlockedReason || 'Bloqueado'}
                                                                    </span>
                                                                )}
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
                                            <div style={{ overflowX: 'auto' }}>
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
                        onClick={onClose}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LaboratorioGerenciarExamesModal;
