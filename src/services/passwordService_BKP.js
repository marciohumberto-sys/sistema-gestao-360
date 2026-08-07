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

    const payload = {
        action: 'reset_user_password',
        target_user_id: targetUserId
    };

    if (moduleKey) {
        payload.module_key = moduleKey;
    }

    console.log('[PasswordService][resetUserTemporaryPassword] Enviando requisição:', {
        targetUserId,
        payload
    });

    const { data, error } = await supabase.functions.invoke('manage-password', {
        body: payload,
        headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`
        }
    });

    if (error || !data?.success) {
        let errorBody = null;
        let errorStatus = error?.status;
        try {
            if (error?.context && typeof error.context.json === 'function') {
                errorBody = await error.context.json();
            } else if (error?.context && typeof error.context.text === 'function') {
                errorBody = await error.context.text();
            }
        } catch (e) {
            errorBody = error?.message;
        }

        console.error('[PasswordService][resetUserTemporaryPassword] Erro detalhado da Edge Function:', {
            status: errorStatus,
            errorName: error?.name,
            errorMessage: error?.message,
            payload,
            errorBody,
            responseData: data
        });

        const detailMsg = errorBody?.error || (typeof errorBody === 'string' ? errorBody : null) || error?.message;
        throw new Error(detailMsg ? `Não foi possível redefinir a senha: ${detailMsg}` : 'Não foi possível redefinir a senha deste usuário. Tente novamente.');
    }

    return data;
};
