const fs = require('fs');
const path = 'src/pages/laboratorio/LaboratorioLaudos.css';
let content = fs.readFileSync(path, 'latin1');
content = content.replace(/\r\n/g, '\n');

// The CSS rules
const exactCss = `
/* LAUDOS EXACT UNIQUE CLASSES (FLEXBOX) */
.laudos-first-row-flex {
    display: flex !important;
    align-items: flex-end !important;
    gap: 12px !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    flex-wrap: nowrap !important;
}

@media (max-width: 1199px) {
    .laudos-first-row-flex {
        flex-wrap: wrap !important;
    }
}

.laudos-flex-data {
    flex: 0 0 160px !important;
    width: 160px !important;
    min-width: 160px !important;
    max-width: none !important;
    box-sizing: border-box !important;
}

.laudos-flex-protocolo {
    flex: 0 0 195px !important;
    width: 195px !important;
    min-width: 195px !important;
    max-width: none !important;
    box-sizing: border-box !important;
}

.laudos-flex-paciente {
    flex: 1 1 auto !important;
    width: auto !important;
    min-width: 240px !important;
    max-width: none !important;
    box-sizing: border-box !important;
}

.laudos-paciente-input {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
}

.laudos-flex-buscar {
    flex: 0 0 185px !important;
    width: 185px !important;
    min-width: 185px !important;
    max-width: none !important;
    box-sizing: border-box !important;
}

.laudos-flex-buscar button {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
}

.laudos-flex-filtros {
    flex: 0 0 165px !important;
    width: 165px !important;
    min-width: 165px !important;
    max-width: none !important;
    box-sizing: border-box !important;
}

.laudos-flex-filtros button {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
}
`;

content += "\n" + exactCss + "\n";
fs.writeFileSync(path, content, 'latin1');
console.log("LaboratorioLaudos.css updated with exact unique flex classes.");
