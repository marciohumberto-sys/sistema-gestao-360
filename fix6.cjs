const fs = require('fs');

const path = 'src/pages/laboratorio/LaboratorioLaudos.css';
let content = fs.readFileSync(path, 'latin1');
content = content.replace(/\r\n/g, '\n');

const newBlock = `@media (min-width: 1200px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: 145px 170px minmax(220px, 1fr) 130px 125px;
        gap: 10px;
    }
}

@media (min-width: 1366px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: 155px 190px minmax(280px, 1fr) 145px 135px;
        gap: 12px;
    }
}

@media (max-width: 1199px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: 1fr 1fr 1fr;
    }
}

@media (max-width: 767px) {
    .lab-laudos-container .lab-filters-grid {
        grid-template-columns: 1fr;
    }
}`;

const oldRegex = /@media \(min-width: 1200px\) \{[\s\S]*?@media \(max-width: 767px\) \{[^\}]*\}/;
if (content.match(oldRegex)) {
    content = content.replace(oldRegex, newBlock);
    console.log("Replaced successfully!");
} else {
    console.log("No match found!");
}

fs.writeFileSync(path, content, 'latin1');
