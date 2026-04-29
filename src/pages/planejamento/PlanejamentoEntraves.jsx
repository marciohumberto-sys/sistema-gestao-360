import React, { useState, useMemo, useEffect } from 'react';
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

const PlanejamentoEntraves = () => {
    // ---- ESTADO E MOCKS ----
    const [entraves, setEntraves] = useState([]);
    const [loading, setLoading] = useState(true);

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
    const [editingEntrave, setEditingEntrave] = useState(null);
    const [viewingEntrave, setViewingEntrave] = useState(null);

    const emptyForm = {
        acaoNome: '',
        secretaria: 'Secretaria de Planejamento',
        descricao: '',
        gravidade: 'Média',
        status: 'Aberto',
        responsavel: '',
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

    // Mock Load
    useEffect(() => {
        const loadMockData = () => {
            const mock = [
                {
                    id: 1,
                    acaoId: 'a1',
                    acaoNome: 'Construção da Nova UPA',
                    secretaria: 'Secretaria de Saúde',
                    descricao: 'Atraso na liberação da licença ambiental pela agência estadual.',
                    gravidade: 'Crítica',
                    status: 'Em Tratativa',
                    responsavel: 'Dra. Amanda',
                    dataRegistro: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                    dataResolucao: null,
                    impacto: 'Obra paralisada. Atraso estimado de 45 dias no cronograma.',
                    providencia: 'Reunião agendada com diretoria da agência estadual para amanhã.',
                    isCritico: true
                },
                {
                    id: 2,
                    acaoId: 'a2',
                    acaoNome: 'Reforma da Praça Central',
                    secretaria: 'Secretaria de Infraestrutura',
                    descricao: 'Falta de cimento no fornecedor licitado.',
                    gravidade: 'Média',
                    status: 'Aberto',
                    responsavel: '',
                    dataRegistro: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    dataResolucao: null,
                    impacto: 'Desaceleração do ritmo da obra.',
                    providencia: 'Notificar fornecedor e buscar orçamento emergencial se necessário.',
                    isCritico: false
                },
                {
                    id: 3,
                    acaoId: 'a3',
                    acaoNome: 'Programa Escola Conectada',
                    secretaria: 'Secretaria de Educação',
                    descricao: 'Roubo de cabos de fibra ótica no bairro São João.',
                    gravidade: 'Alta',
                    status: 'Resolvido',
                    responsavel: 'Marcos Almeida',
                    dataRegistro: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
                    dataResolucao: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    impacto: 'Escola municipal sem internet por 15 dias.',
                    providencia: 'Refazer cabeamento via rota alternativa e solicitar apoio da guarda municipal.',
                    isCritico: true
                },
                {
                    id: 4,
                    acaoId: 'a4',
                    acaoNome: 'Capacitação de Professores',
                    secretaria: 'Secretaria de Educação',
                    descricao: 'Conflito de agenda com período de provas.',
                    gravidade: 'Baixa',
                    status: 'Em Tratativa',
                    responsavel: 'Juliana Costa',
                    dataRegistro: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    dataResolucao: null,
                    impacto: 'Baixa adesão na primeira turma.',
                    providencia: 'Remarcar turmas para o período de recesso escolar.',
                    isCritico: false
                }
            ];
            setEntraves(mock);
            setLoading(false);
        };
        setTimeout(loadMockData, 800);
    }, []);

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
    const handleSave = (e) => {
        e.preventDefault();
        setSaveLoading(true);
        setTimeout(() => {
            const isCritico = formData.gravidade === 'Alta' || formData.gravidade === 'Crítica';
            const dataResolucao = formData.status === 'Resolvido' ? new Date().toISOString() : null;

            if (editingEntrave) {
                const updatedList = entraves.map(ent => {
                    if (ent.id === editingEntrave.id) {
                        return {
                            ...ent,
                            ...formData,
                            isCritico,
                            dataResolucao: formData.status === 'Resolvido' && ent.status !== 'Resolvido' ? new Date().toISOString() : 
                                           formData.status !== 'Resolvido' ? null : ent.dataResolucao
                        };
                    }
                    return ent;
                });
                setEntraves(updatedList);
                setToast('Entrave atualizado com sucesso.');
                if (viewingEntrave && viewingEntrave.id === editingEntrave.id) {
                    setViewingEntrave(updatedList.find(x => x.id === viewingEntrave.id));
                }
            } else {
                const newEntrave = {
                    id: Date.now(),
                    acaoId: `mock-id-${Date.now()}`,
                    acaoNome: formData.acaoNome || 'Ação Não Especificada',
                    secretaria: formData.secretaria,
                    descricao: formData.descricao,
                    gravidade: formData.gravidade,
                    status: formData.status,
                    responsavel: formData.responsavel,
                    dataRegistro: new Date().toISOString(),
                    dataResolucao,
                    impacto: formData.impacto,
                    providencia: formData.providencia,
                    isCritico
                };
                // TODO: integrar update na tela Atualizações ("Entrave registrado")
                console.log("[Mock] Atualização lançada: Entrave registrado");
                setEntraves([newEntrave, ...entraves]);
                setToast('Entrave registrado com sucesso.');
            }
            
            setIsFormModalOpen(false);
            setSaveLoading(false);
            setFormData(emptyForm);
            setEditingEntrave(null);
        }, 600);
    };

    const handleResolve = (entrave) => {
        const updatedList = entraves.map(ent => {
            if (ent.id === entrave.id) {
                return { ...ent, status: 'Resolvido', dataResolucao: new Date().toISOString() };
            }
            return ent;
        });
        // TODO: integrar update na tela Atualizações ("Entrave resolvido")
        console.log("[Mock] Atualização lançada: Entrave resolvido");
        setEntraves(updatedList);
        setToast('Entrave marcado como resolvido!');
        if (viewingEntrave && viewingEntrave.id === entrave.id) {
            setViewingEntrave(updatedList.find(x => x.id === entrave.id));
        }
    };

    const openEdit = (entrave) => {
        setEditingEntrave(entrave);
        setFormData({
            acaoNome: entrave.acaoNome,
            secretaria: entrave.secretaria,
            descricao: entrave.descricao,
            gravidade: entrave.gravidade,
            status: entrave.status,
            responsavel: entrave.responsavel || '',
            impacto: entrave.impacto || '',
            providencia: entrave.providencia || ''
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

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)', gap: '0.5rem' }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.875rem' }}>Carregando entraves...</span>
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
                                gridTemplateColumns: entravesFiltrados.length === 4 
                                    ? 'repeat(2, 1fr)' 
                                    : entravesFiltrados.length === 1 
                                    ? 'minmax(350px, 800px)' 
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
                                        return { bg: '#ffffff', border: '4px solid #10b981', shadow: 'var(--shadow-sm)', opacity: 0.65 };
                                    }
                                    switch (item.gravidade) {
                                        case 'Baixa': return { bg: 'rgba(59, 130, 246, 0.02)', border: '4px solid rgba(59, 130, 246, 0.4)', shadow: 'var(--shadow-sm)', opacity: 1 };
                                        case 'Média': return { bg: 'rgba(245, 158, 11, 0.03)', border: '4px solid rgba(245, 158, 11, 0.7)', shadow: 'var(--shadow-sm)', opacity: 1 };
                                        case 'Alta': return { bg: 'rgba(239, 68, 68, 0.04)', border: '4px solid #ef4444', shadow: '0 4px 12px rgba(239, 68, 68, 0.08)', opacity: 1 };
                                        case 'Crítica': return { bg: 'rgba(220, 38, 38, 0.06)', border: '5px solid #dc2626', shadow: '0 6px 16px rgba(220, 38, 38, 0.15)', opacity: 1 };
                                        default: return { bg: '#ffffff', border: `4px solid ${gConf.color}`, shadow: 'var(--shadow-sm)', opacity: 1 };
                                    }
                                };
                                const heatmap = getHeatmap();
                                
                                return (
                                    <div key={item.id} className="farmacia-card" style={{ 
                                        padding: '1.125rem', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        cursor: 'default',
                                        borderLeft: heatmap.border,
                                        borderTop: `1px solid var(--border)`,
                                        borderRight: `1px solid var(--border)`,
                                        borderBottom: `1px solid var(--border)`,
                                        background: heatmap.bg,
                                        transition: 'all 0.2s',
                                        boxShadow: heatmap.shadow,
                                        opacity: heatmap.opacity
                                    }}>
                                        <div style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>
                                            {/* Mini Timeline Lateral */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '14px', flexShrink: 0, padding: '6px 0 6px 8px', position: 'relative' }}>
                                                {(() => {
                                                    const isAberta = item.status !== 'Em Tratativa' && item.status !== 'Resolvido';
                                                    const isTratativa = item.status === 'Em Tratativa';
                                                    const isResolvido = item.status === 'Resolvido';

                                                    // Define a cor base da timeline ancorada na gravidade (ou status Resolvido)
                                                    const getRgb = () => {
                                                        if (isResolvido) return '52, 211, 153'; // Verde pastel
                                                        if (item.gravidade === 'Crítica' || item.gravidade === 'Alta') return '248, 113, 113'; // Vermelho pastel
                                                        if (item.gravidade === 'Média') return '251, 191, 36'; // Laranja pastel
                                                        return '96, 165, 250'; // Azul pastel (Baixa)
                                                    };
                                                    const rgb = getRgb();

                                                    // Nó 1: Registrado
                                                    const n1Opacity = isAberta ? 1 : 0.5;
                                                    const n1Size = isAberta ? '10px' : '6px';
                                                    const n1Shadow = isAberta ? `0 0 0 3px rgba(${rgb}, 0.2)` : 'none';
                                                    const n1Bg = `rgb(${rgb})`;
                                                    const n1Border = 'none';
                                                    
                                                    // Linha 1 (Registrado -> Tratativa)
                                                    const l1Opacity = isAberta ? 0.3 : (isTratativa ? 0.85 : 0.4);
                                                    const l1Bg = isAberta ? '#cbd5e1' : `rgb(${rgb})`;

                                                    // Nó 2: Em Tratativa
                                                    const n2Opacity = isTratativa ? 1 : (isResolvido ? 0.5 : 0.3);
                                                    const n2Size = isTratativa ? '10px' : '6px';
                                                    const n2Shadow = isTratativa ? `0 0 0 3px rgba(${rgb}, 0.2)` : 'none';
                                                    const n2Bg = isAberta ? '#ffffff' : `rgb(${rgb})`;
                                                    const n2Border = isAberta ? '1px solid #cbd5e1' : 'none';

                                                    // Linha 2 (Tratativa -> Resolvido)
                                                    const l2Opacity = isResolvido ? 0.85 : 0.3;
                                                    const l2Bg = isResolvido ? `rgb(${rgb})` : '#cbd5e1';

                                                    // Nó 3: Resolvido
                                                    const n3Opacity = isResolvido ? 1 : 0.3;
                                                    const n3Size = isResolvido ? '10px' : '6px';
                                                    const n3Shadow = isResolvido ? `0 0 0 3px rgba(${rgb}, 0.2)` : 'none';
                                                    const n3Bg = isResolvido ? `rgb(${rgb})` : '#ffffff';
                                                    const n3Border = isResolvido ? 'none' : '1px solid #cbd5e1';

                                                    return (
                                                        <>
                                                            <div className="premium-tooltip-wrap" style={{ display: 'flex', justifyContent: 'center' }}>
                                                                <div style={{ width: n1Size, height: n1Size, borderRadius: '50%', background: n1Bg, border: n1Border, boxShadow: n1Shadow, opacity: n1Opacity, zIndex: 2, position: 'relative', transition: 'all 0.3s ease' }} />
                                                                <span className="premium-tooltip" style={{ left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '12px', bottom: 'auto' }}>Registrado</span>
                                                            </div>
                                                            <div style={{ width: '1px', flex: 1, background: l1Bg, margin: '2px 0', opacity: l1Opacity, transition: 'all 0.3s ease' }} />
                                                            
                                                            <div className="premium-tooltip-wrap" style={{ display: 'flex', justifyContent: 'center' }}>
                                                                <div style={{ width: n2Size, height: n2Size, borderRadius: '50%', background: n2Bg, border: n2Border, boxShadow: n2Shadow, opacity: n2Opacity, zIndex: 2, position: 'relative', transition: 'all 0.3s ease' }} />
                                                                <span className="premium-tooltip" style={{ left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '12px', bottom: 'auto' }}>Em Tratativa</span>
                                                            </div>
                                                            <div style={{ width: '1px', flex: 1, background: l2Bg, margin: '2px 0', opacity: l2Opacity, transition: 'all 0.3s ease' }} />

                                                            <div className="premium-tooltip-wrap" style={{ display: 'flex', justifyContent: 'center' }}>
                                                                <div style={{ width: n3Size, height: n3Size, borderRadius: '50%', background: n3Bg, border: n3Border, boxShadow: n3Shadow, opacity: n3Opacity, zIndex: 2, position: 'relative', transition: 'all 0.3s ease' }} />
                                                                <span className="premium-tooltip" style={{ left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '12px', bottom: 'auto' }}>Resolvido</span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {/* Conteúdo Principal do Card */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minWidth: 0 }}>
                                                {/* Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px 0', textDecoration: item.status === 'Resolvido' ? 'line-through' : 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {item.status === 'Resolvido' && <CheckCircle2 size={16} color="#10b981" />}
                                                            {item.acaoNome}
                                                        </h3>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                                            {item.secretaria}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: sConf.bg, color: sConf.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            <StatusIcon size={12} /> {item.status}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: gConf.bg, color: gConf.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            Gravidade: {item.gravidade}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Descrição Principal */}
                                                <div style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.5 }}>
                                                    {item.descricao}
                                                </div>

                                                {/* Detalhes (Impacto e Providência) */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto', background: 'var(--bg-muted)', padding: '1.25rem', borderRadius: '8px' }}>
                                                    {item.impacto && (
                                                        <div style={{ fontSize: '0.85rem', display: 'flex', gap: '8px' }}>
                                                            <span style={{ fontWeight: 800, color: 'var(--text)', minWidth: '85px' }}>Impacto:</span>
                                                            <span style={{ color: 'var(--text-muted)' }}>{item.impacto}</span>
                                                        </div>
                                                    )}
                                                    {item.providencia && (
                                                        <div style={{ fontSize: '0.85rem', display: 'flex', gap: '8px' }}>
                                                            <span style={{ fontWeight: 800, color: 'var(--text)', minWidth: '85px' }}>Providência:</span>
                                                            <span style={{ color: 'var(--text-muted)' }}>{item.providencia}</span>
                                                        </div>
                                                    )}
                                                    {!item.impacto && !item.providencia && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                            Sem impacto ou providência registrados.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Rodapé Metadados e Ações */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
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
                                                            <button className="farmacia-btn-secondary farmacia-action-icon" style={{ padding: '6px', minHeight: '0', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'transparent', position: 'relative' }} onClick={() => handleResolve(item)}>
                                                                <Check size={16} />
                                                                <span className="premium-tooltip">Marcar como resolvido</span>
                                                            </button>
                                                        )}
                                                        <button className="farmacia-btn-secondary farmacia-action-icon" style={{ padding: '6px', minHeight: '0', position: 'relative' }} onClick={() => openEdit(item)}>
                                                            <Edit2 size={16} />
                                                            <span className="premium-tooltip">Editar entrave</span>
                                                        </button>
                                                        <button className="farmacia-btn-secondary farmacia-action-icon" style={{ padding: '6px', minHeight: '0', position: 'relative' }} onClick={() => openView(item)}>
                                                            <Eye size={16} />
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
                    <div className="farmacia-modal" style={{ maxWidth: '650px', width: '95%' }}>
                        <div className="farmacia-modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '1.25rem 1.5rem' }}>
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

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 100px)' }}>
                            <div className="farmacia-modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
                                
                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Ação Estratégica Vinculada *</label>
                                    <select className="farmacia-form-select" required value={formData.acaoNome} onChange={e => setFormData({...formData, acaoNome: e.target.value})}>
                                        <option value="">Selecione a ação...</option>
                                        <option value="Construção da Nova UPA">Construção da Nova UPA</option>
                                        <option value="Reforma da Praça Central">Reforma da Praça Central</option>
                                        <option value="Programa Escola Conectada">Programa Escola Conectada</option>
                                        <option value="Capacitação de Professores">Capacitação de Professores</option>
                                        <option value="Revitalização do Centro Histórico">Revitalização do Centro Histórico</option>
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
                            <div className="farmacia-modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.5rem', gap: '1rem' }}>
                                <button type="button" className="farmacia-modal-btn-cancel" onClick={() => setIsFormModalOpen(false)} disabled={saveLoading}>
                                    Cancelar
                                </button>
                                <button type="submit" className="farmacia-modal-btn-confirm" disabled={saveLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: formData.gravidade === 'Crítica' || formData.gravidade === 'Alta' ? '#ef4444' : 'var(--color-primary)' }}>
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
                    <div className="farmacia-modal" style={{ maxWidth: '600px', width: '95%' }}>
                        <div className="farmacia-modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '1.25rem 1.5rem' }}>
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

                        <div className="farmacia-modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            
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

                        <div className="farmacia-modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.5rem', gap: '1rem', justifyContent: 'space-between' }}>
                            <button type="button" className="farmacia-btn-secondary" onClick={() => setIsViewModalOpen(false)}>
                                Fechar
                            </button>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="farmacia-btn-secondary" onClick={() => {
                                    setIsViewModalOpen(false);
                                    openEdit(viewingEntrave);
                                }}>
                                    <Edit2 size={16} /> Editar
                                </button>
                                {viewingEntrave.status !== 'Resolvido' && (
                                    <button type="button" className="farmacia-btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => {
                                        handleResolve(viewingEntrave);
                                    }}>
                                        <Check size={16} /> Marcar como Resolvido
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
