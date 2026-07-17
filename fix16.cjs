const fs = require('fs');
const pathJsx = 'src/pages/laboratorio/LaboratorioResultados.jsx';

// Read as utf8. Original valid utf8 bytes will be parsed correctly.
// Invalid latin1 bytes injected earlier will become the replacement character ().
let content = fs.readFileSync(pathJsx, 'utf8');

// Replace the corrupted injected strings
content = content.replace(/Resultado no salvo/g, 'Resultado não salvo');
content = content.replace(/Existem alteraes no salvas neste exame\. Deseja sair sem salvar\?/g, 'Existem alterações não salvas neste exame. Deseja sair sem salvar?');
content = content.replace(/Em digitao/g, 'Em digitação');
content = content.replace(/Aguardando conferncia/g, 'Aguardando conferência');
content = content.replace(/Aguardando liberao/g, 'Aguardando liberação');
content = content.replace(/Prximo/g, 'Próximo');
content = content.replace(/observao/gi, 'observação');

// Also catch any stray ones just in case
content = content.replace(/no/g, 'não');
content = content.replace(/alteraes/g, 'alterações');
content = content.replace(/conferncia/g, 'conferência');
content = content.replace(/digitao/g, 'digitação');
content = content.replace(/liberao/g, 'liberação');
content = content.replace(/prximo/g, 'próximo');
content = content.replace(/Mdico/g, 'Médico');
content = content.replace(/Histrico/g, 'Histórico');
content = content.replace(/disponvel/g, 'disponível');
content = content.replace(/aps/g, 'após');
content = content.replace(/integrao/g, 'integração');
content = content.replace(/migrao/g, 'migração');

// Save as utf8. This guarantees the file is strictly UTF-8 moving forward.
fs.writeFileSync(pathJsx, content, 'utf8');
console.log("LaboratorioResultados.jsx encoding fixed and saved as UTF-8.");
