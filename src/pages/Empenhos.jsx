import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, FileText, TrendingUp, Edit2, Trash2, DollarSign, FileCheck, AlertCircle, PieChart, PlusCircle, MinusCircle, Eye, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { commitmentsService } from '../services/api/commitments.service';
import { contractsService } from '../services/api/contracts.service';
import { secretariatsService } from '../services/api/secretariats.service';
import { useTenant } from '../context/TenantContext';
import { formatLocalDate, getTodayLocalDateString } from '../utils/dateUtils';
import './Contratos.css';
import './Empenhos.css';

const Empenhos = () => {
    const navigate = useNavigate();
    const { tenantId } = useTenant();

    // 1. Data State
    const [commitments, setCommitments] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [secretariats, setSecretariats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 2. Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [contractFilter, setContractFilter] = useState('ALL');
    const [secretariaFilter, setSecretariaFilter] = useState('ALL');

    // 3. Modals State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddValueModalOpen, setIsAddValueModalOpen] = useState(false);
    const [isAnnulValueModalOpen, setIsAnnulValueModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const [selectedCommitment, setSelectedCommitment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
    const [openActionMenuId, setOpenActionMenuId] = useState(null); // ID of row showing the dropdown

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

    // Form States
    const [createForm, setCreateForm] = useState({
        contract_id: '',
        secretariat_id: '',
        number: '',
        issue_date: getTodayLocalDateString(),
        initial_amount: '',
        notes: ''
    });

    const [valueForm, setValueForm] = useState({
        value: '',
        description: ''
    });

    const [editForm, setEditForm] = useState({
        issue_date: '',
        notes: ''
    });

    const loadData = async () => {
        if (!tenantId) return;
        try {
            setIsLoading(true);
            const [commsData, contData, secData] = await Promise.all([
                commitmentsService.list(tenantId),
                contractsService.list(tenantId),
                secretariatsService.listSecretariats(tenantId)
            ]);
            setCommitments(commsData);
            setContracts(contData);
            setSecretariats(secData);
        } catch (error) {
            console.error("Erro ao carregar dados de empenhos:", error);
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

    const handleCurrencyInput = (e, setter, formState, field) => {
        let value = e.target.value.replace(/\D/g, ""); 
        if (value === "") {
            setter({ ...formState, [field]: "" });
            return;
        }
        const floatValue = parseInt(value, 10) / 100;
        setter({ ...formState, [field]: floatValue });
    };

    const getMaskedCurrencyValue = (numValue) => {
        if (numValue === "" || numValue === undefined || numValue === null) return "";
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numValue);
    };

    // Filter Engine
    const filteredCommitments = useMemo(() => {
        return commitments.filter(c => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesNumber = c.number?.toLowerCase().includes(query);
                const matchesContract = c.contract?.number?.toLowerCase().includes(query) || c.contract?.title?.toLowerCase().includes(query);
                if (!matchesNumber && !matchesContract) return false;
            }
            if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
            if (contractFilter !== 'ALL' && c.contract_id !== contractFilter) return false;
            if (secretariaFilter !== 'ALL' && c.secretariat_id !== secretariaFilter) return false;
            return true;
        });
    }, [commitments, searchQuery, statusFilter, contractFilter, secretariaFilter]);

    // Summary Calculations
    const totalEmpenhos = filteredCommitments.length;
    const saldoTotalDisponivel = filteredCommitments.reduce((acc, c) => acc + (c.current_balance || 0), 0);
    const empenhosConsumidos = filteredCommitments.reduce((acc, c) => acc + (Number(c.consumed_amount) || 0), 0);
    
    const empenhosSaldoBaixo = filteredCommitments.filter(c => {
        const liquido = (Number(c.initial_amount) || 0) + (Number(c.added_amount) || 0) - (Number(c.annulled_amount) || 0);
        const saldo = c.current_balance || 0;
        const perc = liquido > 0 ? saldo / liquido : 0;
        return perc < 0.2; // < 20%
    }).length;

    // Actions
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFeedback(null);
        try {
            setIsSubmitting(true);
            await commitmentsService.create({
                ...createForm,
                initial_amount: parseFloat(createForm.initial_amount) || 0
            }, tenantId);
            setIsCreateModalOpen(false);
            setCreateForm({
                contract_id: '',
                secretariat_id: '',
                number: '',
                issue_date: getTodayLocalDateString(),
                initial_amount: '',
                notes: ''
            });
            setFeedback({ type: 'success', message: 'Empenho criado com sucesso!' });
            setTimeout(() => setFeedback(null), 3000);
            await loadData();
        } catch (error) {
            console.error("Erro na criação:", error);
            setFeedback({ type: 'error', message: 'Não foi possível criar o empenho. Verifique os dados informados ou se a numeração já existe.' });
            setTimeout(() => setFeedback(null), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddValueSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await commitmentsService.addValue(
                selectedCommitment.id, 
                parseFloat(valueForm.value) || 0, 
                valueForm.description, 
                tenantId
            );
            setIsAddValueModalOpen(false);
            setSelectedCommitment(null);
            setValueForm({ value: '', description: '' });
            setFeedback({ type: 'success', message: 'Valor adicionado com sucesso!' });
            setTimeout(() => setFeedback(null), 3000);
            await loadData();
        } catch (error) {
            console.error("Erro ao adicionar valor:", error);
            setFeedback({ type: 'error', message: 'Não foi possível adicionar o valor. Tente novamente.' });
            setTimeout(() => setFeedback(null), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAnnulValueSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await commitmentsService.annulValue(
                selectedCommitment.id, 
                parseFloat(valueForm.value) || 0, 
                valueForm.description, 
                tenantId
            );
            setIsAnnulValueModalOpen(false);
            setSelectedCommitment(null);
            setValueForm({ value: '', description: '' });
            setFeedback({ type: 'success', message: 'Valor anulado com sucesso!' });
            setTimeout(() => setFeedback(null), 3000);
            await loadData();
        } catch (error) {
            console.error("Erro ao anular valor:", error);
            setFeedback({ type: 'error', message: `Não foi possível anular o valor: ${error.message}` });
            setTimeout(() => setFeedback(null), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openAddValueModal = (commitment) => {
        setSelectedCommitment(commitment);
        setValueForm({ value: '', description: '' });
        setIsAddValueModalOpen(true);
    };

    const openAnnulValueModal = (commitment) => {
        setSelectedCommitment(commitment);
        setValueForm({ value: '', description: '' });
        setIsAnnulValueModalOpen(true);
    };

    const openEditModal = (commitment) => {
        if (!commitment) return;
        setSelectedCommitment(commitment);
        setEditForm({
            issue_date: commitment.issue_date?.split('T')[0] || getTodayLocalDateString(),
            notes: commitment.notes || ''
        });
        setOpenActionMenuId(null);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (commitment) => {
        if (!commitment) return;
        // Validation check for # of movements directly here for UX block without API call delay
        const movementCount = commitment.movement_count || 1; 
        // Note: movement_count might not be returned directly by list query, if it's not, we'll try to block via service and show toast
        if (commitment.added_amount > 0 || commitment.annulled_amount > 0 || commitment.consumed_amount > 0) {
             setFeedback({ type: 'error', message: 'Este empenho possui movimentações financeiras e não pode ser excluído.' });
             setTimeout(() => setFeedback(null), 4000);
             setOpenActionMenuId(null);
             return;
        }

        setSelectedCommitment(commitment);
        setOpenActionMenuId(null);
        setIsDeleteModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await commitmentsService.updateCommitment(
                selectedCommitment.id, 
                tenantId, 
                editForm
            );
            setIsEditModalOpen(false);
            setSelectedCommitment(null);
            setFeedback({ type: 'success', message: 'Empenho atualizado com sucesso!' });
            setTimeout(() => setFeedback(null), 3000);
            await loadData();
        } catch (error) {
            console.error("Erro ao editar empenho:", error);
            setFeedback({ type: 'error', message: `Não foi possível editar o empenho: ${error.message}` });
            setTimeout(() => setFeedback(null), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSubmit = async () => {
        try {
            setIsSubmitting(true);
            await commitmentsService.deleteCommitment(selectedCommitment.id, tenantId);
            setIsDeleteModalOpen(false);
            setSelectedCommitment(null);
            setFeedback({ type: 'success', message: 'Empenho excluído com sucesso!' });
            setTimeout(() => setFeedback(null), 3000);
            await loadData();
        } catch (error) {
            console.error("Erro ao excluir empenho:", error);
            setIsDeleteModalOpen(false); // Close modal on error to show toast securely
            setFeedback({ type: 'error', message: `Não foi possível excluir o empenho: ${error.message}` });
            setTimeout(() => setFeedback(null), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="ct-container" style={{ gap: '1rem' }}>
            {/* Header */}
            <header className="ct-header">
                <div>
                    <h1 className="ct-title">Empenhos</h1>
                    <p className="ct-subtitle">Gestão financeira e acompanhamento de saldos dos empenhos</p>
                </div>
                <button className="ct-primary-btn" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={18} />
                    <span>Novo Empenho</span>
                </button>
            </header>

            {/* Summary Cards */}
            <div className="summary-cards-grid">
                <div className="summary-card">
                    <div className="summary-card-icon blue">
                        <FileCheck size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Total de Empenhos</div>
                        <div className="summary-card-value">{totalEmpenhos}</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-card-icon green">
                        <DollarSign size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Saldo Total Disponível</div>
                        <div className="summary-card-value" style={{ color: '#0f8b4d' }}>
                            {formatCurrency(saldoTotalDisponivel)}
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-card-icon amber">
                        <AlertCircle size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Empenhos com Saldo Baixo</div>
                        <div className="summary-card-value" style={empenhosSaldoBaixo > 0 ? { color: '#d97706' } : {}}>
                            {empenhosSaldoBaixo}
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-card-icon purple">
                        <PieChart size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Volume Consumido</div>
                        <div className="summary-card-value">{formatCurrency(empenhosConsumidos)}</div>
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
                    <div className="filters-row" style={{ gap: '0.5rem' }}>
                        <div className="filter-search" style={{ flex: '2 1 250px' }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por número do empenho ou contrato..."
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
                            <option value="EMPENHADO">Empenhado</option>
                            <option value="LIQUIDADO">Liquidado</option>
                            <option value="PAGO">Pago</option>
                        </select>
                    </div>
                </section>

                {/* Data Table */}
                <section className="table-section">
                    <div className="data-table-wrapper">
                        <table className="data-table empenhos-table">
                            <thead>
                                <tr>
                                    <th>Empenho / Contrato</th>
                                    <th>Secretaria</th>
                                    <th>Valor Inicial</th>
                                    <th>Consumido</th>
                                    <th>Saldo</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="loading-state">
                                            <div className="loading-state-content">
                                                <TrendingUp size={48} className="animate-pulse" />
                                                <h3>Buscando empenhos...</h3>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCommitments.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="empty-state">
                                            <div className="empty-state-content">
                                                <FileText size={48} />
                                                <h3>Nenhum empenho encontrado</h3>
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
                                    filteredCommitments.map(emp => {
                                        const inicial = Number(emp.initial_amount) || 0;
                                        const adicoes = Number(emp.added_amount) || 0;
                                        const anulacoes = Number(emp.annulled_amount) || 0;
                                        const consumido = Number(emp.consumed_amount) || 0;
                                        const liquido = inicial + adicoes - anulacoes;
                                        const saldo = emp.current_balance || 0;
                                        const isLow = liquido > 0 && (saldo / liquido) < 0.2;

                                        return (
                                            <tr key={emp.id} className="clickable-row">
                                                <td onClick={() => navigate(`/compras/empenhos/${emp.id}`)}>
                                                    <div className="emp-contract-info">
                                                        <span className="td-number" style={{ fontSize: '0.875rem' }}>{emp.number}</span>
                                                        <span className="emp-meta-text" style={{ marginTop: '0', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={emp.contract?.title}>
                                                            {emp.contract?.number} - {emp.contract?.title}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td onClick={() => navigate(`/compras/empenhos/${emp.id}`)}>
                                                    <div className="emp-contract-info">
                                                        <span className="title-text">{emp.secretariat?.name || '-'}</span>
                                                    </div>
                                                </td>
                                                <td onClick={() => navigate(`/compras/empenhos/${emp.id}`)}>
                                                    <div className="emp-contract-info">
                                                        <span className="val-total" style={{ fontWeight: 500, marginBottom: 0 }}>{formatCurrency(inicial)}</span>
                                                        {(adicoes > 0 || anulacoes > 0) && (
                                                            <span className="emp-meta-text">
                                                                {adicoes > 0 && <span style={{ color: '#16a34a' }}>+ {formatCurrency(adicoes)}</span>}
                                                                {anulacoes > 0 && <span style={{ color: '#ef4444', marginLeft: adicoes > 0 ? '4px' : '0' }}>- {formatCurrency(anulacoes)}</span>}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td onClick={() => navigate(`/compras/empenhos/${emp.id}`)}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                                        <span className="val-total emp-value-consumido" style={consumido > 0 ? { color: '#7C6EE6', fontWeight: 600 } : {}}>
                                                            {formatCurrency(consumido)}
                                                        </span>
                                                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div 
                                                                style={{ 
                                                                    width: `${Math.min((consumido / (inicial || 1)) * 100, 100)}%`, 
                                                                    height: '100%', 
                                                                    backgroundColor: consumido > 0 ? '#7C6EE6' : 'transparent', 
                                                                    borderRadius: '4px', 
                                                                    transition: 'width 0.3s ease' 
                                                                }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td onClick={() => navigate(`/compras/empenhos/${emp.id}`)}>
                                                    <span className={`val-total emp-value-destaque`} style={isLow ? { color: '#d97706' } : {}}>
                                                        {formatCurrency(saldo)}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }} onClick={() => navigate(`/compras/empenhos/${emp.id}`)}>
                                                    <span className={`status-badge ${emp.status?.toLowerCase()}`}>
                                                        {emp.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    <div className="action-buttons-group">
                                                        <button 
                                                            className="action-btn" 
                                                            style={{ color: '#16a34a' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openAddValueModal(emp);
                                                            }}
                                                        >
                                                            <PlusCircle size={18} />
                                                            <span className="premium-tooltip">Adicionar Valor</span>
                                                        </button>
                                                        <button 
                                                            className="action-btn" 
                                                            style={{ color: '#ef4444' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openAnnulValueModal(emp);
                                                            }}
                                                        >
                                                            <MinusCircle size={18} />
                                                            <span className="premium-tooltip">Anular Valor</span>
                                                        </button>
                                                        <button 
                                                            className="action-btn edit" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/compras/empenhos/${emp.id}`);
                                                            }}
                                                        >
                                                            <Eye size={18} />
                                                            <span className="premium-tooltip">Visualizar</span>
                                                        </button>

                                                        {/* More Actions Dropdown */}
                                                        <div className="action-menu-container" style={{ position: 'relative', display: 'flex' }}>
                                                            <button 
                                                                className="action-btn" 
                                                                style={{ color: '#64748b' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenActionMenuId(openActionMenuId === emp.id ? null : emp.id);
                                                                }}
                                                            >
                                                                <MoreVertical size={18} />
                                                                <span className="premium-tooltip">Mais ações</span>
                                                            </button>
                                                            
                                                            {openActionMenuId === emp.id && (
                                                                <div 
                                                                    className="action-dropdown"
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: '100%',
                                                                        right: 0,
                                                                        marginTop: '4px',
                                                                        backgroundColor: '#fff',
                                                                        border: '1px solid #e2e8f0',
                                                                        borderRadius: '8px',
                                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                                        zIndex: 100,
                                                                        minWidth: '160px',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        padding: '4px 0'
                                                                    }}
                                                                >
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); openEditModal(emp); }}
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#334155'
                                                                        }}
                                                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    >
                                                                        <Edit2 size={16} /> Editar empenho
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); openDeleteModal(emp); }}
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#ef4444'
                                                                        }}
                                                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    >
                                                                        <Trash2 size={16} /> Excluir empenho
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Table Footer */}
                    <div className="table-footer">
                        Exibindo {filteredCommitments.length} de {commitments.length} empenhos encontrados
                    </div>
                </section>
            </div>

            {/* MODAL: NOVO EMPENHO */}
            {isCreateModalOpen && (
                <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Novo Empenho</h2>
                            <button className="close-btn" onClick={() => setIsCreateModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form id="createEmpenhoForm" onSubmit={handleCreateSubmit}>
                                <div className="contract-form-section">
                                    <div className="contract-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="form-group">
                                            <label>Contrato Vinculado *</label>
                                            <select 
                                                required 
                                                value={createForm.contract_id} 
                                                onChange={e => setCreateForm({...createForm, contract_id: e.target.value})}
                                            >
                                                <option value="">Selecione o contrato</option>
                                                {contracts.filter(c => c.status !== 'RESCINDIDO').map(c => (
                                                    <option key={c.id} value={c.id}>{c.number} - {c.title} ({c.supplierName})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Secretaria Solicitante *</label>
                                            <select 
                                                required 
                                                value={createForm.secretariat_id} 
                                                onChange={e => setCreateForm({...createForm, secretariat_id: e.target.value})}
                                            >
                                                <option value="">Selecione a secretaria</option>
                                                {secretariats.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="contract-form-grid" style={{ marginTop: '1.5rem' }}>
                                        <div className="form-group">
                                            <label>Número do Empenho *</label>
                                            <input 
                                                required 
                                                type="text" 
                                                placeholder="Ex: 2026NE000123" 
                                                value={createForm.number} 
                                                onChange={e => setCreateForm({...createForm, number: e.target.value})} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Data de Emissão *</label>
                                            <input 
                                                required 
                                                type="date" 
                                                value={createForm.issue_date} 
                                                onChange={e => setCreateForm({...createForm, issue_date: e.target.value})} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Valor Inicial (R$) *</label>
                                            <input 
                                                required 
                                                type="text" 
                                                placeholder="R$ 0,00" 
                                                value={getMaskedCurrencyValue(createForm.initial_amount)} 
                                                onChange={e => handleCurrencyInput(e, setCreateForm, createForm, 'initial_amount')} 
                                            />
                                        </div>
                                    </div>
                                    <div className="contract-form-grid" style={{ gridTemplateColumns: '1fr', marginTop: '1.5rem' }}>
                                        <div className="form-group">
                                            <label>Observações</label>
                                            <input 
                                                type="text" 
                                                placeholder="Detalhes adicionais (opcional)" 
                                                value={createForm.notes} 
                                                onChange={e => setCreateForm({...createForm, notes: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button type="submit" form="createEmpenhoForm" className="btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : 'Salvar Empenho'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ADICIONAR VALOR */}
            {isAddValueModalOpen && selectedCommitment && (
                <div className="modal-overlay" onClick={() => setIsAddValueModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header" style={{ borderBottomColor: '#dcfce7' }}>
                            <h2 style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PlusCircle size={20} /> Adicionar Valor
                            </h2>
                            <button className="close-btn" onClick={() => setIsAddValueModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '4px' }}>Empenho</div>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedCommitment.number}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Saldo Atual</div>
                                        <div style={{ fontWeight: 600, color: '#0f8b4d' }}>{formatCurrency(selectedCommitment.current_balance)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Saldo Projetado</div>
                                        <div style={{ fontWeight: 600, color: '#3b82f6' }}>{formatCurrency((selectedCommitment.current_balance || 0) + (parseFloat(valueForm.value) || 0))}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <form id="addValueForm" onSubmit={handleAddValueSubmit}>
                                <div className="contract-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                                    <div className="form-group">
                                        <label>Valor do Acréscimo (R$) *</label>
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder="R$ 0,00" 
                                            value={getMaskedCurrencyValue(valueForm.value)} 
                                            onChange={e => handleCurrencyInput(e, setValueForm, valueForm, 'value')} 
                                            style={{ borderColor: '#22c55e' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Motivo / Descrição *</label>
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder="Ex: Aditivo contratual, reajuste..." 
                                            value={valueForm.description} 
                                            onChange={e => setValueForm({...valueForm, description: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={() => setIsAddValueModalOpen(false)} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button type="submit" form="addValueForm" className="btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} disabled={isSubmitting || !parseFloat(valueForm.value)}>
                                {isSubmitting ? 'Confirmando...' : 'Confirmar Adição'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ANULAR VALOR */}
            {isAnnulValueModalOpen && selectedCommitment && (
                <div className="modal-overlay" onClick={() => setIsAnnulValueModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header" style={{ borderBottomColor: '#fee2e2' }}>
                            <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MinusCircle size={20} /> Anular Valor
                            </h2>
                            <button className="close-btn" onClick={() => setIsAnnulValueModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: '#fff1f2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fecaca' }}>
                                <div style={{ fontSize: '0.8125rem', color: '#991b1b', marginBottom: '4px' }}>Empenho</div>
                                <div style={{ fontWeight: 600, color: '#7f1d1d' }}>{selectedCommitment.number}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>Saldo Atual</div>
                                        <div style={{ fontWeight: 600, color: '#0f8b4d' }}>{formatCurrency(selectedCommitment.current_balance)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>Saldo Projetado</div>
                                        <div style={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency((selectedCommitment.current_balance || 0) - (parseFloat(valueForm.value) || 0))}</div>
                                    </div>
                                </div>
                                {(parseFloat(valueForm.value) || 0) > (selectedCommitment.current_balance || 0) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontSize: '0.75rem', marginTop: '8px', fontWeight: 500 }}>
                                        <AlertTriangle size={14} /> O valor anulado não pode ser maior que o saldo atual!
                                    </div>
                                )}
                            </div>
                            
                            <form id="annulValueForm" onSubmit={handleAnnulValueSubmit}>
                                <div className="contract-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                                    <div className="form-group">
                                        <label>Valor da Anulação (R$) *</label>
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder="R$ 0,00" 
                                            value={getMaskedCurrencyValue(valueForm.value)} 
                                            onChange={e => handleCurrencyInput(e, setValueForm, valueForm, 'value')} 
                                            style={{ borderColor: '#ef4444' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Motivo / Descrição *</label>
                                        <input 
                                            required 
                                            type="text" 
                                            placeholder="Ex: Anulação parcial, correção..." 
                                            value={valueForm.description} 
                                            onChange={e => setValueForm({...valueForm, description: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={() => setIsAnnulValueModalOpen(false)} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                form="annulValueForm" 
                                className="btn-primary" 
                                style={{ background: '#ef4444', borderColor: '#ef4444' }} 
                                disabled={isSubmitting || !parseFloat(valueForm.value) || parseFloat(valueForm.value) > (selectedCommitment.current_balance || 0)}
                            >
                                {isSubmitting ? 'Confirmando...' : 'Confirmar Anulação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: EDITAR EMPENHO */}
            {isEditModalOpen && selectedCommitment && (
                <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Editar Empenho</h2>
                            <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form id="editEmpenhoForm" onSubmit={handleEditSubmit}>
                                <div className="contract-form-section">
                                    <div className="contract-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="form-group">
                                            <label>Contrato Vinculado</label>
                                            <input 
                                                type="text" 
                                                disabled 
                                                value={`${selectedCommitment.contract?.number || ''} / ${selectedCommitment.contract?.title || ''}`} 
                                                style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Secretaria Solicitante</label>
                                            <input 
                                                type="text" 
                                                disabled 
                                                value={selectedCommitment.secretariat?.name || '-'} 
                                                style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="contract-form-grid" style={{ marginTop: '1.5rem' }}>
                                        <div className="form-group">
                                            <label>Número do Empenho</label>
                                            <input 
                                                type="text" 
                                                disabled 
                                                value={selectedCommitment.number} 
                                                style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Data de Emissão *</label>
                                            <input 
                                                required 
                                                type="date" 
                                                value={editForm.issue_date} 
                                                disabled={(selectedCommitment.movement_count || 1) > 1 || selectedCommitment.added_amount > 0 || selectedCommitment.annulled_amount > 0 || selectedCommitment.consumed_amount > 0}
                                                onChange={e => setEditForm({...editForm, issue_date: e.target.value})} 
                                                style={(selectedCommitment.added_amount > 0 || selectedCommitment.annulled_amount > 0 || selectedCommitment.consumed_amount > 0) ? { backgroundColor: '#f1f5f9', color: '#64748b' } : {}}
                                                title={(selectedCommitment.added_amount > 0 || selectedCommitment.annulled_amount > 0 || selectedCommitment.consumed_amount > 0) ? 'A data não pode ser alterada pois o empenho já possui movimentações.' : ''}
                                            />
                                        </div>
                                    </div>
                                    <div className="contract-form-grid" style={{ gridTemplateColumns: '1fr', marginTop: '1.5rem' }}>
                                        <div className="form-group">
                                            <label>Observações</label>
                                            <textarea 
                                                placeholder="Detalhes adicionais (opcional)" 
                                                value={editForm.notes} 
                                                onChange={e => setEditForm({...editForm, notes: e.target.value})} 
                                                style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button type="submit" form="editEmpenhoForm" className="btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: EXCLUIR EMPENHO */}
            {isDeleteModalOpen && selectedCommitment && (
                <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 style={{ color: '#ef4444' }}>Excluir Empenho</h2>
                            <button className="close-btn" onClick={() => setIsDeleteModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                                <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem', display: 'inline-block' }} />
                                <h3 style={{ marginBottom: '0.5rem' }}>Você tem certeza que deseja excluir este empenho?</h3>
                                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    Esta ação não pode ser desfeita.
                                </p>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <div style={{ marginBottom: '0.5rem' }}><strong>Número:</strong> {selectedCommitment.number}</div>
                                    <div style={{ marginBottom: '0.5rem' }}><strong>Contrato:</strong> {selectedCommitment.contract?.number}</div>
                                    <div><strong>Valor Inicial:</strong> {formatCurrency(selectedCommitment.initial_amount)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
                            <button type="button" className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button type="button" onClick={handleDeleteSubmit} className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} disabled={isSubmitting}>
                                {isSubmitting ? 'Excluindo...' : 'Excluir Empenho'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Empenhos;
