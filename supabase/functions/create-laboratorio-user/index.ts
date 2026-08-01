import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const tempPassword = Deno.env.get('GPI_TEMP_PASSWORD')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !tempPassword) {
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.length <= 7) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseOptions = {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions)
    const { data: { user: requester }, error: userError } = await anonClient.auth.getUser(token)

    if (userError || !requester) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let payload
    try {
      payload = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const allowedKeys = ['email', 'name', 'role', 'is_active', 'tenant_id', 'module_key', 'secretariat_id', 'unit_id']
    const payloadKeys = Object.keys(payload)

    if (payloadKeys.length !== allowedKeys.length || !payloadKeys.every(k => allowedKeys.includes(k))) {
       return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (payload.password || payload.user_metadata || payload.app_metadata || payload.user_id || payload.tenant_slug || payload.module_id) {
       return new Response(JSON.stringify({ error: 'Invalid fields present' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let { email, name, role, is_active, tenant_id, module_key, secretariat_id, unit_id } = payload

    if (
      typeof email !== 'string' || !email.trim() ||
      typeof name !== 'string' || !name.trim() ||
      typeof role !== 'string' ||
      typeof is_active !== 'boolean' ||
      typeof tenant_id !== 'string' ||
      typeof secretariat_id !== 'string' ||
      (unit_id !== null && typeof unit_id !== 'string') ||
      typeof module_key !== 'string'
    ) {
      return new Response(JSON.stringify({ error: 'Invalid payload fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    module_key = module_key.trim().toUpperCase()
    if (module_key !== 'LABORATORIO') {
      return new Response(JSON.stringify({ error: 'Invalid payload fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(tenant_id) || !uuidRegex.test(secretariat_id) || (unit_id !== null && !uuidRegex.test(unit_id))) {
      return new Response(JSON.stringify({ error: 'Invalid payload fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    email = email.trim().toLowerCase()
    name = name.trim()
    role = role.trim().toUpperCase()

    const validRoles = ['ADMINISTRADOR', 'BIOMEDICO', 'TECNICO', 'COLETA', 'RECEPCAO', 'VISUALIZADOR']
    if (!validRoles.includes(role)) {
       return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, supabaseOptions)

    // Validate module
    const { data: modData, error: modError } = await adminClient
        .from('system_modules')
        .select('id')
        .eq('key', 'LABORATORIO')
        .eq('is_active', true)
        .maybeSingle()

    if (modError) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    if (!modData) {
        return new Response(JSON.stringify({ error: 'Module not available' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    // Validate requester access
    const { data: requesterTenant, error: requesterTenantError } = await adminClient
        .from('user_tenants')
        .select('role')
        .eq('user_id', requester.id)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .maybeSingle()

    if (requesterTenantError) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    if (!requesterTenant) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const requesterRole = String(requesterTenant.role || '').trim().toUpperCase()

    let isAuthorized = false
    if (requesterRole === 'SUPERADMIN') {
        isAuthorized = true
    } else if (requesterRole === 'ADMINISTRADOR') {
        const { data: scope, error: scopeError } = await adminClient
            .from('user_access_scopes')
            .select('id')
            .eq('user_id', requester.id)
            .eq('tenant_id', tenant_id)
            .eq('module_id', modData.id)
            .eq('is_active', true)
            .maybeSingle()
            
        if (scopeError) {
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }
            
        if (scope) isAuthorized = true
    }

    if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    // Validate secretariat_id and unit_id
    const { data: secData, error: secError } = await adminClient
        .from('secretariats')
        .select('id')
        .eq('id', secretariat_id)
        .eq('tenant_id', tenant_id)
        .maybeSingle()

    if (secError) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    if (!secData) {
         return new Response(JSON.stringify({ error: 'Invalid secretariat' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    if (unit_id) {
        const { data: uData, error: unitError } = await adminClient
            .from('units')
            .select('id')
            .eq('id', unit_id)
            .eq('secretariat_id', secretariat_id)
            .maybeSingle()

        if (unitError) {
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (!uData) {
            return new Response(JSON.stringify({ error: 'Invalid unit' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }
    }

    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
            name: name,
            full_name: name
        }
    })

    if (createError) {
        if (createError.message && createError.message.toLowerCase().includes('already been registered')) {
             return new Response(JSON.stringify({ error: 'USER_ALREADY_EXISTS' }), {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const createdUserId = newUserData.user.id

    const updatedAppMetadata = {
        ...newUserData.user.app_metadata,
        must_change_password: true
    }

    const { error: updateAppMetaError } = await adminClient.auth.admin.updateUserById(createdUserId, {
        app_metadata: updatedAppMetadata
    })

    if (updateAppMetaError) {
        await adminClient.auth.admin.deleteUser(createdUserId)
        return new Response(JSON.stringify({ error: 'Failed to configure user' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const { error: insTenantErr } = await adminClient.from('user_tenants').insert({
        tenant_id: tenant_id,
        user_id: createdUserId,
        role: role,
        is_active: is_active
    })

    if (insTenantErr) {
        await adminClient.auth.admin.deleteUser(createdUserId)
        return new Response(JSON.stringify({ error: 'Failed to provision user tenant' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const { error: insScopeErr } = await adminClient.from('user_access_scopes').insert({
        tenant_id: tenant_id,
        user_id: createdUserId,
        module_id: modData.id,
        secretariat_id: secretariat_id,
        unit_id: unit_id,
        is_active: is_active,
        is_primary_secretariat: true
    })

    if (insScopeErr) {
        await adminClient.from('user_tenants').delete().eq('user_id', createdUserId).eq('tenant_id', tenant_id)
        await adminClient.auth.admin.deleteUser(createdUserId)
        return new Response(JSON.stringify({ error: 'Failed to provision user scope' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    return new Response(JSON.stringify({ success: true, user_id: createdUserId, email: email }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
