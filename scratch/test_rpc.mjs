import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jfctiocmxydedvlgxdhg.supabase.co', 'sb_publishable_kkTckONQxHJfsyR2YNKYZw_tK7x3UK_');

async function test() {
    try {
        const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
        if (!tenants || tenants.length === 0) {
            console.log('No tenants found or RLS blocked');
            return;
        }
        const tenantId = tenants[0].id;
        console.log('Using Tenant ID:', tenantId);

        const { data, error } = await supabase.rpc('get_farmacia_users_with_auth', { p_tenant_id: tenantId });
        console.log('RPC response error:', error);
        if (data && data.length > 0) {
            console.log('Sample row:', data[0]);
            const allKeys = new Set();
            data.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
            console.log('All available keys in response:', Array.from(allKeys));
        } else {
            console.log('No data returned from RPC.');
        }
    } catch (e) {
        console.error(e);
    }
}
test();
