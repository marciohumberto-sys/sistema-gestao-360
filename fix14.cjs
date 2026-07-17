const fs = require('fs');

const pathJsx = 'src/pages/laboratorio/LaboratorioResultados.jsx';
let jsxContent = fs.readFileSync(pathJsx, 'latin1');
jsxContent = jsxContent.replace(/\r\n/g, '\n');

// 1. ADD EXAM_STATUS_CONFIG
const configStr = `
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
`;
if (!jsxContent.includes('EXAM_STATUS_CONFIG')) {
    jsxContent = jsxContent.replace(/const LaboratorioResultados = \(\) => \{/, configStr + '\nconst LaboratorioResultados = () => {');
}

// 2. ADD STATES
const statesStr = `    const [initialFormValues, setInitialFormValues] = useState({});
    const [pendingNavigation, setPendingNavigation] = useState(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);`;

if (!jsxContent.includes('initialFormValues')) {
    jsxContent = jsxContent.replace(/const \[formValues, setFormValues\] = useState\(\{\}\);/, `const [formValues, setFormValues] = useState({});\n${statesStr}`);
}

// 3. REPLACE selecionarExame
const selExameStr = `    const selecionarExame = (result) => {
        setSelectedExamId(result.id);
        
        const initialForm = {};
        if (result && result.structuredValues) {
            result.structuredValues.forEach(v => {
                initialForm[v.parameter_id] = { ...v };
            });
        }
        setFormValues(initialForm);
        setInitialFormValues(initialForm);
    };`;
jsxContent = jsxContent.replace(/const selecionarExame = \(result\) => \{[\s\S]*?setFormValues\(initialForm\);\n    \};/, selExameStr);

// 4. ADD NAVIGATION LOGIC
const navLogic = `
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

    const currentAttendance = selectedAttendance;
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
`;
if (!jsxContent.includes('goToPreviousExam')) {
    jsxContent = jsxContent.replace(/const handleValueChange = /, navLogic + '\n    const handleValueChange = ');
}

// FIX SIDEBAR ONCLICK
jsxContent = jsxContent.replace(/onClick=\{\(\) => selecionarExame\(res\)\}/g, 'onClick={() => handleSelectExamWithCheck(res)}');

// FIX STATUS TAGS
// 1. Sidebar exam items
jsxContent = jsxContent.replace(/<span className=\{`lab-status-tag \$\{res\.status === 'DIGITADO' \? 'status-success' : 'status-warning'\}`\}>/g, `<span className={\`lab-status-tag \$\{EXAM_STATUS_CONFIG[String(res.status || 'PENDENTE').toUpperCase()]?.className || 'status-pendente'\}\`}>`);

// 2. Typing header status
jsxContent = jsxContent.replace(/<span className=\{`lab-status-tag \$\{isDigitado \? 'status-success' : 'status-warning'\}`\}>/g, `<span className={\`lab-status-tag \$\{EXAM_STATUS_CONFIG[String(selectedResult.status || 'PENDENTE').toUpperCase()]?.className || 'status-pendente'\}\`}>`);

// 3. Status Geral
const statusGeralStr = `const getStatusGeralAtendimento = (exames) => {
        if (!exames || exames.length === 0) return { label: 'Sem exames', cssClass: 'status-warning' };
        const statuses = exames.map(e => String(e.status || 'PENDENTE').toUpperCase());
        if (statuses.every(status => status === 'LIBERADO')) return { label: 'Laudo liberado', cssClass: EXAM_STATUS_CONFIG['LIBERADO'].className };
        if (statuses.includes('PENDENTE')) return { label: 'Em digitação', cssClass: EXAM_STATUS_CONFIG['PENDENTE'].className };
        if (statuses.includes('DIGITADO')) return { label: 'Aguardando conferência', cssClass: EXAM_STATUS_CONFIG['DIGITADO'].className };
        if (statuses.includes('CONFERIDO')) return { label: 'Aguardando liberação', cssClass: EXAM_STATUS_CONFIG['CONFERIDO'].className };
        return { label: 'Em andamento', cssClass: EXAM_STATUS_CONFIG['PENDENTE'].className };
    };`;
jsxContent = jsxContent.replace(/const getStatusGeralAtendimento = \(exames\) => \{[\s\S]*?return \{ label: 'Em andamento', cssClass: 'status-warning' \};\n    \};/, statusGeralStr);

// 4. FIX BUTTONS AT BOTTOM
const buttonsOld = /<button className="lab-btn lab-btn-outline"><ChevronLeft size=\{16\} \/> Anterior<\/button>\s*<button className="lab-btn lab-btn-outline">Próximo <ChevronRight size=\{16\} \/><\/button>/g;
// Because of accents, maybe use a flexible regex
const buttonsOldSafe = /<button className="lab-btn lab-btn-outline"><ChevronLeft size=\{16\} \/> Anterior<\/button>\s*<button className="lab-btn lab-btn-outline">Pr.*ximo <ChevronRight size=\{16\} \/><\/button>/g;

const buttonsNew = `<button className="lab-btn lab-btn-outline" disabled={currentExamIndex <= 0} onClick={goToPreviousExam}><ChevronLeft size={16} /> Anterior</button>
                                    <button className="lab-btn lab-btn-outline" disabled={currentExamIndex < 0 || currentExamIndex >= attendanceExams.length - 1} onClick={goToNextExam}>Próximo <ChevronRight size={16} /></button>`;

jsxContent = jsxContent.replace(/<button className="lab-btn lab-btn-outline"><ChevronLeft size=\{16\} \/> Anterior<\/button>[\s\S]*?<button className="lab-btn lab-btn-outline">Pr.*ximo <ChevronRight size=\{16\} \/><\/button>/g, buttonsNew);

// 5. ADD MODAL
const modalStr = `
            {/* Modal Unsaved Changes */}
            {showUnsavedModal && (
                <div className="lab-modal-overlay">
                    <div className="lab-modal-content" style={{ maxWidth: '400px' }}>
                        <h2 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Resultado não salvo</h2>
                        <p style={{ color: '#475569', marginBottom: '1.5rem', lineHeight: 1.5 }}>Existem alterações não salvas neste exame. Deseja sair sem salvar?</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="lab-btn lab-btn-outline" onClick={cancelNavigation}>Continuar editando</button>
                            <button className="lab-btn lab-btn-primary" onClick={confirmNavigation}>Sair sem salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
`;

jsxContent = jsxContent.replace(/<\/div>\n    \);\n\};/, modalStr);

