
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://' + 'ovlvlvlvlvlvlvlvlvlv' + '.supabase.co'; // Preciso pegar os valores reais do .env se possível, ou usar as ferramentas de consulta.
// Na verdade, vou usar o run_command para rodar um curl ou algo similar se o script falhar.
// Mas vamos tentar uma abordagem mais simples: carregar os valores do ambiente do próprio processo se estiverem lá.

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Ambiente não carregado.");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    const { data: contracts } = await supabase.from('contracts').select('id, tenant_id, end_date');
    for (const c of contracts) {
        if (c.end_date) {
            const { data: h } = await supabase.from('contract_history').select('id').eq('contract_id', c.id).eq('event_type', 'vigency_end');
            if (h && h.length === 0) {
                await supabase.from('contract_history').insert({
                    contract_id: c.id,
                    tenant_id: c.tenant_id,
                    event_type: 'vigency_end',
                    event_title: 'Final da vigência do contrato',
                    event_date: c.end_date
                });
                console.log("Adicionado para " + c.id);
            }
        }
    }
}
run();
