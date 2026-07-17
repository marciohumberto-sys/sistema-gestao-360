const fs = require('fs');
const jsxPath = 'src/pages/laboratorio/LaboratorioConferencia.jsx';

const originalContent = `import React, { useState, useEffect } from 'react';
import { formatCpf } from '../../utils/formatters';
import { 
    CheckCircle2, AlertTriangle, XCircle, Search, RefreshCw, 
    Activity, Clock, ShieldCheck, User, Eye, 
    ChevronLeft, ChevronRight, Info, ListChecks, Loader2
} from 'lucide-react';
import './LaboratorioConferencia.css';
import { laboratorioConferenciaService } from '../../services/api/laboratorioConferencia.service';
import { ATTENDANCE_ORIGINS, formatAttendanceOrigin } from '../../utils/laboratorioHelpers';

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return \`\${year}-\${month}-\${day}\`;
};

const LaboratorioConferencia = () => {
    const [searchFilters, setSearchFilters] = useState({
        date: '',
        protocol: '',
        patient: '',
        exam: '',
        attendance_origin: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    
    const [selectedExam, setSelectedExam] = useState(null);
    const [examDetails, setExamDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    const [saving, setSaving] = useState(false);
    const [returning, setReturning] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');

    // Initial load
    useEffect(() => {
        handleSearch();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showConfirmModal && !saving) setShowConfirmModal(false);
                if (showReturnModal && !returning) setShowReturnModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showConfirmModal, showReturnModal, saving, returning]);

    const handleFilterKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSearch();
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

    const handleConfirmar = () => {
        if (!selectedExam || saving || returning) return;
        setShowConfirmModal(true);
    };

    const confirmConferenceAction = async () => {
        try {
            setSaving(true);
            await laboratorioConferenciaService.confirmarConferencia(selectedExam.id);
            setFeedbackMsg({ type: 'success', text: 'Exame conferido com sucesso.' });
            
            setSearchResults(prev => prev.filter(ex => ex.id !== selectedExam.id));
            setSelectedExam(null);
            setExamDetails([]);
            setShowConfirmModal(false);

            setTimeout(() => {
                setFeedbackMsg(null);
            }, 3000);
        } catch (error) {
            console.error('Erro ao confirmar', error);
            setFeedbackMsg({ type: 'error', text: 'Não foi possível confirmar a conferência deste exame.' });
            setTimeout(() => setFeedbackMsg(null), 4000);
        } finally {
            setSaving(false);
        }
    };

    const handleDevolver = () => {
        if (!selectedExam || saving || returning) return;
        setReturnReason('');
        setShowReturnModal(true);
    };

    const confirmDevolverAction = async () => {
        if (!returnReason || returnReason.trim().length === 0) return;
        try {
            setReturning(true);
            await laboratorioConferenciaService.devolverExame(selectedExam.id, returnReason);
            setFeedbackMsg({ type: 'success', text: 'Exame devolvido para correção.' });
            
            setSearchResults(prev => prev.filter(ex => ex.id !== selectedExam.id));
            setSelectedExam(null);
            setExamDetails([]);
            setShowReturnModal(false);

            setTimeout(() => {
                setFeedbackMsg(null);
            }, 3000);
        } catch (error) {
            console.error('Erro ao devolver', error);
            setFeedbackMsg({ type: 'error', text: 'Não foi possível devolver o exame para correção.' });
            setTimeout(() => setFeedbackMsg(null), 4000);
        } finally {
            setReturning(false);
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
                            position: 'absolute', top: '50%', right: '100%', 
                            transform: 'translateY(-50%)', marginRight: '1rem',
                            background: feedbackMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                            color: feedbackMsg.type === 'success' ? '#047857' : '#b91c1c',
                            border: \`1px solid \${feedbackMsg.type === 'success' ? '#10b981' : '#ef4444'}\`,
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            fontWeight: '600', fontSize: '0.85rem', zIndex: 10,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            {feedbackMsg.text}
                        </div>
                    )}
                    <button className="lab-btn lab-btn-outline" onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 
                        Atualizar lista
                    </button>
                </div>
            </header>

            {/* Filtros */}
            <div className={\`lab-card lab-filters-card \${selectedExam ? 'compact' : ''}\`}>
                <div className="lab-filters-grid">
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
                        <label>Protocolo</label>
                        <input 
                            type="text" 
                            placeholder="Buscar por protocolo..."
                            value={searchFilters.protocol}
                            onChange={(e) => setSearchFilters({...searchFilters, protocol: e.target.value})}
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
                        <label>Exame</label>
                        <input 
                            type="text" 
                            placeholder="Código ou nome..."
                            value={searchFilters.exam}
                            onChange={(e) => setSearchFilters({...searchFilters, exam: e.target.value})}
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
                        <button className="lab-btn lab-btn-primary" onClick={handleSearch} disabled={loading}>
                            {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                            Buscar
                        </button>
                    </div>
                </div>
            </div>

            {/* Layout Principal */}
            <div className="lab-conf-layout">
                
                {/* Coluna Esquerda: Fila */}
                <div className="lab-conf-sidebar">
                    <div className="lab-card lab-queue-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><Clock size={18} /> Resultados Encontrados</h3>
                            <span className="lab-badge lab-badge-primary">{searchResults.length} registros</span>
                        </div>
                        <div className="lab-queue-list">
                            {searchResults.length === 0 && !loading && (
                                <div className="text-center p-4 text-gray-500 text-sm">
                                    Nenhum exame encontrado com os filtros atuais.
                                </div>
                            )}
                            {searchResults.map((item) => (
                                <div 
                                    key={item.id} 
                                    className={\`lab-queue-item \${selectedExam?.id === item.id ? 'active' : ''}\`}
                                    onClick={() => handleSelectExam(item)}
                                >
                                    <div className="lab-qi-header">
                                        <span className="font-bold text-gray-900">{item.protocolo}</span>
                                        <span className="text-gray-500 text-sm">{item.dataAtendimento}</span>
                                    </div>
                                    <div className="lab-qi-name font-semibold text-primary">{item.pacienteNome}</div>
                                    <div className="lab-qi-meta mt-1">
                                        <span className="font-medium text-gray-800 text-sm">{item.exameCodigo} — {item.exameNome}</span>
                                    </div>
                                    <div className="lab-qi-meta mt-1">
                                        <span className="text-gray-500 text-xs">{item.parametros} parâmetros</span>
                                    </div>
                                    <div className="lab-qi-status mt-2">
                                        <span className={\`lab-badge \${item.status === 'CONFERIDO' ? 'lab-badge-success' : 'lab-badge-success'}\`}>{item.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Painel de Revisão */}
                <div className="lab-conf-main">
                    
                    {!selectedExam && (
                        <div className="lab-card flex flex-col items-center justify-center p-8 text-center h-full" style={{ minHeight: '400px' }}>
                            <Activity size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700">Nenhum exame selecionado</h3>
                            <p className="text-gray-500 max-w-md mt-2">
                                Selecione um exame na lista lateral para revisar os valores digitados e realizar a conferência.
                            </p>
                        </div>
                    )}

                    {selectedExam && (
                        <>
                            {/* Resumo do Paciente com Ações Integradas */}
                            <div className="lab-card lab-patient-summary" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={16} className="text-primary" /> Dados do Atendimento
                                    </div>
                                    
                                    <div className="lab-header-actions" style={{ position: 'relative', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {feedbackMsg && (
                                            <div style={{
                                                position: 'absolute', top: '50%', right: '100%', 
                                                transform: 'translateY(-50%)', marginRight: '1rem',
                                                background: feedbackMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                                                color: feedbackMsg.type === 'success' ? '#047857' : '#b91c1c',
                                                border: \`1px solid \${feedbackMsg.type === 'success' ? '#10b981' : '#ef4444'}\`,
                                                padding: '0.4rem 0.8rem', borderRadius: '6px',
                                                fontWeight: '600', fontSize: '0.85rem', zIndex: 10,
                                                whiteSpace: 'nowrap',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                            }}>
                                                {feedbackMsg.text}
                                            </div>
                                        )}
                                        
                                        <button 
                                            className="lab-btn lab-btn-outline" 
                                            onClick={handleDevolver} 
                                            disabled={saving || returning}
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#b91c1c', borderColor: '#fecaca' }}
                                        >
                                            <XCircle size={14} style={{ marginRight: '4px' }} />
                                            Devolver para correção
                                        </button>

                                        <button 
                                            className="lab-btn lab-btn-success" 
                                            onClick={handleConfirmar} 
                                            disabled={saving || returning}
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                        >
                                            <CheckCircle2 size={14} style={{ marginRight: '4px' }} />
                                            Confirmar Conferência
                                        </button>
                                    </div>
                                </div>

                                <div className="lab-patient-summary-grid" style={{ gap: '0.5rem 1.25rem' }}>
                                    <div className="lab-ps-item"><span className="lab-ps-label">Protocolo:</span> <span className="lab-ps-val font-semibold">{selectedExam.protocolo}</span></div>
                                    <div className="lab-ps-item"><span className="lab-ps-label">Paciente:</span> <span className="lab-ps-val font-bold text-primary">{selectedExam.pacienteNome}</span></div>
                                    <div className="lab-ps-item"><span className="lab-ps-label">Idade:</span> <span className="lab-ps-val">{selectedExam.pacienteIdade}</span></div>
                                    <div className="lab-ps-item"><span className="lab-ps-label">Sexo:</span> <span className="lab-ps-val">{selectedExam.pacienteSexo}</span></div>
                                    <div className="lab-ps-item"><span className="lab-ps-label">Origem:</span> <span className="lab-ps-val">{formatAttendanceOrigin(selectedExam.attendance_origin)}</span></div>
                                    <div className="lab-ps-item"><span className="lab-ps-label">CNS:</span> <span className="lab-ps-val">{selectedExam.pacienteCns || '---'}</span></div>
                                    <div className="lab-ps-item"><span className="lab-ps-label">CPF:</span> <span className="lab-ps-val">{formatCpf(selectedExam.pacienteCpf)}</span></div>
                                    <div className="lab-ps-item"><span className="lab-ps-label">Médico:</span> <span className="lab-ps-val">{selectedExam.medico || 'Não informado'}</span></div>
                                </div>
                            </div>

                            {/* Painel do Exame Específico */}
                            <div className="lab-card lab-review-panel">
                                <div className="lab-typing-header">
                                    <div className="lab-typing-title">
                                        <h2>{selectedExam.exameCodigo} — {selectedExam.exameNome}</h2>
                                        <div className="lab-typing-badges">
                                            <span className="lab-badge lab-badge-gray">Material: {selectedExam.exameMaterial || 'Não inf.'}</span>
                                            <span className="lab-badge lab-badge-gray">Método: {selectedExam.exameMetodo || 'Não inf.'}</span>
                                        </div>
                                    </div>
                                    <div className="lab-typing-status">
                                        <span className="lab-status-tag status-success">{selectedExam.status}</span>
                                    </div>
                                </div>

                                <div className="lab-review-body" style={{ padding: '1.5rem', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                                    {loadingDetails ? (
                                        <div className="flex justify-center py-8 text-gray-500">
                                            <Loader2 size={24} className="spin" />
                                            <span className="ml-2">Carregando parâmetros...</span>
                                        </div>
                                    ) : examDetails.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">Nenhum parâmetro encontrado para este exame.</div>
                                    ) : (
                                        <div className="lab-review-params-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {examDetails.map(param => {
                                                const displayValue = param.value_numeric !== null ? param.value_numeric : (param.value_text || 'Não informado');
                                                const abnormalStatus = isAbnormal(param.value_numeric, param.min_value, param.max_value);
                                                
                                                return (
                                                    <div key={param.id} className="lab-card" style={{ padding: '1rem', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                            <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>{param.parameter_name || param.parameter_code}</strong>
                                                            {abnormalStatus === 'below' && <span className="lab-badge lab-badge-danger"><AlertTriangle size={12}/> Abaixo da ref.</span>}
                                                            {abnormalStatus === 'above' && <span className="lab-badge lab-badge-danger"><AlertTriangle size={12}/> Acima da ref.</span>}
                                                            {abnormalStatus === 'normal' && param.min_value !== null && <span className="lab-badge lab-badge-success"><CheckCircle2 size={12}/> Normal</span>}
                                                        </div>
                                                        
                                                        <div className="lab-review-data-row" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                                            <div className="lab-review-result-box" style={{ flex: 1, minWidth: '200px' }}>
                                                                <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Valor Digitado</label>
                                                                <div className="result-display" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                                    <span className={\`result-value \${abnormalStatus !== 'normal' && abnormalStatus !== false ? 'text-danger font-bold' : 'font-semibold'}\`} style={{ fontSize: '1.25rem', color: abnormalStatus !== 'normal' && abnormalStatus !== false ? '#ef4444' : '#0f172a' }}>
                                                                        {displayValue}
                                                                    </span>
                                                                    {param.unit && <span className="result-unit" style={{ color: '#64748b', fontSize: '0.9rem' }}>{param.unit}</span>}
                                                                </div>
                                                                {param.observation && (
                                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                                                                        <strong>Obs:</strong> {param.observation}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="lab-review-ref-box" style={{ flex: 1, minWidth: '200px', borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
                                                                <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Referência</label>
                                                                <div className="ref-line" style={{ marginTop: '0.25rem', color: '#334155', fontSize: '0.9rem' }}>
                                                                    {param.reference_text || (param.min_value !== null || param.max_value !== null ? \`\${param.min_value || 0} a \${param.max_value || '∞'}\` : 'Não cadastrada')}
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
                        </>
                    )}
                </div>
            </div>
            
            {/* Modal Confirmar Conferência */}
            {showConfirmModal && (
                <div className="unsaved-result-modal-overlay" role="dialog" aria-modal="true">
                    <div className="unsaved-result-modal" style={{ maxWidth: '450px' }}>
                        <div className="unsaved-result-modal-header" style={{ paddingBottom: '12px' }}>
                            <div className="unsaved-result-modal-icon" style={{ background: '#d1fae5', color: '#047857' }}>
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h2 className="unsaved-result-modal-title">Confirmar conferência?</h2>
                                <p className="unsaved-result-modal-subtitle">O exame será aprovado e ficará disponível para emissão do laudo.</p>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-body" style={{ paddingLeft: '26px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                                <div><span style={{ color: '#64748b' }}>Protocolo:</span> <strong style={{ color: '#1e293b' }}>{selectedExam?.protocolo}</strong></div>
                                <div><span style={{ color: '#64748b' }}>Paciente:</span> <strong style={{ color: '#1e293b' }}>{selectedExam?.pacienteNome}</strong></div>
                                <div><span style={{ color: '#64748b' }}>Exame:</span> <strong style={{ color: '#1e293b' }}>{selectedExam?.exameNome}</strong></div>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-footer">
                            <button className="unsaved-btn-neutral" onClick={() => setShowConfirmModal(false)} disabled={saving}>Voltar e revisar</button>
                            <button className="lab-btn-success" style={{ height: '46px', padding: '0 20px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={confirmConferenceAction} disabled={saving}>
                                {saving ? <Loader2 size={16} className="spin" style={{ display: 'inline-block', marginRight: '8px' }}/> : null}
                                {saving ? 'Confirmando...' : 'Confirmar conferência'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Devolver para Correção */}
            {showReturnModal && (
                <div className="unsaved-result-modal-overlay" role="dialog" aria-modal="true">
                    <div className="unsaved-result-modal" style={{ maxWidth: '450px' }}>
                        <div className="unsaved-result-modal-header" style={{ paddingBottom: '12px' }}>
                            <div className="unsaved-result-modal-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="unsaved-result-modal-title">Devolver exame para correção</h2>
                                <p className="unsaved-result-modal-subtitle">Informe o motivo da devolução para que o responsável pela digitação possa corrigir o resultado.</p>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-body" style={{ paddingLeft: '26px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Motivo da devolução <span style={{ color: '#ef4444' }}>*</span></label>
                            <textarea 
                                style={{ width: '100%', minHeight: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none', outline: 'none' }}
                                placeholder="Descreva o motivo..."
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value.slice(0, 500))}
                                disabled={returning}
                                autoFocus
                            />
                            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: returnReason.length >= 500 ? '#ef4444' : '#64748b', marginTop: '4px' }}>
                                {returnReason.length}/500
                            </div>
                        </div>
                        <div className="unsaved-result-modal-footer">
                            <button className="unsaved-btn-neutral" onClick={() => setShowReturnModal(false)} disabled={returning}>Cancelar</button>
                            <button className="lab-btn-danger" style={{ height: '46px', padding: '0 20px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: (!returnReason || returnReason.trim().length === 0 || returning) ? 'not-allowed' : 'pointer', opacity: (!returnReason || returnReason.trim().length === 0 || returning) ? 0.5 : 1 }} onClick={confirmDevolverAction} disabled={!returnReason || returnReason.trim().length === 0 || returning}>
                                {returning ? <Loader2 size={16} className="spin" style={{ display: 'inline-block', marginRight: '8px' }}/> : null}
                                {returning ? 'Devolvendo...' : 'Confirmar devolução'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaboratorioConferencia;
`;

fs.writeFileSync(jsxPath, originalContent, 'utf8');
console.log('LaboratorioConferencia.jsx successfully rewritten with correct syntax.');
