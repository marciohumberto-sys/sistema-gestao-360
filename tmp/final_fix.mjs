
import { createClient } from '@supabase/supabase-js';

const url = 'https://jfctiocmxydedvlgxdhg.supabase.co';
const key = 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_';

const supabase = createClient(url, key);

async function run() {
    console.log("Iniciando correção...");
    const { data: contracts, error: cErr } = await supabase.from('contracts').select('id, tenant_id, end_date');

    if (cErr) {
        console.error("Erro ao buscar contratos:", cErr);
        return;
    }

    console.log(`Verificando em ${contracts.length} contratos...`);

    for (const c of contracts) {
        if (c.end_date) {
            const { data: h, error: hErr } = await supabase
                .from('contract_history')
                .select('id')
                .eq('contract_id', c.id)
                .eq('event_type', 'vigency_end');

            if (h && h.length === 0) {
                console.log(`Adicionando evento Final da vigência para o contrato: ${c.id}`);
                const { error: iErr } = await supabase.from('contract_history').insert({
                    contract_id: c.id,
                    tenant_id: c.tenant_id,
                    event_type: 'vigency_end',
                    event_title: 'Final da vigência do contrato',
                    event_date: c.end_date
                });
                if (iErr) console.error(`Erro ao inserir para ${c.id}:`, iErr);
            }
        }
    }
    console.log("Correção finalizada.");
}
run();
