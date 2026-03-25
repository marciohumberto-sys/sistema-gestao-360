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

    const loadSessionData = async (user) => {
        try {
            if (!user) {
                setAuthUser(null);
                setTenantLink(null);
                setScopes([]);
                setAccessibleModules([]);
                setIsSuperAdmin(false);
                return;
            }

            setAuthUser(user);
            const data = await authService.getUserTenantAndScopes(user.id);
            setTenantLink(data.tenantLink);
            setScopes(data.scopes);
            setAccessibleModules(data.accessibleModules);
            setIsSuperAdmin(data.isSuperAdmin);

        } catch (error) {
            console.error("Erro ao carregar dados do usuário:", error);
            setTenantLink(null);
            setAccessibleModules([]);
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

    const value = {
        authUser,
        tenantLink,
        scopes,
        accessibleModules,
        isSuperAdmin,
        isAuthenticated: !!authUser,
        loading,
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
