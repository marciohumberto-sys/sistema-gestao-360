
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixHistory() {
    console.log("Starting history fix...");

    // 1. Fetch contracts that have end_date but no vigency_end event
    const { data: contracts, error: cError } = await supabase
        .from('contracts')
        .select('id, tenant_id, end_date');

    if (cError) {
        console.error("Error fetching contracts:", cError);
        return;
    }

    console.log(`Checking ${contracts.length} contracts...`);

    for (const contract of contracts) {
        if (!contract.end_date) continue;

        const { data: existing, error: hError } = await supabase
            .from('contract_history')
            .select('id')
            .eq('contract_id', contract.id)
            .eq('event_type', 'vigency_end')
            .single();

        if (!existing && !hError) {
            console.log(`Adding vigency_end for contract ${contract.id}`);
            const { error: iError } = await supabase
                .from('contract_history')
                .insert({
                    contract_id: contract.id,
                    tenant_id: contract.tenant_id,
                    event_type: 'vigency_end',
                    event_title: 'Final da vigência do contrato',
                    event_date: contract.end_date
                });
            if (iError) console.error(`Error inserting for ${contract.id}:`, iError);
        }
    }

    console.log("Finished history fix.");
}

fixHistory();
