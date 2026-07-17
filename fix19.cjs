const fs = require('fs');

const pathCss = 'src/index.css';
let cssContent = fs.readFileSync(pathCss, 'utf8');

const modalCss = `
/* UNSAVED RESULT MODAL */
.unsaved-result-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.58);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 9999;
}

.unsaved-result-modal {
    width: 100%;
    max-width: 540px;
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.22);
    box-sizing: border-box;
    animation: unsaved-modal-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes unsaved-modal-enter {
    from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.unsaved-result-modal-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 24px 26px 18px 26px;
}

.unsaved-result-modal-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FFF4E5;
    color: #D97706;
    flex-shrink: 0;
}

.unsaved-result-modal-title {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
    color: #172033;
    margin: 0;
}

.unsaved-result-modal-subtitle {
    margin-top: 6px;
    font-size: 15px;
    line-height: 1.5;
    color: #64748B;
    margin-bottom: 0;
}

.unsaved-result-modal-body {
    padding: 0 26px 22px 84px;
    font-size: 15px;
    line-height: 1.5;
    color: #475569;
}

.unsaved-result-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 18px 26px 22px 26px;
    border-top: 1px solid #E8EDF3;
    background: #FAFBFC;
}

.unsaved-btn-neutral {
    height: 46px;
    padding: 0 20px;
    border-radius: 10px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #334155;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}
.unsaved-btn-neutral:hover {
    background: #F8FAFC;
    border-color: #94A3B8;
}

.unsaved-btn-destructive {
    height: 46px;
    padding: 0 20px;
    border-radius: 10px;
    border: 1px solid #EF4444;
    background: #EF4444;
    color: #FFFFFF;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}
.unsaved-btn-destructive:hover {
    background: #DC2626;
    border-color: #DC2626;
}

@media (max-width: 560px) {
    .unsaved-result-modal-footer {
        flex-direction: column-reverse;
    }
    .unsaved-result-modal-footer button {
        width: 100%;
    }
    .unsaved-result-modal-body {
        padding: 0 26px 22px 26px;
    }
}
`;
if (!cssContent.includes('.unsaved-result-modal')) {
    fs.writeFileSync(pathCss, cssContent + '\n' + modalCss, 'utf8');
}


const pathJsx = 'src/pages/laboratorio/LaboratorioResultados.jsx';
let jsxContent = fs.readFileSync(pathJsx, 'utf8');

// Add TriangleAlert to lucide-react import
if (!jsxContent.includes('TriangleAlert')) {
    jsxContent = jsxContent.replace(/import \{\s*Search,\s*CheckCircle2/, 'import { \n    TriangleAlert, Search, CheckCircle2');
}

// Add useEffect for Escape key
const useEffectStr = `
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && showUnsavedModal) {
                cancelNavigation();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showUnsavedModal]);
`;
if (!jsxContent.includes("e.key === 'Escape'")) {
    jsxContent = jsxContent.replace(/const cancelNavigation = \(\) => \{[\s\S]*?setPendingNavigation\(null\);\s*\};/, `const cancelNavigation = () => {
        setShowUnsavedModal(false);
        setPendingNavigation(null);
    };\n${useEffectStr}`);
}

// Replace the modal JSX
const oldModalRegex = /\{showUnsavedModal && \([\s\S]*?<div className="lab-modal-overlay">[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;

const newModalJsx = `{showUnsavedModal && (
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
                                <h2 id="unsaved-modal-title" className="unsaved-result-modal-title">{'Resultado n\\u00e3o salvo'}</h2>
                                <p className="unsaved-result-modal-subtitle">{'Existem altera\\u00e7\\u00f5es n\\u00e3o salvas neste exame.'}</p>
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
            )}`;

jsxContent = jsxContent.replace(oldModalRegex, newModalJsx);

fs.writeFileSync(pathJsx, jsxContent, 'utf8');
console.log("LaboratorioResultados.jsx and index.css updated for modal UI.");
