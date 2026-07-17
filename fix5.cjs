const fs = require('fs');

const data = [
    {
        path: 'src/pages/laboratorio/LaboratorioResultados.css',
        prefix: '.lab-res-container',
        height: '42px'
    },
    {
        path: 'src/pages/laboratorio/LaboratorioConferencia.css',
        prefix: '.lab-conf-container',
        height: '36px'
    },
    {
        path: 'src/pages/laboratorio/LaboratorioLaudos.css',
        prefix: '.lab-laudos-container',
        height: '36px'
    }
];

for (const {path, prefix, height} of data) {
    let content = fs.readFileSync(path, 'latin1');
    content = content.replace(/\r\n/g, '\n');

    // Remove any previous spacer fixes if they existed from manual edits
    const cleanRegex = /\/\* Fix Alignment \*\/[\s\S]*/;
    if (content.match(cleanRegex)) {
        content = content.replace(cleanRegex, '');
    }

    const newRules = `\n/* Fix Alignment */
${prefix} .lab-filters-grid {
    --filter-control-height: ${height};
}

${prefix} .lab-filters-grid input,
${prefix} .lab-filters-grid select,
${prefix} .lab-filter-actions button {
    height: var(--filter-control-height) !important;
    min-height: var(--filter-control-height) !important;
    box-sizing: border-box !important;
}

.filter-label-spacer {
    visibility: hidden;
    display: block;
    margin-bottom: 0.15rem;
    line-height: 1.2;
}

${prefix} .lab-filter-actions {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
`;

    content += newRules;
    fs.writeFileSync(path, content, 'latin1');
    console.log('Appended fixes to ' + path);
}
