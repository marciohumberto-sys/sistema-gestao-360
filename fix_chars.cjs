const fs = require('fs');
const filePath = 'src/pages/laboratorio/LaboratorioResultados.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (line.includes("return { label: 'Em digita")) {
    lines[i] = "        if (statuses.includes('PENDENTE')) return { label: 'Em digita\\u00e7\\u00e3o', cssClass: EXAM_STATUS_CONFIG['PENDENTE'].className };";
  } else if (line.includes("return { label: 'Aguardando confer")) {
    lines[i] = "        if (statuses.includes('DIGITADO')) return { label: 'Aguardando confer\\u00eancia', cssClass: EXAM_STATUS_CONFIG['DIGITADO'].className };";
  } else if (line.includes("return { label: 'Aguardando libera")) {
    lines[i] = "        if (statuses.includes('CONFERIDO')) return { label: 'Aguardando libera\\u00e7\\u00e3o', cssClass: EXAM_STATUS_CONFIG['CONFERIDO'].className };";
  } else if (line.includes("onClick={goToNextExam}>Pr")) {
    lines[i] = "                                    <button className=\"lab-btn lab-btn-outline\" disabled={currentExamIndex < 0 || currentExamIndex >= attendanceExams.length - 1} onClick={goToNextExam}>{'Pr\\u00f3ximo'} <ChevronRight size={16} /></button>";
  } else if (line.includes("Novo Resultado")) {
    // Remove Novo Resultado button
    lines[i] = "";
  }
}

content = lines.join('\n');

// Also remove Edit3 import
content = content.replace(/Edit3,\s*/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed broken characters and removed Novo Resultado');
