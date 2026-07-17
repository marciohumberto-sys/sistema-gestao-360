const fs = require('fs');

const pathJsx = 'src/pages/laboratorio/LaboratorioResultados.jsx';
let jsxContent = fs.readFileSync(pathJsx, 'latin1');
jsxContent = jsxContent.replace(/\r\n/g, '\n');

// 1. First, replace the one we added with the correct data source (attendances[0])
jsxContent = jsxContent.replace(/const currentAttendance = selectedAttendance;/, 'const currentAttendance = attendances[0] || {};');

// 2. Now find the SECOND declaration (around line 346) and remove it.
// We use a regex that matches "const currentAttendance = attendances[0] || {};"
// only if it's followed by "const resultados =" to be safe.
jsxContent = jsxContent.replace(/const currentAttendance = attendances\[0\] \|\| \{\};\s*const resultados = currentAttendance\.resultados \|\| \[\];/g, 'const resultados = currentAttendance.resultados || [];');

fs.writeFileSync(pathJsx, jsxContent, 'latin1');
console.log("Duplicated currentAttendance removed.");
