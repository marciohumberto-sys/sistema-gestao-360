import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ module, children }) => {
    const { isAuthenticated, loading, isSuperAdmin, accessibleModules, tenantLink } = useAuth();
    const location = useLocation();

    if (loading) {
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
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!tenantLink || !tenantLink.is_active) {
        return <Navigate to="/acesso-negado" replace />;
    }

    if (module && !isSuperAdmin) {
        if (!accessibleModules.includes(module)) {
             return <Navigate to="/home" replace />;
        }
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
