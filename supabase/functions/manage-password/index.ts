import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const GPI_TEMP_PASSWORD = Deno.env.get('GPI_TEMP_PASSWORD');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !GPI_TEMP_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await req.json();
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Missing or malformed token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Missing token payload' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: { user: requester }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !requester) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const requesterId = requester.id;

    const { action } = body;

    if (action === 'change_own_temporary_password') {
      const allowedFields = ['action', 'new_password'];
      const extraFields = Object.keys(body).filter(k => !allowedFields.includes(k));
      if (extraFields.length > 0) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid body structure' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { new_password } = body;
      
      const { data: { user: currentUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(requesterId);
      if (getUserError) {
        console.error('getUserById error');
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!currentUser) {
        return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (currentUser.app_metadata?.must_change_password !== true) {
        return new Response(JSON.stringify({ success: false, error: 'Not eligible' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!new_password || typeof new_password !== 'string' || new_password === GPI_TEMP_PASSWORD) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (new_password.length < 8 || new_password.length > 128) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const hasUpper = /[A-Z]/.test(new_password);
      const hasLower = /[a-z]/.test(new_password);
      const hasNumber = /[0-9]/.test(new_password);
      const hasSpecial = /[^A-Za-z0-9]/.test(new_password);

      if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
         return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updatedAppMetadata = {
        ...currentUser.app_metadata,
        must_change_password: false
      };

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(requesterId, {
        password: new_password,
        app_metadata: updatedAppMetadata
      });

      if (updateError) {
        console.error('updateUserById error');
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Password updated' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'reset_user_password') {
      const allowedFields = ['action', 'target_user_id', 'module_key'];
      const extraFields = Object.keys(body).filter(k => !allowedFields.includes(k));
      if (extraFields.length > 0) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid body structure' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { target_user_id, module_key } = body;

      if (!target_user_id || typeof target_user_id !== 'string') {
        return new Response(JSON.stringify({ success: false, error: 'Invalid target format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (module_key !== undefined && (typeof module_key !== 'string' || !module_key.trim())) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid module format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const requestedModuleKey = (typeof module_key === 'string' && module_key.trim())
        ? module_key.trim().toUpperCase()
        : 'LABORATORIO';

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(target_user_id)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid target format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (target_user_id === requesterId) {
        return new Response(JSON.stringify({ success: false, error: 'Cannot reset own password' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: moduleData, error: moduleError } = await supabaseAdmin
        .from('system_modules')
        .select('id')
        .eq('key', requestedModuleKey)
        .eq('is_active', true)
        .single();

      if (moduleError) {
        console.error('system_modules fetch error');
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!moduleData) {
        return new Response(JSON.stringify({ success: false, error: 'Module not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const targetModuleId = moduleData.id;

      const { data: requesterTenants, error: requesterTenantsError } = await supabaseAdmin
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', requesterId)
        .eq('is_active', true);

      if (requesterTenantsError) {
        console.error('requester user_tenants fetch error');
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!requesterTenants || requesterTenants.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: requesterScopes, error: requesterScopesError } = await supabaseAdmin
        .from('user_access_scopes')
        .select('tenant_id')
        .eq('user_id', requesterId)
        .eq('module_id', targetModuleId)
        .eq('is_active', true);

      if (requesterScopesError) {
        console.error('requester user_access_scopes fetch error');
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const requesterScopesTenants = new Set((requesterScopes || []).map(s => s.tenant_id));

      let isGlobalSuperAdmin = false;
      const requesterActiveTenants = new Set(requesterTenants.map(rt => rt.tenant_id));
      
      for (const rt of requesterTenants) {
        if (rt.role?.trim().toUpperCase() === 'SUPERADMIN') {
          isGlobalSuperAdmin = true;
          break;
        }
      }

      const authorizedTenants = new Set<string>();

      if (isGlobalSuperAdmin) {
        for (const tenantId of requesterActiveTenants) {
          authorizedTenants.add(tenantId);
        }
      } else {
        for (const rt of requesterTenants) {
          if (rt.role?.trim().toUpperCase() === 'ADMINISTRADOR') {
            if (requesterScopesTenants.has(rt.tenant_id)) {
              authorizedTenants.add(rt.tenant_id);
            }
          }
        }
      }

      if (authorizedTenants.size === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: allTargetTenants, error: allTargetTenantsError } = await supabaseAdmin
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', target_user_id)
        .eq('is_active', true);

      if (allTargetTenantsError) {
        console.error('target user_tenants fetch error');
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: allTargetScopes, error: allTargetScopesError } = await supabaseAdmin
        .from('user_access_scopes')
        .select('tenant_id, module_id')
        .eq('user_id', target_user_id)
        .eq('is_active', true);

      if (allTargetScopesError) {
        console.error('target user_access_scopes fetch error');
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const targetIsSuperAdminAnywhere = (allTargetTenants || []).some(
        t => t.role?.trim().toUpperCase() === 'SUPERADMIN'
      );

      if (!isGlobalSuperAdmin) {
        const hasOutsideTenants = (allTargetTenants || []).some(t => !authorizedTenants.has(t.tenant_id));
        const hasOutsideModules = (allTargetScopes || []).some(s => s.module_id !== targetModuleId);
        
        if (targetIsSuperAdminAnywhere || hasOutsideTenants || hasOutsideModules) {
          return new Response(JSON.stringify({ success: false, error: 'TARGET_REQUIRES_SUPERADMIN' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const validTenants = (allTargetTenants || []).filter(tt => 
        authorizedTenants.has(tt.tenant_id) && 
        (allTargetScopes || []).some(ts => ts.tenant_id === tt.tenant_id && ts.module_id === targetModuleId)
      );

      if (validTenants.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Target not found or not in authorized scope' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: { user: targetUser }, error: getTargetError } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
      if (getTargetError) {
        console.error('target getUserById error');
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!targetUser) {
        return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updatedAppMetadataTarget = {
        ...targetUser.app_metadata,
        must_change_password: true
      };

      const { error: updateTargetError } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
        password: GPI_TEMP_PASSWORD,
        app_metadata: updatedAppMetadataTarget
      });

      if (updateTargetError) {
        console.error('updateUserById target error');
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Password reset' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err) {
    console.error('Unhandled internal error');
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
