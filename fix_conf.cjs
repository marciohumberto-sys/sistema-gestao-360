const fs = require('fs');

// 1. Rewrite laboratorioConferencia.service.js
const srvPath = 'src/services/api/laboratorioConferencia.service.js';
let srv = fs.readFileSync(srvPath, 'utf8');

const srvOldQuery = `                if (!statusFilter || statusFilter === 'TODOS') {
                    query = query.in('status', ['DIGITADO', 'CONFERIDO', 'LIBERADO']);
                } else {
                    query = query.eq('status', statusFilter);
                }`;
srv = srv.replace(srvOldQuery, `                // Apenas DIGITADOS na Conferência
                query = query.eq('status', 'DIGITADO');`);

const srvDevolver = `
    devolverExame: async (resultId, motivo) => {
        try {
            // Fetch current observation
            const { data: curr, error: errCurr } = await supabase
                .from('lab_results')
                .select('general_observation')
                .eq('id', resultId)
                .single();
                
            if (errCurr) throw errCurr;
            
            let obs = curr.general_observation || '';
            if (motivo) {
                const prefix = obs ? obs + '\\n\\n' : '';
                obs = prefix + '[Devolvido para correção]: ' + motivo;
            }

            const { data, error } = await supabase
                .from('lab_results')
                .update({ 
                    status: 'PENDENTE',
                    general_observation: obs,
                    updated_at: new Date().toISOString()
                })
                .eq('id', resultId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao devolver exame:', error);
            throw error;
        }
    },
`;

if (!srv.includes('devolverExame:')) {
    srv = srv.replace(/confirmarConferencia: async \(\w+\) => \{[\s\S]*?\}\n\};/g, (match) => {
        return match.replace('};', '},\n' + srvDevolver + '};');
    });
    fs.writeFileSync(srvPath, srv, 'utf8');
}


// 2. Rewrite LaboratorioConferencia.jsx
const jsxPath = 'src/pages/laboratorio/LaboratorioConferencia.jsx';
let jsx = fs.readFileSync(jsxPath, 'utf8');

// Add states for Modals
const oldStates = `const [saving, setSaving] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);`;
const newStates = `const [saving, setSaving] = useState(false);
    const [returning, setReturning] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');`;
jsx = jsx.replace(oldStates, newStates);

// Remove status from searchFilters
jsx = jsx.replace(/status: 'DIGITADO',?\s*/, '');
// Remove Status Filter Dropdown
const statusDropdownRegex = /<div className="lab-filter-item lab-filter-group">\s*<label>Status<\/label>\s*<select[\s\S]*?<\/select>\s*<\/div>/;
jsx = jsx.replace(statusDropdownRegex, '');

// Adjust handleConfirmar to show modal first
const handleConfirmarOld = /const handleConfirmar = async \(\) => \{[\s\S]*?finally \{\n\s*setSaving\(false\);\n\s*\}\n\s*\};/;
const handleConfirmarNew = `const handleConfirmar = () => {
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
    };`;
jsx = jsx.replace(handleConfirmarOld, handleConfirmarNew);

// Add Esc key listener for Modals
const useEff = `    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showConfirmModal && !saving) setShowConfirmModal(false);
                if (showReturnModal && !returning) setShowReturnModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showConfirmModal, showReturnModal, saving, returning]);`;
jsx = jsx.replace(`const handleFilterKeyDown`, useEff + '\n\n    const handleFilterKeyDown');

// Update UI buttons in Header
const headerButtonsRegex = /<button[\s\S]*?onClick=\{handleConfirmar\}[\s\S]*?<\/button>/;
const headerButtonsNew = `<button 
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
                                        </button>`;
jsx = jsx.replace(headerButtonsRegex, headerButtonsNew);

// Modals appended before last </div>
const modals = `
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
`;

jsx = jsx.replace(/<\/div>\n    \);\n};\n\nexport default LaboratorioConferencia;/, modals + '\n        </div>\n    );\n};\n\nexport default LaboratorioConferencia;');

// Fix syntax in LaboratorioConferencia.css (optional, but let's make sure it doesn't break anything)

fs.writeFileSync(jsxPath, jsx, 'utf8');
console.log('Fixed LaboratorioConferencia.jsx and service');
