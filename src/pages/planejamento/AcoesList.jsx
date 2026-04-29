import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    Search, 
    Plus, 
    Filter, 
    ChevronDown, 
    ChevronUp,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    CheckCircle2,
    Eye, 
    Edit2, 
    Calendar,
    Target,
    Activity,
    AlertTriangle,
    ShieldCheck,
    Clock,
    MapPin,
    Loader,
    X,
    Info,
    CheckCircle
} from 'lucide-react';
import '../farmacia/FarmaciaPages.css';
import '../farmacia/FarmaciaModal.css';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchAcoes, fetchAxes, fetchSecretariats, createAcao, updateAcao, fetchObjectivesByAxis } from '../../services/api/planejamentoAcoes.service';

const AcoesList = () => {
    const { tenantLink } = useAuth();
    const tenantId = tenantLink?.tenant_id;
    const location = useLocation();
    const navigate = useNavigate();

    const [busca, setBusca] = useState('');
    const [statusFiltro, setStatusFiltro] = useState('Todos');
    const [secretariaFiltro, setSecretariaFiltro] = useState('Todas');

    // Estado dos dados reais
    const [acoes, setAcoes] = useState([]);
    const [axes, setAxes] = useState([]);
    const [secretariats, setSecretariats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingAcao, setViewingAcao] = useState(null);

    const [toast, setToast] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Carregar dados do banco
    const loadAcoes = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const data = await fetchAcoes(tenantId);
            setAcoes(data);
        } catch (err) {
            console.error('[AcoesList] Erro ao carregar ações:', err);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        if (tenantId) {
            loadAcoes();
            fetchAxes(tenantId).then(setAxes);
            fetchSecretariats(tenantId).then(setSecretariats);
        }
    }, [tenantId, loadAcoes]);

    // Detectar gatilho global de "Nova Ação" via Topbar
    useEffect(() => {
        if (location.state?.openModal === 'nova-acao') {
            openModal();
            // Limpar o estado para não reabrir ao atualizar
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    // Estado do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAcao, setEditingAcao] = useState(null);

    const emptyForm = {
        nome: '',
        local: '',
        secretariatId: '',
        secretaria: '',
        axisId: '',
        eixo: '',
        status: 'NAO_INICIADA',
        progresso: 0,
        prazo: '',
        data_inicio: '',
        responsible_name: '',
        descricao: '',
        observacoes: ''
    };
    const [formData, setFormData] = useState(emptyForm);
    const [objectives, setObjectives] = useState([]);
    const [loadingObjectives, setLoadingObjectives] = useState(false);

    // Validar objetivos ao trocar o eixo
    useEffect(() => {
        const validateAxisObjectives = async () => {
            if (isModalOpen && formData.axisId && tenantId && !editingAcao) {
                setLoadingObjectives(true);
                try {
                    const objs = await fetchObjectivesByAxis(tenantId, formData.axisId);
                    setObjectives(objs);
                    
                    const objetivoAtivo = objs.find(o => o.is_active);
                    
                    console.log("[Planejamento][Nova Ação] eixo selecionado:", formData.axisId);
                    console.log("[Planejamento][Nova Ação] objetivos carregados:", objs);
                    console.log("[Planejamento][Nova Ação] objetivo ativo encontrado:", objetivoAtivo);
                } catch (err) {
                    console.error('[Planejamento] Erro ao validar objetivos:', err);
                    setObjectives([]);
                } finally {
                    setLoadingObjectives(false);
                }
            } else if (editingAcao) {
                // Se estiver editando, assumimos que já existe objetivo ou não bloqueamos
                setObjectives([{ id: 'existing', is_active: true }]);
            }
        };

        validateAxisObjectives();
    }, [formData.axisId, isModalOpen, tenantId, editingAcao]);

    const openModal = (acao = null) => {
        setSaveError(null);
        if (acao) {
            setEditingAcao(acao);
            setFormData({
                ...emptyForm,
                nome: acao.nome || '',
                local: acao.local || '',
                secretariatId: acao.secretariaId || '',
                secretaria: acao.secretaria || '',
                axisId: acao.eixoId || '',
                eixo: acao.eixo || '',
                status: acao.status || 'NAO_INICIADA',
                progresso: acao.progresso ?? 0,
                prazo: acao.prazo || '',
                data_inicio: acao.data_inicio || '',
                responsible_name: acao.responsavel || '',
                descricao: acao.descricao || '',
                observacoes: acao.observacoes || ''
            });
        } else {
            setEditingAcao(null);
            const firstAxis = axes[0];
            const firstSec = secretariats[0];
            setFormData({
                ...emptyForm,
                axisId: firstAxis?.id || '',
                eixo: firstAxis?.name || '',
                secretariatId: firstSec?.id || '',
                secretaria: firstSec?.name || ''
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSaveError(null);
    };

    const openViewModal = (acao) => {
        setViewingAcao(acao);
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setViewingAcao(null);
    };

    // Função auxiliar para renderizar o ícone de ordenação
    const renderSortIcon = (key) => {
        const isActive = sortConfig.key === key;
        if (isActive) {
            return sortConfig.direction === 'asc' 
                ? <ArrowUp size={12} style={{ color: 'var(--color-secondary)', transition: 'all 0.2s' }} /> 
                : <ArrowDown size={12} style={{ color: 'var(--color-secondary)', transition: 'all 0.2s' }} />;
        }
        return <ArrowUpDown size={12} style={{ color: 'var(--text-muted)', opacity: 0.4, transition: 'all 0.2s' }} />;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!tenantId) return;
        setSaveLoading(true);
        setSaveError(null);
        try {
            console.log("[Planejamento][Nova Ação] payload antes de salvar:", { tenantId, formData });
            if (editingAcao) {
                await updateAcao(tenantId, editingAcao.id, formData);
                setToast('Ação atualizada com sucesso.');
            } else {
                await createAcao(tenantId, formData, axes);
                setToast('Ação criada com sucesso.');
            }
            closeModal();
            await loadAcoes();
        } catch (err) {
            console.error('[AcoesList] Erro ao salvar:', err);
            setSaveError(err.message || 'Erro ao salvar. Tente novamente.');
        } finally {
            setSaveLoading(false);
        }
    };

    const hasActiveObjective = useMemo(() => {
        if (editingAcao) return true;
        return objectives.length > 0 && objectives.some(o => o.is_active);
    }, [objectives, editingAcao]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const acoesFiltradas = useMemo(() => {
        let filtered = acoes.filter(a => {
            const mBusca = (a.nome || '').toLowerCase().includes(busca.toLowerCase()) || (a.local || '').toLowerCase().includes(busca.toLowerCase());
            const mStatus = statusFiltro === 'Todos' || a.status === statusFiltro;
            const mSec = secretariaFiltro === 'Todas' || a.secretaria === secretariaFiltro || a.secretariaId === secretariaFiltro;
            return mBusca && mStatus && mSec;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                // Mapeamento de campos especiais se necessário
                if (sortConfig.key === 'secretaria') {
                    valA = a.secretaria_nome || a.secretaria;
                    valB = b.secretaria_nome || b.secretaria;
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [busca, statusFiltro, secretariaFiltro, acoes, sortConfig]);

    const metrics = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const limitDate = new Date(today);
        limitDate.setDate(limitDate.getDate() + 7);

        let emAndamento = 0;
        let concluidas = 0;
        let emRisco = 0;
        let semAtualizacao = 0;
        let prazoProximoVencido = 0;

        acoesFiltradas.forEach(a => {
            if (a.status === 'EM_ANDAMENTO') emAndamento++;
            if (a.status === 'CONCLUIDA') concluidas++;
            if (a.status === 'EM_RISCO') emRisco++;

            const lastUpdate = new Date(a.updated_at || a.created_at || now);
            const diffDaysUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
            if (diffDaysUpdate > 15) semAtualizacao++;

            if (a.prazo && a.status !== 'CONCLUIDA') {
                const prazoDate = new Date(`${a.prazo}T12:00:00`);
                if (prazoDate < today || (prazoDate >= today && prazoDate <= limitDate)) {
                    prazoProximoVencido++;
                }
            }
        });

        return {
            total: acoesFiltradas.length,
            emAndamento,
            concluidas,
            emRisco,
            semAtualizacao,
            prazoProximoVencido
        };
    }, [acoesFiltradas]);

    const getStatusBadge = (status) => {
        const styles = {
            'CONCLUIDA': { label: 'Concluída', bg: 'rgba(16, 185, 129, 0.18)', color: '#047857', border: 'rgba(16, 185, 129, 0.4)' },
            'EM_ANDAMENTO': { label: 'Em Andamento', bg: 'rgba(59, 130, 246, 0.18)', color: '#1d4ed8', border: 'rgba(59, 130, 246, 0.4)' },
            'EM_RISCO': { label: 'Em Risco', bg: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c', border: 'rgba(239, 68, 68, 0.4)' },
            'PARALISADA': { label: 'Paralisada', bg: 'rgba(245, 158, 11, 0.18)', color: '#b45309', border: 'rgba(245, 158, 11, 0.4)' },
            'NAO_INICIADA': { label: 'Não Iniciada', bg: 'rgba(148, 163, 184, 0.18)', color: '#334155', border: 'rgba(148, 163, 184, 0.4)' },
            'CANCELADA': { label: 'Cancelada', bg: 'rgba(71, 85, 105, 0.18)', color: '#1e293b', border: 'rgba(71, 85, 105, 0.4)' }
        };
        const s = styles[status] || styles['NAO_INICIADA'];
        return (
            <span className="farmacia-badge" style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '5px 12px', fontWeight: 600 }}>
                {s.label}
            </span>
        );
    };

    const getProgressColor = (status, isDelayed) => {
        if (status === 'CONCLUIDA') return '#059669';
        if (status === 'EM_RISCO' || isDelayed) return '#dc2626';
        if (status === 'PARALISADA') return '#d97706';
        if (status === 'EM_ANDAMENTO') return '#2563eb';
        return '#64748b';
    };

    const getProgressGradient = (status, isDelayed) => {
        if (status === 'CONCLUIDA') return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
        if (status === 'EM_RISCO' || isDelayed) return 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)';
        if (status === 'PARALISADA') return 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)';
        if (status === 'EM_ANDAMENTO') return 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)';
        return 'linear-gradient(90deg, #94a3b8 0%, #cbd5e1 100%)';
    };

    const formatSecretaria = (name) => {
        if (!name || name === 'Não informada') return { simplified: 'Não informada', full: '' };
        
        // Remove prefixos comuns para o nome curto
        let simplified = name.replace(/^Secretaria de /i, '').replace(/^Sec\. de /i, '').replace(/^Secretaria /i, '');
        
        // Garante que o nome completo tenha o prefixo correto
        let full = name;
        if (!name.toLowerCase().startsWith('secretaria')) {
            full = `Secretaria de ${name}`;
        }

        return { simplified, full };
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '--/--/----';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="farmacia-page-container">
            {/* Cabeçalho */}
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Ações Estratégicas</h1>
                    <p className="farmacia-page-subtitle">Monitore o progresso e execução das ações do plano de governo.</p>
                </div>
                <button className="farmacia-btn-primary" onClick={() => openModal()} disabled={loading}>
                    <Plus size={18} /> Nova Ação
                </button>
            </header>

            {/* Animação spin para o loader */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Estado de carregamento */}
            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)', gap: '0.5rem' }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.875rem' }}>Carregando ações...</span>
                </div>
            )}

            {/* Cards Executivos */}
            {!loading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #64748b' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Ações</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{metrics.total}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #3b82f6' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Em Andamento</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{metrics.emAndamento}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #10b981' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Concluídas</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{metrics.concluidas}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #ef4444' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Em Risco</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{metrics.emRisco}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #f59e0b' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sem Atualização</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{metrics.semAtualizacao}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #d946ef' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prazo Próximo/Vencido</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d946ef' }}>{metrics.prazoProximoVencido}</span>
                    </div>
                </div>
            )}

            {/* Container Principal (Filtros + Tabela) */}
            <div className="farmacia-card" style={{ padding: 0, overflow: 'visible', background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                {/* Toolbar de Filtros */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div className="farmacia-toolbar">
                        <div className="farmacia-search-box" style={{ maxWidth: '300px' }}>
                            <Search size={16} className="farmacia-search-icon" />
                            <input
                                type="text"
                                className="farmacia-search-input"
                                placeholder="Buscar ação ou local..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                            />
                        </div>

                        <div className="farmacia-select-wrapper" style={{ minWidth: '160px', position: 'relative' }}>
                            <select 
                                className="farmacia-filter-select" 
                                style={{ width: '100%' }}
                                value={statusFiltro}
                                onChange={(e) => setStatusFiltro(e.target.value)}
                            >
                                <option value="Todos">Status: Todos</option>
                                <option value="EM_ANDAMENTO">Em Andamento</option>
                                <option value="CONCLUIDA">Concluída</option>
                                <option value="EM_RISCO">Em Risco</option>
                                <option value="PARALISADA">Paralisada</option>
                                <option value="NAO_INICIADA">Não Iniciada</option>
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        </div>

                        <div className="farmacia-select-wrapper" style={{ minWidth: '180px', position: 'relative' }}>
                            <select 
                                className="farmacia-filter-select" 
                                style={{ width: '100%' }}
                                value={secretariaFiltro}
                                onChange={(e) => setSecretariaFiltro(e.target.value)}
                            >
                                <option value="Todas">Secretaria: Todas</option>
                                {secretariats.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        </div>

                        <div className="farmacia-select-wrapper" style={{ minWidth: '160px', position: 'relative' }}>
                            <select className="farmacia-filter-select" style={{ width: '100%' }}>
                                <option value="Todos">Eixo: Todos</option>
                                {axes.map(ax => (
                                    <option key={ax.id} value={ax.name}>{ax.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        </div>
                    </div>
                </div>

                {/* Listagem */}
                <style>{`
                .farmacia-table thead th { background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 600; padding-top: 14px; padding-bottom: 14px; position: sticky; top: 0; z-index: 20; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
                .farmacia-table tbody td { padding-top: 16px; padding-bottom: 16px; }
                .farmacia-table tbody tr { transition: all 0.2s ease; }
                .farmacia-table tbody tr:hover { background-color: #f8fafc !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); z-index: 10; position: relative; }
                .farmacia-table tbody tr:hover .farmacia-action-icon { opacity: 1 !important; background: rgba(0,0,0,0.03); }
                .farmacia-action-icon { opacity: 0.5; transition: all 0.2s ease; }
                .farmacia-action-icon:hover { transform: scale(1.1); background: rgba(0,0,0,0.06) !important; }
                @keyframes fillBar { from { width: 0; } }
                `}</style>
                <div className="farmacia-table-wrapper" style={{ border: 'none', boxShadow: 'none', margin: 0, borderRadius: '0 0 10px 10px' }}>
                <table className="farmacia-table">
                    <colgroup>
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '8%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('nome')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Ação
                                    {renderSortIcon('nome')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('secretaria')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Secretaria
                                    {renderSortIcon('secretaria')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Status
                                    {renderSortIcon('status')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('progresso')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Progresso
                                    {renderSortIcon('progresso')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('prazo')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Prazo
                                    {renderSortIcon('prazo')}
                                </div>
                            </th>
                            <th>Responsável</th>
                            <th style={{ textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {acoesFiltradas.map((acao) => {
                            const sec = formatSecretaria(acao.secretaria);
                            
                            // 3. Fundo sutil por status
                            let rowBg = 'transparent';
                            if (acao.status === 'EM_RISCO') rowBg = 'rgba(239, 68, 68, 0.02)';
                            else if (acao.status === 'EM_ANDAMENTO') rowBg = 'rgba(59, 130, 246, 0.02)';
                            else if (acao.status === 'CONCLUIDA') rowBg = 'rgba(16, 185, 129, 0.02)';

                            // 2. Inteligência de prazo
                            let isDelayed = false;
                            let prazoUI = null;
                            if (acao.prazo && acao.status !== 'CONCLUIDA') {
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const pDate = new Date(`${acao.prazo}T12:00:00`);
                                pDate.setHours(0,0,0,0);
                                const diffDays = Math.ceil((pDate - today) / (1000 * 60 * 60 * 24));
                                
                                if (diffDays < 0) {
                                    isDelayed = true;
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'#ef4444', fontWeight:600, marginTop:'2px'}}>Atrasado há {Math.abs(diffDays)} dia{Math.abs(diffDays)>1?'s':''}</span>;
                                } else if (diffDays === 0) {
                                    isDelayed = true;
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'#ef4444', fontWeight:600, marginTop:'2px'}}>Vence hoje</span>;
                                } else if (diffDays < 7) {
                                    isDelayed = true;
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'#ef4444', fontWeight:600, marginTop:'2px'}}>Faltam {diffDays} dias</span>;
                                } else if (diffDays <= 30) {
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'#d97706', fontWeight:600, marginTop:'2px'}}>Faltam {diffDays} dias</span>;
                                } else {
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:500, marginTop:'2px'}}>Faltam {diffDays} dias</span>;
                                }
                            }

                            // 1 & 5. Inteligência de barra de progresso
                            const pbColor = getProgressColor(acao.status, isDelayed);
                            const pbGradient = getProgressGradient(acao.status, isDelayed);

                            return (
                                <tr key={acao.id} style={{ backgroundColor: rowBg }}>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9rem', cursor: 'default' }}>{acao.nome}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {acao.eixo && <span>{acao.eixo}</span>}
                                                {acao.eixo && acao.local && <span>&bull;</span>}
                                                {acao.local && <span style={{ fontWeight: 400 }}>{acao.local}</span>}
                                            </div>
                                        </div>
                                    </td>
                                     <td>
                                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                                             <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem' }}>{sec.simplified}</span>
                                             {sec.full && (
                                                 <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>{sec.full}</span>
                                             )}
                                         </div>
                                     </td>
                                    <td>
                                        {getStatusBadge(acao.status)}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: pbColor }}>
                                                <span>{Math.round(acao.progresso || 0)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div 
                                                    style={{ 
                                                        width: `${Math.round(acao.progresso || 0)}%`, 
                                                        height: '100%', 
                                                        background: pbGradient,
                                                        animation: 'fillBar 0.6s ease-out forwards'
                                                    }} 
                                                />
                                            </div>
                                        </div>
                                    </td>
                                     <td>
                                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                                             <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: isDelayed ? '#ef4444' : 'var(--text)' }}>
                                                 <Calendar size={14} style={{ flexShrink: 0, opacity: 0.8 }} />
                                                 <span style={{ fontWeight: 600 }}>{formatDate(acao.prazo)}</span>
                                             </div>
                                             {prazoUI}
                                         </div>
                                     </td>
                                    <td>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{acao.responsavel || 'Não informado'}</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            <button className="farmacia-action-icon" style={{ padding: '4px' }} onClick={() => openViewModal(acao)}>
                                                <Eye size={16} />
                                                <span className="premium-tooltip">Visualizar</span>
                                            </button>
                                            <button className="farmacia-action-icon" style={{ padding: '4px' }} onClick={() => openModal(acao)}>
                                                <Edit2 size={16} />
                                                <span className="premium-tooltip">Editar</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            </div> {/* Fecha o Container Principal */}

            {/* Modal de Ação */}
            {isModalOpen && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal" style={{
                        maxWidth: '800px',
                        width: '95%',
                        boxShadow: '0 20px 60px -16px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15,23,42,0.05)'
                    }}>
                        {/* Header */}
                        <div className="farmacia-modal-header" style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                                <div style={{
                                    width: '34px', height: '34px', borderRadius: '9px',
                                    background: 'rgba(0,150,125,0.08)', border: '1px solid rgba(0,150,125,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <Target size={16} color="var(--color-primary)" />
                                </div>
                                <div>
                                    <h2 className="farmacia-modal-title" style={{ fontSize: '1rem', letterSpacing: '-0.01em' }}>
                                        {editingAcao ? 'Editar Ação Estratégica' : 'Nova Ação Estratégica'}
                                    </h2>
                                    <p className="farmacia-modal-subtitle" style={{ marginTop: '1px' }}>
                                        {editingAcao ? 'Atualize as informações da ação selecionada.' : 'Preencha os dados para registrar uma nova iniciativa.'}
                                    </p>
                                </div>
                            </div>
                            <button className="farmacia-modal-close" onClick={closeModal}>
                                <Plus size={18} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            {/* Body com scroll */}
                            <div className="farmacia-modal-body" style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {/* ── Bloco: Informações Gerais ── */}
                                <div style={{
                                    background: 'hsl(220,20%,97%)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1.1rem 1.25rem',
                                    borderLeft: '3px solid rgba(0,150,125,0.7)',
                                    boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                        <Target size={13} color="var(--color-primary)" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
                                            Informações Gerais
                                        </span>
                                    </div>
                                    <div className="farmacia-modal-grid" style={{ gap: '0.875rem' }}>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Nome da Ação</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: Reforma da Praça Central"
                                                required
                                                value={formData.nome}
                                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Eixo Estratégico</label>
                                            <select
                                                className="farmacia-form-select"
                                                value={formData.axisId}
                                                onChange={e => {
                                                    const axis = axes.find(a => a.id === e.target.value);
                                                    setFormData({ ...formData, axisId: e.target.value, eixo: axis?.name || '' });
                                                }}
                                            >
                                                <option value="">Selecione o eixo...</option>
                                                {axes.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="farmacia-form-group col-span-2">
                                            <label className="farmacia-form-label">Secretaria Responsável</label>
                                            <select
                                                className="farmacia-form-select"
                                                value={formData.secretariatId}
                                                onChange={e => {
                                                    const sec = secretariats.find(s => s.id === e.target.value);
                                                    setFormData({ ...formData, secretariatId: e.target.value, secretaria: sec?.name || '' });
                                                }}
                                            >
                                                <option value="">Selecione a secretaria...</option>
                                                {secretariats.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="farmacia-form-group col-span-2">
                                            <label className="farmacia-form-label">Descrição</label>
                                            <textarea
                                                className="farmacia-form-textarea"
                                                rows="2"
                                                placeholder="Detalhe o objetivo desta ação..."
                                                value={formData.descricao}
                                                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Bloco: Execução ── */}
                                <div style={{
                                    background: 'hsl(220,20%,97%)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1.1rem 1.25rem',
                                    borderLeft: '3px solid rgba(139,92,246,0.7)',
                                    boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                        <Activity size={13} color="#8b5cf6" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8b5cf6' }}>
                                            Execução e Monitoramento
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.2fr', gap: '0.875rem' }}>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Status Atual</label>
                                            <select className="farmacia-form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                                <option value="NAO_INICIADA">Não Iniciada</option>
                                                <option value="EM_ANDAMENTO">Em Andamento</option>
                                                <option value="CONCLUIDA">Concluída</option>
                                                <option value="EM_RISCO">Em Risco</option>
                                                <option value="PARALISADA">Paralisada</option>
                                            </select>
                                        </div>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Progresso (%)</label>
                                            <input
                                                type="number"
                                                className="farmacia-form-input"
                                                min="0" max="100"
                                                value={formData.progresso}
                                                onChange={e => setFormData({ ...formData, progresso: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Responsável Técnico</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Nome do responsável"
                                                value={formData.responsible_name}
                                                onChange={e => setFormData({ ...formData, responsible_name: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Blocos lado a lado: Planejamento + Localização ── */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{
                                        background: 'hsl(220,20%,97%)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        padding: '1.1rem 1.25rem',
                                        borderLeft: '3px solid rgba(59,130,246,0.7)',
                                        boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                            <Calendar size={13} color="#3b82f6" />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3b82f6' }}>
                                                Planejamento
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div className="farmacia-form-group">
                                                <label className="farmacia-form-label">Data Início</label>
                                                <input type="date" className="farmacia-form-input" value={formData.data_inicio} onChange={e => setFormData({ ...formData, data_inicio: e.target.value })} />
                                            </div>
                                            <div className="farmacia-form-group">
                                                <label className="farmacia-form-label">Data Término</label>
                                                <input type="date" className="farmacia-form-input" value={formData.prazo} onChange={e => setFormData({ ...formData, prazo: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        background: 'hsl(220,20%,97%)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        padding: '1.1rem 1.25rem',
                                        borderLeft: '3px solid rgba(245,158,11,0.7)',
                                        boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                            <MapPin size={13} color="#f59e0b" />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b' }}>
                                                Localização
                                            </span>
                                        </div>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Bairro / Localidade</label>
                                            <select className="farmacia-form-select" value={formData.local} onChange={e => setFormData({ ...formData, local: e.target.value })}>
                                                <option value="">Selecione o bairro...</option>
                                                <option value="Centro">Centro</option>
                                                <option value="Gameleira">Gameleira</option>
                                                <option value="Bairro Novo">Bairro Novo</option>
                                                <option value="Santo Amaro">Santo Amaro</option>
                                                <option value="Cruzeiro">Cruzeiro</option>
                                                <option value="São Sebastião">São Sebastião</option>
                                                <option value="Retiro">Retiro</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Bloco: Observações ── */}
                                <div style={{
                                    background: 'hsl(220,20%,97%)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1.1rem 1.25rem',
                                    borderLeft: '3px solid rgba(100,116,139,0.6)',
                                    boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                        <AlertTriangle size={13} color="#64748b" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
                                            Observações
                                        </span>
                                    </div>
                                    <div className="farmacia-form-group">
                                        <textarea
                                            className="farmacia-form-textarea"
                                            rows="2"
                                            placeholder="Entraves, pendências ou informações relevantes..."
                                            value={formData.observacoes}
                                            onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Footer fixo */}
                            <div className="farmacia-modal-footer" style={{
                                borderTop: '1px solid var(--border)',
                                padding: '0.875rem 1.5rem',
                                gap: '0.75rem'
                            }}>
                                {saveError && (
                                    <span style={{ flex: 1, fontSize: '0.8rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertTriangle size={14} /> {saveError}
                                    </span>
                                )}
                                <button type="button" className="farmacia-modal-btn-cancel" onClick={closeModal} disabled={saveLoading}>
                                    Cancelar
                                </button>
                                <button type="submit" className="farmacia-modal-btn-confirm" disabled={saveLoading || loadingObjectives} style={{
                                    padding: '0.55rem 1.5rem',
                                    fontSize: '0.875rem',
                                    boxShadow: '0 2px 8px rgba(0,150,125,0.25)',
                                    opacity: (saveLoading || loadingObjectives) ? 0.7 : 1,
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    {(saveLoading || loadingObjectives) && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {editingAcao ? 'Salvar Alterações' : 'Criar Ação'}
                                </button>
                            </div>

                            {/* Aviso informativo de objetivo opcional */}
                            {!editingAcao && formData.axisId && !loadingObjectives && !hasActiveObjective && (
                                <div style={{ 
                                    padding: '0.75rem 1.5rem', 
                                    backgroundColor: 'rgba(59, 130, 246, 0.04)', 
                                    borderTop: '1px solid rgba(59, 130, 246, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: '#475569',
                                    fontSize: '0.825rem',
                                    fontWeight: 500
                                }}>
                                    <Info size={16} color="#3b82f6" />
                                    <span>Esta ação será criada vinculada ao eixo estratégico selecionado. O vínculo com objetivo estratégico poderá ser definido futuramente.</span>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
            {/* ── Modal de Visualização (Somente Leitura) ── */}
            {isViewModalOpen && viewingAcao && (
                <div className="farmacia-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="farmacia-modal-content" style={{ 
                        maxWidth: '750px', 
                        width: '100%',
                        maxHeight: '85vh', 
                        borderTop: '4px solid #3b82f6',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden' 
                    }}>
                        {/* Header Fixo */}
                        <div className="farmacia-modal-header" style={{ flexShrink: 0, padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '8px' }}>
                                    <Info size={18} color="#3b82f6" />
                                </div>
                                <div>
                                    <h2 className="farmacia-modal-title" style={{ fontSize: '1.1rem' }}>Detalhes da Ação</h2>
                                    <p className="farmacia-modal-subtitle">Informações consolidadas da ação estratégica</p>
                                </div>
                            </div>
                            <button className="farmacia-modal-close" onClick={closeViewModal}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Conteúdo Rolável */}
                        <div className="farmacia-modal-body custom-scrollbar" style={{ 
                            flex: 1, 
                            overflowY: 'auto', 
                            padding: '1.25rem 1.75rem',
                            backgroundColor: '#fff'
                        }}>
                            <style>{`
                                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                                .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
                                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                            `}</style>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                                
                                {/* Cabeçalho: Título e Status */}
                                <div style={{ 
                                    background: 'linear-gradient(to right, #f8fafc, #ffffff)', 
                                    padding: '1.25rem', 
                                    borderRadius: '10px', 
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                                }}>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px', lineHeight: '1.3' }}>
                                        {viewingAcao.nome}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        {getStatusBadge(viewingAcao.status)}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Progresso:</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{viewingAcao.progresso}%</span>
                                        </div>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: `${viewingAcao.progresso}%`, 
                                            height: '100%', 
                                            backgroundColor: getProgressColor(viewingAcao.status), 
                                            borderRadius: '10px',
                                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }} />
                                    </div>
                                </div>

                                {/* Grid de Informações Agrupadas */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
                                    
                                    {/* Grupo 1: Estratégia e Localização */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Eixo Estratégico</span>
                                            <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{viewingAcao.eixo || 'Não informado'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Localidade / Bairro</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <MapPin size={13} color="#64748b" />
                                                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{viewingAcao.local || 'Não informada'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grupo 2: Responsabilidade */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Secretaria Executora</span>
                                            <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{viewingAcao.secretariaFull || viewingAcao.secretaria}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Responsável Técnico</span>
                                            <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{viewingAcao.responsible_name || viewingAcao.responsavel || 'Não informado'}</span>
                                        </div>
                                    </div>

                                    {/* Grupo 3: Cronograma */}
                                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data de Início</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={13} color="#64748b" />
                                                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{formatDate(viewingAcao.data_inicio) || 'Não definida'}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prazo Final</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={13} color="#64748b" />
                                                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{formatDate(viewingAcao.prazo) || 'Não definido'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Descrição e Observações */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Descrição Detalhada</span>
                                        <div style={{ 
                                            background: '#fcfcfc', 
                                            padding: '1rem', 
                                            borderRadius: '8px', 
                                            border: '1px solid #f1f5f9', 
                                            fontSize: '0.9rem', 
                                            color: '#475569', 
                                            lineHeight: '1.6'
                                        }}>
                                            {viewingAcao.descricao || 'Sem descrição detalhada cadastrada.'}
                                        </div>
                                    </div>
                                    {viewingAcao.observacoes && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Observações</span>
                                            <div style={{ 
                                                background: 'hsl(30, 100%, 98.5%)', 
                                                padding: '1rem', 
                                                borderRadius: '8px', 
                                                border: '1px solid hsl(30, 100%, 95%)', 
                                                fontSize: '0.85rem', 
                                                color: 'hsl(30, 80%, 25%)', 
                                                lineHeight: '1.6' 
                                            }}>
                                                {viewingAcao.observacoes}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer Fixo */}
                        <div className="farmacia-modal-footer" style={{ 
                            flexShrink: 0,
                            padding: '1rem 1.75rem', 
                            borderTop: '1px solid #f1f5f9', 
                            display: 'flex', 
                            justifyContent: 'flex-end', 
                            gap: '10px',
                            background: '#fcfcfc',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px'
                        }}>
                            <button 
                                className="farmacia-btn-secondary" 
                                style={{ 
                                    padding: '0.5rem 1.25rem', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    color: '#64748b',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#fff'
                                }} 
                                onClick={closeViewModal}
                            >
                                Fechar
                            </button>
                            <button 
                                className="farmacia-btn-primary" 
                                style={{ 
                                    padding: '0.5rem 1.25rem', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
                                }}
                                onClick={() => {
                                    const targetAcao = viewingAcao;
                                    closeViewModal();
                                    setTimeout(() => openModal(targetAcao), 100);
                                }}
                            >
                                <Edit2 size={14} /> Editar Ação
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback de Sucesso (Toast) */}
            {toast && (
                <div className="farmacia-toast farmacia-toast-global">
                    <CheckCircle2 size={15} /> {toast}
                </div>
            )}
        </div>
    );
};

export default AcoesList;
