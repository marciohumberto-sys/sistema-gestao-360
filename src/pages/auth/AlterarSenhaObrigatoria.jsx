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
        <div className="alterar-senha-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #edf7f5 0%, #f8fafc 50%, #eef3f7 100%)', padding: '2rem', fontFamily: 'var(--font-family, system-ui, sans-serif)', position: 'relative', overflow: 'hidden' }}>
            
            {/* Formas orgânicas desfocadas no fundo */}
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '450px', height: '450px', borderRadius: '50%', backgroundColor: 'rgba(15, 74, 68, 0.03)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', backgroundColor: 'rgba(14, 165, 233, 0.03)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }}></div>

            <div className="alterar-senha-container" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '980px', minHeight: '560px', backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 30px 80px -35px rgba(15, 74, 68, 0.38)', display: 'grid', gridTemplateColumns: 'minmax(300px, 0.85fr) minmax(0, 1.65fr)', overflow: 'hidden', border: '1px solid rgba(15, 74, 68, 0.08)' }}>
                
                {/* PAINEL INFORMATIVO ESQUERDO */}
                <div className="info-panel" style={{ backgroundColor: 'var(--color-primary, #0f4a44)', backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)', color: '#fff', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                    
                    {/* Decoração interna do painel */}
                    <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }}></div>
                    <ShieldCheck size={200} style={{ position: 'absolute', bottom: '-15%', left: '-15%', color: '#ffffff', opacity: 0.03, transform: 'rotate(-15deg)', pointerEvents: 'none' }} />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <img 
                            src="/logo-prefeitura_branco.png" 
                            alt="Logo Prefeitura" 
                            style={{ height: 'auto', width: '200px', objectFit: 'contain', alignSelf: 'flex-start', opacity: 0.95 }}
                            onError={(e) => e.target.style.display = 'none'}
                        />

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)', width: 'fit-content' }}>
                            <ShieldCheck size={14} />
                            Ambiente Protegido
                        </div>
                    </div>

                    <div style={{ position: 'relative', zIndex: 1, marginTop: '2.5rem', marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2, letterSpacing: '-0.02em', color: '#ffffff' }}>
                            Proteja seu acesso
                        </h2>
                        
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, fontWeight: 400, margin: 0 }}>
                            Crie uma senha pessoal e segura para continuar no Gestão 360.
                        </p>
                    </div>

                    <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                        <Lock size={20} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, margin: 0 }}>
                            Sua senha temporária deixará de funcionar após a atualização.
                        </p>
                    </div>
                </div>

                {/* ÁREA DO FORMULÁRIO DIREITO */}
                <div className="form-panel" style={{ padding: '2.5rem 3rem', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', position: 'relative', overflowY: 'auto' }}>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                            SEGURANÇA DA CONTA
                        </span>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem', letterSpacing: '-0.025em' }}>
                            Crie sua nova senha
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.5, margin: 0 }}>
                            Substitua a senha temporária por uma senha pessoal para continuar.
                        </p>
                    </div>

                    {errorMsg && (
                        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nova senha</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} strokeWidth={2.5} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Sua nova senha" 
                                        required
                                        style={{ width: '100%', padding: '12px 46px 12px 46px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', backgroundColor: '#fdfdfd', boxSizing: 'border-box' }} 
                                        onFocus={e => { e.target.style.borderColor = 'var(--color-primary, #0f4a44)'; e.target.style.boxShadow = '0 0 0 4px rgba(15, 74, 68, 0.08)'; e.target.style.backgroundColor = '#fff'; }}
                                        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#fdfdfd'; }}
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
                                    <Lock size={18} strokeWidth={2.5} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Repita a senha" 
                                        required
                                        style={{ width: '100%', padding: '12px 46px 12px 46px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', backgroundColor: '#fdfdfd', boxSizing: 'border-box' }} 
                                        onFocus={e => { e.target.style.borderColor = 'var(--color-primary, #0f4a44)'; e.target.style.boxShadow = '0 0 0 4px rgba(15, 74, 68, 0.08)'; e.target.style.backgroundColor = '#fff'; }}
                                        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#fdfdfd'; }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem', marginTop: '1.25rem', marginBottom: '1.25rem' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Requisitos de segurança</p>
                            <div className="requirements-grid" style={{ display: 'grid', gap: '6px' }}>
                                <RequirementItem met={hasLength} text="Mínimo de 8 caracteres" />
                                <RequirementItem met={hasUpper} text="Uma letra maiúscula" />
                                <RequirementItem met={hasLower} text="Uma letra minúscula" />
                                <RequirementItem met={hasNumber} text="Um número" />
                                <RequirementItem met={hasSpecial} text="Um caractere especial" />
                                <RequirementItem met={password.length > 0 && password === confirmPassword} text="As senhas coincidem" />
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <button 
                                className="btn-atualizar"
                                type="submit" 
                                disabled={loading || !isValid}
                                style={{ 
                                    width: '100%', padding: '14px', 
                                    backgroundColor: 'var(--color-primary, #0f4a44)', 
                                    color: '#fff', border: 'none', borderRadius: '10px', 
                                    fontSize: '1.05rem', fontWeight: 700, cursor: (loading || !isValid) ? 'not-allowed' : 'pointer', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                }}
                            >
                                {loading ? <Loader2 size={20} className="spin-anim" /> : 'Atualizar Senha'}
                            </button>
                            
                            <button 
                                className="btn-sair"
                                type="button"
                                onClick={() => logout()}
                                disabled={loading}
                                style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'color 0.2s' }}
                            >
                                <LogOut size={16} />
                                Sair da conta
                            </button>
                        </div>
                    </form>
                </div>

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .spin-anim { animation: spin 1s linear infinite; }
                    
                    .requirements-grid {
                        grid-template-columns: 1fr 1fr;
                    }

                    @media (max-width: 900px) {
                        .alterar-senha-page {
                            padding: 1rem !important;
                            align-items: flex-start !important;
                        }
                        .alterar-senha-container {
                            grid-template-columns: 1fr !important;
                            min-height: auto !important;
                        }
                        .info-panel {
                            padding: 2.5rem 2rem !important;
                        }
                        .form-panel {
                            padding: 2.5rem 2rem !important;
                        }
                        .requirements-grid {
                            grid-template-columns: 1fr !important;
                        }
                    }

                    .btn-atualizar:not(:disabled) {
                        box-shadow: 0 4px 14px rgba(15, 74, 68, 0.25);
                    }

                    .btn-atualizar:not(:disabled):hover {
                        background-color: #135c55 !important;
                        transform: translateY(-1px);
                        box-shadow: 0 6px 20px rgba(15, 74, 68, 0.3) !important;
                    }

                    .btn-atualizar:not(:disabled):active {
                        transform: translateY(1px);
                        box-shadow: 0 2px 8px rgba(15, 74, 68, 0.15) !important;
                    }

                    .btn-atualizar:disabled {
                        background-color: #94a3b8 !important;
                        opacity: 0.7;
                    }

                    .btn-sair:not(:disabled):hover {
                        color: #0f4a44 !important;
                    }
                `}</style>

                {/* MODAL DE SUCESSO (Inalterado) */}
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
                                {isLoggingOut ? <Loader2 size={20} className="spin-anim" /> : 'Entrar novamente'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const RequirementItem = ({ met, text }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: met ? '#0f4a44' : '#64748b', fontWeight: met ? 600 : 500, padding: '2px 0' }}>
        {met ? <CheckCircle size={14} color="#059669" /> : <XCircle size={14} color="#cbd5e1" />}
        <span>{text}</span>
    </div>
);

export default AlterarSenhaObrigatoria;
