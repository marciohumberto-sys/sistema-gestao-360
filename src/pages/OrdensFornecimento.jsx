import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileText, TrendingUp, Eye, FileCheck, AlertCircle, PlayCircle, XCircle, MoreVertical, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ofsService } from '../services/api/ofs.service';
import { contractsService } from '../services/api/contracts.service';
import { secretariatsService } from '../services/api/secretariats.service';
import { useTenant } from '../context/TenantContext';
import { formatLocalDate } from '../utils/dateUtils';
import NovaOfModal from './components/NovaOfModal';
import './Contratos.css';
import './OrdensFornecimento.css';

const OrdensFornecimento = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { tenantId } = useTenant();

    // 1. Data State
    const [ofs, setOfs] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [secretariats, setSecretariats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 2. Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [contractFilter, setContractFilter] = useState('ALL');
    const [secretariaFilter, setSecretariaFilter] = useState('ALL');

    // 3. Modals & Actions State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [openActionMenuId, setOpenActionMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [isNovaOfModalOpen, setIsNovaOfModalOpen] = useState(false);

    // Listen to route state to open modal automatically
    useEffect(() => {
        if (location.state?.openModal === 'nova-of') {
            setIsNovaOfModalOpen(true);
            // Clear state so it doesn't reopen on refresh/navigation back
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Click outside handler for dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.action-menu-container')) {
                setOpenActionMenuId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadData = async () => {
        if (!tenantId) return;
        try {
            setIsLoading(true);
            const [ofsData, contData, secData] = await Promise.all([
                ofsService.list(tenantId),
                contractsService.list(tenantId),
                secretariatsService.listSecretariats(tenantId)
            ]);
            setOfs(ofsData);
            setContracts(contData);
            setSecretariats(secData);
        } catch (error) {
            console.error("Erro ao carregar dados de OFs:", error);
            setFeedback({ type: 'error', message: 'Erro ao carregar dados remotos.' });
        } finally {
            setIsLoading(false);
        }
    };

     
    useEffect(() => {
        let isMounted = true;
        if (isMounted) loadData();
        return () => { isMounted = false; };
    }, [tenantId]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    // Filter Engine
    const filteredOfs = useMemo(() => {
        return ofs.filter(o => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesNumber = o.number?.toLowerCase().includes(query);
                const matchesContract = o.contract?.number?.toLowerCase().includes(query) || o.contract?.title?.toLowerCase().includes(query);
                if (!matchesNumber && !matchesContract) return false;
            }
            if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
            if (contractFilter !== 'ALL' && o.contract_id !== contractFilter) return false;
            if (secretariaFilter !== 'ALL' && o.secretariat_id !== secretariaFilter) return false;
            return true;
        });
    }, [ofs, searchQuery, statusFilter, contractFilter, secretariaFilter]);

    // Summary Calculations
    const totalOfs = filteredOfs.length;
    const ofsDraft = filteredOfs.filter(o => o.status === 'DRAFT').length;
    const ofsIssued = filteredOfs.filter(o => o.status === 'ISSUED').length;
    const valorTotalOfs = filteredOfs.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
    
    // Actions
    const handleIssueOf = async (ofId) => {
        try {
            setIsSubmitting(true);
            await ofsService.issueOf(ofId, tenantId);
            setFeedback({ type: 'success', message: 'OF emitida com sucesso!' });
            setTimeout(() => setFeedback(null), 3000);
            await loadData();
        } catch (error) {
            console.error("Erro ao emitir OF:", error);
            setFeedback({ type: 'error', message: error.message || 'Erro ao emitir a OF.' });
            setTimeout(() => setFeedback(null), 4000);
        } finally {
            setIsSubmitting(false);
            setOpenActionMenuId(null);
        }
    };

    const handleCancelOf = async (ofId) => {
        try {
            setIsSubmitting(true);
            await ofsService.cancelOf(ofId, tenantId);
            setFeedback({ type: 'success', message: 'OF cancelada com sucesso!' });
            setTimeout(() => setFeedback(null), 3000);
            await loadData();
        } catch (error) {
            console.error("Erro ao cancelar OF:", error);
            setFeedback({ type: 'error', message: error.message || 'Erro ao cancelar a OF.' });
            setTimeout(() => setFeedback(null), 4000);
        } finally {
            setIsSubmitting(false);
            setOpenActionMenuId(null);
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'DRAFT': return 'Rascunho';
            case 'ISSUED': return 'Emitida';
            case 'CANCELLED':
            case 'CANCELED': return 'Cancelada';
            default: return status;
        }
    };

    return (
        <div className="ct-container" style={{ gap: '1rem' }}>
            {/* Header */}
            <header className="ct-header">
                <div>
                    <h1 className="ct-title">Ordens de Fornecimento</h1>
                    <p className="ct-subtitle">Gestão e acompanhamento das OFs geradas</p>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="summary-cards-grid">
                <div className="summary-card">
                    <div className="summary-card-icon blue">
                        <FileText size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Total de OFs</div>
                        <div className="summary-card-value">{totalOfs}</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-card-icon amber">
                        <AlertCircle size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">OFs em Rascunho</div>
                        <div className="summary-card-value" style={ofsDraft > 0 ? { color: '#d97706' } : {}}>
                            {ofsDraft}
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-card-icon green">
                        <FileCheck size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">OFs Emitidas</div>
                        <div className="summary-card-value" style={{ color: '#0f8b4d' }}>
                            {ofsIssued}
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-card-icon purple">
                        <TrendingUp size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Volume Total OFs</div>
                        <div className="summary-card-value">{formatCurrency(valorTotalOfs)}</div>
                    </div>
                </div>
            </div>

            {/* Feedback Message */}
            {feedback && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    padding: '20px 32px',
                    borderRadius: '12px',
                    background: feedback.type === 'success' ? '#0b7035' : '#7f1d1d',
                    color: 'white',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontWeight: 500,
                    fontSize: '1.125rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {feedback.type === 'success' ? <FileCheck size={24} /> : <AlertCircle size={24} />}
                        {feedback.message}
                    </div>
                    {feedback.type === 'error' && (
                        <button 
                            onClick={() => setFeedback(null)} 
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'rgba(255,255,255,0.8)', 
                                cursor: 'pointer',
                                padding: '4px',
                                marginLeft: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                            title="Fechar"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    )}
                </div>
            )}

            <div className="main-content-card" style={{ padding: '1rem 1.5rem' }}>
                {/* Filters Bar */}
                <section className="filters-toolbar empenhos-compact-filters" style={{ paddingBottom: '0.75rem', marginBottom: '0', gap: '0.75rem', borderBottom: 'none' }}>
                    <div className="filters-row">
                        <div className="filter-search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por número da OF ou contrato..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <select className="filter-select" value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}>
                            <option value="ALL">Todos os Contratos</option>
                            {contracts.map(c => (
                                <option key={c.id} value={c.id}>{c.number} - {c.title}</option>
                            ))}
                        </select>

                        <select className="filter-select" value={secretariaFilter} onChange={(e) => setSecretariaFilter(e.target.value)}>
                            <option value="ALL">Todas as Secretarias</option>
                            {secretariats.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="ALL">Status</option>
                            <option value="DRAFT">Rascunho</option>
                            <option value="ISSUED">Emitida</option>
                            <option value="CANCELLED">Cancelada</option>
                        </select>
                    </div>
                </section>

                {/* Data Table */}
                <section className="table-section">
                    <div className="data-table-wrapper">
                        <table className="data-table ofs-table" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th>Nº da OF</th>
                                    <th>Contrato</th>
                                    <th>Secretaria</th>
                                    <th>Valor Total</th>
                                    <th>Status</th>
                                    <th>Data Emissão</th>
                                    <th style={{ textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="loading-state">
                                            <div className="loading-state-content">
                                                <TrendingUp size={48} className="animate-pulse" />
                                                <h3>Buscando Ordens de Fornecimento...</h3>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredOfs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="empty-state">
                                            <div className="empty-state-content">
                                                <FileText size={48} />
                                                <h3>Nenhuma OF encontrada</h3>
                                                <p>Ajuste os filtros ou verifique a conexão.</p>
                                                {(searchQuery || statusFilter !== 'ALL' || contractFilter !== 'ALL' || secretariaFilter !== 'ALL') && (
                                                    <button
                                                        className="clear-filters-btn"
                                                        onClick={() => {
                                                            setSearchQuery('');
                                                            setStatusFilter('ALL');
                                                            setContractFilter('ALL');
                                                            setSecretariaFilter('ALL');
                                                        }}
                                                    >
                                                        Limpar busca
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOfs.map(of => (
                                        <tr key={of.id} className="clickable-row">
                                            <td onClick={() => navigate(`/compras/ordens-fornecimento/${of.id}`)}>
                                                <span className="td-number" style={{ fontSize: '0.875rem' }}>{of.number}</span>
                                            </td>
                                            <td onClick={() => navigate(`/compras/ordens-fornecimento/${of.id}`)}>
                                                <div className="emp-contract-info">
                                                    <span className="emp-contract-number">{of.contract?.number || '-'}</span>
                                                    <span className="emp-contract-type" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={of.contract?.title}>
                                                        {of.contract?.title || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td onClick={() => navigate(`/compras/ordens-fornecimento/${of.id}`)}>
                                                <span className="title-text">{of.secretariat?.name || '-'}</span>
                                            </td>
                                            <td onClick={() => navigate(`/compras/ordens-fornecimento/${of.id}`)}>
                                                <span className="val-total" style={{ fontWeight: 600, fontStyle: of.status === 'DRAFT' ? 'italic' : 'normal' }}>
                                                    {of.status === 'DRAFT' ? 'OF em edição' : formatCurrency(of.total_amount)}
                                                </span>
                                            </td>
                                            <td onClick={() => navigate(`/compras/ordens-fornecimento/${of.id}`)}>
                                                <span className={`status-badge ${of.status?.toLowerCase()}`}>
                                                    {getStatusLabel(of.status)}
                                                </span>
                                            </td>
                                            <td onClick={() => navigate(`/compras/ordens-fornecimento/${of.id}`)}>
                                                <span className="td-date">
                                                    {of.issue_date ? formatLocalDate(of.issue_date) : '-'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <div className="action-buttons-group">
                                                    <button 
                                                        className="action-btn edit" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/compras/ordens-fornecimento/${of.id}`);
                                                        }}
                                                    >
                                                        <Eye size={18} />
                                                    </button>

                                                    {/* More Actions Dropdown via Portal */}
                                                    <div className="action-menu-container" style={{ position: 'relative', display: 'flex' }}>
                                                        <button 
                                                            className="action-btn" 
                                                            style={{ color: '#64748b' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setMenuPosition({
                                                                    top: rect.bottom + window.scrollY + 4,
                                                                    left: rect.right + window.scrollX - 160 // 160 is the minWidth
                                                                });
                                                                setOpenActionMenuId(openActionMenuId === of.id ? null : of.id);
                                                            }}
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>
                                                        
                                                        {openActionMenuId === of.id && createPortal(
                                                            <div 
                                                                className="action-dropdown portal-dropdown"
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: `${menuPosition.top}px`,
                                                                    left: `${menuPosition.left}px`,
                                                                    backgroundColor: '#fff',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '8px',
                                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                                    zIndex: 9999,
                                                                    minWidth: '160px',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    padding: '4px 0'
                                                                }}
                                                            >
                                                                <button 
                                                                    className="action-button icon-only" 
                                                                    onClick={(e) => { e.stopPropagation(); navigate(`/compras/ordens-fornecimento/${of.id}`); }}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#4a5568'
                                                                    }}
                                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                >
                                                                    <Eye size={16} /> Visualizar OF
                                                                </button>
                                                                {of.status === 'DRAFT' && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleIssueOf(of.id); }}
                                                                        disabled={isSubmitting}
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#16a34a', opacity: isSubmitting ? 0.5 : 1
                                                                        }}
                                                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                                                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    >
                                                                        <PlayCircle size={16} /> Emitir OF
                                                                    </button>
                                                                )}

                                                                {of.status === 'ISSUED' && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleCancelOf(of.id); }}
                                                                        disabled={isSubmitting}
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#ef4444', opacity: isSubmitting ? 0.5 : 1
                                                                        }}
                                                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    >
                                                                        <XCircle size={16} /> Cancelar OF
                                                                    </button>
                                                                )}
                                                                
                                                                {of.status === 'CANCELED' && (
                                                                    <div style={{ padding: '8px 16px', fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                                        Sem ações adicionais
                                                                    </div>
                                                                )}
                                                            </div>,
                                                            document.body
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Table Footer */}
                    <div className="table-footer">
                        Exibindo {filteredOfs.length} de {ofs.length} OFs encontradas
                    </div>
                </section>
            </div>
            <NovaOfModal 
                isOpen={isNovaOfModalOpen}
                onClose={() => setIsNovaOfModalOpen(false)}
            />
        </div>
    );
};

export default OrdensFornecimento;
