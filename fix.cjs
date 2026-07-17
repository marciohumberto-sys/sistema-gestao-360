const fs = require('fs');

const files = [
    { path: 'src/pages/laboratorio/LaboratorioConferencia.css', container: '.lab-conf-container' },
    { path: 'src/pages/laboratorio/LaboratorioLaudos.css', container: '.lab-laudos-container' }
];

for (const {path, container} of files) {
    let content = fs.readFileSync(path, 'latin1');
    
    let oldPart = '';
    if (path.includes('Conferencia')) {
        oldPart = container + " .lab-filters-grid {\n" +
"    display: grid;\n" +
"    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));\n" +
"    gap: 1rem;\n" +
"    align-items: flex-end;\n" +
"}\n\n" +
container + " .lab-filters-grid > * {\n" +
"    min-width: 0;\n" +
"}\n\n" +
"@media (min-width: 1024px) {\n" +
"    " + container + " .lab-filters-grid {\n" +
"        grid-template-columns: 0.9fr 0.9fr 1.8fr 1.1fr 1.9fr 130px;\n" +
"    }\n" +
"}";
    } else {
        oldPart = container + " .lab-filters-grid {\n" +
"    display: grid;\n" +
"    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));\n" +
"    gap: 1rem;\n" +
"    align-items: flex-end;\n" +
"}\n\n" +
container + " .lab-filters-grid > * {\n" +
"    min-width: 0;\n" +
"}\n\n" +
"@media (min-width: 1024px) {\n" +
"    " + container + " .lab-filters-grid {\n" +
"        grid-template-columns: 1fr 1.1fr 1.8fr 1.4fr 1.3fr 140px;\n" +
"    }\n" +
"}";
    }

    const newPart = container + " .lab-filters-grid {\n" +
"    display: grid;\n" +
"    grid-template-columns: 1fr;\n" +
"    gap: 16px;\n" +
"    align-items: end;\n" +
"    width: 100%;\n" +
"}\n\n" +
container + " .lab-filters-grid > * {\n" +
"    min-width: 0;\n" +
"}\n\n" +
"@media (min-width: 768px) {\n" +
"    " + container + " .lab-filters-grid {\n" +
"        grid-template-columns: 1fr 1fr 1fr;\n" +
"    }\n" +
"}\n\n" +
"@media (min-width: 1200px) {\n" +
"    " + container + " .lab-filters-grid {\n" +
"        grid-template-columns: 145px 180px minmax(200px, 1fr) 175px 175px 145px;\n" +
"        gap: 12px;\n" +
"    }\n" +
"}\n\n" +
"@media (min-width: 1400px) {\n" +
"    " + container + " .lab-filters-grid {\n" +
"        grid-template-columns: 160px 210px minmax(260px, 1fr) 220px 220px 160px;\n" +
"        gap: 16px;\n" +
"    }\n" +
"}";

    if (content.includes(oldPart)) {
        content = content.replace(oldPart, newPart);
        fs.writeFileSync(path, content, 'latin1');
        console.log('Replaced in ' + path);
    } else {
        console.log('Not found in ' + path);
    }
}
