import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    Search, 
    Plus, 
    Filter, 
    ChevronDown, 
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    TrendingUp,
    MessageSquare,
    AlertCircle,
    X,
    Loader,
    ShieldAlert,
    Target,
    HelpCircle,
    Eye,
    Edit2,
    Check
} from 'lucide-react';
import '../farmacia/FarmaciaPages.css';
import '../farmacia/FarmaciaModal.css';
import { useAuth } from '../../context/AuthContext';
import {
    fetchEntraves,
    createEntrave,
    updateEntrave,
    resolveEntrave,
    fetchAcoesParaEntraves,
} from '../../services/api/planejamentoEntraves.service';

const PlanejamentoEntraves = () => {
    const { tenantLink } = useAuth();
    const tenantId = tenantLink?.tenant_id;

    // ---- ESTADO ----
    const [entraves, setEntraves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [acoes, setAcoes] = useState([]); // para popular o select do modal

    // Filtros
    const [busca, setBusca] = useState('');
    const [acaoFiltro, setAcaoFiltro] = useState('Todas');
    const [secretariaFiltro, setSecretariaFiltro] = useState('Todas');
    const [gravidadeFiltro, setGravidadeFiltro] = useState('Todas');
    const [statusFiltro, setStatusFiltro] = useState('Todos');
    const [responsavelFiltro, setResponsavelFiltro] = useState('Todos');

    // Modais
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [editingEntrave, setEditingEntrave] = useState(null);
    const [viewingEntrave, setViewingEntrave] = useState(null);

    const emptyForm = {
        acaoId: '',
        acaoNome: '',
        secretaria: '',
        titulo: '',
        descricao: '',
        gravidade: 'Média',
        status: 'Aberto',
        responsavel: '',
        setor: '',
        prazo: '',
        impacto: '',
        providencia: ''
    };
    const [formData, setFormData] = useState(emptyForm);

    // Toast
    const [toast, setToast] = useState(null);
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // ---- CARGA REAL DO SUPABASE ----
    const loadEntraves = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        setLoadError(null);
        try {
            const data = await fetchEntraves(tenantId);
            setEntraves(data);
        } catch (err) {
            console.error('[PlanejamentoEntraves] Erro ao carregar:', err);
            setLoadError('Não foi possível carregar os entraves. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        if (tenantId) {
            loadEntraves();
            fetchAcoesParaEntraves(tenantId).then(setAcoes).catch(console.error);
        }
    }, [tenantId, loadEntraves]);

    // ---- LISTAS ÚNICAS PARA FILTROS ----
    const acoesUnicas = useMemo(() => [...new Set(entraves.map(a => a.acaoNome))].sort(), [entraves]);
    const secretariasUnicas = useMemo(() => [...new Set(entraves.map(a => a.secretaria))].sort(), [entraves]);
    const gravidadesUnicas = ['Baixa', 'Média', 'Alta', 'Crítica'];
    const statusUnicos = ['Aberto', 'Em Tratativa', 'Resolvido'];
    const responsaveisUnicos = useMemo(() => [...new Set(entraves.filter(e => e.responsavel).map(a => a.responsavel))].sort(), [entraves]);

    // ---- FILTRAGEM ----
    const entravesFiltrados = useMemo(() => {
        return entraves.filter(item => {
            const mBusca = (item.acaoNome || '').toLowerCase().includes(busca.toLowerCase()) || 
                           (item.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
                           (item.responsavel || '').toLowerCase().includes(busca.toLowerCase()) ||
                           (item.secretaria || '').toLowerCase().includes(busca.toLowerCase()) ||
                           (item.impacto || '').toLowerCase().includes(busca.toLowerCase()) ||
                           (item.providencia || '').toLowerCase().includes(busca.toLowerCase());
            
            const mAcao = acaoFiltro === 'Todas' || item.acaoNome === acaoFiltro;
            const mSec = secretariaFiltro === 'Todas' || item.secretaria === secretariaFiltro;
            const mGrav = gravidadeFiltro === 'Todas' || item.gravidade === gravidadeFiltro;
            const mStatus = statusFiltro === 'Todos' || item.status === statusFiltro;
            const mResp = responsavelFiltro === 'Todos' || 
                          (responsavelFiltro === 'Sem Responsável' ? !item.responsavel : item.responsavel === responsavelFiltro);

            return mBusca && mAcao && mSec && mGrav && mStatus && mResp;
        }).sort((a, b) => {
            if (a.status !== 'Resolvido' && b.status === 'Resolvido') return -1;
            if (a.status === 'Resolvido' && b.status !== 'Resolvido') return 1;
            return new Date(b.dataRegistro) - new Date(a.dataRegistro);
        });
    }, [entraves, busca, acaoFiltro, secretariaFiltro, gravidadeFiltro, statusFiltro, responsavelFiltro]);

    // ---- MÉTRICAS PARA CARDS ----
    const metrics = useMemo(() => {
        let abertos = 0;
        let tratativa = 0;
        let criticos = 0;
        let resolvidos = 0;
        let semResp = 0;

        entravesFiltrados.forEach(item => {
            if (item.status === 'Aberto') abertos++;
            if (item.status === 'Em Tratativa') tratativa++;
            if (item.status === 'Resolvido') resolvidos++;
            if (item.isCritico || item.gravidade === 'Alta' || item.gravidade === 'Crítica') criticos++;
            if (!item.responsavel || item.responsavel.trim() === '') semResp++;
        });

        return { total: entravesFiltrados.length, abertos, tratativa, criticos, resolvidos, semResp };
    }, [entravesFiltrados]);

    // ---- HELPERS VISUAIS ----
    const getGravidadeConfig = (g) => {
        switch(g) {
            case 'Baixa': return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
            case 'Média': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
            case 'Alta': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
            case 'Crítica': return { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)' };
            default: return { color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' };
        }
    };

    const getStatusConfig = (s) => {
        switch(s) {
            case 'Aberto': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: AlertCircle };
            case 'Em Tratativa': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: Activity };
            case 'Resolvido': return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: CheckCircle2 };
            default: return { color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', icon: AlertCircle };
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '--';
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    };

    // ---- AÇÕES ----
    const handleSave = async (e) => {
        e.preventDefault();
        if (!tenantId) return;
        setSaveLoading(true);
        setSaveError(null);
        try {
            if (editingEntrave) {
                const updated = await updateEntrave(tenantId, editingEntrave.id, {
                    ...formData,
                    _statusAnterior_db: editingEntrave.status_db,
                });
                setToast('Entrave atualizado com sucesso.');
                // Se o modal de visualização estiver aberto, atualizar o item
                if (viewingEntrave && viewingEntrave.id === editingEntrave.id) {
                    setViewingEntrave(null);
                    setIsViewModalOpen(false);
                }
            } else {
                await createEntrave(tenantId, formData);
                setToast('Entrave registrado com sucesso.');
            }
            setIsFormModalOpen(false);
            setFormData(emptyForm);
            setEditingEntrave(null);
            await loadEntraves();
        } catch (err) {
            console.error('[PlanejamentoEntraves] Erro ao salvar:', err);
            setSaveError(err.message || 'Erro ao salvar entrave. Tente novamente.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleResolve = async (entrave) => {
        if (!tenantId) return;
        try {
            await resolveEntrave(tenantId, entrave.id);
            setToast('Entrave marcado como resolvido!');
            if (viewingEntrave && viewingEntrave.id === entrave.id) {
                setIsViewModalOpen(false);
                setViewingEntrave(null);
            }
            await loadEntraves();
        } catch (err) {
            console.error('[PlanejamentoEntraves] Erro ao resolver:', err);
            setToast('Erro ao marcar como resolvido. Tente novamente.');
        }
    };

    const openEdit = (entrave) => {
        setEditingEntrave(entrave);
        setSaveError(null);
        setFormData({
            acaoId: entrave.acaoId || '',
            acaoNome: entrave.acaoNome || '',
            secretaria: entrave.secretaria || '',
            titulo: entrave.titulo || '',
            descricao: entrave.descricao || '',
            gravidade: entrave.gravidade || 'Média',
            status: entrave.status || 'Aberto',
            responsavel: entrave.responsavel || '',
            setor: entrave.setor || '',
            prazo: entrave.prazo || '',
            impacto: entrave.impacto || '',
            providencia: entrave.providencia || '',
            _statusAnterior_db: entrave.status_db,
        });
        setIsFormModalOpen(true);
    };

    const openView = (entrave) => {
        setViewingEntrave(entrave);
        setIsViewModalOpen(true);
    };

    return (
        <div className="farmacia-page-container">
            {/* Cabeçalho */}
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Entraves das Ações</h1>
                    <p className="farmacia-page-subtitle">Acompanhe problemas, riscos e impedimentos que podem impactar a execução das ações estratégicas.</p>
                </div>
                <button className="farmacia-btn-primary" onClick={() => {
                    setEditingEntrave(null);
                    setFormData(emptyForm);
                    setIsFormModalOpen(true);
                }} disabled={loading}>
                    <Plus size={18} /> Novo Entrave
                </button>
            </header>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .farmacia-btn-secondary {
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 0.5rem !important;
                    background: #f8fafc !important;
                    color: #334155 !important;
                    border: 1px solid #cbd5e1 !important;
                    border-radius: 8px !important;
                    font-size: 0.875rem !important;
                    font-weight: 600 !important;
                    padding: 0.5rem 1.1rem !important;
                    height: 38px !important;
                    cursor: pointer !important;
                    transition: all 180ms ease !important;
                    white-space: nowrap !important;
                }
                .farmacia-btn-secondary:hover {
                    background: #f1f5f9 !important;
                    border-color: #94a3b8 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }
            `}</style>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)', gap: '0.5rem' }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.875rem' }}>Carregando entraves...</span>
                </div>
            ) : loadError ? (
                <div className="farmacia-card" style={{ padding: '3rem 2rem', textAlign: 'center', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <AlertTriangle size={32} style={{ opacity: 0.7 }} />
                    <p style={{ fontWeight: 600, margin: 0 }}>{loadError}</p>
                    <button className="farmacia-btn-secondary" onClick={loadEntraves} style={{ marginTop: '0.5rem' }}>Tentar novamente</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {/* Cards Executivos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '32px' }}>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '4px solid #94a3b8' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total de Entraves</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>{metrics.total}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '4px solid #cbd5e1' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Abertos</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>{metrics.abertos}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '4px solid #3b82f6' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Em Tratativa</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>{metrics.tratativa}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '4px solid #dc2626', background: 'rgba(239, 68, 68, 0.05)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Críticos</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{metrics.criticos}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Resolvidos</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{metrics.resolvidos}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Sem Responsável</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{metrics.semResp}</div>
                        </div>
                    </div>

                    {/* Toolbar de Filtros */}
                    <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0', marginBottom: '32px' }}>
                        <div className="farmacia-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
                            <div className="farmacia-search-box" style={{ flex: '2 1 250px', maxWidth: 'none', margin: 0 }}>
                                <Search size={16} className="farmacia-search-icon" />
                                <input
                                    type="text"
                                    className="farmacia-search-input"
                                    placeholder="Buscar texto..."
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                />
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 150px' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%', appearance: 'auto', WebkitAppearance: 'auto', MozAppearance: 'auto' }} value={acaoFiltro} onChange={(e) => setAcaoFiltro(e.target.value)}>
                                    <option value="Todas">Ação: Todas</option>
                                    {acoesUnicas.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 150px' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%', appearance: 'auto', WebkitAppearance: 'auto', MozAppearance: 'auto' }} value={secretariaFiltro} onChange={(e) => setSecretariaFiltro(e.target.value)}>
                                    <option value="Todas">Sec: Todas</option>
                                    {secretariasUnicas.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 160px' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%', appearance: 'auto', WebkitAppearance: 'auto', MozAppearance: 'auto' }} value={gravidadeFiltro} onChange={(e) => setGravidadeFiltro(e.target.value)}>
                                    <option value="Todas">Gravidade: Todas</option>
                                    {gravidadesUnicas.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 140px' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%', appearance: 'auto', WebkitAppearance: 'auto', MozAppearance: 'auto' }} value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
                                    <option value="Todos">Status: Todos</option>
                                    {statusUnicos.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 140px' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%', appearance: 'auto', WebkitAppearance: 'auto', MozAppearance: 'auto' }} value={responsavelFiltro} onChange={(e) => setResponsavelFiltro(e.target.value)}>
                                    <option value="Todos">Resp: Todos</option>
                                    <option value="Sem Responsável">Sem Responsável</option>
                                    {responsaveisUnicos.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Listagem de Entraves em Cards */}
                    {entravesFiltrados.length === 0 ? (
                        <div className="farmacia-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldAlert size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', fontWeight: 600, marginBottom: '4px' }}>Nenhum entrave registrado.</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                                    Registre entraves para acompanhar problemas que possam impactar a execução das ações estratégicas.
                                </p>
                            </div>
                            <button className="farmacia-btn-secondary" onClick={() => setIsFormModalOpen(true)} style={{ marginTop: '0.5rem' }}>
                                <Plus size={16} /> Registrar primeiro entrave
                            </button>
                        </div>
                    ) : (
                        <div 
                            style={{ 
                                display: 'grid', 
                                gridTemplateColumns: entravesFiltrados.length === 1
                                    ? '1fr'
                                    : entravesFiltrados.length === 4
                                    ? 'repeat(2, 1fr)'
                                    : 'repeat(auto-fit, minmax(400px, 1fr))', 
                                gap: '1rem',
                                alignItems: 'stretch'
                            }}
                        >
                            {entravesFiltrados.map(item => {
                                const gConf = getGravidadeConfig(item.gravidade);
                                const sConf = getStatusConfig(item.status);
                                const StatusIcon = sConf.icon;
                                
                                const getHeatmap = () => {
                                    if (item.status === 'Resolvido') {
                                        return { borderLeft: '3px solid #10b981' };
                                    }
                                    switch (item.gravidade) {
                                        case 'Baixa': return { borderLeft: '3px solid #3b82f6' };
                                        case 'Média': return { borderLeft: '3px solid #f59e0b' };
                                        case 'Alta': return { borderLeft: '3px solid #ef4444' };
                                        case 'Crítica': return { borderLeft: '3px solid #dc2626' };
                                        default: return { borderLeft: `3px solid ${gConf.color}` };
                                    }
                                };
                                const heatmap = getHeatmap();
                                
                                return (
                                    <div key={item.id} className="farmacia-card" style={{ 
                                        padding: '1rem', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        cursor: 'default',
                                        borderLeft: heatmap.borderLeft,
                                        borderTop: `1px solid var(--border)`,
                                        borderRight: `1px solid var(--border)`,
                                        borderBottom: `1px solid var(--border)`,
                                        background: '#ffffff',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
                                        opacity: item.status === 'Resolvido' ? 0.85 : 1
                                    }}>
                                        <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
                                            {/* Mini Timeline Lateral */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12px', flexShrink: 0, padding: '4px 0 4px 6px', position: 'relative' }}>
                                                {(() => {
                                                    const isAberta = item.status !== 'Em Tratativa' && item.status !== 'Resolvido';
                                                    const isTratativa = item.status === 'Em Tratativa';
                                                    const isResolvido = item.status === 'Resolvido';

                                                    const getRgb = () => {
                                                        if (isResolvido) return '52, 211, 153'; // Verde pastel
                                                        if (item.gravidade === 'Crítica' || item.gravidade === 'Alta') return '248, 113, 113'; // Vermelho
                                                        if (item.gravidade === 'Média') return '251, 191, 36'; // Laranja
                                                        return '96, 165, 250'; // Azul (Baixa)
                                                    };
                                                    const rgb = getRgb();

                                                    // Nó 1: Registrado
                                                    const n1Opacity = isAberta ? 1 : 0.4;
                                                    const n1Size = isAberta ? '7px' : '5px';
                                                    const n1Bg = `rgb(${rgb})`;
                                                    const n1Border = isAberta ? `2px solid rgba(${rgb}, 0.2)` : 'none';
                                                    
                                                    // Linha 1 (Registrado -> Tratativa)
                                                    const l1Opacity = 1;
                                                    const l1Bg = isAberta ? 'var(--border)' : `rgba(${rgb}, 0.5)`;

                                                    // Nó 2: Em Tratativa
                                                    const n2Opacity = isTratativa ? 1 : (isResolvido ? 0.4 : 0.2);
                                                    const n2Size = isTratativa ? '7px' : '5px';
                                                    const n2Bg = isAberta ? '#ffffff' : `rgb(${rgb})`;
                                                    const n2Border = isAberta ? '1px solid var(--border)' : (isTratativa ? `2px solid rgba(${rgb}, 0.2)` : 'none');

                                                    // Linha 2 (Tratativa -> Resolvido)
                                                    const l2Opacity = 1;
                                                    const l2Bg = isResolvido ? `rgba(${rgb}, 0.5)` : 'var(--border)';

                                                    // Nó 3: Resolvido
                                                    const n3Opacity = isResolvido ? 1 : 0.2;
                                                    const n3Size = isResolvido ? '7px' : '5px';
                                                    const n3Bg = isResolvido ? `rgb(${rgb})` : '#ffffff';
                                                    const n3Border = isResolvido ? `2px solid rgba(${rgb}, 0.2)` : '1px solid var(--border)';

                                                    return (
                                                        <>
                                                            <div className="premium-tooltip-wrap" style={{ display: 'flex', justifyContent: 'center' }}>
                                                                <div style={{ width: n1Size, height: n1Size, borderRadius: '50%', background: n1Bg, border: n1Border, opacity: n1Opacity, zIndex: 2, position: 'relative', transition: 'all 0.3s ease' }} />
                                                                <span className="premium-tooltip" style={{ left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '12px', bottom: 'auto' }}>Registrado</span>
                                                            </div>
                                                            <div style={{ width: '1px', flex: 1, background: l1Bg, margin: '2px 0', opacity: l1Opacity, transition: 'all 0.3s ease' }} />
                                                            
                                                            <div className="premium-tooltip-wrap" style={{ display: 'flex', justifyContent: 'center' }}>
                                                                <div style={{ width: n2Size, height: n2Size, borderRadius: '50%', background: n2Bg, border: n2Border, opacity: n2Opacity, zIndex: 2, position: 'relative', transition: 'all 0.3s ease' }} />
                                                                <span className="premium-tooltip" style={{ left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '12px', bottom: 'auto' }}>Em Tratativa</span>
                                                            </div>
                                                            <div style={{ width: '1px', flex: 1, background: l2Bg, margin: '2px 0', opacity: l2Opacity, transition: 'all 0.3s ease' }} />

                                                            <div className="premium-tooltip-wrap" style={{ display: 'flex', justifyContent: 'center' }}>
                                                                <div style={{ width: n3Size, height: n3Size, borderRadius: '50%', background: n3Bg, border: n3Border, opacity: n3Opacity, zIndex: 2, position: 'relative', transition: 'all 0.3s ease' }} />
                                                                <span className="premium-tooltip" style={{ left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '12px', bottom: 'auto' }}>Resolvido</span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {/* Conteúdo Principal do Card */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                                                {/* Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px 0', textDecoration: item.status === 'Resolvido' ? 'line-through' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {item.status === 'Resolvido' && <CheckCircle2 size={14} color="#10b981" />}
                                                            {item.acaoNome}
                                                        </h3>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                            {item.secretaria}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: sConf.bg, color: sConf.color, border: `1px solid ${sConf.color}30`, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                            <StatusIcon size={10} strokeWidth={2.5} /> {item.status}
                                                        </span>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: gConf.bg, color: gConf.color, border: `1px solid ${gConf.color}30`, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                            Gravidade: {item.gravidade}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Descrição Principal */}
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>
                                                    {item.descricao}
                                                </div>

                                                {/* Detalhes (Impacto e Providência) */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                    {item.impacto && (
                                                        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '6px' }}>
                                                            <span style={{ fontWeight: 700, color: '#475569', minWidth: '80px' }}>Impacto:</span>
                                                            <span style={{ color: '#334155' }}>{item.impacto}</span>
                                                        </div>
                                                    )}
                                                    {item.providencia && (
                                                        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '6px' }}>
                                                            <span style={{ fontWeight: 700, color: '#475569', minWidth: '80px' }}>Providência:</span>
                                                            <span style={{ color: '#334155' }}>{item.providencia}</span>
                                                        </div>
                                                    )}
                                                    {!item.impacto && !item.providencia && (
                                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                            Nenhum detalhe adicional registrado.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Rodapé Metadados e Ações */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Clock size={12} /> Registrado em: {formatDate(item.dataRegistro)}
                                                        </span>
                                                        {item.status === 'Resolvido' ? (
                                                            <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                                <CheckCircle2 size={12} /> Resolvido em: {formatDate(item.dataResolucao)}
                                                            </span>
                                                        ) : (
                                                            item.responsavel ? (
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    Resp: {item.responsavel}
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--bg-muted)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 600, alignSelf: 'flex-start' }}>
                                                                    Sem responsável
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        {item.status !== 'Resolvido' && (
                                                            <button className="farmacia-action-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }} onClick={() => handleResolve(item)}>
                                                                <Check size={15} />
                                                                <span className="premium-tooltip">Marcar como resolvido</span>
                                                            </button>
                                                        )}
                                                        <button className="farmacia-action-icon" onClick={() => openEdit(item)}>
                                                            <Edit2 size={15} />
                                                            <span className="premium-tooltip">Editar entrave</span>
                                                        </button>
                                                        <button className="farmacia-action-icon" onClick={() => openView(item)}>
                                                            <Eye size={15} />
                                                            <span className="premium-tooltip">Visualizar detalhes</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Novo/Editar */}
            {isFormModalOpen && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal" style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="farmacia-modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '1.25rem 1.5rem', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShieldAlert size={18} color="#ef4444" />
                                </div>
                                <div>
                                    <h2 className="farmacia-modal-title" style={{ fontSize: '1.05rem' }}>
                                        {editingEntrave ? 'Editar Entrave' : 'Registrar Novo Entrave'}
                                    </h2>
                                    <p className="farmacia-modal-subtitle">Detalhe o problema para acompanhamento e resolução.</p>
                                </div>
                            </div>
                            <button className="farmacia-modal-close" onClick={() => setIsFormModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <div className="farmacia-modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                                {saveError && (
                                    <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                                        <AlertTriangle size={16} />
                                        {saveError}
                                    </div>
                                )}

                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Ação Estratégica Vinculada *</label>
                                    <select className="farmacia-form-select" required value={formData.acaoId} onChange={e => {
                                        const selected = acoes.find(a => a.id === e.target.value);
                                        setFormData({...formData, acaoId: e.target.value, acaoNome: selected?.title || ''});
                                    }}>
                                        <option value="">Selecione a ação...</option>
                                        {acoes.map(a => (
                                            <option key={a.id} value={a.id}>{a.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Descrição do Entrave *</label>
                                    <textarea 
                                        className="farmacia-form-textarea" 
                                        rows="2" 
                                        required 
                                        placeholder="Qual o problema exato que está ocorrendo?"
                                        value={formData.descricao} 
                                        onChange={e => setFormData({...formData, descricao: e.target.value})}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div className="farmacia-form-group">
                                        <label className="farmacia-form-label">Gravidade *</label>
                                        <select className="farmacia-form-select" required value={formData.gravidade} onChange={e => setFormData({...formData, gravidade: e.target.value})}>
                                            <option value="Baixa">Baixa</option>
                                            <option value="Média">Média</option>
                                            <option value="Alta">Alta</option>
                                            <option value="Crítica">Crítica</option>
                                        </select>
                                    </div>
                                    <div className="farmacia-form-group">
                                        <label className="farmacia-form-label">Status *</label>
                                        <select className="farmacia-form-select" required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                            <option value="Aberto">Aberto</option>
                                            <option value="Em Tratativa">Em Tratativa</option>
                                            <option value="Resolvido">Resolvido</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Impacto</label>
                                    <textarea 
                                        className="farmacia-form-textarea" 
                                        rows="2" 
                                        placeholder="Quais as consequências deste entrave na ação?"
                                        value={formData.impacto} 
                                        onChange={e => setFormData({...formData, impacto: e.target.value})}
                                    />
                                </div>

                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Providência / Próximo Passo</label>
                                    <textarea 
                                        className="farmacia-form-textarea" 
                                        rows="2" 
                                        placeholder="O que está sendo ou precisa ser feito para resolver?"
                                        value={formData.providencia} 
                                        onChange={e => setFormData({...formData, providencia: e.target.value})}
                                    />
                                </div>

                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Responsável pelo Desbloqueio</label>
                                    <input 
                                        type="text"
                                        className="farmacia-form-input" 
                                        placeholder="Nome de quem deve resolver"
                                        value={formData.responsavel} 
                                        onChange={e => setFormData({...formData, responsavel: e.target.value})}
                                    />
                                </div>

                            </div>
                            <div className="farmacia-modal-footer">
                                <button type="button" className="farmacia-modal-btn-cancel" onClick={() => setIsFormModalOpen(false)} disabled={saveLoading}>
                                    Cancelar
                                </button>
                                <button type="submit" className="farmacia-modal-btn-confirm" disabled={saveLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {saveLoading && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {editingEntrave ? 'Salvar Alterações' : 'Registrar Entrave'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Visualização (Somente Leitura) */}
            {isViewModalOpen && viewingEntrave && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal" style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="farmacia-modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '1.25rem 1.5rem', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(100,116,139,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Target size={18} color="var(--text-muted)" />
                                </div>
                                <div>
                                    <h2 className="farmacia-modal-title" style={{ fontSize: '1.05rem' }}>Detalhes do Entrave</h2>
                                    <p className="farmacia-modal-subtitle">Visualização completa do registro.</p>
                                </div>
                            </div>
                            <button className="farmacia-modal-close" onClick={() => setIsViewModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="farmacia-modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ação Estratégica:</span>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>{viewingEntrave.acaoNome}</h3>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Secretaria: {viewingEntrave.secretaria}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ background: 'var(--bg-muted)', padding: '0.75rem 1rem', borderRadius: '8px', flex: 1, minWidth: '120px' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Status</span>
                                    <span style={{ fontWeight: 700, color: getStatusConfig(viewingEntrave.status).color }}>{viewingEntrave.status}</span>
                                </div>
                                <div style={{ background: 'var(--bg-muted)', padding: '0.75rem 1rem', borderRadius: '8px', flex: 1, minWidth: '120px' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Gravidade</span>
                                    <span style={{ fontWeight: 700, color: getGravidadeConfig(viewingEntrave.gravidade).color }}>{viewingEntrave.gravidade}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Descrição do Entrave:</span>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.5 }}>{viewingEntrave.descricao}</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Impacto:</span>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: viewingEntrave.impacto ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1.5, fontStyle: viewingEntrave.impacto ? 'normal' : 'italic' }}>
                                    {viewingEntrave.impacto || 'Não informado.'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Providência / Próximos Passos:</span>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: viewingEntrave.providencia ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1.5, fontStyle: viewingEntrave.providencia ? 'normal' : 'italic' }}>
                                    {viewingEntrave.providencia || 'Nenhuma providência registrada.'}
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Responsável:</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>{viewingEntrave.responsavel || 'Não definido'}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Datas:</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span>Registro: {formatDate(viewingEntrave.dataRegistro)}</span>
                                        {viewingEntrave.status === 'Resolvido' && <span style={{ color: '#10b981', fontWeight: 600 }}>Resolução: {formatDate(viewingEntrave.dataResolucao)}</span>}
                                    </span>
                                </div>
                            </div>

                        </div>

                        <div className="farmacia-modal-footer" style={{ justifyContent: 'space-between' }}>
                            <button type="button" className="farmacia-modal-btn-cancel" onClick={() => setIsViewModalOpen(false)}>
                                Fechar
                            </button>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button type="button" className="farmacia-modal-btn-cancel" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => {
                                    setIsViewModalOpen(false);
                                    openEdit(viewingEntrave);
                                }}>
                                    <Edit2 size={15} /> Editar
                                </button>
                                {viewingEntrave.status !== 'Resolvido' && (
                                    <button type="button" className="farmacia-modal-btn-confirm" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981' }} onClick={() => {
                                        handleResolve(viewingEntrave);
                                    }}>
                                        <Check size={15} /> Marcar como Resolvido
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast de Sucesso */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', background: '#10b981', color: 'white',
                    padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', gap: '8px', zIndex: 9999, fontWeight: 500, fontSize: '0.9rem'
                }}>
                    <CheckCircle2 size={18} />
                    {toast}
                </div>
            )}
        </div>
    );
};

export default PlanejamentoEntraves;
