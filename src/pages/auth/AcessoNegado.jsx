import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AcessoNegado = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Erro ao desconectar:', error);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '2rem' }}>
            <div style={{ maxWidth: '450px', width: '100%', backgroundColor: '#fff', borderRadius: '16px', padding: '3rem 2rem', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', marginBottom: '1.5rem' }}>
                    <ShieldAlert size={32} />
                </div>
                
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Acesso Restrito</h1>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2.5rem' }}>
                    Seu usuário autenticou com sucesso, mas você não possui um <strong>perfil configurado ou módulos ativos</strong> para acessar a área solicitada.<br/><br/>
                    Por favor, entre em contato com o administrador de T.I. local para solicitar vínculo lógico a um departamento.
                </p>

                <button 
                    onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    <LogOut size={18} />
                    Desconectar Sessão
                </button>
            </div>
        </div>
    );
};

export default AcessoNegado;
