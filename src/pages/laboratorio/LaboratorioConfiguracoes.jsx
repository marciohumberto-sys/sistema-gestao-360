import React, { useState, useEffect } from 'react';
import { 
    Settings, RefreshCw, Plus, AlertTriangle, 
    FileSignature, Layers, Activity, Users, 
    Search, Loader2, Eye
} from 'lucide-react';
import { laboratorioConfiguracoesService } from '../../services/api/laboratorioConfiguracoes.service';
import './LaboratorioConfiguracoes.css';

const LaboratorioConfiguracoes = () => {
    const [activeTab, setActiveTab] = useState('exames');
    
    // Cards State
    const [loadingCards, setLoadingCards] = useState(false);
    const [cards, setCards] = useState({
        examesAtivos: 0,
        setoresAtivos: 0,
        parametrosAtivos: 0,
        usuariosVinculados: 0
    });

    // Filters and Data State for Exames
    const [loadingExames, setLoadingExames] = useState(false);
    const [examesList, setExamesList] = useState([]);
    const [sectorsFilter, setSectorsFilter] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState(null);
    
    const [filters, setFilters] = useState({
        search: '',
        sector_id: 'todos',
        status: 'ativos'
    });

    // Initial Load
    useEffect(() => {
        loadDashboardCards();
        loadSectorsFilter();
    }, []);

    // Load data based on tab
    useEffect(() => {
        if (activeTab === 'exames') {
            loadExames();
        }
    }, [activeTab]);

    const loadDashboardCards = async () => {
        try {
            setLoadingCards(true);
            const data = await laboratorioConfiguracoesService.getDashboardCards();
            setCards(data);
        } catch (error) {
            console.error("Erro ao carregar cards:", error);
        } finally {
            setLoadingCards(false);
        }
    };

    const loadSectorsFilter = async () => {
        try {
            const data = await laboratorioConfiguracoesService.getSetoresAtivos();
            setSectorsFilter(data);
        } catch (error) {
            console.error("Erro ao carregar setores:", error);
        }
    };

    const loadExames = async () => {
        try {
            setLoadingExames(true);
            const data = await laboratorioConfiguracoesService.getExames(filters);
            setExamesList(data);
            
            // Se o exame selecionado não estiver na nova lista, seleciona o primeiro
            if (data.length > 0) {
                const stillExists = data.find(e => e.id === selectedExamId);
                if (!stillExists) {
                    setSelectedExamId(data[0].id);
                }
            } else {
                setSelectedExamId(null);
            }
        } catch (error) {
            console.error("Erro ao carregar exames:", error);
        } finally {
            setLoadingExames(false);
        }
    };

    const handleFilterKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loadExames();
        }
    };

    const handleRefresh = async () => {
        await Promise.all([
            loadDashboardCards(),
            activeTab === 'exames' ? loadExames() : Promise.resolve()
        ]);
    };

    const kpis = [
        { label: 'Exames ativos', value: cards.examesAtivos, icon: FileSignature, color: '#3b82f6' },
        { label: 'Setores ativos', value: cards.setoresAtivos, icon: Layers, color: '#10b981' },
        { label: 'Parâmetros ativos', value: cards.parametrosAtivos, icon: Activity, color: '#f59e0b' },
        { label: 'Usuários vinculados', value: cards.usuariosVinculados, icon: Users, color: '#64748b' },
    ];

    const tabs = [
        { id: 'exames', label: 'Exames' },
        { id: 'setores', label: 'Setores' },
        { id: 'parametros', label: 'Parâmetros e Referências' },
        { id: 'usuarios', label: 'Usuários' },
    ];

    const currentExam = examesList.find(e => e.id === selectedExamId);

    const translateResultType = (type) => {
        switch (type) {
            case 'NUMERICO': return 'Numérico';
            case 'TEXTO': return 'Texto';
            case 'ESTRUTURADO': return 'Estruturado';
            case 'QUALITATIVO': return 'Qualitativo';
            default: return type || '---';
        }
    };

    return (
        <div className="lab-cfg-container">
            
            <div className="lab-warning-banner">
                <AlertTriangle size={16} />
                <span>Usuários da Recepção terão acesso somente para visualização das configurações.</span>
            </div>

            <header className="lab-cfg-header">
                <div>
                    <h1 className="lab-title">Configurações</h1>
                    <p className="lab-subtitle">Parâmetros, cadastros e regras operacionais do laboratório</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline" onClick={handleRefresh}>
                        {loadingCards || loadingExames ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 
                        Atualizar lista
                    </button>
                    {activeTab === 'exames' && (
                        <button 
                            className="lab-btn lab-btn-primary" 
                            disabled 
                            title="Cadastro de exames será reativado na próxima fase."
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        >
                            <Plus size={16} /> Novo exame
                        </button>
                    )}
                </div>
            </header>

            {/* KPIs */}
            <div className="lab-kpis-grid" style={{ marginBottom: '1.25rem' }}>
                {kpis.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="lab-kpi-card">
                            <div className="lab-kpi-header">
                                <span className="lab-kpi-label">{item.label}</span>
                                <div className="lab-kpi-icon-wrapper" style={{ backgroundColor: `${item.color}15`, color: item.color, width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div className="lab-kpi-value" style={{ fontSize: '1.6rem' }}>
                                {loadingCards ? <Loader2 size={24} className="spin text-gray-400" /> : item.value}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Abas */}
            <div className="lab-cfg-tabs">
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        className={`lab-cfg-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conteúdo das Abas */}
            {activeTab === 'exames' && (
                <div className="lab-cfg-layout">
                    
                    {/* Lista de Exames */}
                    <div className="lab-cfg-main-col">
                        <div className="lab-card lab-cfg-list-card">
                            <div className="lab-cfg-list-header">
                                <div className="lab-cfg-filters-grid">
                                    <div className="lab-filter-item">
                                        <label>Nome / Código</label>
                                        <input 
                                            type="text" 
                                            placeholder="Buscar exame..." 
                                            value={filters.search}
                                            onChange={e => setFilters({...filters, search: e.target.value})}
                                            onKeyDown={handleFilterKeyDown}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                    </div>
                                    <div className="lab-filter-item">
                                        <label>Setor</label>
                                        <select 
                                            value={filters.sector_id}
                                            onChange={e => setFilters({...filters, sector_id: e.target.value})}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                                        >
                                            <option value="todos">Todos</option>
                                            {sectorsFilter.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="lab-filter-item">
                                        <label>Status</label>
                                        <select 
                                            value={filters.status}
                                            onChange={e => setFilters({...filters, status: e.target.value})}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                                        >
                                            <option value="todos">Todos</option>
                                            <option value="ativos">Ativos</option>
                                            <option value="inativos">Inativos</option>
                                        </select>
                                    </div>
                                    <div className="lab-filter-actions">
                                        <button className="lab-btn lab-btn-primary" style={{ height: '38px' }} onClick={loadExames}>
                                            <Search size={16} /> Buscar
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="lab-cfg-table-wrapper">
                                <table className="lab-cfg-table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Exame</th>
                                            <th>Setor</th>
                                            <th>Material</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingExames ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                                                    <Loader2 size={32} className="spin text-gray-400" style={{ margin: '0 auto' }} />
                                                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Carregando exames...</p>
                                                </td>
                                            </tr>
                                        ) : examesList.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                                                    <p style={{ color: '#64748b' }}>Nenhum exame encontrado com os filtros atuais.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            examesList.map(ex => (
                                                <tr 
                                                    key={ex.id} 
                                                    className={selectedExamId === ex.id ? 'active' : ''}
                                                    onClick={() => setSelectedExamId(ex.id)}
                                                >
                                                    <td className="font-bold text-gray-500" style={{ fontSize: '0.85rem' }}>{ex.code || '---'}</td>
                                                    <td className="font-bold text-primary">{ex.name}</td>
                                                    <td><span className="lab-badge lab-badge-gray" style={{ background: '#f1f5f9', color: '#475569', border: 'none' }}>{ex.sector_name}</span></td>
                                                    <td style={{ color: '#475569', fontSize: '0.9rem' }}>{ex.material || '---'}</td>
                                                    <td>
                                                        <span className={`lab-badge ${ex.is_active ? 'lab-badge-success' : 'lab-badge-gray'}`}>
                                                            {ex.is_active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Detalhe do Exame */}
                    <div className="lab-cfg-side-col">
                        {currentExam ? (
                            <div className="lab-cfg-details-panel">
                                <div className="cfg-panel-header">
                                    <div className="cfg-panel-title">
                                        <h2>{currentExam.code} — {currentExam.name}</h2>
                                    </div>
                                    <div className="cfg-panel-badges mt-2" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span className="lab-badge lab-badge-gray">{currentExam.sector_name}</span>
                                        <span className={`lab-badge ${currentExam.is_active ? 'lab-badge-success' : 'lab-badge-gray'}`}>
                                            {currentExam.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                </div>
                                <div className="cfg-panel-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Código</label>
                                        <span className="font-semibold text-primary">{currentExam.code || '---'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Nome</label>
                                        <span className="font-bold text-gray-900">{currentExam.name}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Setor</label>
                                        <span>{currentExam.sector_name}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Material</label>
                                        <span>{currentExam.material || '---'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Método</label>
                                        <span>{currentExam.method || '---'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Analisador</label>
                                        <span>{currentExam.analyzer_name || '---'}</span>
                                    </div>
                                    <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Tipo de resultado</label>
                                        <span className="font-semibold">{translateResultType(currentExam.result_type)}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Unidade</label>
                                        <span>{currentExam.unit || '---'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Ordem de impressão</label>
                                        <span>{currentExam.print_order}</span>
                                    </div>
                                    <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Exige conferência?</label>
                                        <span style={{ color: currentExam.requires_conference ? '#10b981' : '#64748b', fontWeight: currentExam.requires_conference ? 'bold' : 'normal' }}>
                                            {currentExam.requires_conference ? 'Sim' : 'Não'}
                                        </span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Imprime no laudo?</label>
                                        <span style={{ color: currentExam.prints_on_report ? '#10b981' : '#64748b', fontWeight: currentExam.prints_on_report ? 'bold' : 'normal' }}>
                                            {currentExam.prints_on_report ? 'Sim' : 'Não'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="lab-cfg-details-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                <FileSignature size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p>Selecione um exame para visualizar os detalhes.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'setores' && (
                <div className="lab-card" style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                    <Layers size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Setores</h3>
                    <p>Gerenciamento de setores será reativado na próxima etapa.</p>
                </div>
            )}

            {activeTab === 'parametros' && (
                <div className="lab-card" style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                    <Activity size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Parâmetros e Referências</h3>
                    <p>Gerenciamento de parâmetros será reativado na próxima etapa.</p>
                </div>
            )}

            {activeTab === 'usuarios' && (
                <div className="lab-card" style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                    <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Usuários</h3>
                    <p>Gerenciamento de usuários será reativado na próxima etapa.</p>
                </div>
            )}

        </div>
    );
};

export default LaboratorioConfiguracoes;
