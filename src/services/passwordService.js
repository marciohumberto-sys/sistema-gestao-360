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

export const resetUserTemporaryPassword = async (targetUserId) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData?.session) {
        throw new Error('Sua sessão expirou. Entre novamente.');
    }

    const { data, error } = await supabase.functions.invoke('manage-password', {
        body: {
            action: 'reset_user_password',
            target_user_id: targetUserId
        },
        headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`
        }
    });

    if (error || !data?.success) {
        throw new Error('Não foi possível redefinir a senha deste usuário. Tente novamente.');
    }

    return data;
};
