import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.length < 10) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });

    const { data: userAuth, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !userAuth || !userAuth.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }
    const callerId = userAuth.user.id;

    let payload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const allowedFields = ['tenant_id', 'module_key'];
    const payloadKeys = Object.keys(payload);
    if (payloadKeys.length !== 2 || !payloadKeys.every(k => allowedFields.includes(k))) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    let tenant_id = payload.tenant_id;
    let module_key = payload.module_key;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const normalizedTenantId = tenant_id.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(normalizedTenantId)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    tenant_id = normalizedTenantId;
    if (!module_key || typeof module_key !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    module_key = module_key.trim().toUpperCase();
    if (module_key !== 'LABORATORIO') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const { data: modData, error: modErr } = await adminClient
      .from('system_modules')
      .select('id')
      .eq('key', 'LABORATORIO')
      .eq('is_active', true)
      .maybeSingle();

    if (modErr) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    if (!modData) {
      return new Response(JSON.stringify({ error: 'Module not found' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    const moduleId = modData.id;

    const { data: callerTenant, error: callerTenantErr } = await adminClient
      .from('user_tenants')
      .select('role')
      .eq('user_id', callerId)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .maybeSingle();

    if (callerTenantErr) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    if (!callerTenant) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    let isAuthorized = false;
    const role = String(callerTenant.role || '').trim().toUpperCase();
    
    if (role === 'SUPERADMIN') {
      isAuthorized = true;
    } else if (role === 'ADMINISTRADOR') {
      const { data: callerScope, error: callerScopeErr } = await adminClient
        .from('user_access_scopes')
        .select('id')
        .eq('user_id', callerId)
        .eq('tenant_id', tenant_id)
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (callerScopeErr) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
      
      if (callerScope) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    const { data: scopes, error: scopesErr } = await adminClient
      .from('user_access_scopes')
      .select('user_id, unit_id, secretariat_id, is_active, units(name)')
      .eq('tenant_id', tenant_id)
      .eq('module_id', moduleId);

    if (scopesErr) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    if (!scopes || scopes.length === 0) {
      return new Response(JSON.stringify({ success: true, users: [] }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const uniqueUserIds = Array.from(new Set(scopes.map(s => s.user_id)));
    const scopeMap = new Map();
    scopes.forEach(s => {
      if (!scopeMap.has(s.user_id)) {
        scopeMap.set(s.user_id, {
          units: new Set()
        });
      }
      const mapVal = scopeMap.get(s.user_id);
      if (s.units && s.units.name) {
        mapVal.units.add(s.units.name);
      }
    });

    const { data: tenants, error: tenantsErr } = await adminClient
      .from('user_tenants')
      .select('id, user_id, role, is_active, crbm, signature_path')
      .eq('tenant_id', tenant_id)
      .in('user_id', uniqueUserIds);

    if (tenantsErr) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const authPromises = uniqueUserIds.map(async (uid) => {
      const { data, error } = await adminClient.auth.admin.getUserById(uid);
      if (error || !data || !data.user) {
        return {
          id: uid,
          email: '',
          name: 'Usuário não localizado'
        };
      }
      const u = data.user;
      const meta = u.user_metadata || {};
      return {
        id: u.id,
        email: u.email || '',
        name: meta.full_name || meta.name || 'Usuário Sem Nome'
      };
    });

    const authUsers = await Promise.all(authPromises);
    const authMap = new Map(authUsers.map(au => [au.id, au]));

    const resultUsers = [];
    
    (tenants || []).forEach(t => {
      const uid = t.user_id;
      const authU = authMap.get(uid) || { email: '', name: 'Usuário não localizado' };
      const scopeData = scopeMap.get(uid);
      
      const unitList = scopeData ? Array.from(scopeData.units) : [];
      
      resultUsers.push({
        id: uid,
        user_id: uid,
        user_tenant_id: t.id,
        name: authU.name,
        email: authU.email,
        profile: t.role,
        status: t.is_active ? 'ATIVO' : 'INATIVO',
        secretariat_name: '',
        units: unitList
      });
    });

    resultUsers.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    return new Response(JSON.stringify({ success: true, users: resultUsers }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
