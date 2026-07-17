const fs = require('fs');
const pathJsx = 'src/pages/laboratorio/LaboratorioResultados.jsx';

let content = fs.readFileSync(pathJsx, 'utf8');

// Undo over-matches of "no" -> "não"
content = content.replace(/nãovamente/g, 'novamente');
content = content.replace(/Retornão/g, 'Retorno');
content = content.replace(/nãowrap/g, 'nowrap');
content = content.replace(/nãone/g, 'none');
content = content.replace(/gravado não/g, 'gravado no');

fs.writeFileSync(pathJsx, content, 'utf8');
console.log("LaboratorioResultados.jsx over-matches fixed.");
