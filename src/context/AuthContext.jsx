import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [authUser, setAuthUser] = useState(null);
    const [tenantLink, setTenantLink] = useState(null);
    const [scopes, setScopes] = useState([]);
    const [accessibleModules, setAccessibleModules] = useState([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [networkError, setNetworkError] = useState(null);

    const loadSessionData = async (user) => {
        try {
            if (!user) {
                setAuthUser(null);
                setTenantLink(null);
                setScopes([]);
                setAccessibleModules([]);
                setIsSuperAdmin(false);
                setNetworkError(null);
                return;
            }

            setAuthUser(user);
            
            let data = null;
            let attempt = 0;
            const maxAttempts = 3;

            while (attempt < maxAttempts) {
                try {
                    data = await authService.getUserTenantAndScopes(user.id);
                    break;
                } catch (err) {
                    attempt++;
                    const errMsg = err.message || '';
                    const isNetwork = 
                        errMsg.toLowerCase().includes('fetch') ||
                        errMsg.toLowerCase().includes('network') ||
                        errMsg.toLowerCase().includes('connection') ||
                        errMsg.toLowerCase().includes('timeout') ||
                        errMsg.toLowerCase().includes('quic') ||
                        errMsg.toLowerCase().includes('reset') ||
                        errMsg.toLowerCase().includes('aborted') ||
                        errMsg.toLowerCase().includes('load');

                    if (isNetwork && attempt < maxAttempts) {
                        console.warn(`[AuthContext] Falha de rede temporária (Tentativa ${attempt}/${maxAttempts}): ${errMsg}. Retrying in 1500ms...`);
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    } else {
                        throw err;
                    }
                }
            }

            // Mock frontend exclusivo para liberar o Laboratório para Osvaldo Albanez
            if (user?.email === 'osvaldo.albanez@sistema.local' && data?.accessibleModules) {
                if (!data.accessibleModules.includes('LABORATORIO')) {
                    data.accessibleModules.push('LABORATORIO');
                }
            }

            setTenantLink(data.tenantLink);
            setScopes(data.scopes);
            setAccessibleModules(data.accessibleModules);
            setIsSuperAdmin(data.isSuperAdmin);
            setNetworkError(null);

        } catch (error) {
            const errMsg = error.message || '';
            const isNetwork = 
                errMsg.toLowerCase().includes('fetch') ||
                errMsg.toLowerCase().includes('network') ||
                errMsg.toLowerCase().includes('connection') ||
                errMsg.toLowerCase().includes('timeout') ||
                errMsg.toLowerCase().includes('quic') ||
                errMsg.toLowerCase().includes('reset') ||
                errMsg.toLowerCase().includes('aborted') ||
                errMsg.toLowerCase().includes('load');

            if (isNetwork) {
                console.error("[AuthContext] Falha de conectividade persistente:", error);
                setNetworkError(error);
            } else {
                console.error("[AuthContext] Erro de perfil/permissão confirmado (sem vínculo real):", error);
                setTenantLink(null);
                setAccessibleModules([]);
                setNetworkError(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Obter a sessão atual no mount (hidratação limpa s/ reload)
        supabase.auth.getSession().then(({ data: { session } }) => {
            loadSessionData(session?.user || null);
        });

        // Listener reativo de auth.
        // IMPORTANTE: setLoading(true) só é chamado para eventos que realmente
        // mudam a identidade do usuário (login/logout). Eventos silenciosos como
        // TOKEN_REFRESHED e INITIAL_SESSION NÃO devem desmontar a árvore React.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const eventosQueExigemLoading = ['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'];
            if (eventosQueExigemLoading.includes(event)) {
                setLoading(true);
            }
            loadSessionData(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const retryLoadSessionData = async () => {
        setLoading(true);
        await loadSessionData(authUser);
    };

    const value = {
        authUser,
        tenantLink,
        scopes,
        accessibleModules,
        isSuperAdmin,
        isAuthenticated: !!authUser,
        loading,
        networkError,
        retryLoadSessionData,
        logout: authService.logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser invocado dentro de um AuthProvider');
    }
    return context;
};
