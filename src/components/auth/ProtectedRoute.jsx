import React, { useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPostLoginRedirectPath } from '../../utils/authUtils';
import { WifiOff, RefreshCw, LogOut } from 'lucide-react';

const ProtectedRoute = ({ module, children }) => {
    const { isAuthenticated, loading, isSuperAdmin, accessibleModules, tenantLink, networkError, retryLoadSessionData, logout } = useAuth();
    const location = useLocation();
    const [retrying, setRetrying] = useState(false);

    // Controla se o splash inicial já foi exibido.
    // Depois que a sessão foi carregada uma vez, loading subsequentes
    // (ex: TOKEN_REFRESHED) não devem desmontar a árvore de componentes.
    const initialLoadDone = useRef(false);
    if (!loading) {
        initialLoadDone.current = true;
    }

    const handleRetry = async () => {
        setRetrying(true);
        try {
            await retryLoadSessionData();
        } catch (e) {
            console.error(e);
        } finally {
            setRetrying(false);
        }
    };

    // Apenas exibe o splash ANTES de qualquer dado de sessão estar disponível
    if (loading && !initialLoadDone.current) {
        return (
            <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 150, 125, 0.1)', borderTopColor: '#00967d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', letterSpacing: '0.02em' }}>
                    Autenticando...
                </span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location, moduleContext: module }} replace />;
    }

    if (networkError) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '2rem' }}>
                <div style={{ maxWidth: '480px', width: '100%', backgroundColor: '#fff', borderRadius: '16px', padding: '3rem 2rem', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #fee2e2' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.1)', animation: 'pulse 2s infinite' }}>
                        <WifiOff size={32} />
                    </div>
                    
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Instabilidade de Conexão Detectada</h1>
                    
                    <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem', textAlign: 'center' }}>
                        Não foi possível carregar as configurações do seu perfil devido a uma oscilação na rede externa (Supabase/Internet).<br/><br/>
                        Sua sessão está **ativa**, mas para sua segurança, estamos aguardando o restabelecimento da conexão para carregar as permissões do sistema.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                        <button 
                            onClick={handleRetry}
                            disabled={retrying}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: '8px', 
                                padding: '12px 24px', 
                                backgroundColor: '#00967d', 
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: '8px', 
                                fontSize: '0.95rem', 
                                fontWeight: 700, 
                                cursor: retrying ? 'not-allowed' : 'pointer', 
                                transition: 'all 0.2s',
                                opacity: retrying ? 0.7 : 1,
                                boxShadow: '0 4px 12px rgba(0, 150, 125, 0.2)'
                            }}
                        >
                            <RefreshCw size={16} style={{ animation: retrying ? 'spin 1s linear infinite' : 'none' }} />
                            {retrying ? 'Tentando Reconectar...' : 'Tentar Reconectar Agora'}
                        </button>

                        <button 
                            onClick={async () => {
                                try {
                                    await logout();
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: '8px', 
                                padding: '12px 24px', 
                                backgroundColor: '#f1f5f9', 
                                color: '#475569', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '8px', 
                                fontSize: '0.9rem', 
                                fontWeight: 600, 
                                cursor: 'pointer', 
                                transition: 'all 0.2s'
                            }}
                        >
                            <LogOut size={16} />
                            Desconectar Sessão
                        </button>
                    </div>
                </div>
                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.9; }
                    }
                `}</style>
            </div>
        );
    }

    if (!tenantLink || !tenantLink.is_active) {
        return <Navigate to="/acesso-negado" replace />;
    }

    if (module && !isSuperAdmin) {
        if (!accessibleModules.includes(module)) {
             const redirectPath = getPostLoginRedirectPath(tenantLink, isSuperAdmin, accessibleModules);
             return <Navigate to={redirectPath} replace />;
        }
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
