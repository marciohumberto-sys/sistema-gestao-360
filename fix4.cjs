const fs = require('fs');

const data = [
    {
        path: 'src/pages/laboratorio/LaboratorioResultados.css',
        prefix: '.lab-res-container',
        grid1500: 'minmax(145px, 0.75fr) minmax(180px, 0.95fr) minmax(260px, 1.6fr) minmax(150px, 0.85fr) minmax(150px, 0.85fr) 145px',
        grid1366: '145px 180px minmax(220px, 1fr) 145px 155px 130px',
        grid1200: '140px 165px minmax(190px, 1fr) 135px 145px 120px'
    },
    {
        path: 'src/pages/laboratorio/LaboratorioConferencia.css',
        prefix: '.lab-conf-container',
        grid1500: 'minmax(130px, 0.65fr) minmax(150px, 0.85fr) minmax(220px, 1.3fr) minmax(140px, 0.8fr) minmax(130px, 0.7fr) minmax(130px, 0.7fr) 140px',
        grid1366: '120px 140px minmax(180px, 1fr) 130px 120px 120px 130px',
        grid1200: '115px 130px minmax(150px, 1fr) 120px 110px 110px 115px'
    },
    {
        path: 'src/pages/laboratorio/LaboratorioLaudos.css',
        prefix: '.lab-laudos-container',
        grid1500: 'minmax(145px, 0.75fr) minmax(180px, 0.95fr) minmax(260px, 1.6fr) auto',
        grid1366: '145px 180px minmax(220px, 1fr) auto',
        grid1200: '140px 165px minmax(190px, 1fr) auto'
    }
];

for (const {path, prefix, grid1500, grid1366, grid1200} of data) {
    let content = fs.readFileSync(path, 'latin1');
    content = content.replace(/\r\n/g, '\n');

    // Define the new block
    const newBlock = `${prefix} .lab-filters-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    align-items: end;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    overflow: visible;
}

${prefix} .lab-filters-grid > * {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
}

${prefix} .lab-filters-grid input,
${prefix} .lab-filters-grid select {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
}

${prefix} .lab-filter-actions {
    width: 100%;
    min-width: 0;
    overflow: visible;
}

${prefix} .lab-filter-actions button {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    align-self: end;
    margin: 0;
    transform: none;
}

@media (min-width: 1200px) {
    ${prefix} .lab-filters-grid {
        grid-template-columns: ${grid1200};
        gap: 8px;
    }
}

@media (min-width: 1366px) {
    ${prefix} .lab-filters-grid {
        grid-template-columns: ${grid1366};
        gap: 10px;
    }
}

@media (min-width: 1500px) {
    ${prefix} .lab-filters-grid {
        grid-template-columns: ${grid1500};
        gap: 12px;
    }
}

@media (max-width: 1199px) {
    ${prefix} .lab-filters-grid {
        grid-template-columns: 1fr 1fr 1fr;
    }
}

@media (max-width: 767px) {
    ${prefix} .lab-filters-grid {
        grid-template-columns: 1fr;
    }
}`;

    // Regex to match existing grid setups
    // For Resultados and Conferencia, we matched it via replace before, so we have:
    // .prefix .lab-filters-grid { ... } ... @media (min-width: 1400px) { ... }
    const regex1 = new RegExp(
        `\\${prefix} \\.lab-filters-grid \\{[\\s\\S]*?\\}\\s*` +
        `\\${prefix} \\.lab-filters-grid > \\* \\{[\\s\\S]*?\\}\\s*` +
        `@media \\(min-width: 768px\\) \\{[\\s\\S]*?\\}\\s*` +
        `@media \\(min-width: 1200px\\) \\{[\\s\\S]*?\\}\\s*` +
        `@media \\(min-width: 1400px\\) \\{[\\s\\S]*?\\}`
    , 'g');

    // For Laudos, it was never successfully replaced! It's still using minmax(170px, 1fr) and @media (min-width: 1024px)
    const regex2 = new RegExp(
        `\\${prefix} \\.lab-filters-grid \\{[\\s\\S]*?\\}\\s*` +
        `\\${prefix} \\.lab-filters-grid > \\* \\{[\\s\\S]*?\\}\\s*` +
        `@media \\(min-width: 1024px\\) \\{[\\s\\S]*?\\}`
    , 'g');

    if (content.match(regex1)) {
        content = content.replace(regex1, newBlock);
        console.log('Replaced regex1 in ' + path);
    } else if (content.match(regex2)) {
        content = content.replace(regex2, newBlock);
        console.log('Replaced regex2 in ' + path);
    } else {
        console.log('NO MATCH for ' + path);
    }

    // Now let's remove any stray button rules that we've overridden
    const buttonRegex = new RegExp(`\\${prefix} \\.lab-filter-actions button \\{[\\s\\S]*?\\}`, 'g');
    // Actually, maybe better not to wipe all of them, they might have `height: 42px;` which is needed!
    // The user says "height: igual aos inputs" so if I wipe it, it's fine as long as they get the height from `.lab-btn` or it defaults to the flex layout. But `.lab-filter-group input` has `height: 42px`. We should keep the button height or set it.
    // I will append `height: 42px` for Resultados, and `36px` for Conferencia/Laudos if I just append to newBlock.
    
    fs.writeFileSync(path, content, 'latin1');
}
