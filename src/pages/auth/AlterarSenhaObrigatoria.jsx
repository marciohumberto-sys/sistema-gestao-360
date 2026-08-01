import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changeOwnTemporaryPassword } from '../../services/passwordService';
import { useAuth } from '../../context/AuthContext';
import { Lock, Eye, EyeOff, Loader2, LogOut, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';

const AlterarSenhaObrigatoria = () => {
    const { logout } = useAuth();
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

        sessionStorage.removeItem('gpi_password_change_success');

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
            
            sessionStorage.setItem('gpi_password_change_success', 'true');
            window.dispatchEvent(new Event('gpi-password-change-success'));
            
            setLoading(false);
            setShowSuccessModal(true);
            return;
            
        } catch (err) {
            setErrorMsg(err.message || 'Não foi possível alterar a senha. Tente novamente.');
            setLoading(false);
        }
    };

    return (
        <div className="alterar-senha-container" style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, #edf7f5 0%, #f8fafc 48%, #eef2f7 100%)', fontFamily: 'var(--font-family, system-ui, sans-serif)', justifyContent: 'center', alignItems: 'center', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
            
            {/* Elementos Decorativos */}
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '420px', height: '420px', borderRadius: '50%', backgroundColor: 'rgba(15, 74, 68, 0.04)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: '360px', height: '360px', borderRadius: '50%', backgroundColor: 'rgba(14, 165, 233, 0.03)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }}></div>
            
            {/* Detalhe Gráfico Institucional */}
            <div style={{ position: 'absolute', top: '15%', right: '-10%', width: '600px', height: '200px', border: '1px solid rgba(15, 74, 68, 0.05)', borderRadius: '100px', transform: 'rotate(-15deg)', pointerEvents: 'none', zIndex: 0 }}></div>

            <div className="alterar-senha-card" style={{ width: '100%', maxWidth: '460px', padding: '2.5rem 3rem', backgroundColor: 'rgba(255, 255, 255, 0.96)', borderRadius: '20px', boxShadow: '0 28px 70px -30px rgba(15, 74, 68, 0.35)', border: '1px solid rgba(15, 74, 68, 0.10)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, boxSizing: 'border-box' }}>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <img 
                        src="/logo-prefeitura_cores.png" 
                        alt="Logo" 
                        style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
                        onError={(e) => e.target.style.display = 'none'}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ecfdf5', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <ShieldCheck size={14} />
                        Ambiente Seguro
                    </div>
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Crie sua nova senha
                </h2>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.5, textAlign: 'center', maxWidth: '340px' }}>
                        Por segurança, substitua a senha temporária antes de continuar.
                    </p>
                </div>

                {errorMsg && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nova senha</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Sua nova senha" 
                                required
                                style={{ width: '100%', padding: '14px 46px 14px 46px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc', boxSizing: 'border-box' }} 
                                onFocus={e => { e.target.style.borderColor = '#0f4a44'; e.target.style.boxShadow = '0 0 0 4px rgba(15, 74, 68, 0.08)'; e.target.style.backgroundColor = '#fff'; }}
                                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#f8fafc'; }}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confirmar nova senha</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Repita a senha" 
                                required
                                style={{ width: '100%', padding: '14px 46px 14px 46px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc', boxSizing: 'border-box' }} 
                                onFocus={e => { e.target.style.borderColor = '#0f4a44'; e.target.style.boxShadow = '0 0 0 4px rgba(15, 74, 68, 0.08)'; e.target.style.backgroundColor = '#fff'; }}
                                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#f8fafc'; }}
                            />
                        </div>
                    </div>

                    <div style={{ padding: '1.25rem', backgroundColor: '#f1f8f6', borderRadius: '12px', border: '1px solid rgba(15, 74, 68, 0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f4a44', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Requisitos de segurança:</p>
                        <div className="requirements-grid" style={{ display: 'grid', gap: '10px' }}>
                            <RequirementItem met={hasLength} text="Mínimo 8 caracteres" />
                            <RequirementItem met={hasUpper} text="Uma maiúscula" />
                            <RequirementItem met={hasLower} text="Uma minúscula" />
                            <RequirementItem met={hasNumber} text="Um número" />
                            <RequirementItem met={hasSpecial} text="Um caractere especial" />
                            <RequirementItem met={password.length > 0 && password === confirmPassword} text="Senhas coincidem" />
                        </div>
                    </div>

                    <button 
                        className="btn-atualizar"
                        type="submit" 
                        disabled={loading || !isValid}
                        style={{ 
                            marginTop: '0.5rem', width: '100%', padding: '14px', 
                            backgroundColor: '#0f4a44', 
                            color: '#fff', border: 'none', borderRadius: '12px', 
                            fontSize: '1rem', fontWeight: 700, cursor: (loading || !isValid) ? 'not-allowed' : 'pointer', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            opacity: (loading || !isValid) ? 0.6 : 1,
                            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            boxShadow: (loading || !isValid) ? 'none' : '0 4px 14px rgba(15, 74, 68, 0.25)' 
                        }}
                    >
                        {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Atualizar Senha'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <button 
                        className="btn-sair"
                        onClick={() => logout()}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'color 0.2s' }}
                    >
                        <LogOut size={16} />
                        Sair da conta
                    </button>
                </div>

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    
                    .requirements-grid {
                        grid-template-columns: 1fr 1fr;
                    }

                    @media (max-width: 480px) {
                        .alterar-senha-container {
                            padding: 16px !important;
                        }
                        .alterar-senha-card {
                            padding: 2rem 1.5rem !important;
                            border-radius: 16px !important;
                        }
                        .requirements-grid {
                            grid-template-columns: 1fr !important;
                        }
                    }

                    .btn-atualizar:not(:disabled):hover {
                        background-color: #135c55 !important;
                        transform: translateY(-1px);
                        box-shadow: 0 6px 20px rgba(15, 74, 68, 0.35) !important;
                    }

                    .btn-sair:not(:disabled):hover {
                        color: #0f4a44 !important;
                    }
                `}</style>

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
