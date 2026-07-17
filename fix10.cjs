const fs = require('fs');
const path = 'src/pages/laboratorio/LaboratorioLaudos.css';
let content = fs.readFileSync(path, 'latin1');
content = content.replace(/\r\n/g, '\n');

// 1. Rip out all the previous CSS grid and width overrides for .lab-laudos-container .lab-filters-grid
const regexesToRemove = [
    /^\s*\/\* FORCED 100% WIDTH GRID FIX \*\/[\s\S]*?(?=\n\S|\n$)/gm,
    /^\s*\/\* ÚNICA COLUNA FLEXÍVEL \(PACIENTE\) \*\/[\s\S]*?(?=\n\S|\n$)/gm,
    /@media \(min-width: 1366px\) \{\s*\.lab-laudos-container \.lab-filters-grid \{[\s\S]*?\}\s*\}/g,
    /@media \(min-width: 1200px\) and \(max-width: 1365px\) \{\s*\.lab-laudos-container \.lab-filters-grid \{[\s\S]*?\}\s*\}/g,
    /@media \(max-width: 1199px\) \{\s*\.lab-laudos-container \.lab-filters-grid \{[\s\S]*?\}\s*\}/g,
    /@media \(max-width: 767px\) \{\s*\.lab-laudos-container \.lab-filters-grid \{[\s\S]*?\}\s*\}/g,
    /\.lab-laudos-container \.lab-filters-grid > \* \{[\s\S]*?\}/g,
    /\.lab-laudos-container \.lab-filters-grid input,[\s\S]*?\.lab-laudos-container \.lab-filters-grid select \{[\s\S]*?\}/g,
    /\.lab-laudos-container \.lab-filter-actions \{[\s\S]*?\}/g,
    /\.lab-laudos-container \.lab-filter-actions button \{[\s\S]*?\}/g,
];

regexesToRemove.forEach(regex => {
    content = content.replace(regex, '');
});

// 2. The pure Flexbox CSS to append at the end
const finalFlexCss = `
/* FLEXBOX FINAL FIX FOR LAUDOS FIRST ROW */
.lab-laudos-container .lab-filters-grid {
    display: flex !important;
    align-items: flex-end !important;
    gap: 12px !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
}

@media (min-width: 1200px) {
    .lab-laudos-container .lab-filters-grid {
        flex-wrap: nowrap !important;
    }
}

@media (max-width: 1199px) {
    .lab-laudos-container .lab-filters-grid {
        flex-wrap: wrap !important;
    }
}

/* LIMPANDO REGRAS DOS FILHOS */
.lab-laudos-container .lab-filters-grid > * {
    max-width: none !important;
    box-sizing: border-box !important;
}

/* DATA (1º filho) */
.lab-laudos-container .lab-filters-grid > div:nth-child(1) {
    flex: 0 0 160px !important;
    width: 160px !important;
    min-width: 160px !important;
}

/* PROTOCOLO (2º filho) */
.lab-laudos-container .lab-filters-grid > div:nth-child(2) {
    flex: 0 0 195px !important;
    width: 195px !important;
    min-width: 195px !important;
}

/* PACIENTE (3º filho) */
.lab-laudos-container .lab-filters-grid > div:nth-child(3) {
    flex: 1 1 auto !important;
    width: auto !important;
    min-width: 240px !important;
    max-width: none !important;
    box-sizing: border-box !important;
}
.lab-laudos-container .lab-filters-grid > div:nth-child(3) input {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
}

/* BUSCAR (4º filho) */
.lab-laudos-container .lab-filters-grid > div:nth-child(4) {
    flex: 0 0 185px !important;
    width: 185px !important;
    min-width: 185px !important;
}
.lab-laudos-container .lab-filters-grid > div:nth-child(4) button {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    height: var(--filter-control-height, 36px) !important;
    min-height: var(--filter-control-height, 36px) !important;
    white-space: nowrap !important;
}

/* FILTROS (5º filho) */
.lab-laudos-container .lab-filters-grid > div:nth-child(5) {
    flex: 0 0 165px !important;
    width: 165px !important;
    min-width: 165px !important;
}
.lab-laudos-container .lab-filters-grid > div:nth-child(5) button {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    height: var(--filter-control-height, 36px) !important;
    min-height: var(--filter-control-height, 36px) !important;
    white-space: nowrap !important;
}
`;

content += "\n" + finalFlexCss + "\n";

fs.writeFileSync(path, content, 'latin1');
console.log("LaboratorioLaudos.css rewritten with pure flexbox.");
