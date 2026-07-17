const fs = require('fs');

const jsxPath = 'src/pages/laboratorio/LaboratorioResultados.jsx';
let jsx = fs.readFileSync(jsxPath, 'utf8');

// 1. Remove states
jsx = jsx.replace(/const \[showPendenteModal.*?\n/g, '');
jsx = jsx.replace(/const \[showConfirmEnvioModal.*?\n/g, '');
jsx = jsx.replace(/const \[examesPendentes.*?\n/g, '');
jsx = jsx.replace(/const \[marcandoDigitado.*?\n/g, '');

// 2. Remove modal UI
jsx = jsx.replace(/\{\/\* Modal Pendentes \*\/\}[\s\S]*?(?=\{\/\* Modal Unsaved Changes \*\/)/, '');

// 3. Remove side panel card "Ações do Atendimento"
const cardAcoesRegex = /<div className="lab-card lab-final-actions-card">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
jsx = jsx.replace(cardAcoesRegex, '</div>');

// 4. Remove Enviar para Conferência from Header
jsx = jsx.replace(/<button className="lab-btn lab-btn-success" onClick=\{handleEnviarParaConferencia\}.*?<\/button>/, '');

// 5. Remove handlers handleMarcarComoDigitado, handleEnviarParaConferencia, confirmEnviarParaConferencia
jsx = jsx.replace(/const handleMarcarComoDigitado = async \(\) => \{[\s\S]*?\}\;\n/g, '');
jsx = jsx.replace(/const handleEnviarParaConferencia = async \(\) => \{[\s\S]*?\}\;\n/g, '');
jsx = jsx.replace(/const confirmEnviarParaConferencia = async \(\) => \{[\s\S]*?\}\;\n/g, '');

// 6. Update salvarExameAtual to do everything
const oldSalvar = /const salvarExameAtual = async \(\) => \{[\s\S]*?return false;\n\s*\} finally \{\n\s*setSaving\(false\);\n\s*\}\n\s*\};/;
const newSalvar = `const salvarExameAtual = async () => {
        try {
            setSaving(true);
            setSaveStatus('saving');
            setFeedbackMsg(null);
            
            const valuesToSave = Object.values(formValues);
            
            // Validate mandatory
            const isEmpty = valuesToSave.some(v => (v.value_numeric === null || v.value_numeric === '') && (!v.value_text || String(v.value_text).trim() === ''));
            if (isEmpty) {
                setFeedbackMsg({ type: 'error', text: 'Preencha todos os resultados obrigatórios antes de salvar.' });
                setTimeout(() => setFeedbackMsg(null), 4000);
                setSaveStatus('error');
                return false;
            }

            console.log('[DEBUG] result_id selecionado:', selectedExamId);
            console.log('[DEBUG] parâmetros enviados:', valuesToSave);

            await laboratorioResultadosService.salvarResultados(selectedExamId, valuesToSave);
            
            await carregarDados(selectedAttendance ? selectedAttendance.protocol_number : searchFilters.protocol, selectedExamId);
            setSaveStatus('success');
            setFeedbackMsg({ type: 'success', text: 'Resultado salvo com sucesso.' });
            
            setTimeout(() => {
                setFeedbackMsg(null);
                setSaveStatus('idle');
            }, 3000);
            return true;
        } catch (err) {
            console.error('[DEBUG] erro ao salvar:', err);
            setSaveStatus('error');
            setFeedbackMsg({ type: 'error', text: 'Erro ao salvar resultado. Tente novamente.' });
            
            setTimeout(() => {
                setSaveStatus('idle');
            }, 3000);
            return false;
        } finally {
            setSaving(false);
        }
    };`;
jsx = jsx.replace(oldSalvar, newSalvar);

// 7. Update read-only message
jsx = jsx.replace(/<span>Este exame já avançou para a etapa de conferência e não pode ser editado em Resultados\.<\/span>/, '<span>Este exame já foi conferido e não pode mais ser alterado.</span>');

// 8. Remove `isEnvioConferenciaDisabled` logic
jsx = jsx.replace(/const resultadosAtivosParaConferencia = [\s\S]*?\]\)\);\n/g, '');

// Clean imports (optional but recommended)
// Just remove Send, Printer from lucide-react if they exist, but honestly it won't break anything if they stay. 
// We'll remove them strictly via regex.
jsx = jsx.replace(/Send,?\s*/, '');
jsx = jsx.replace(/Printer,?\s*/, '');

fs.writeFileSync(jsxPath, jsx, 'utf8');

// Now restore laboratorioResultados.service.js salvarResultados and remove the unused methods
const srvPath = 'src/services/api/laboratorioResultados.service.js';
let srv = fs.readFileSync(srvPath, 'utf8');

const oldServiceSalvar = `        // O salvamento de valores n\\u00e3o muda o status para DIGITADO.`;
const newServiceSalvar = `        // 2. Atualiza lab_results para DIGITADO
        const { data: resData, error: errUpdateResult } = await supabase
            .from('lab_results')
            .update({ 
                status: 'DIGITADO',
                typed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', resultId)
            .select();
            
        if (errUpdateResult) throw errUpdateResult;`;
        
srv = srv.replace(oldServiceSalvar, newServiceSalvar);

// Remove the injected methods
srv = srv.replace(/async marcarExameComoDigitado[\s\S]*?async enviarAtendimentoParaConferencia[\s\S]*?\}\n\s*\}\n/, '}\n');

fs.writeFileSync(srvPath, srv, 'utf8');

// Revert laboratorioConferencia.service.js
const confPath = 'src/services/api/laboratorioConferencia.service.js';
if (fs.existsSync(confPath)) {
    let conf = fs.readFileSync(confPath, 'utf8');
    conf = conf.replace(/let attendancesQuery = supabase\.from\('lab_attendances'\)\.select\('\*'\)\.eq\('status', 'CONFERENCIA'\);/g, "let attendancesQuery = supabase.from('lab_attendances').select('*');");
    fs.writeFileSync(confPath, conf, 'utf8');
}

console.log("Refactor Final applied!");
