const fs = require('fs');
const srvPath = 'src/services/api/laboratorioResultados.service.js';
let srvContent = fs.readFileSync(srvPath, 'utf8');

srvContent = srvContent.replace(/\\n\}\\n\\nexport const/g, '\n}\n\nexport const');

fs.writeFileSync(srvPath, srvContent, 'utf8');
console.log('Fixed literally escaped \\n');
