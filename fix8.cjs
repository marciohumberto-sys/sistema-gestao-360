const fs = require('fs');

const path = 'src/pages/laboratorio/LaboratorioLaudos.css';
let content = fs.readFileSync(path, 'latin1');
content = content.replace(/\r\n/g, '\n');

// The ultimate CSS block to force 100% width on the grid
const finalCss = `
/* FORCED 100% WIDTH GRID FIX */
.lab-laudos-container .lab-filters-card {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
}

.lab-laudos-container .lab-filters-grid {
    display: grid !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    align-items: end !important;
    justify-content: stretch !important;
    margin: 0 !important;
}

@media (min-width: 1366px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: minmax(145px, 0.75fr) minmax(180px, 0.95fr) minmax(280px, 1.65fr) minmax(145px, 0.85fr) minmax(135px, 0.75fr) !important;
        column-gap: 12px !important;
    }
}

@media (min-width: 1200px) and (max-width: 1365px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: minmax(135px, 0.75fr) minmax(165px, 0.90fr) minmax(220px, 1.5fr) minmax(125px, 0.75fr) minmax(120px, 0.70fr) !important;
        column-gap: 10px !important;
    }
}

@media (max-width: 1199px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: 1fr 1fr 1fr !important;
    }
}

@media (max-width: 767px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: 1fr !important;
    }
}

.lab-laudos-container .lab-filters-grid > * {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    margin: 0 !important;
}

.lab-laudos-container .lab-filters-grid input,
.lab-laudos-container .lab-filters-grid select {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
}

.lab-laudos-container .lab-filter-actions {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
}

.lab-laudos-container .lab-filter-actions button {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: var(--filter-control-height, 36px) !important;
    min-height: var(--filter-control-height, 36px) !important;
    box-sizing: border-box !important;
    white-space: nowrap !important;
    margin: 0 !important;
    transform: none !important;
}
`;

// Just append this block to the absolute end of the CSS file
content += "\n" + finalCss + "\n";

fs.writeFileSync(path, content, 'latin1');
console.log("LaboratorioLaudos.css updated with forced 100% grid.");
