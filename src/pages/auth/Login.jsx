import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import { normalizeEmail, getPostLoginRedirectPath } from '../../utils/authUtils';
import { brandConfig } from '../../config/brand';
import { Lock, Mail, Loader2 } from 'lucide-react';

const Login = () => {
    const { authUser, isAuthenticated, loading: authLoading, tenantLink, isSuperAdmin, accessibleModules } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [loginStr, setLoginStr] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Se já estiver logado e O CARREGAMENTO CONCLUIU, redireciona.
    // Isso impede falsos redirects enquanto IS_SUPERADMIN ainda estiver mascarado.
    React.useEffect(() => {
        if (isAuthenticated && !authLoading) {
            // PRIORIDADE ABSOLUTA: Marcio Humberto sempre vai para /home
            if (authUser?.email === 'marcio.humberto@gmail.com') {
                console.log('[AUTH DEBUG] Prioridade Absoluta: Marcio detectado. Forçando /home');
                console.log(`[AUTH DEBUG] Email Autenticado: ${authUser.email}`);
                navigate('/home', { replace: true });
                return;
            }

            const from = location.state?.from?.pathname;
            if (from && from !== '/login') {
                navigate(from, { replace: true });
            } else {
                const path = getPostLoginRedirectPath(tenantLink, isSuperAdmin, accessibleModules, authUser?.email);
                console.log(`[AUTH DEBUG] Rota de redirecionamento final: ${path}`);
                navigate(path, { replace: true });
            }
        }
    }, [isAuthenticated, authLoading, navigate, location, tenantLink, isSuperAdmin, accessibleModules, authUser]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const moduleContext = location.state?.moduleContext;
            const fromPathname = location.state?.from?.pathname;
            const emailsToTry = normalizeEmail(loginStr, fromPathname, moduleContext);
            
            let lastError = null;
            let success = false;

            for (let i = 0; i < emailsToTry.length; i++) {
                const currentEmail = emailsToTry[i];
                console.log(`[AUTH DEBUG] Tentativa ${i + 1}/${emailsToTry.length} com email: ${currentEmail}`);
                
                try {
                    await authService.login(currentEmail, password);
                    success = true;
                    console.log(`[AUTH DEBUG] Sucesso na tentativa com o email: ${currentEmail}`);
                    break; // Sucesso: listener do AuthContext atualizará o estado e disparará o redirect
                } catch (err) {
                    lastError = err;
                    if (err.message === 'Invalid login credentials' || err.code === 'invalid_credentials') {
                        console.log(`[AUTH DEBUG] Falha na tentativa com ${currentEmail}. Erro: credenciais inválidas.`);
                        // Se houver mais e-mails no array (fallback), o loop continua. Se acabou, vai pro fim.
                    } else {
                        // Erro estrutural ou de rede (timeout, banco offline), não fará fallback cego. Rejeita.
                        console.error(`[AUTH DEBUG] Erro não mapeável durante a tentativa com ${currentEmail}:`, err);
                        throw err;
                    }
                }
            }

            // Após verificar as possibilidades (seja 1 ou dupla)
            if (!success && lastError) {
                if (lastError.message === 'Invalid login credentials' || lastError.code === 'invalid_credentials') {
                    setErrorMsg('Usuário ou senha incorretos.');
                } else {
                    setErrorMsg('Ocorreu um erro ao tentar fazer login na base do Supabase.');
                }
                setLoading(false);
            }
        } catch (err) {
            console.error('[AUTH DEBUG] Erro fatal no fluxo de login:', err);
            setErrorMsg('Ocorreu um erro grave ao comunicar com a plataforma.');
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8fafc', fontFamily: 'var(--font-family, system-ui, sans-serif)' }}>
            {/* Esquerda - Branding */}
            <div style={{ flex: 1, backgroundColor: 'var(--color-primary)', backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, rgba(0,0,0,0.1) 100%)', display: 'flex', flexDirection: 'column', padding: '5rem 6rem', color: '#fff', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                
                {/* Texturas de profundidade do modo Premium */}
                <div style={{ position: 'absolute', top: '-15%', left: '-15%', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
                <div style={{ position: 'absolute', bottom: '-20%', right: '-20%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,0,0,0.15) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }}></div>

                <div style={{ position: 'relative', zIndex: 1, maxWidth: '540px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: '3.5rem' }}>
                    
                    <img 
                        src="/logo-prefeitura_branco.png" 
                        alt={`Prefeitura de ${brandConfig.cityName}`} 
                        style={{ width: '270px', height: 'auto', objectFit: 'contain', display: 'block', opacity: 0.95, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }} 
                        onError={(e) => e.target.style.display = 'none'}
                    />

                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.06em', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase', color: '#ffffff', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            Ambiente Institucional
                        </div>
                        <h1 style={{ fontSize: '2.45rem', fontWeight: 800, marginBottom: '1.25rem', lineHeight: 1.15, letterSpacing: '-0.02em', color: '#ffffff', textShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                            Sistema<br/>Gestão 360
                        </h1>
                        <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.95)', lineHeight: 1.6, fontWeight: 400, maxWidth: '95%', textShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                            Plataforma unificada para controle inteligente de recursos e processos da Prefeitura de {brandConfig.cityName}.
                        </p>
                    </div>
                </div>
            </div>

            {/* Direita - Formulário */}
            <div style={{ width: '520px', display: 'flex', flexDirection: 'column', padding: '5rem 5.5rem', backgroundColor: '#fff', boxShadow: '-24px 0 48px rgba(0,0,0,0.06), 1px 0 0 rgba(0,0,0,0.02) inset', position: 'relative', zIndex: 10 }}>
                {/* Linha invisível macia criando a separação premium (Inset Effect) */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '1px', background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0) 100%)' }}></div>
                
                <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Acesso Restrito</h2>
                    <p style={{ color: '#64748b', marginBottom: '2.5rem', fontSize: '1.05rem', lineHeight: 1.5 }}>Entre com suas credenciais institucionais.</p>

                    {errorMsg && (
                        <div style={{ padding: '14px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>USUÁRIO</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} strokeWidth={2.5} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                <input 
                                    type="text" 
                                    value={loginStr}
                                    onChange={e => {
                                        const val = e.target.value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9.]/g, '');
                                        setLoginStr(val);
                                    }}
                                    placeholder="Ex: isabella.oliveira" 
                                    required
                                    style={{ width: '100%', padding: '15px 15px 15px 46px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box', backgroundColor: '#fdfdfd' }} 
                                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 4px rgba(0,180,150, 0.1)'; e.target.style.backgroundColor = '#fff'; }}
                                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#fdfdfd'; }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Senha de Acesso</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} strokeWidth={2.5} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" 
                                    required
                                    style={{ width: '100%', padding: '15px 15px 15px 46px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box', backgroundColor: '#fdfdfd' }} 
                                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 4px rgba(0,180,150, 0.1)'; e.target.style.backgroundColor = '#fff'; }}
                                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#fdfdfd'; }}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !loginStr || !password}
                            style={{ 
                                marginTop: '1rem', width: '100%', padding: '16px', 
                                backgroundColor: '#0f4a44', // Verde escuro exato e irrevogável
                                color: '#fff', border: 'none', borderRadius: '12px', 
                                fontSize: '1.1rem', fontWeight: 700, cursor: (loading || !loginStr || !password) ? 'not-allowed' : 'pointer', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)', 
                                opacity: 1, // Fixado em 1 para a cor não ser esbranquiçada pelo fundo branco
                                boxShadow: (loading || !loginStr || !password) ? 'none' : '0 4px 14px rgba(15, 74, 68, 0.25)' 
                            }}
                            onMouseEnter={e => { if(!loading && loginStr && password) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 74, 68, 0.4)'; e.currentTarget.style.backgroundColor = '#135c55'; } }}
                            onMouseLeave={e => { if(!loading && loginStr && password) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 74, 68, 0.25)'; e.currentTarget.style.backgroundColor = '#0f4a44'; } }}
                            onMouseDown={e => { if(!loading && loginStr && password) { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 74, 68, 0.2)'; e.currentTarget.style.backgroundColor = '#0b3833'; } }}
                        >
                            {loading ? <Loader2 size={22} className="farmacia-spin" /> : 'Entrar no Sistema'}
                        </button>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } } .farmacia-spin { animation: spin 1s linear infinite; }`}</style>
                    </form>
                </div>

                <div style={{ marginTop: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', paddingTop: '3rem', fontWeight: 500 }}>
                    &copy; {new Date().getFullYear()} Gestão Pública Inteligente
                </div>
            </div>
        </div>
    );
};

export default Login;
