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
    Loader
} from 'lucide-react';
import '../farmacia/FarmaciaPages.css';
import '../farmacia/FarmaciaModal.css';

// Sub-componente para animação individual do card
const UpdateCard = ({ item, index, getTipoConfig, getStatusLabel, formatDate }) => {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = React.useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.1, rootMargin: '50px' });

        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    const conf = getTipoConfig(item.tipo, item.critica);
    const Icon = conf.icon;

    return (
        <div 
            ref={cardRef}
            className={`farmacia-card update-card ${isVisible ? 'visible' : ''}`} 
            style={{ 
                padding: '1.25rem 1.5rem', 
                border: '1px solid rgba(0,0,0,0.08)', 
                borderLeft: `5px solid ${conf.border}`, 
                position: 'relative', 
                zIndex: 1, 
                marginLeft: 0, 
                background: item.critica ? 'rgba(239, 68, 68, 0.015)' : '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transitionDelay: `${index * 80}ms`
            }}
        >
            <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: conf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${conf.bg.replace('0.05', '0.15')}` }}>
                        <Icon size={20} color={conf.color} />
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{item.acao}</h3>
                        <span className="update-badge" style={{ 
                            fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: '5px', 
                            background: conf.bg, color: conf.color, textTransform: 'uppercase', letterSpacing: '0.05em',
                            border: `1px solid ${conf.color}20`, whiteSpace: 'nowrap'
                        }}>
                            {conf.label}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', opacity: 0.55 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{item.secretaria}</span>
                        <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>&bull;</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Por {item.responsavel}</span>
                        <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>&bull;</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} /> {formatDate(item.data)}
                        </span>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '0.875rem 1.125rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.02)', maxWidth: '850px', marginTop: '0' }}>
                        {item.descricao}
                    </div>

                    {(item.statusNovo || item.progressoNovo !== null) && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0', flexWrap: 'wrap' }}>
                            {item.statusNovo && (
                                <div className="update-change-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', animationDelay: `${(index * 80) + 150}ms` }}>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Status:</span>
                                    {item.statusAnterior && <span style={{ textDecoration: 'line-through', opacity: 0.5, color: 'var(--text-muted)' }}>{getStatusLabel(item.statusAnterior)}</span>}
                                    {item.statusAnterior && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                                    <span style={{ fontWeight: 700, color: '#10b981' }}>{getStatusLabel(item.statusNovo)}</span>
                                </div>
                            )}
                            {item.progressoNovo !== null && (
                                <div className="update-change-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', animationDelay: `${(index * 80) + 250}ms` }}>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Progresso:</span>
                                    {item.progressoAnterior !== null && <span style={{ textDecoration: 'line-through', opacity: 0.5, color: 'var(--text-muted)' }}>{item.progressoAnterior}%</span>}
                                    {item.progressoAnterior !== null && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{item.progressoNovo}%</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Componente principal
const PlanejamentoAtualizacoes = () => {
    // ---- ESTADO E MOCKS ----
    const [atualizacoes, setAtualizacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [busca, setBusca] = useState('');
    const [acaoFiltro, setAcaoFiltro] = useState('Todas');
    const [secretariaFiltro, setSecretariaFiltro] = useState('Todas');
    const [tipoFiltro, setTipoFiltro] = useState('Todos');
    const [periodoFiltro, setPeriodoFiltro] = useState('Todos');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        acao: '',
        secretaria: 'Secretaria de Planejamento',
        tipo: 'Geral',
        descricao: '',
        novoStatus: '',
        novoProgresso: '',
        critica: false
    });

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
                    acao: 'Reforma da Praça Central',
                    secretaria: 'Secretaria de Infraestrutura',
                    tipo: 'Avanço de Progresso',
                    data: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    responsavel: 'Carlos Silva',
                    descricao: 'Concluída a etapa de terraplanagem e iniciada a fundação dos quiosques.',
                    progressoAnterior: 15,
                    progressoNovo: 35,
                    statusAnterior: null,
                    statusNovo: null,
                    critica: false
                },
                {
                    id: 2,
                    acao: 'Construção da Nova UPA',
                    secretaria: 'Secretaria de Saúde',
                    tipo: 'Registro de Entrave',
                    data: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    responsavel: 'Dra. Amanda',
                    descricao: 'Atraso na entrega dos materiais elétricos devido a problemas com o fornecedor local.',
                    progressoAnterior: null,
                    progressoNovo: null,
                    statusAnterior: 'EM_ANDAMENTO',
                    statusNovo: 'PARALISADA',
                    critica: true
                },
                {
                    id: 3,
                    acao: 'Programa Escola Conectada',
                    secretaria: 'Secretaria de Educação',
                    tipo: 'Mudança de Status',
                    data: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    responsavel: 'Marcos Almeida',
                    descricao: 'Equipamentos instalados em 100% das escolas previstas na primeira fase.',
                    progressoAnterior: 80,
                    progressoNovo: 100,
                    statusAnterior: 'EM_ANDAMENTO',
                    statusNovo: 'CONCLUIDA',
                    critica: false
                },
                {
                    id: 4,
                    acao: 'Revitalização do Centro Histórico',
                    secretaria: 'Secretaria de Turismo',
                    tipo: 'Observação Crítica',
                    data: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                    responsavel: 'Fernanda Lima',
                    descricao: 'Necessária aprovação do IPHAN para pintura das fachadas da rua principal. Risco de atraso no cronograma.',
                    progressoAnterior: null,
                    progressoNovo: null,
                    statusAnterior: null,
                    statusNovo: null,
                    critica: true
                },
                {
                    id: 5,
                    acao: 'Pavimentação do Bairro Novo',
                    secretaria: 'Secretaria de Infraestrutura',
                    tipo: 'Geral',
                    data: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
                    responsavel: 'João Pedro',
                    descricao: 'Reunião com os moradores para apresentar o cronograma da obra.',
                    progressoAnterior: null,
                    progressoNovo: null,
                    statusAnterior: null,
                    statusNovo: null,
                    critica: false
                }
            ];
            setAtualizacoes(mock);
            setLoading(false);
        };
        setTimeout(loadMockData, 800);
    }, []);

    // ---- LISTAS ÚNICAS PARA FILTROS ----
    const acoesUnicas = useMemo(() => [...new Set(atualizacoes.map(a => a.acao))].sort(), [atualizacoes]);
    const secretariasUnicas = useMemo(() => [...new Set(atualizacoes.map(a => a.secretaria))].sort(), [atualizacoes]);
    const tiposUnicos = ['Geral', 'Avanço de Progresso', 'Mudança de Status', 'Registro de Entrave', 'Observação Crítica'];

    // ---- FILTRAGEM ----
    const atualizacoesFiltradas = useMemo(() => {
        const now = new Date();
        return atualizacoes.filter(item => {
            const mBusca = (item.acao || '').toLowerCase().includes(busca.toLowerCase()) || 
                           (item.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
                           (item.responsavel || '').toLowerCase().includes(busca.toLowerCase());
            const mAcao = acaoFiltro === 'Todas' || item.acao === acaoFiltro;
            const mSec = secretariaFiltro === 'Todas' || item.secretaria === secretariaFiltro;
            const mTipo = tipoFiltro === 'Todos' || item.tipo === tipoFiltro;
            
            let mPeriodo = true;
            if (periodoFiltro !== 'Todos') {
                const itemDate = new Date(item.data);
                const diffDays = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));
                if (periodoFiltro === 'hoje') mPeriodo = itemDate.toDateString() === now.toDateString();
                if (periodoFiltro === '7d') mPeriodo = diffDays <= 7;
                if (periodoFiltro === '30d') mPeriodo = diffDays <= 30;
            }

            return mBusca && mAcao && mSec && mTipo && mPeriodo;
        }).sort((a, b) => new Date(b.data) - new Date(a.data));
    }, [atualizacoes, busca, acaoFiltro, secretariaFiltro, tipoFiltro, periodoFiltro]);

    // ---- MÉTRICAS PARA CARDS ----
    const metrics = useMemo(() => {
        const now = new Date();
        let total = atualizacoesFiltradas.length;
        let recentes = 0;
        let statusChanges = 0;
        let progressChanges = 0;
        let criticas = 0;

        atualizacoesFiltradas.forEach(item => {
            const diffDays = Math.floor((now - new Date(item.data)) / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) recentes++;
            if (item.statusNovo) statusChanges++;
            if (item.progressoNovo !== null && item.progressoNovo !== undefined) progressChanges++;
            if (item.critica) criticas++;
        });

        return { total, recentes, statusChanges, progressChanges, criticas };
    }, [atualizacoesFiltradas]);

    // ---- HELPERS VISUAIS ----
    const getTipoConfig = (tipo, critica) => {
        if (critica) return { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', border: '#ef4444', label: 'ALERTA' };
        switch(tipo) {
            case 'Avanço de Progresso': return { icon: TrendingUp, color: '#2563eb', bg: 'rgba(37, 99, 235, 0.05)', border: '#3b82f6', label: 'AVANÇO' };
            case 'Mudança de Status': return { icon: Activity, color: '#059669', bg: 'rgba(5, 150, 105, 0.05)', border: '#10b981', label: 'STATUS' };
            case 'Registro de Entrave': return { icon: AlertCircle, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.05)', border: '#ef4444', label: 'ALERTA' };
            case 'Observação Crítica': return { icon: AlertTriangle, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.05)', border: '#ef4444', label: 'ALERTA' };
            default: return { icon: MessageSquare, color: '#475569', bg: 'rgba(71, 85, 105, 0.05)', border: '#94a3b8', label: 'GERAL' };
        }
    };

    const getStatusLabel = (s) => {
        const map = {
            'CONCLUIDA': 'Concluída',
            'EM_ANDAMENTO': 'Em Andamento',
            'EM_RISCO': 'Em Risco',
            'PARALISADA': 'Paralisada',
            'NAO_INICIADA': 'Não Iniciada',
            'CANCELADA': 'Cancelada'
        };
        return map[s] || s;
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
    };

    // ---- AÇÕES ----
    const handleSave = (e) => {
        e.preventDefault();
        setSaveLoading(true);
        setTimeout(() => {
            const newUpdate = {
                id: Date.now(),
                acao: formData.acao || 'Ação Não Especificada',
                secretaria: formData.secretaria,
                tipo: formData.tipo,
                data: new Date().toISOString(),
                responsavel: 'Usuário Logado (Você)',
                descricao: formData.descricao,
                progressoAnterior: null,
                progressoNovo: formData.novoProgresso !== '' ? parseInt(formData.novoProgresso) : null,
                statusAnterior: null,
                statusNovo: formData.novoStatus !== '' ? formData.novoStatus : null,
                critica: formData.critica
            };
            
            setAtualizacoes([newUpdate, ...atualizacoes]);
            setToast('Atualização registrada com sucesso.');
            setIsModalOpen(false);
            setSaveLoading(false);
            setFormData({
                acao: '', secretaria: 'Secretaria de Planejamento', tipo: 'Geral', descricao: '', novoStatus: '', novoProgresso: '', critica: false
            });
        }, 600);
    };

    return (
        <div className="farmacia-page-container">
            {/* Cabeçalho */}
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Atualizações das Ações</h1>
                    <p className="farmacia-page-subtitle">Acompanhe os registros recentes de evolução, status e observações das ações estratégicas.</p>
                </div>
                <button className="farmacia-btn-primary" onClick={() => setIsModalOpen(true)} disabled={loading}>
                    <Plus size={18} /> Nova Atualização
                </button>
            </header>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeInRight { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
                
                .update-card { 
                    opacity: 0; 
                    transform: translateY(12px);
                    transition: opacity 400ms ease-out, transform 400ms ease-out, box-shadow 200ms ease, border-color 200ms ease;
                    will-change: transform, opacity;
                }
                
                .update-card.visible { 
                    opacity: 1; 
                    transform: translateY(0); 
                }
                
                .update-card:hover { 
                    transform: translateY(-2px) !important; 
                    box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; 
                    border-color: rgba(0,0,0,0.15) !important; 
                    transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease !important;
                }
                
                .update-badge { transition: all 0.2s ease; cursor: default; }
                .update-badge:hover { filter: saturate(1.3) brightness(0.95); transform: translateY(-1px); }
                
                .update-change-item { 
                    transition: all 0.2s ease; 
                    animation: fadeInRight 0.4s ease-out backwards; 
                }
                .update-change-item:hover { transform: scale(1.02); background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
                
                /* Ajustes obrigatórios de espaçamento */
                .updates-metrics { margin-bottom: 32px !important; }
                .updates-filters { margin-bottom: 0 !important; }
                .updates-feed { 
                    display: flex !important; 
                    flex-direction: column !important; 
                    gap: 22px !important; 
                    margin-top: 32px !important; 
                    padding-top: 0 !important; 
                }
                .update-card:first-child { margin-top: 0 !important; }
            `}</style>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)', gap: '0.5rem' }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.875rem' }}>Carregando histórico...</span>
                </div>
            ) : (
                <div className="planejamento-atualizacoes-container" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {/* Cards Executivos */}
                    <div className="updates-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #64748b' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total de Atualizações</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>{metrics.total}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #3b82f6' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Recentes (7 dias)</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>{metrics.recentes}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #10b981' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Mudanças de Status</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{metrics.statusChanges}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #8b5cf6' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Avanços de Progresso</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>{metrics.progressChanges}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #ef4444' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Atenção/Críticas</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{metrics.criticas}</div>
                        </div>
                    </div>

                    {/* Toolbar de Filtros */}
                    <div className="farmacia-card updates-filters" style={{ padding: '1rem 1.25rem', gap: '0', marginBottom: '0 !important' }}>
                        <div className="farmacia-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
                            <div className="farmacia-search-box" style={{ flex: '2 1 250px', maxWidth: 'none', margin: 0 }}>
                                <Search size={16} className="farmacia-search-icon" />
                                <input
                                    type="text"
                                    className="farmacia-search-input"
                                    placeholder="Buscar texto ou responsável..."
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                />
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 150px' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%' }} value={acaoFiltro} onChange={(e) => setAcaoFiltro(e.target.value)}>
                                    <option value="Todas">Ação: Todas</option>
                                    {acoesUnicas.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 150px' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%' }} value={secretariaFiltro} onChange={(e) => setSecretariaFiltro(e.target.value)}>
                                    <option value="Todas">Secretaria: Todas</option>
                                    {secretariasUnicas.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 140px' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%' }} value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
                                    <option value="Todos">Tipo: Todos</option>
                                    {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 140px' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%' }} value={periodoFiltro} onChange={(e) => setPeriodoFiltro(e.target.value)}>
                                    <option value="Todos">Período: Todos</option>
                                    <option value="hoje">Hoje</option>
                                    <option value="7d">Últimos 7 dias</option>
                                    <option value="30d">Últimos 30 dias</option>
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>
                        </div>
                    </div>

                    {/* Timeline / Lista de Atualizações */}
                    {atualizacoesFiltradas.length === 0 ? (
                        <div className="farmacia-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '32px !important' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Clock size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', fontWeight: 600, marginBottom: '4px' }}>Nenhuma atualização encontrada.</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                                    As atualizações ajudam a acompanhar a evolução das ações estratégicas ao longo do tempo.
                                </p>
                            </div>
                            <button className="farmacia-btn-secondary" onClick={() => setIsModalOpen(true)} style={{ marginTop: '0.5rem' }}>
                                <Plus size={16} /> Registrar primeira atualização
                            </button>
                        </div>
                    ) : (
                        <div className="updates-feed" style={{ position: 'relative', marginTop: '32px !important' }}>
                            {atualizacoesFiltradas.map((item, index) => (
                                <UpdateCard 
                                    key={item.id} 
                                    item={item} 
                                    index={index}
                                    getTipoConfig={getTipoConfig}
                                    getStatusLabel={getStatusLabel}
                                    formatDate={formatDate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Nova Atualização */}
            {isModalOpen && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal" style={{ maxWidth: '600px', width: '95%' }}>
                        <div className="farmacia-modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '1.25rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,150,125,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Activity size={18} color="var(--color-primary)" />
                                </div>
                                <div>
                                    <h2 className="farmacia-modal-title" style={{ fontSize: '1.05rem' }}>Registrar Atualização</h2>
                                    <p className="farmacia-modal-subtitle">Adicione um novo evento à linha do tempo.</p>
                                </div>
                            </div>
                            <button className="farmacia-modal-close" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className="farmacia-modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                
                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Ação Estratégica *</label>
                                    <select className="farmacia-form-select" required value={formData.acao} onChange={e => setFormData({...formData, acao: e.target.value})}>
                                        <option value="">Selecione a ação vinculada...</option>
                                        {['Reforma da Praça Central', 'Construção da Nova UPA', 'Programa Escola Conectada', 'Pavimentação do Bairro Novo'].map(a => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="farmacia-form-group">
                                        <label className="farmacia-form-label">Tipo de Atualização *</label>
                                        <select className="farmacia-form-select" required value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                                            {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="farmacia-form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>
                                            <input type="checkbox" checked={formData.critica} onChange={e => setFormData({...formData, critica: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: '#ef4444' }} />
                                            Marcar como Crítica / Atenção
                                        </label>
                                    </div>
                                </div>

                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Descrição *</label>
                                    <textarea 
                                        className="farmacia-form-textarea" 
                                        rows="3" 
                                        required 
                                        placeholder="Descreva detalhadamente o que ocorreu nesta atualização..."
                                        value={formData.descricao} 
                                        onChange={e => setFormData({...formData, descricao: e.target.value})}
                                    />
                                </div>

                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Atualizar Indicadores (Opcional)</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Novo Status</label>
                                            <select className="farmacia-form-select" value={formData.novoStatus} onChange={e => {
                                                const val = e.target.value;
                                                const updates = { novoStatus: val };
                                                if (val === 'CONCLUIDA') updates.novoProgresso = '100';
                                                setFormData({...formData, ...updates});
                                            }}>
                                                <option value="">Manter atual</option>
                                                <option value="NAO_INICIADA">Não Iniciada</option>
                                                <option value="EM_ANDAMENTO">Em Andamento</option>
                                                <option value="CONCLUIDA">Concluída</option>
                                                <option value="EM_RISCO">Em Risco</option>
                                                <option value="PARALISADA">Paralisada</option>
                                            </select>
                                        </div>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Novo Progresso (%)</label>
                                            <input 
                                                type="number" 
                                                className="farmacia-form-input" 
                                                min="0" max="100" 
                                                placeholder="0 a 100"
                                                value={formData.novoProgresso} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const updates = { novoProgresso: val };
                                                    if (val === '100' && formData.novoStatus !== 'CONCLUIDA') {
                                                        updates.novoStatus = 'CONCLUIDA';
                                                    }
                                                    setFormData({...formData, ...updates});
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                            <div className="farmacia-modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.5rem', gap: '1rem' }}>
                                <button type="button" className="farmacia-modal-btn-cancel" onClick={() => setIsModalOpen(false)} disabled={saveLoading}>
                                    Cancelar
                                </button>
                                <button type="submit" className="farmacia-modal-btn-confirm" disabled={saveLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {saveLoading && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                    Registrar Atualização
                                </button>
                            </div>
                        </form>
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

export default PlanejamentoAtualizacoes;
