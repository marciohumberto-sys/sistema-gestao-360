const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRpc() {
    const { data: { session }, error } = await supabase.auth.signUp({
      email: 'fake@example.com',
      password: 'fake_password'
    });
    // This is just to test if issue_of exists and what happens if we call it
    const { data, error: err } = await supabase.rpc('issue_of', { p_of_id: '00000000-0000-0000-0000-000000000000' });
    console.log("RPC call result:", err ? err.message : data);
}

checkRpc();
