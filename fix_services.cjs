const fs = require('fs');

const srvPath = 'src/services/api/laboratorioResultados.service.js';
let srvContent = fs.readFileSync(srvPath, 'utf8');

// Modificar salvarResultados
const oldSalvar = `        // 2. Atualiza lab_results para DIGITADO
        const { data: resData, error: errUpdateResult } = await supabase
            .from('lab_results')
            .update({ 
                status: 'DIGITADO',
                typed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', resultId)
            .select();
            
        console.log('[DEBUG] retorno Supabase lab_results (status=DIGITADO):', { data: resData, error: errUpdateResult });
        if (errUpdateResult) throw errUpdateResult;`;

if (srvContent.includes(oldSalvar)) {
    srvContent = srvContent.replace(oldSalvar, `        // O salvamento de valores n\\u00e3o muda o status para DIGITADO.`);
}

// Adicionar as novas fun\u00e7\u00f5es se n\\u00e3o existirem
const novas = `
    async marcarExameComoDigitado(resultId) {
        if (!resultId) throw new Error("ID do resultado n\\u00e3o fornecido.");
        const { data, error } = await supabase
            .from('lab_results')
            .update({ 
                status: 'DIGITADO',
                typed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', resultId)
            .select();
            
        if (error) throw error;
        return data;
    }

    async enviarAtendimentoParaConferencia(attendanceId) {
        if (!attendanceId) throw new Error("ID do atendimento n\\u00e3o fornecido.");
        const { data, error } = await supabase
            .from('lab_attendances')
            .update({ 
                status: 'CONFERENCIA',
                updated_at: new Date().toISOString()
            })
            .eq('id', attendanceId)
            .select();
            
        if (error) throw error;
        return data;
    }
`;

if (!srvContent.includes('marcarExameComoDigitado')) {
    srvContent = srvContent.replace(/}\s*export const laboratorioResultadosService/, novas + '\\n}\\n\\nexport const laboratorioResultadosService');
}

fs.writeFileSync(srvPath, srvContent, 'utf8');


const confSrvPath = 'src/services/api/laboratorioConferencia.service.js';
let confContent = fs.readFileSync(confSrvPath, 'utf8');

const oldConf = `let attendancesQuery = supabase.from('lab_attendances').select('*');`;
const newConf = `let attendancesQuery = supabase.from('lab_attendances').select('*').eq('status', 'CONFERENCIA');`;

if (confContent.includes(oldConf)) {
    confContent = confContent.replace(oldConf, newConf);
    fs.writeFileSync(confSrvPath, confContent, 'utf8');
}

console.log("Services updated.");
