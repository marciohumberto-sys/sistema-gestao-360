const fs = require('fs');
const pathJsx = 'src/pages/laboratorio/LaboratorioResultados.jsx';

// Read as utf8
let content = fs.readFileSync(pathJsx, 'utf8');

// The exact string replacements using Unicode Escapes inside JSX expressions
const newH2 = `<h2 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>{'Resultado n\\u00e3o salvo'}</h2>`;
const newP = `<p style={{ color: '#475569', marginBottom: '1.5rem', lineHeight: 1.5 }}>{'Existem altera\\u00e7\\u00f5es n\\u00e3o salvas neste exame. Deseja sair sem salvar?'}</p>`;

// Replace using regex that matches the tag contents regardless of corrupted characters inside
content = content.replace(/<h2 style=\{\{\s*margin:\s*'0 0 1rem 0',\s*color:\s*'#1e293b'\s*\}\}>.*?<\/h2>/, newH2);
content = content.replace(/<p style=\{\{\s*color:\s*'#475569',\s*marginBottom:\s*'1\.5rem',\s*lineHeight:\s*1\.5\s*\}\}>.*?<\/p>/, newP);

// Just in case it was already replaced and the regex didn't match, or if it matched correctly.
fs.writeFileSync(pathJsx, content, 'utf8');
console.log("LaboratorioResultados.jsx modal texts replaced with Unicode Escapes.");
