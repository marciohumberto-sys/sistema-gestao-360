const fs = require('fs');

const path = 'src/pages/laboratorio/LaboratorioLaudos.css';
let content = fs.readFileSync(path, 'latin1');
content = content.replace(/\r\n/g, '\n');

// 1. Replace the media query blocks for .lab-laudos-container .lab-filters-grid
const grid1500 = `minmax(145px, 0.75fr) minmax(180px, 0.95fr) minmax(280px, 1.65fr) minmax(145px, 0.75fr) minmax(135px, 0.70fr)`;
const grid1366 = `minmax(145px, 0.75fr) minmax(180px, 0.95fr) minmax(280px, 1.65fr) minmax(145px, 0.75fr) minmax(135px, 0.70fr)`; // Default desktop
const grid1200 = `minmax(135px, 0.75fr) minmax(165px, 0.90fr) minmax(220px, 1.5fr) minmax(125px, 0.70fr) minmax(120px, 0.65fr)`;

const newMediaBlocks = `@media (min-width: 1200px) {
    .lab-laudos-container .lab-filters-grid {
        display: grid;
        grid-template-columns: ${grid1200};
        gap: 10px;
        align-items: end;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        box-sizing: border-box;
    }
}

@media (min-width: 1366px) {
    .lab-laudos-container .lab-filters-grid {
        display: grid;
        grid-template-columns: ${grid1366};
        gap: 12px;
        align-items: end;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        box-sizing: border-box;
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

// Replace everything from @media (min-width: 1200px) to the end of max-width: 767px block
const mediaRegex = /@media \(min-width: 1200px\) \{[\s\S]*?@media \(max-width: 767px\) \{[^\}]*\}/;
content = content.replace(mediaRegex, newMediaBlocks);

// 2. Ensure all immediate children have correct sizing
const childRegex = /\.lab-laudos-container \.lab-filters-grid > \* \{[\s\S]*?\}/;
const newChildBlock = `.lab-laudos-container .lab-filters-grid > * {
    min-width: 0;
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
}`;
if (content.match(childRegex)) {
    content = content.replace(childRegex, newChildBlock);
} else {
    // Append if not found
    content += `\n${newChildBlock}\n`;
}

// 3. Update the button styles
const buttonRegex = /\.lab-laudos-container \.lab-filter-actions button \{[\s\S]*?\}/;
const newButtonBlock = `.lab-laudos-container .lab-filter-actions button {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    height: var(--filter-control-height, 36px) !important;
    min-height: var(--filter-control-height, 36px) !important;
    box-sizing: border-box !important;
    white-space: nowrap;
    margin: 0;
    transform: none;
}`;
if (content.match(buttonRegex)) {
    content = content.replace(buttonRegex, newButtonBlock);
}

// 4. Update the fix from fix5.cjs at the end of the file
const fix5ButtonRegex = /\.lab-laudos-container \.lab-filter-actions button\s*\{\s*height: var\(--filter-control-height\)[^}]*\}/;
if (content.match(fix5ButtonRegex)) {
    content = content.replace(fix5ButtonRegex, newButtonBlock);
}

fs.writeFileSync(path, content, 'latin1');
console.log("LaboratorioLaudos.css updated successfully.");
