import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changeOwnTemporaryPassword } from '../../services/passwordService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Lock, Eye, EyeOff, Loader2, LogOut, CheckCircle, XCircle } from 'lucide-react';

const AlterarSenhaObrigatoria = () => {
    const { logout, retryLoadSessionData } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();

    const handleLoginAgain = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            await logout();
        } catch (error) {
            console.error('Erro ao encerrar sessão após troca de senha:', error);
        } finally {
            navigate('/login', { replace: true });
        }
    };

    const hasLength = password.length >= 8 && password.length <= 128;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const isValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial && password === confirmPassword;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!isValid) {
            setErrorMsg('A senha não atende aos requisitos de segurança ou as senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            await changeOwnTemporaryPassword(password);
            
            const { data, error } = await supabase.auth.refreshSession();
            
            if (error || !data?.session) {
                setLoading(false);
                setShowSuccessModal(true);
                return;
            }

            if (data.session.user?.app_metadata?.must_change_password === true) {
                setLoading(false);
                setShowSuccessModal(true);
                return;
            }

            await retryLoadSessionData(data.session.user);
            
        } catch (err) {
            setErrorMsg(err.message || 'Não foi possível alterar a senha. Tente novamente.');
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8fafc', fontFamily: 'var(--font-family, system-ui, sans-serif)', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '440px', padding: '2.5rem 3rem', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <img 
                        src="/logo-prefeitura_cores.png" 
                        alt="Logo" 
                        style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
                        onError={(e) => e.target.style.display = 'none'}
                    />
                </div>

                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', textAlign: 'center', letterSpacing: '-0.02em' }}>
                    Crie sua nova senha
                </h2>
                <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.5, textAlign: 'center' }}>
                    Por segurança, substitua a senha temporária antes de continuar.
                </p>

                {errorMsg && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nova senha</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Sua nova senha" 
                                required
                                style={{ width: '100%', padding: '14px 46px 14px 46px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', backgroundColor: '#fdfdfd', boxSizing: 'border-box' }} 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confirmar nova senha</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Repita a senha" 
                                required
                                style={{ width: '100%', padding: '14px 46px 14px 46px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', backgroundColor: '#fdfdfd', boxSizing: 'border-box' }} 
                            />
                        </div>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Requisitos de segurança:</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <RequirementItem met={hasLength} text="Mínimo 8 caracteres" />
                            <RequirementItem met={hasUpper} text="Uma maiúscula" />
                            <RequirementItem met={hasLower} text="Uma minúscula" />
                            <RequirementItem met={hasNumber} text="Um número" />
                            <RequirementItem met={hasSpecial} text="Um caractere especial" />
                            <RequirementItem met={password.length > 0 && password === confirmPassword} text="Senhas coincidem" />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !isValid}
                        style={{ 
                            marginTop: '0.5rem', width: '100%', padding: '14px', 
                            backgroundColor: '#0f4a44', 
                            color: '#fff', border: 'none', borderRadius: '12px', 
                            fontSize: '1rem', fontWeight: 700, cursor: (loading || !isValid) ? 'not-allowed' : 'pointer', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            opacity: (loading || !isValid) ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: (loading || !isValid) ? 'none' : '0 4px 14px rgba(15, 74, 68, 0.25)' 
                        }}
                    >
                        {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Atualizar Senha'}
                    </button>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </form>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <button 
                        onClick={() => logout()}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'color 0.2s' }}
                    >
                        <LogOut size={16} />
                        Sair da conta
                    </button>
                </div>

                {showSuccessModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <div style={{ width: '400px', backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ backgroundColor: '#ecfdf5', color: '#10b981', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
                                <CheckCircle size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Senha alterada com sucesso</h3>
                            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>Entre novamente usando sua nova senha.</p>
                            <button 
                                disabled={isLoggingOut}
                                onClick={handleLoginAgain}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: isLoggingOut ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isLoggingOut ? 0.7 : 1, display: 'flex', justifyContent: 'center' }}
                            >
                                {isLoggingOut ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Entrar novamente'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

const RequirementItem = ({ met, text }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: met ? '#059669' : '#64748b', fontWeight: 500 }}>
        {met ? <CheckCircle size={14} color="#059669" /> : <XCircle size={14} color="#94a3b8" />}
        <span>{text}</span>
    </div>
);

export default AlterarSenhaObrigatoria;
