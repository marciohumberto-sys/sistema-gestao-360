const fs = require('fs');

// 1. CSS
const cssPath = 'src/index.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const newCss = `
/* Status Colors for Resultados */
.status-pendente { background: #fef3c7 !important; color: #b45309 !important; border-color: #fde68a !important; }
.status-digitado { background: #dcfce7 !important; color: #166534 !important; border-color: #bbf7d0 !important; }
.status-conferido { background: #dbeafe !important; color: #1e40af !important; border-color: #bfdbfe !important; }
.status-liberado { background: #d1fae5 !important; color: #047857 !important; border-color: #a7f3d0 !important; }
.status-cancelado { background: #fee2e2 !important; color: #b91c1c !important; border-color: #fecaca !important; }

/* Custom Tooltip */
.tooltip-container { position: relative; display: inline-block; width: 100%; }
.tooltip-container[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%; left: 50%; transform: translateX(-50%);
  background: #1e293b; color: #fff;
  padding: 6px 12px; border-radius: 6px;
  font-size: 12px; font-weight: 500;
  white-space: nowrap; z-index: 100;
  margin-bottom: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.tooltip-container[title]:hover::before {
  content: '';
  position: absolute;
  bottom: 100%; left: 50%; transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1e293b;
  margin-bottom: -4px; z-index: 100;
}
`;
if (!cssContent.includes('.status-digitado { background: #dcfce7')) {
    fs.writeFileSync(cssPath, cssContent + '\n' + newCss, 'utf8');
}


// 2. JSX
const jsxPath = 'src/pages/laboratorio/LaboratorioResultados.jsx';
let jsx = fs.readFileSync(jsxPath, 'utf8');

// Replace EXAM_STATUS_CONFIG
const oldConfig = `const EXAM_STATUS_CONFIG = {
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
};`;

if (!jsx.includes("className: 'status-pendente'")) {
    // If not found exactly, just replace whatever is there.
    // Actually it matches exactly.
}

// State changes
const oldState = `const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [saving, setSaving] = useState(false);`;
const newState = `const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [showPendenteModal, setShowPendenteModal] = useState(false);
    const [showConfirmEnvioModal, setShowConfirmEnvioModal] = useState(false);
    const [examesPendentes, setExamesPendentes] = useState([]);
    const [marcandoDigitado, setMarcandoDigitado] = useState(false);
    const [saving, setSaving] = useState(false);`;
jsx = jsx.replace(oldState, newState);

// Salvar exame: Return true/false
jsx = jsx.replace(`const salvarExameAtual = async () => {`, `const salvarExameAtual = async () => {`);
jsx = jsx.replace(`setSaveStatus('idle');\n            }, 3000);\n        } catch (err) {`, `setSaveStatus('idle');\n            }, 3000);\n            return true;\n        } catch (err) {`);
jsx = jsx.replace(`setSaveStatus('idle');\n            }, 3000);\n        } finally {`, `setSaveStatus('idle');\n            }, 3000);\n            return false;\n        } finally {`);

// Marcar como digitado
const marcarComoDigitadoCode = `
    const handleMarcarComoDigitado = async () => {
        if (!selectedExamId || isReadOnly) return;
        try {
            setMarcandoDigitado(true);
            setFeedbackMsg(null);
            
            const valuesToSave = Object.values(formValues);
            const isEmpty = valuesToSave.some(v => (v.value_numeric === null || v.value_numeric === '') && (!v.value_text || String(v.value_text).trim() === ''));
            if (isEmpty) {
                setFeedbackMsg({ type: 'error', text: 'Preencha todos os resultados obrigatórios antes de marcar o exame como Digitado.' });
                setTimeout(() => setFeedbackMsg(null), 4000);
                return;
            }

            if (checkUnsavedChanges()) {
                const sucesso = await salvarExameAtual(); 
                if (!sucesso) return;
            }
            
            await laboratorioResultadosService.marcarExameComoDigitado(selectedExamId);
            
            await carregarDados(selectedAttendance.protocol_number, selectedExamId);
            setFeedbackMsg({ type: 'success', text: 'Exame marcado como Digitado.' });
            setTimeout(() => setFeedbackMsg(null), 3000);
        } catch (error) {
            console.error('Erro ao marcar como digitado', error);
            setFeedbackMsg({ type: 'error', text: 'Não foi possível concluir a digitação deste exame.' });
            setTimeout(() => setFeedbackMsg(null), 4000);
        } finally {
            setMarcandoDigitado(false);
        }
    };
`;
// Insert before handleEnviarParaConferencia
jsx = jsx.replace(`const handleEnviarParaConferencia = async () => {`, marcarComoDigitadoCode + `\n    const handleEnviarParaConferencia = async () => {`);

// Replace handleEnviarParaConferencia
const oldEnviar = `const handleEnviarParaConferencia = async () => {`;
// We will replace the body of handleEnviarParaConferencia
const handleEnviarRegex = /const handleEnviarParaConferencia = async \(\) => \{[\s\S]*?\}\s*\}\;/;
const newEnviar = `const handleEnviarParaConferencia = async () => {
        if (!selectedAttendance?.id || saving) return;
        
        const resultadosAtuais = currentAttendance.resultados || [];
        const resultadosAtivos = resultadosAtuais.filter(item => String(item.status).toUpperCase() !== 'CANCELADO');
        const pendentes = resultadosAtivos.filter(item => String(item.status).toUpperCase() === 'PENDENTE');

        if (pendentes.length > 0) {
            setExamesPendentes(pendentes);
            setShowPendenteModal(true);
            return;
        }

        setShowConfirmEnvioModal(true);
    };

    const confirmEnviarParaConferencia = async () => {
        try {
            setSaving(true);
            await laboratorioResultadosService.enviarAtendimentoParaConferencia(selectedAttendance.id);
            setFeedbackMsg({ type: 'success', text: 'Atendimento enviado para Conferência com sucesso.' });
            setTimeout(() => setFeedbackMsg(null), 3000);
            setShowConfirmEnvioModal(false);
            
            await handleSearch(); 
        } catch (error) {
            console.error('Erro ao enviar', error);
            setFeedbackMsg({ type: 'error', text: 'Não foi possível enviar o atendimento para Conferência.' });
            setTimeout(() => setFeedbackMsg(null), 4000);
        } finally {
            setSaving(false);
        }
    };`;
jsx = jsx.replace(handleEnviarRegex, newEnviar);

// Readonly Message in JSX
const readOnlyMsg = `
                                {isReadOnly && (
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af', fontSize: '0.9rem', fontWeight: 500 }}>
                                        <Info size={18} />
                                        <span>Este exame já avançou para a etapa de conferência e não pode ser editado em Resultados.</span>
                                    </div>
                                )}
`;
jsx = jsx.replace(`<div className="lab-typing-body">`, `<div className="lab-typing-body">\n${readOnlyMsg}`);

// Inputs readOnly and disabled
jsx = jsx.replace(`disabled={currentExamIndex <= 0}`, `disabled={currentExamIndex <= 0 || saving}`);
jsx = jsx.replace(/disabled=\{isReadOnly\}/g, `disabled={isReadOnly || saving}`);

// Add disabled={isReadOnly} to inputs
jsx = jsx.replace(`onChange={(e) => handleValueChange(param.id, isNumeric ? 'value_numeric' : 'value_text', e.target.value)}`, `onChange={(e) => handleValueChange(param.id, isNumeric ? 'value_numeric' : 'value_text', e.target.value)}\n                                                            disabled={isReadOnly || saving}`);

// Add disabled to textarea
jsx = jsx.replace(`<textarea placeholder="Adicionar comentário ao laudo (apenas para suporte, gravado no primeiro parâmetro se necessário)..."></textarea>`, `<textarea placeholder="Adicionar comentário ao laudo (apenas para suporte, gravado no primeiro parâmetro se necessário)..." disabled={isReadOnly || saving}></textarea>`);


// Modals at the bottom
const modals = `
            {/* Modal Pendentes */}
            {showPendenteModal && (
                <div className="unsaved-result-modal-overlay" role="dialog" aria-modal="true">
                    <div className="unsaved-result-modal">
                        <div className="unsaved-result-modal-header" style={{ paddingBottom: '12px' }}>
                            <div className="unsaved-result-modal-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h2 className="unsaved-result-modal-title">Atendimento incompleto</h2>
                                <p className="unsaved-result-modal-subtitle">Existem exames pendentes de digitação. Conclua todos os exames antes de enviar para Conferência.</p>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-body" style={{ paddingLeft: '26px' }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: '10px' }}>
                                {examesPendentes.map(ex => (
                                    <li key={ex.id} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f1f5f9', color: '#334155', fontWeight: 500 }}>
                                        <span style={{ color: '#64748b' }}>{ex.exameCodigo}</span> — {ex.exameNome}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="unsaved-result-modal-footer">
                            <button className="unsaved-btn-neutral" onClick={() => setShowPendenteModal(false)} autoFocus>Voltar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmar Envio */}
            {showConfirmEnvioModal && (
                <div className="unsaved-result-modal-overlay" role="dialog" aria-modal="true">
                    <div className="unsaved-result-modal">
                        <div className="unsaved-result-modal-header" style={{ paddingBottom: '12px' }}>
                            <div className="unsaved-result-modal-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                                <Send size={24} />
                            </div>
                            <div>
                                <h2 className="unsaved-result-modal-title">Enviar para Conferência?</h2>
                                <p className="unsaved-result-modal-subtitle">Todos os exames digitados serão enviados para conferência e ficarão indisponíveis para edição nesta etapa.</p>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-body" style={{ paddingLeft: '26px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                                <div><span style={{ color: '#64748b' }}>Protocolo:</span> <strong style={{ color: '#1e293b' }}>{currentAttendance.protocol_number || currentAttendance.protocol}</strong></div>
                                <div><span style={{ color: '#64748b' }}>Paciente:</span> <strong style={{ color: '#1e293b' }}>{currentAttendance.pacienteNome}</strong></div>
                                <div><span style={{ color: '#64748b' }}>Exames aptos:</span> <strong style={{ color: '#1e293b' }}>{currentAttendance.resultados?.filter(item => String(item.status).toUpperCase() !== 'CANCELADO').length}</strong></div>
                            </div>
                        </div>
                        <div className="unsaved-result-modal-footer">
                            <button className="unsaved-btn-neutral" onClick={() => setShowConfirmEnvioModal(false)}>Voltar e revisar</button>
                            <button className="lab-btn-success" style={{ height: '46px', padding: '0 20px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={confirmEnviarParaConferencia} disabled={saving}>
                                {saving ? 'Enviando...' : 'Confirmar envio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
`;

jsx = jsx.replace(`{/* Modal Unsaved Changes */}`, modals + `\n            {/* Modal Unsaved Changes */}`);


// Remove "Salvar Resultado" buttons (Header and Sidebar)
jsx = jsx.replace(`<button \n                                    className={\`lab-btn \${saveStatus === 'success' ? 'lab-btn-success' : saveStatus === 'error' ? 'lab-btn-outline' : 'lab-btn-primary'}\`} \n                                    onClick={salvarExameAtual} \n                                    disabled={saving || saveStatus === 'success' || isReadOnly}\n                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}\n                                >\n                                    {getSaveButtonIcon()}\n                                    <span style={{ marginLeft: '4px' }}>{getSaveButtonText('Salvar Resultado')}</span>\n                                </button>`, ``);

jsx = jsx.replace(`<button \n                                className={\`lab-btn lab-btn-block \${saveStatus === 'success' ? 'lab-btn-success' : saveStatus === 'error' ? 'lab-btn-outline' : 'lab-btn-primary'}\`} \n                                onClick={salvarExameAtual} \n                                disabled={saving || saveStatus === 'success' || isReadOnly}\n                            >\n                                {getSaveButtonIcon()}\n                                {getSaveButtonText('Salvar Resultado')}\n                            </button>`, ``);

// Connect Sidebar "Marcar como Digitado"
jsx = jsx.replace(`<button className="lab-btn lab-btn-outline lab-btn-block" disabled={isReadOnly}><CheckCircle2 size={16} /> Marcar como Digitado</button>`, `<button className="lab-btn lab-btn-outline lab-btn-block" disabled={isReadOnly || marcandoDigitado || isDigitado || isConferido || isLiberado} onClick={handleMarcarComoDigitado}>{marcandoDigitado ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {isDigitado ? 'Exame digitado' : 'Marcar como Digitado'}</button>`);

// Fix Sidebar Imprimir Rascunho Tooltip title vs disabled title. Note: The button is disabled, so hover tooltips native don't work reliably on some browsers, so a wrapper is best.
jsx = jsx.replace(`<button className="lab-btn lab-btn-outline lab-btn-block" disabled={isReadOnly}><Printer size={16} /> Imprimir Rascunho</button>`, `<div className="tooltip-container" title="Impressão de rascunho ainda não disponível." style={{ marginTop: '0.5rem' }}><button className="lab-btn lab-btn-outline lab-btn-block" disabled={true} style={{ pointerEvents: 'none' }}><Printer size={16} /> Imprimir Rascunho</button></div>`);


fs.writeFileSync(jsxPath, jsx, 'utf8');
console.log("LaboratorioResultados.jsx updated.");
