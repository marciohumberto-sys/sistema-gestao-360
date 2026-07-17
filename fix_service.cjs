const fs = require('fs');
const srvPath = 'src/services/api/laboratorioConferencia.service.js';
let srv = fs.readFileSync(srvPath, 'utf8');

// Fix the syntax error by re-reading from the very first structure
// Since the file has "devolverExame", let's just find "devolverExame:" and remove everything from it to the end, then rebuild the end of the object properly.

const exportStart = srv.indexOf('export const laboratorioConferenciaService = {');

// I will just download or rewrite the end of the file
const parts = srv.split('confirmarConferencia: async (resultId) => {');
if (parts.length > 1) {
    let cleanSrv = parts[0] + 'confirmarConferencia: async (resultId) => {';
    // extract just what is inside confirmarConferencia
    const confirmBody = `
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id || null;

            const updateData = { 
                status: 'CONFERIDO',
                checked_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (userId) {
                updateData.checked_by = userId;
            }

            const { data, error } = await supabase
                .from('lab_results')
                .update(updateData)
                .eq('id', resultId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao confirmar conferência:', error);
            throw error;
        }
    },
    
    devolverExame: async (resultId, motivo) => {
        try {
            const { data: curr, error: errCurr } = await supabase
                .from('lab_results')
                .select('general_observation')
                .eq('id', resultId)
                .single();
                
            if (errCurr) throw errCurr;
            
            let obs = curr.general_observation || '';
            if (motivo) {
                const prefix = obs ? obs + '\\n\\n' : '';
                obs = prefix + '[Devolvido para correção]: ' + motivo;
            }

            const { data, error } = await supabase
                .from('lab_results')
                .update({ 
                    status: 'PENDENTE',
                    general_observation: obs,
                    updated_at: new Date().toISOString()
                })
                .eq('id', resultId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao devolver exame:', error);
            throw error;
        }
    }
};
`;
    cleanSrv += confirmBody;
    fs.writeFileSync(srvPath, cleanSrv, 'utf8');
    console.log('Fixed syntax error in service');
}

