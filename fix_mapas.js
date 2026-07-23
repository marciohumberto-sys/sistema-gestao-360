const fs = require('fs');

let jsx = fs.readFileSync('src/pages/laboratorio/LaboratorioMapas.jsx', 'utf8');

const originalPrintTemplate = \const cssStyles = \\\
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #333; margin: 0; padding: 0; font-size: 9pt; }
            .lab-paper-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
            .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
            .header-text-block h3 { margin: 0 0 2px 0; font-size: 10pt; text-transform: uppercase; }
            .header-text-block h4 { margin: 0; font-size: 8pt; color: #64748b; font-weight: normal; }
            .header-logos { display: flex; gap: 10px; }
            .header-logos img { height: 25px; object-fit: contain; }
            .header-divider { flex: 1; border-top: 1px solid #e2e8f0; margin: 0 15px; }
            .header-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
            .header-bottom h2 { margin: 0 0 5px 0; font-size: 12pt; }
            .lab-paper-sector-badge { font-size: 8pt; font-weight: bold; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 4px; }
            
            .lab-paper-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 15px; }
            .lab-paper-info-item { display: flex; gap: 5px; font-size: 9pt; }
            .lab-paper-info-item.full-row { grid-column: 1 / -1; }
            .font-bold { font-weight: bold; }
            
            .lab-paper-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .lab-paper-table th, .lab-paper-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            .lab-paper-table th { background-color: #f8fafc; font-weight: bold; }
            .col-cod { width: 80px; }
            .col-exame { width: 250px; }
            .col-resultado { width: auto; }
            .linha-escrita { border-bottom: 1px solid #e2e8f0; height: 16px; width: 100%; margin-top: 5px; }
            
            .lab-paper-footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8pt; color: #64748b; display: flex; justify-content: space-between; }
            
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            thead { display: table-header-group; }
        \\\;
        
        const html = \\\
<!DOCTYPE html>
<html>
<head>
    <title>Impressão de Lote</title>
    <style>\\\</style>
</head>
<body>
    <div class="lab-paper-header">
        <div class="header-top">
            <div class="header-text-block">
                <h3>Secretaria Municipal de Saúde de Bezerros</h3>
                <h4>Laboratório Municipal Lindoberg Cândido de Souza</h4>
            </div>
            <div class="header-divider"></div>
            <div class="header-logos-stacked">
                <img src="/logo-prefeitura.png" alt="Prefeitura" onerror="this.style.display='none'" />
            </div>
        </div>
        <div class="header-bottom">
            <h2>Mapa Coletivo de Trabalho</h2>
            <span class="lab-paper-sector-badge">SETOR: \\\ | DATA REF: \\\</span>
        </div>
    </div>\\\;

        let bodyHtml = '';

        lote.document_snapshot.patients.forEach(pat => {
            let examsHtml = '';
            pat.exams.forEach(ex => {
                examsHtml += \\\
                <tr>
                    <td class="col-cod">\\\</td>
                    <td class="col-exame">\\\</td>
                    <td class="col-resultado"><div class="linha-escrita"></div></td>
                </tr>\\\;
            });

            bodyHtml += \\\
            <div style="page-break-inside: avoid; margin-bottom: 25px;">
                <div class="lab-paper-info-grid">
                    <div class="lab-paper-info-item">
                        <label class="font-bold">Cód. Paciente:</label>
                        <span>\\\</span>
                    </div>
                    <div class="lab-paper-info-item">
                        <label class="font-bold">Paciente:</label>
                        <span class="font-bold">\\\</span>
                    </div>
                    <div class="lab-paper-info-item">
                        <label class="font-bold">Sexo / Idade:</label>
                        <span>\\\ - \\\</span>
                    </div>
                    <div class="lab-paper-info-item">
                        <label class="font-bold">Origem:</label>
                        <span>\\\</span>
                    </div>
                    <div class="lab-paper-info-item full-row">
                        <label class="font-bold">Médico solicitante:</label>
                        <span>\\\</span>
                    </div>
                </div>

                <table class="lab-paper-table">
                    <thead>
                        <tr>
                            <th class="col-cod">Cód.</th>
                            <th class="col-exame">Exame Solicitado</th>
                            <th class="col-resultado">Resultado / Anotação</th>
                        </tr>
                    </thead>
                    <tbody>
                        \\\
                    </tbody>
                </table>
            </div>\\\;
        });

        const fullHtml = html + bodyHtml + \\\
        <div class="lab-paper-footer">
            <p>Impresso por: \\\ em \\\</p>
            <p>Gestão 360 - Módulo Laboratório</p>
        </div>
    </body>
    </html>\\\;\;

const originalPreview = \                            <div className="lab-paper-mock">
                                <div className="lab-paper-header">
                                    <div className="header-top">
                                        <div className="header-text-block">
                                            <h3>Secretaria Municipal de Saúde de Bezerros</h3>
                                            <h4>Laboratório Municipal Lindoberg Cândido de Souza</h4>
                                        </div>
                                        <div className="header-logos">
                                            <img src="/logo-prefeitura.png" alt="Prefeitura" style={{ height: '24px' }} onError={(e) => e.target.style.display = 'none'} />
                                        </div>
                                    </div>
                                    <div className="header-bottom">
                                        <h2 style={{ fontSize: '13pt', margin: '10px 0 0 0' }}>Mapa Coletivo de Trabalho</h2>
                                        <span className="lab-paper-sector-badge">SETOR: {(previewSnap.metadata?.sector?.name || 'DESCONHECIDO').toUpperCase()} | DATA REF: {formatDate(previewSnap.metadata?.reference_date)}</span>
                                    </div>
                                </div>

                                {previewSnap.patients.map((pat, idx) => (
                                    <div key={idx} style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
                                        <div className="lab-paper-info-grid">
                                            <div className="lab-paper-info-item">
                                                <label className="font-bold">Cód. Paciente:</label>
                                                <span>{pat.code}</span>
                                            </div>
                                            <div className="lab-paper-info-item">
                                                <label className="font-bold">Paciente:</label>
                                                <span className="font-bold">{pat.name}</span>
                                            </div>
                                            <div className="lab-paper-info-item">
                                                <label className="font-bold">Sexo / Idade:</label>
                                                <span>{pat.sex} - {pat.age_at_generation}</span>
                                            </div>
                                            <div className="lab-paper-info-item">
                                                <label className="font-bold">Origem:</label>
                                                <span>{pat.origin}</span>
                                            </div>
                                            <div className="lab-paper-info-item full-row">
                                                <label className="font-bold">Médico solicitante:</label>
                                                <span>{pat.doctor}</span>
                                            </div>
                                        </div>

                                        <table className="lab-paper-table">
                                            <thead>
                                                <tr>
                                                    <th className="col-cod">Cód.</th>
                                                    <th className="col-exame">Exame Solicitado</th>
                                                    <th className="col-resultado">Resultado / Anotação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pat.exams.map((ex, exIdx) => (
                                                    <tr key={exIdx}>
                                                        <td className="col-cod">{ex.code}</td>
                                                        <td className="col-exame">{ex.name}</td>
                                                        <td className="col-resultado"><div className="linha-escrita"></div></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}

                                <div className="lab-paper-footer">
                                    <p>Impresso por: {displayName} em {formatDate(todayDate)} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p>Gestão 360 - Módulo Laboratório</p>
                                </div>
                            </div>\;

// Replace the bad print logic
const printStart = jsx.indexOf('const cssStyles = \');
const printEnd = jsx.indexOf('</html>\;') + 9;
if (printStart > -1 && printEnd > printStart) {
    jsx = jsx.substring(0, printStart) + originalPrintTemplate.replace(/\\\\\$/g, '$').replace(/\\\\\\\/g, '\') + jsx.substring(printEnd);
} else {
    console.error('Could not find print block');
}

// Replace the bad preview mock
const previewStart = jsx.indexOf('<div className=\"lab-paper-mock\">');
const previewEndStr = '</div>\\n                            </div>\\n                        </>';
let previewEnd = jsx.indexOf(previewEndStr, previewStart);
if (previewStart > -1 && previewEnd > previewStart) {
    jsx = jsx.substring(0, previewStart) + originalPreview + jsx.substring(previewEnd + 7);
} else {
    console.error('Could not find preview block');
}

fs.writeFileSync('src/pages/laboratorio/LaboratorioMapas.jsx', jsx, 'utf8');

// Now, restore the CSS classes into LaboratorioMapas.css!
const cssExtras = \

/* =========================================
   ESTILOS GLOBAIS RECUPERADOS COM SCOPE
   ========================================= */
.lab-mapas-container .lab-card {
    background: white;
    border-radius: 16px;
    padding: 0.85rem 1rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    border: 1px solid #f1f5f9;
}

.lab-mapas-container .lab-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f1f5f9;
}

.lab-mapas-container .lab-card-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.lab-mapas-container .lab-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.lab-mapas-container .lab-btn-primary {
    background-color: #3b82f6;
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}
.lab-mapas-container .lab-btn-primary:hover { background-color: #2563eb; transform: translateY(-1px); }

.lab-mapas-container .lab-btn-success {
    background-color: #10b981;
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
}
.lab-mapas-container .lab-btn-success:hover { background-color: #059669; transform: translateY(-1px); }

.lab-mapas-container .lab-btn-danger {
    background-color: #fef2f2;
    color: #ef4444;
    border: 1px solid #fecaca;
}
.lab-mapas-container .lab-btn-danger:hover { background-color: #fee2e2; }

.lab-mapas-container .lab-btn-outline {
    background-color: white;
    color: #334155;
    border: 1px solid #cbd5e1;
}
.lab-mapas-container .lab-btn-outline:hover { background-color: #f8fafc; border-color: #94a3b8; }

.lab-mapas-container .lab-btn-sm {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 6px;
}

.lab-mapas-container .lab-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.02em;
}

.lab-mapas-container .lab-subtitle {
    color: #64748b;
    margin: 0;
    font-size: 1.05rem;
    font-weight: 400;
}

.lab-mapas-container .lab-header-actions {
    display: flex;
    gap: 0.75rem;
}

.lab-mapas-container .lab-icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 6px;
    transition: background-color 0.2s;
}
.lab-mapas-container .lab-icon-btn:hover { background-color: #f1f5f9; }
.lab-mapas-container .lab-text-primary { color: #3b82f6; }
.lab-mapas-container .lab-text-gray { color: #64748b; }
.lab-mapas-container .lab-text-success { color: #10b981; }
\;

let css = fs.readFileSync('src/pages/laboratorio/LaboratorioMapas.css', 'utf8');
if (!css.includes('.lab-mapas-container .lab-card {')) {
    fs.writeFileSync('src/pages/laboratorio/LaboratorioMapas.css', css + cssExtras, 'utf8');
}
console.log('Script concluded.');