fs.writeFileSync(pathJsx, jsxContent, 'latin1');
console.log("LaboratorioResultados.jsx updated.");

// 6. UPDATE CSS
const pathCss = 'src/index.css';
let cssContent = fs.readFileSync(pathCss, 'latin1');
const statusCss = `
/* LAB EXAM STATUS COLORS */
.status-pendente {
    background: #FFF4CC !important;
    color: #B45309 !important;
    border: 1px solid #F6D365 !important;
}

.status-digitado {
    background: #DDF8E8 !important;
    color: #087443 !important;
    border: 1px solid #A7EAC5 !important;
}

.status-conferido {
    background: #E6F0FF !important;
    color: #1D4ED8 !important;
    border: 1px solid #B8D2FF !important;
}

.status-liberado {
    background: #D1FAE5 !important;
    color: #047857 !important;
    border: 1px solid #86E7BD !important;
}

.status-cancelado {
    background: #FEE2E2 !important;
    color: #B91C1C !important;
    border: 1px solid #FCA5A5 !important;
}
`;
if (!cssContent.includes('.status-pendente {')) {
    fs.writeFileSync(pathCss, cssContent + '\n' + statusCss, 'latin1');
    console.log("CSS added to src/index.css");
} else {
    // replace existing ones?
    // just append with !important, it will override
    console.log("CSS already present, skipping.");
}
