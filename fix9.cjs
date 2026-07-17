const fs = require('fs');

const path = 'src/pages/laboratorio/LaboratorioLaudos.css';
let content = fs.readFileSync(path, 'latin1');
content = content.replace(/\r\n/g, '\n');

const cssOverride = `
/* ÚNICA COLUNA FLEXÍVEL (PACIENTE) */
@media (min-width: 1366px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: 155px 190px minmax(300px, 1fr) 180px 160px !important;
        column-gap: 12px !important;
    }
}

@media (min-width: 1200px) and (max-width: 1365px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: 145px 170px minmax(220px, 1fr) 150px 140px !important;
        column-gap: 10px !important;
    }
}
`;

content += "\n" + cssOverride + "\n";

fs.writeFileSync(path, content, 'latin1');
console.log("LaboratorioLaudos.css updated with single flexible column grid.");
