import { supabase } from '../lib/supabase';

export const changeOwnTemporaryPassword = async (newPassword) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData?.session) {
        throw new Error('Sua sessão expirou. Entre novamente.');
    }

    const { data, error } = await supabase.functions.invoke('manage-password', {
        body: {
            action: 'change_own_temporary_password',
            new_password: newPassword
        },
        headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`
        }
    });

    if (error) {
        throw new Error('Não foi possível alterar a senha. Tente novamente.');
    }

    if (!data?.success) {
        throw new Error('Não foi possível alterar a senha. Tente novamente.');
    }

    return data;
};

export const resetUserTemporaryPassword = async (targetUserId, moduleKey) => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData?.session) {
    throw new Error('Sua sessão expirou. Entre novamente.');
  }

  const normalizedTargetUserId = String(targetUserId || '').trim();

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!normalizedTargetUserId || !uuidRegex.test(normalizedTargetUserId)) {
    throw new Error('Usuário sem vínculo de autenticação válido.');
  }

  const payload = {
    action: 'reset_user_password',
    target_user_id: normalizedTargetUserId
  };

  if (moduleKey) {
    payload.module_key = String(moduleKey).trim().toUpperCase();
  }

  const { data, error } = await supabase.functions.invoke('manage-password', {
    body: payload,
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`
    }
  });

  if (error) {
    let errorBodyJson = null;
    let errorBodyText = null;

    try {
      if (error?.context) {
        const cloned = error.context.clone ? error.context.clone() : error.context;
        if (typeof cloned.text === 'function') {
          errorBodyText = await cloned.text();
          try {
            errorBodyJson = JSON.parse(errorBodyText);
          } catch (_) {}
        }
      }
    } catch (_) {}

    const edgeMessage =
      errorBodyJson?.error ||
      errorBodyJson?.detail ||
      (typeof errorBodyText === 'string' && errorBodyText.length < 200 ? errorBodyText : null) ||
      data?.error ||
      error?.message ||
      'Não foi possível redefinir a senha deste usuário. Tente novamente.';

    throw new Error(edgeMessage);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Não foi possível redefinir a senha deste usuário. Tente novamente.');
  }

  return data;
};