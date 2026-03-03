import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronDown,
    ChevronRight,
    MoreVertical,
    FileText,
    DollarSign,
    Clock,
    Calendar,
    AlertCircle,
    CheckCircle,
    Landmark,
    Trash2,
    Plus,
    Edit2,
    ShieldAlert,
    AlertTriangle
} from 'lucide-react';
import { contractsService } from '../services/api/contracts.service';
import { empenhosService } from '../services/api/empenhos.service';
import { contractItemsService } from '../services/api/contractItems.service';
import { secretariatsService } from '../services/api/secretariats.service';
import { allocationsService } from '../services/api/allocations.service';
import { useTenant } from '../context/TenantContext';
import './ContractDetails.css';

const ContractDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { tenantId } = useTenant();

    const [contract, setContract] = useState(null);
    const [empenhos, setEmpenhos] = useState([]);
    const [isLoadingContract, setIsLoadingContract] = useState(true);
    const [isLoadingEmpenhos, setIsLoadingEmpenhos] = useState(true);
    const [error, setError] = useState(false);

    const [activeTab, setActiveTab] = useState('geral');

    // Itens & Rateio State
    const [items, setItems] = useState([]);
    const [globalItemsCount, setGlobalItemsCount] = useState(0);
    const [secretariats, setSecretariats] = useState([]);
    const [allocationsSummaryByItemId, setAllocationsSummaryByItemId] = useState({}); // { itemId: sumAllocated }
    const [itemAllocations, setItemAllocations] = useState({}); // Mapping from itemId -> allocations list
    const [isLoadingItems, setIsLoadingItems] = useState(false);

    // UI State for Items
    const [expandedItemId, setExpandedItemId] = useState(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isSubmittingItem, setIsSubmittingItem] = useState(false);
    const [itemFormData, setItemFormData] = useState({
        item_number: '', description: '', unit: '', unit_price: '', total_quantity: ''
    });
    const [editingItemId, setEditingItemId] = useState(null);

    // Rateio UI State
    const [allocationForm, setAllocationForm] = useState({}); // { secretariatId: quantity }
    const [rateioSelect, setRateioSelect] = useState('');
    const [rateioAmount, setRateioAmount] = useState('');
    const [isSavingAllocations, setIsSavingAllocations] = useState(false);
    const rateioAmountRef = useRef(null);

    // Delete Confirmation State
    const [itemToDelete, setItemToDelete] = useState(null);

    // Contract Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [contractFormData, setContractFormData] = useState({
        number: '',
        code: '',
        title: '',
        supplierName: '',
        totalValue: '',
        startDate: '',
        endDate: '',
        responsibleUnit: '',
        biddingProcess: '',
        electronicAuction: '',
        notes: ''
    });

    // Toast State
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
    };

    // Força a exibição da barra de rolagem (evita layout shift ao trocar de abas)
    useEffect(() => {
        document.body.style.overflowY = 'scroll';
        return () => {
            document.body.style.overflowY = 'auto';
        };
    }, []);

    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    const loadSecretariats = async () => {
        if (!tenantId) return;
        try {
            const data = await secretariatsService.listSecretariats(tenantId);
            setSecretariats(data);
        } catch (error) {
            console.error("Erro ao carregar secretarias:", error);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchContract = async () => {
            try {
                setIsLoadingContract(true);
                setError(false);
                const contractData = await contractsService.getById(id);
                if (isMounted) {
                    setContract(contractData);
                }
            } catch (err) {
                console.error("Erro ao detalhar contrato:", err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setIsLoadingContract(false);
            }
        };

        const fetchEmpenhos = async () => {
            try {
                setIsLoadingEmpenhos(true);
                const empenhosData = await empenhosService.listByContract(id);
                if (isMounted) {
                    setEmpenhos(empenhosData);
                }
            } catch (err) {
                console.error("Erro ao carregar empenhos:", err);
            } finally {
                if (isMounted) setIsLoadingEmpenhos(false);
            }
        };

        const fetchItemsCount = async () => {
            if (!tenantId || !id) return;
            try {
                const count = await contractItemsService.countContractItems(id, tenantId);
                if (isMounted) setGlobalItemsCount(count);
            } catch (err) {
                console.error("Erro ao carregar contagem de itens:", err);
            }
        };

        if (id) {
            fetchContract();
            fetchEmpenhos();
            loadSecretariats();
            fetchItemsCount();
        }

        return () => { isMounted = false; };
    }, [id, tenantId]);

    const fetchItemsTab = async () => {
        if (!tenantId || !id || activeTab !== 'itens') return;
        try {
            setIsLoadingItems(true);
            const itemsData = await contractItemsService.listContractItems(id, tenantId);
            const secretariatsData = await secretariatsService.listSecretariats(tenantId);

            const itemIds = itemsData.map(i => i.id);
            const contractAllocations = itemIds.length > 0
                ? await allocationsService.listAllocationsByItemIds(itemIds, tenantId)
                : [];

            setItems(itemsData);
            setSecretariats(secretariatsData);

            // Build summary map for badge display:
            const summary = {};
            contractAllocations.forEach(alloc => {
                const iid = alloc.contract_item_id;
                if (!summary[iid]) summary[iid] = 0;
                summary[iid] += (alloc.quantity_allocated || 0);
            });
            setAllocationsSummaryByItemId(summary);
        } catch (err) {
            console.error("Erro ao carregar itens/secretarias:", err);
        } finally {
            setIsLoadingItems(false);
        }
    };

    const handleEditContract = () => {
        if (!contract) return;
        setContractFormData({
            number: contract.number,
            code: contract.code || '',
            title: contract.title,
            supplierName: contract.supplierName,
            totalValue: contract.totalValue,
            startDate: contract.dateRange.startDate || '',
            endDate: contract.dateRange.endDate || '',
            responsibleUnit: contract.responsibleUnit || '',
            biddingProcess: contract.biddingProcess || '',
            electronicAuction: contract.electronicAuction || '',
            notes: contract.notes || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateContract = async (e) => {
        e.preventDefault();
        try {
            setIsSubmittingEdit(true);
            const payload = {
                number: contractFormData.number,
                code: contractFormData.code,
                title: contractFormData.title,
                supplierName: contractFormData.supplierName,
                totalValue: parseFloat(contractFormData.totalValue) || 0,
                dateRange: {
                    startDate: contractFormData.startDate,
                    endDate: contractFormData.endDate
                },
                responsibleUnit: contractFormData.responsibleUnit,
                biddingProcess: contractFormData.biddingProcess,
                electronicAuction: contractFormData.electronicAuction,
                notes: contractFormData.notes
            };

            const updated = await contractsService.update(id, payload);
            setContract(updated);
            setIsEditModalOpen(false);
            showToast("Contrato atualizado com sucesso!");
        } catch (err) {
            console.error("Erro ao atualizar contrato:", err);
            showToast("Erro ao atualizar contrato.", "error");
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    const handleContractCurrencyInput = (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Keep only digits
        if (value === "") {
            setContractFormData({ ...contractFormData, totalValue: "" });
            return;
        }
        const floatValue = parseInt(value, 10) / 100;
        setContractFormData({ ...contractFormData, totalValue: floatValue });
    };

    const getMaskedContractCurrencyValue = (numValue) => {
        if (numValue === "" || numValue === undefined || numValue === null) return "";
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numValue);
    };

    useEffect(() => {
        fetchItemsTab();
    }, [id, tenantId, activeTab]);

    const loadAllocationsForItem = async (itemId) => {
        if (!tenantId) return;
        try {
            const allocs = await allocationsService.listAllocationsByItem(itemId, tenantId);
            setItemAllocations(prev => ({ ...prev, [itemId]: allocs }));

            // Initialize form for this item (only active allocations)
            const initialForm = {};
            allocs.forEach(a => {
                if (a.quantity_allocated > 0) {
                    initialForm[a.secretariat_id] = a.quantity_allocated;
                }
            });
            setAllocationForm(initialForm);
            setRateioSelect('');
            setRateioAmount('');
        } catch (err) {
            console.error("Erro ao carregar rateio:", err);
        }
    };

    const handleExpandItem = (itemId) => {
        if (expandedItemId === itemId) {
            setExpandedItemId(null);
            return;
        }
        setExpandedItemId(itemId);
        loadAllocationsForItem(itemId);
    };

    const handleSaveAllocations = async (item) => {
        if (!tenantId) return;
        setIsSavingAllocations(true);
        try {
            const operations = secretariats.map(async (sec) => {
                const qty = parseFloat(allocationForm[sec.id]) || 0;
                // If it is > 0 or existing allocation could be reduced to 0
                if (qty >= 0) {
                    const existingAlloc = itemAllocations[item.id]?.find(a => a.secretariat_id === sec.id);
                    if (qty === 0 && !existingAlloc) {
                        return; // No need to create 0 entries. Optional: cleanup.
                    }
                    if (qty === 0 && existingAlloc) {
                        await allocationsService.deleteAllocation(item.id, sec.id, tenantId);
                    } else {
                        await allocationsService.upsertAllocation({
                            contract_item_id: item.id,
                            secretariat_id: sec.id,
                            quantity_allocated: qty
                        }, tenantId);
                    }
                }
            });

            await Promise.all(operations);
            await loadAllocationsForItem(item.id); // reload fresh allocations

            // Updates the global summary purely locally:
            let freshTotal = 0;
            secretariats.forEach(sec => {
                const qty = parseFloat(allocationForm[sec.id]) || 0;
                freshTotal += qty;
            });
            setAllocationsSummaryByItemId(prev => ({
                ...prev,
                [item.id]: freshTotal
            }));

            // Auto-collapse accordion
            setExpandedItemId(null);

            // Toast feedback
            showToast("Rateio salvo com sucesso!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar rateio.", "error");
        } finally {
            setIsSavingAllocations(false);
        }
    };

    const submitItemModal = async (e) => {
        e.preventDefault();
        if (!tenantId || !id) return;
        setIsSubmittingItem(true);
        try {
            const payload = {
                contract_id: id,
                item_number: itemFormData.item_number,
                description: itemFormData.description,
                unit: itemFormData.unit,
                unit_price: parseFloat(itemFormData.unit_price) || 0,
                total_quantity: parseFloat(itemFormData.total_quantity) || 0
            };

            if (editingItemId) {
                await contractItemsService.updateContractItem(editingItemId, payload, tenantId);
            } else {
                await contractItemsService.createContractItem(payload, tenantId);
            }

            setGlobalItemsCount(prev => editingItemId ? prev : prev + 1); // update count purely visually 

            // Reload list internally without removing UI interactions 
            fetchItemsTab();

            setIsItemModalOpen(false);
            setEditingItemId(null);
            showToast("Item salvo com sucesso!", "success");
        } catch (err) {
            console.error(err);
            showToast("Erro ao salvar item", "error");
        } finally {
            setIsSubmittingItem(false);
        }
    };

    const handleQuickAddItem = () => {
        setActiveTab('itens');
        setItemFormData({ item_number: '', description: '', unit: '', unit_price: '', total_quantity: '' });
        setEditingItemId(null);
        setIsItemModalOpen(true);
    };

    const handleCurrencyInput = (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Keep only digits

        if (value === "") {
            setItemFormData({ ...itemFormData, unit_price: "" });
            return;
        }

        // Convert the string of numbers back into a float currency 
        const floatValue = parseInt(value, 10) / 100;

        setItemFormData({ ...itemFormData, unit_price: floatValue });
    };

    // Helper to extract value since unit_price stores actual float
    const getMaskedCurrencyValue = (numValue) => {
        if (numValue === "" || numValue === undefined) return "";
        // Just format string value back to pt-BR without symbol 
        return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numValue);
    };

    const deleteItem = async (itemId) => {
        if (!tenantId) return;
        try {
            // Primeiro removemos as alocações para evitar erros de restrição de chave estrangeira
            const existingAllocations = await allocationsService.listAllocationsByItem(itemId, tenantId);
            if (existingAllocations && existingAllocations.length > 0) {
                for (const alloc of existingAllocations) {
                    await allocationsService.deleteAllocation(itemId, alloc.secretariat_id, tenantId);
                }
            }

            await contractItemsService.deleteContractItem(itemId, tenantId);

            // Recalcula e atualiza a lista dinamicamente
            setGlobalItemsCount(prev => Math.max(0, prev - 1));
            const updatedItems = await contractItemsService.listContractItems(id, tenantId);
            setItems(updatedItems);
            showToast("Item removido", "success");
        } catch (err) {
            console.error(err);
            showToast("Erro ao remover item", "error");
        }
    };

    const formatCurrency = (value) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
    };

    const formatExactCurrency = (value) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Intl.DateTimeFormat('pt-BR').format(new Date(isoString));
    };

    const getDaysLeft = (endDateISO) => {
        if (!endDateISO) return null;
        const diffTime = new Date(endDateISO) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Calculate specific stats based on rules
    let commitValue = 0;
    let balanceValue = 0;
    let daysLeft = null;
    let isUrgent = false;

    if (contract) {
        // Calculate dynamically from fetched empenhos instead of static DB mock if desired.
        // For matching visuals exactly we trust real calculation:
        commitValue = empenhos.reduce((sum, e) => sum + e.value, 0);
        balanceValue = contract.totalValue - commitValue;

        daysLeft = getDaysLeft(contract.dateRange?.endDate);
        if (daysLeft !== null && daysLeft <= 30 && daysLeft >= 0) isUrgent = true;
    }

    if (isLoadingContract) {
        return (
            <div className="cd-container">
                <div className="cd-loading-state">
                    <div className="skeleton sk-header"></div>
                    <div className="cd-kpi-grid">
                        <div className="skeleton sk-card"></div>
                        <div className="skeleton sk-card"></div>
                        <div className="skeleton sk-card"></div>
                        <div className="skeleton sk-card"></div>
                    </div>
                    <div className="skeleton sk-content-block"></div>
                </div>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="cd-container">
                <div className="cd-error-state">
                    <AlertCircle size={48} className="cd-error-icon" />
                    <h2>Contrato não encontrado</h2>
                    <p>O registro que você tenta acessar não existe ou foi removido.</p>
                    <button className="cd-btn-secondary" onClick={() => navigate('/contratos')}>
                        <ChevronLeft size={18} />
                        Voltar para Contratos
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="cd-container">
            {toast.visible && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 9999,
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {toast.message}
                </div>
            )}

            {/* Context Navigation */}
            <nav className="cd-breadcrumb">
                <button className="cd-back-link" onClick={() => navigate('/contratos')}>
                    <ChevronLeft size={16} /> Contratos
                </button>
                <span className="cd-crumb-separator">/</span>
                <span className="cd-crumb-current">{contract.number}</span>
            </nav>

            {/* Alerta de Pendência Operacional */}
            {contract.isPending && (
                <div className="cd-pendency-banner">
                    <div className="cd-pendency-banner-content">
                        <ShieldAlert size={20} />
                        <div>
                            <strong>Pendência Operacional Identificada:</strong>
                            <span>Este contrato está ATIVO mas não possui itens cadastrados.</span>
                        </div>
                    </div>
                    <button
                        className="cd-pendency-banner-action"
                        onClick={handleQuickAddItem}
                    >
                        Adicionar itens agora
                    </button>
                </div>
            )}

            {/* Header Section */}
            <header className="cd-header">
                <div className="cd-header-main">
                    <div>
                        <div className="cd-title-group">
                            <h1 className="cd-title">{contract.number} — {contract.title}</h1>
                            <span className={`status-badge-lg ${contract.status.toLowerCase()}`}>
                                {contract.status}
                            </span>
                        </div>
                        <p className="cd-supplier-name">{contract.supplierName}</p>
                    </div>

                    <div className="cd-header-actions">
                        <button className="cd-btn-secondary" onClick={handleEditContract}>Editar</button>
                        <button
                            className={`cd-btn-primary ${contract.isPending ? 'is-blocked' : ''}`}
                            disabled={contract.isPending}
                            title={contract.isPending ? "Para gerar OF, cadastre pelo menos 1 item." : "Gerar Ordem de Fornecimento"}
                        >
                            Gerar OF
                        </button>
                        <button className="cd-action-icon-btn">
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* KPI Row */}
            <section className="cd-kpi-grid">
                <div className="cd-kpi-card">
                    <div className="cd-kpi-icon"><DollarSign size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Valor Total</span>
                        <span className="cd-kpi-value">{formatCurrency(contract.totalValue)}</span>
                    </div>
                </div>
                <div className={`cd-kpi-card ${activeTab === 'empenhos' ? 'is-highlighted' : ''}`}>
                    <div className="cd-kpi-icon warning"><FileText size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Empenhado/Comprometido</span>
                        <span className="cd-kpi-value warning">{formatCurrency(commitValue)}</span>
                    </div>
                </div>
                <div className="cd-kpi-card">
                    <div className="cd-kpi-icon success"><DollarSign size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Saldo Disponível</span>
                        <span className="cd-kpi-value success">{formatCurrency(balanceValue)}</span>
                    </div>
                </div>
                <div className={`cd-kpi-card ${isUrgent ? 'urgent' : ''}`}>
                    <div className={`cd-kpi-icon ${isUrgent ? 'urgent' : ''}`}><Clock size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Vigência</span>
                        <div className="cd-kpi-value-group">
                            <span className="cd-kpi-value date">{formatDate(contract.dateRange?.endDate)}</span>
                            {daysLeft !== null && (
                                <span className={`cd-kpi-badge ${isUrgent || daysLeft < 0 ? 'danger' : 'neutral'}`}>
                                    {daysLeft < 0 ? `Vencido há ${Math.abs(daysLeft)} dias` : `Faltam ${daysLeft} dias`}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Depth Tabs */}
            <section className="cd-tabs-container">
                <div className="cd-tabs-header">
                    <button
                        className={`cd-tab-btn ${activeTab === 'geral' ? 'active' : ''}`}
                        onClick={() => setActiveTab('geral')}
                    >
                        Visão Geral
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'empenhos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('empenhos')}
                    >
                        Empenhos <span className="cd-tab-count">{empenhos.length}</span>
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'itens' ? 'active' : ''}`}
                        onClick={() => setActiveTab('itens')}
                    >
                        Itens <span className="cd-tab-count">{globalItemsCount}</span>
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'aditivos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('aditivos')}
                    >
                        Aditivos <span className="cd-tab-count">0</span>
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
                        onClick={() => setActiveTab('historico')}
                    >
                        Histórico
                    </button>
                </div>

                <div className="cd-tabs-content">
                    {/* VISION GERAL TAB */}
                    {activeTab === 'geral' && (
                        <div className="cd-grid-details">
                            <div className="cd-detail-group full">
                                <h3>Objeto do Contrato</h3>
                                <p className="cd-detail-text">{contract.title}</p>
                            </div>
                            <div className="cd-detail-group">
                                <label>Fornecedor (Razão Social)</label>
                                <span>{contract.supplierName}</span>
                            </div>
                            <div className="cd-detail-group">
                                <label>Período de Vigência</label>
                                <span>{formatDate(contract.dateRange?.startDate)} até {formatDate(contract.dateRange?.endDate)}</span>
                            </div>
                            <div className="cd-detail-group">
                                <label>Secretaria Responsável</label>
                                <span>{contract.responsibleUnit || 'Não informada'}</span>
                            </div>
                            <div className="cd-detail-group">
                                <label>Processo Licitatório</label>
                                <span>{contract.biddingProcess || 'Não informado'}</span>
                            </div>
                            <div className="cd-detail-group">
                                <label>Pregão Eletrônico</label>
                                <span>{contract.electronicAuction || 'Não informado'}</span>
                            </div>
                            <div className="cd-detail-group">
                                <label>Código / Ref</label>
                                <span>{contract.code || 'Não informado'}</span>
                            </div>
                            <div className="cd-detail-group full">
                                <label>Observações</label>
                                {contract.notes ? (
                                    <span style={{ whiteSpace: 'pre-wrap' }}>{contract.notes}</span>
                                ) : (
                                    <span className="empty-value">Nenhuma observação registrada neste contrato.</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* EMPENHOS TAB (Real Data) */}
                    {activeTab === 'empenhos' && (
                        <div className="cd-tab-panel">
                            <div className="cd-tab-panel-header">
                                <h3>Relação de Empenhos</h3>
                                <div className="cd-info-chip">
                                    <span className="cd-info-chip-label">Total empenhado:</span>
                                    <span className="cd-info-chip-value">{formatCurrency(commitValue)}</span>
                                </div>
                            </div>

                            <div className="table-section" style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
                                <div className="cd-data-table-wrapper" style={{ boxShadow: 'none' }}>
                                    <table className="cd-data-table">
                                        <thead>
                                            <tr>
                                                <th>Nº Empenho</th>
                                                <th>Descrição / Objeto</th>
                                                <th>Datas</th>
                                                <th>Valor</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoadingEmpenhos ? (
                                                <tr>
                                                    <td colSpan="5" className="loading-state">
                                                        <div className="loading-state-content" style={{ padding: '2rem 1rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
                                                            <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '4px' }}></div>
                                                            <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '4px' }}></div>
                                                            <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '4px' }}></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : empenhos.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="empty-state">
                                                        <div className="empty-state-content" style={{ padding: '3rem 0' }}>
                                                            <FileText size={40} style={{ color: 'var(--border-light)', marginBottom: '1rem' }} />
                                                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Nenhum empenho vinculado a este contrato</h4>
                                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>As notas de empenho reservadas para este contrato aparecerão aqui.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                empenhos.map(emp => (
                                                    <tr key={emp.id}>
                                                        <td>
                                                            <span className="td-number" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.number}</span>
                                                        </td>
                                                        <td>
                                                            <span className="title-text" style={{ color: 'var(--text-secondary)' }} title={emp.description}>{emp.description}</span>
                                                        </td>
                                                        <td className="td-dates">
                                                            <div>
                                                                <span className="date-start">
                                                                    Emissão: {formatDate(emp.issueDate)}
                                                                </span>
                                                                {emp.paymentDate && (
                                                                    <span className="date-end" style={{ color: 'var(--success-color-dark, #0f8b4d)' }}>
                                                                        Pg: {formatDate(emp.paymentDate)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="td-values">
                                                            <span className="val-total" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(emp.value)}</span>
                                                        </td>
                                                        <td>
                                                            <span className={`status-badge ${emp.status.toLowerCase()}`}>
                                                                {emp.status}
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
                    )}

                    {/* ADITIVOS TAB (Placeholder) */}
                    {activeTab === 'aditivos' && (
                        <div className="cd-placeholder-tab">
                            <Calendar size={40} />
                            <h4>Sem termos aditivos</h4>
                            <p>Qualquer prorrogação de prazo ou acréscimo de valor será listado nesta aba.</p>
                        </div>
                    )}

                    {/* HISTORICO TAB (Placeholder Timeline) */}
                    {activeTab === 'historico' && (
                        <div className="cd-timeline">
                            <div className="cd-timeline-item">
                                <div className="indicator active"></div>
                                <div className="info">
                                    <span className="time">{formatDate(contract.updatedAt)}</span>
                                    <p>Status atualizado para <strong>{contract.status}</strong></p>
                                </div>
                            </div>
                            <div className="cd-timeline-item">
                                <div className="indicator"></div>
                                <div className="info">
                                    <span className="time">{formatDate(contract.createdAt)}</span>
                                    <p>Contrato cadastrado no sistema</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ITENS TAB */}
                    {activeTab === 'itens' && (
                        <div className="cd-tab-panel">
                            <div className="cd-tab-panel-header">
                                <h3>Itens do Contrato</h3>
                                <button className="cd-btn-primary" onClick={() => {
                                    setItemFormData({ item_number: '', description: '', unit: '', unit_price: '', total_quantity: '' });
                                    setEditingItemId(null);
                                    setIsItemModalOpen(true);
                                }}>
                                    + Adicionar Item
                                </button>
                            </div>

                            <div className="table-section" style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
                                <div className="cd-data-table-wrapper" style={{ boxShadow: 'none' }}>
                                    <table className="cd-data-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px', textAlign: 'left', paddingLeft: '1.5rem' }}>Nº</th>
                                                <th style={{ textAlign: 'left', minWidth: '220px' }}>Descrição</th>
                                                <th style={{ textAlign: 'center', width: '110px' }}>Rateio</th>
                                                <th style={{ textAlign: 'right', width: '90px' }}>Qtd. Total</th>
                                                <th style={{ textAlign: 'center', width: '60px' }}>Und</th>
                                                <th style={{ textAlign: 'right', width: '130px' }}>Val. Unitário</th>
                                                <th style={{ textAlign: 'right', width: '130px' }}>Valor Total</th>
                                                <th style={{ textAlign: 'right', width: '160px', paddingRight: '1.5rem' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoadingItems ? (
                                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Carregando itens...</td></tr>
                                            ) : items.length === 0 ? (
                                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhum item adicionado a este contrato yet.</td></tr>
                                            ) : (
                                                items.map(item => {
                                                    const allocSum = allocationsSummaryByItemId[item.id] || 0;
                                                    const qTotal = item.total_quantity || 0;
                                                    const diff = qTotal - allocSum;
                                                    const isPending = qTotal > 0 && diff !== 0;

                                                    return (
                                                        <React.Fragment key={item.id}>
                                                            <tr
                                                                onClick={() => handleExpandItem(item.id)}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    borderLeft: isPending ? '4px solid #f59e0b' : '4px solid transparent',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                className={expandedItemId === item.id ? 'active-row' : ''}
                                                            >
                                                                <td style={{ width: '80px', minWidth: '80px', fontWeight: 600, textAlign: 'center' }}>
                                                                    <span>{item.item_number || '-'}</span>
                                                                </td>
                                                                <td style={{ width: '38%', maxWidth: '400px', textAlign: 'left' }}>
                                                                    <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: 'var(--text-primary)', textTransform: 'uppercase', lineHeight: '1.4' }} title={item.description}>
                                                                        {item.description}
                                                                    </div>
                                                                </td>
                                                                <td style={{ width: '100px', textAlign: 'center' }}>
                                                                    <span
                                                                        className={`cd-kpi-badge ${isPending ? 'warning' : 'success'}`}
                                                                        style={{
                                                                            background: isPending ? '#fff4e5' : '#e6f6ec',
                                                                            color: isPending ? '#b75c00' : '#0f8b4d',
                                                                            padding: '4px 10px',
                                                                            borderRadius: '9999px',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: 700,
                                                                            letterSpacing: '0.025em'
                                                                        }}
                                                                    >
                                                                        {isPending ? 'PENDENTE' : 'OK'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ width: '100px', textAlign: 'center', fontWeight: 500 }}>{item.total_quantity}</td>
                                                                <td style={{ width: '80px', textAlign: 'center', textTransform: 'uppercase', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{item.unit || '-'}</td>
                                                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text-primary)' }}>{formatExactCurrency(item.unit_price)}</td>
                                                                <td style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatExactCurrency((item.total_quantity || 0) * (item.unit_price || 0))}</td>
                                                                <td style={{ width: '100px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setItemFormData({
                                                                                    item_number: item.item_number || '',
                                                                                    description: item.description,
                                                                                    unit: item.unit || '',
                                                                                    unit_price: item.unit_price || '',
                                                                                    total_quantity: item.total_quantity || ''
                                                                                });
                                                                                setEditingItemId(item.id);
                                                                                setIsItemModalOpen(true);
                                                                            }}
                                                                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.375rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
                                                                            title="Editar"
                                                                        >
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setItemToDelete(item.id);
                                                                            }}
                                                                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.375rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                                                                            title="Remover"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                        </React.Fragment>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section >

            {/* Modal Rateio */}
            {
                expandedItemId && (() => {
                    const item = items.find(i => i.id === expandedItemId);
                    if (!item) return null;

                    return (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }} onClick={() => setExpandedItemId(null)}>
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', maxWidth: '720px', maxHeight: '90vh', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 40px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ background: '#e0f2fe', padding: '0.5rem', borderRadius: '8px', color: '#0284c7' }}>
                                                    <Landmark size={20} />
                                                </div>
                                                <div>
                                                    <h4 style={{ margin: '0 0 0.125rem 0', color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Rateio Institucional — Item {item.item_number || 'X'}</h4>
                                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Distribua as quantidades do item pelas secretarias beneficiadas</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setExpandedItemId(null)}
                                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                                                title="Fechar"
                                            >
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>
                                    </div>


                                    <div style={{ padding: '0.75rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                        {secretariats.length > 0 && (() => {
                                            let totalAlocado = 0;
                                            secretariats.forEach(sec => {
                                                const val = parseInt(allocationForm[sec.id], 10);
                                                totalAlocado += isNaN(val) ? 0 : val;
                                            });
                                            const diff = Math.round(((item.total_quantity || 0) - totalAlocado) * 100) / 100;

                                            return (
                                                <div style={{ display: 'flex', gap: '1rem', background: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '0.75rem', flexShrink: 0 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total do Item</span>
                                                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.total_quantity || 0}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Soma Alocada</span>
                                                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalAlocado}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diferença</span>
                                                        <div style={{
                                                            display: 'inline-flex', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 700,
                                                            background: diff === 0 ? '#e6f6ec' : (diff > 0 ? '#fff4e5' : '#fef2f2'),
                                                            color: diff === 0 ? '#0f8b4d' : (diff > 0 ? '#b75c00' : '#dc2626'),
                                                            border: `1px solid ${diff === 0 ? '#d1f2e1' : (diff > 0 ? '#ffedcc' : '#fecaca')}`
                                                        }}>
                                                            {diff > 0 ? `Falta ratear ${diff} unidades` : diff < 0 ? `Excedeu ${Math.abs(diff)} unidades` : 'Rateio completo'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })()}

                                        {secretariats.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                                <Landmark size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem auto' }} />
                                                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nenhuma secretaria cadastrada no sistema.</h5>
                                            </div>
                                        ) : (() => {
                                            let totalAlocado = 0;
                                            const addedSecretariatsList = [];
                                            const availableSecretariats = [];

                                            secretariats.forEach(sec => {
                                                const val = allocationForm[sec.id];
                                                if (val !== undefined && val !== '' && parseFloat(val) > 0) {
                                                    totalAlocado += parseFloat(val) || 0;
                                                    addedSecretariatsList.push({ ...sec, allocated: val });
                                                } else {
                                                    availableSecretariats.push(sec);
                                                }
                                            });

                                            const diff = (item.total_quantity || 0) - totalAlocado;
                                            const isSaveDisabled = (item.total_quantity > 0 && diff !== 0) || isSavingAllocations;

                                            const handleAddAllocation = () => {
                                                const parsedVal = parseInt(rateioAmount, 10);
                                                if (!rateioSelect || isNaN(parsedVal) || parsedVal <= 0) return;
                                                setAllocationForm(prev => ({ ...prev, [rateioSelect]: parsedVal }));
                                                setRateioSelect('');
                                                setRateioAmount('');
                                            };

                                            const handleRemoveAllocation = (secId) => {
                                                const newMap = { ...allocationForm };
                                                delete newMap[secId];
                                                setAllocationForm(newMap);
                                            };

                                            return (
                                                <>
                                                    <div style={{ background: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', flexShrink: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Selecionar Secretaria</label>
                                                                <select
                                                                    value={rateioSelect}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setRateioSelect(val);
                                                                        if (val) {
                                                                            setTimeout(() => rateioAmountRef.current?.focus(), 0);
                                                                        }
                                                                    }}
                                                                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: 'var(--text-primary)', outline: 'none', background: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }}
                                                                    onFocus={e => { e.target.style.background = '#ffffff'; e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(10,37,64,0.05)'; }}
                                                                    onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                                                                >
                                                                    <option value="">Selecione uma opção...</option>
                                                                    {availableSecretariats.map(sec => (
                                                                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div style={{ width: '120px' }}>
                                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Quantidade</label>
                                                                <input
                                                                    ref={rateioAmountRef}
                                                                    type="number"
                                                                    value={rateioAmount}
                                                                    onChange={(e) => setRateioAmount(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleAddAllocation();
                                                                    }}
                                                                    min="1" step="1" placeholder="0"
                                                                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: 'var(--text-primary)', outline: 'none', background: '#f8fafc', transition: 'all 0.2s', textAlign: 'center' }}
                                                                    onFocus={e => { e.target.style.background = '#ffffff'; e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(10,37,64,0.05)'; }}
                                                                    onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={handleAddAllocation}
                                                                disabled={!rateioSelect || !rateioAmount || parseInt(rateioAmount, 10) <= 0}
                                                                style={{ height: '38px', padding: '0 1rem', borderRadius: '6px', background: (!rateioSelect || !rateioAmount || parseInt(rateioAmount, 10) <= 0) ? '#f1f5f9' : '#0f172a', color: (!rateioSelect || !rateioAmount || parseInt(rateioAmount, 10) <= 0) ? '#94a3b8' : '#ffffff', fontWeight: 600, fontSize: '0.8125rem', border: 'none', cursor: (!rateioSelect || !rateioAmount || parseInt(rateioAmount, 10) <= 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                                                            >
                                                                <Plus size={16} /> Adicionar
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '0.25rem', paddingBottom: '0.5rem' }}>

                                                        {addedSecretariatsList.length > 0 && (
                                                            <div style={{ marginBottom: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff' }} className="cd-rateio-scrollbox">
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                                                                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                                                                        <tr>
                                                                            <th style={{ padding: '0.4rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Secretaria Alocada</th>
                                                                            <th style={{ padding: '0.4rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', width: '140px', borderBottom: '1px solid #e2e8f0' }}>Quantidade</th>
                                                                            <th style={{ padding: '0.4rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', width: '80px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Ações</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {addedSecretariatsList.map((sec, index) => (
                                                                            <tr key={sec.id} style={{ borderBottom: index === addedSecretariatsList.length - 1 ? 'none' : '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                                <td style={{ padding: '0.4rem 1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{sec.name}</td>
                                                                                <td style={{ padding: '0.4rem 1rem' }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                                                        <input
                                                                                            type="number"
                                                                                            value={sec.allocated}
                                                                                            onChange={(e) => {
                                                                                                const val = parseInt(e.target.value, 10);
                                                                                                if (!isNaN(val) && val < 0) return;
                                                                                                setAllocationForm({ ...allocationForm, [sec.id]: isNaN(val) ? '' : val });
                                                                                            }}
                                                                                            style={{ width: '80px', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#ffffff', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary)', outline: 'none', transition: 'all 0.2s' }}
                                                                                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(10,37,64,0.05)'; }}
                                                                                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                                                                            min="0" step="1"
                                                                                        />
                                                                                        <Edit2 size={12} style={{ color: '#94a3b8' }} />
                                                                                    </div>
                                                                                </td>
                                                                                <td style={{ padding: '0.4rem 1rem', textAlign: 'right' }}>
                                                                                    <button
                                                                                        onClick={() => handleRemoveAllocation(sec.id)}
                                                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                                                                                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ef4444'; }}
                                                                                        title="Remover"
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        {(!item.total_quantity || item.total_quantity === 0) && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fffbeb', color: '#b45309', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                                                                <AlertCircle size={16} />
                                                                <span>Nenhuma quantidade total definida para validação estrita. Rateio será salvo como definido.</span>
                                                            </div>
                                                        )}

                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexShrink: 0 }}>
                                    <button className="cd-btn-secondary" onClick={() => setExpandedItemId(null)} style={{ padding: '0 1.5rem', height: '44px', borderRadius: '10px' }}>Cancelar</button>
                                    {(() => {
                                        let totalAlocado = 0;
                                        Object.values(allocationForm).forEach(val => totalAlocado += (parseInt(val, 10) || 0));
                                        const diff = Math.round(((item.total_quantity || 0) - totalAlocado) * 100) / 100;
                                        const isSaveDisabled = (item.total_quantity > 0 && diff !== 0) || isSavingAllocations;
                                        return (
                                            <button
                                                className="cd-btn-primary"
                                                onClick={() => handleSaveAllocations(item)}
                                                disabled={isSaveDisabled}
                                                style={{
                                                    padding: '0 2rem',
                                                    height: '44px',
                                                    borderRadius: '10px',
                                                    background: isSaveDisabled ? '#cbd5e1' : 'var(--color-primary)',
                                                    color: isSaveDisabled ? '#94a3b8' : '#ffffff',
                                                    border: 'none',
                                                    opacity: 1,
                                                    transition: 'all 0.2s',
                                                    cursor: isSaveDisabled ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isSavingAllocations ? 'Salvando...' : 'Salvar Rateio'}
                                            </button>
                                        )
                                    })()}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* Modal de Confirmação de Exclusão */}
            {
                itemToDelete && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }} onClick={() => setItemToDelete(null)}>
                        <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ background: '#fef2f2', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                                    <Trash2 size={24} style={{ color: '#ef4444' }} />
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Excluir Item</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>Tem certeza que deseja remover este item? Esta ação não pode ser desfeita.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    className="cd-btn-secondary"
                                    onClick={() => setItemToDelete(null)}
                                    style={{ flex: 1, height: '44px', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="cd-btn-primary"
                                    onClick={() => {
                                        deleteItem(itemToDelete);
                                        setItemToDelete(null);
                                    }}
                                    style={{ flex: 1, height: '44px', borderRadius: '10px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Item */}
            {
                isItemModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsItemModalOpen(false)}>
                        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>{editingItemId ? 'Editar Item' : 'Novo Item'}</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsItemModalOpen(false)}
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                                    title="Fechar"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <form onSubmit={submitItemModal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nº do Item (opcional)</label>
                                    <input style={{ width: '100%', height: '40px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)' }} type="number" step="1" min="0" value={itemFormData.item_number} onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        setItemFormData({ ...itemFormData, item_number: isNaN(val) ? '' : val });
                                    }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Descrição (obrigatório)</label>
                                    <textarea
                                        style={{ width: '100%', minHeight: '100px', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'inherit' }}
                                        required
                                        value={itemFormData.description}
                                        onChange={e => setItemFormData({ ...itemFormData, description: e.target.value })}
                                        placeholder="Detalhes completos do item..."
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Unidade (obrigatório)</label>
                                        <input style={{ width: '100%', height: '40px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)', textAlign: 'center' }} required type="text" placeholder="Ex: UN, KG" value={itemFormData.unit} onChange={e => setItemFormData({ ...itemFormData, unit: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Qtd Total (obrigatório)</label>
                                        <input style={{ width: '100%', height: '40px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)', textAlign: 'center' }} required type="number" step="1" min="0" value={itemFormData.total_quantity} onChange={e => {
                                            const val = parseInt(e.target.value, 10);
                                            setItemFormData({ ...itemFormData, total_quantity: isNaN(val) ? '' : val });
                                        }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Val. Unit. (R$) (obrigatório)</label>
                                        <input
                                            style={{ width: '100%', height: '40px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)', textAlign: 'right' }}
                                            type="text"
                                            required
                                            value={getMaskedCurrencyValue(itemFormData.unit_price)}
                                            onChange={handleCurrencyInput}
                                        />
                                    </div>
                                </div>
                                <div style={{ margin: '0.5rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total estimado:</span>
                                    <span style={{ fontSize: '1.125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                        {formatExactCurrency((parseFloat(itemFormData.total_quantity) || 0) * (parseFloat(itemFormData.unit_price) || 0))}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button type="button" className="cd-btn-secondary" onClick={() => setIsItemModalOpen(false)}>Cancelar</button>
                                    <button
                                        type="submit"
                                        className="cd-btn-primary"
                                        disabled={isSubmittingItem || !itemFormData.description?.trim() || !itemFormData.unit?.trim() || !itemFormData.total_quantity || parseFloat(itemFormData.total_quantity) <= 0 || !itemFormData.unit_price || parseFloat(itemFormData.unit_price) <= 0}
                                        style={{ opacity: (isSubmittingItem || !itemFormData.description?.trim() || !itemFormData.unit?.trim() || !itemFormData.total_quantity || parseFloat(itemFormData.total_quantity) <= 0 || !itemFormData.unit_price || parseFloat(itemFormData.unit_price) <= 0) ? 0.6 : 1 }}
                                    >
                                        {isSubmittingItem ? 'Salvando...' : 'Salvar Item'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Modal Editar Contrato */}
            {
                isEditModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setIsEditModalOpen(false)}>
                        <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Edit2 size={20} style={{ color: 'var(--color-primary)' }} />
                                    Editar Contrato
                                </h3>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem', display: 'flex' }}
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleUpdateContract} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Número do Contrato *</label>
                                        <input
                                            style={{ width: '100%', height: '44px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                            required
                                            type="text"
                                            value={contractFormData.number}
                                            onChange={e => setContractFormData({ ...contractFormData, number: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Código / Ref</label>
                                        <input
                                            style={{ width: '100%', height: '44px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                            type="text"
                                            value={contractFormData.code}
                                            onChange={e => setContractFormData({ ...contractFormData, code: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Secretaria Responsável *</label>
                                        <select
                                            style={{
                                                width: '100%',
                                                height: '44px',
                                                padding: '0 1rem',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '10px',
                                                backgroundColor: '#fff',
                                                cursor: 'pointer'
                                            }}
                                            required
                                            value={contractFormData.responsibleUnit}
                                            onChange={e => setContractFormData({ ...contractFormData, responsibleUnit: e.target.value })}
                                        >
                                            <option value="">Selecione uma secretaria</option>
                                            {secretariats.map(s => (
                                                <option key={s.id} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Fornecedor *</label>
                                        <input
                                            style={{ width: '100%', height: '44px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                            required
                                            type="text"
                                            value={contractFormData.supplierName}
                                            onChange={e => setContractFormData({ ...contractFormData, supplierName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Processo Licitatório</label>
                                        <input
                                            style={{ width: '100%', height: '44px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                            type="text"
                                            value={contractFormData.biddingProcess}
                                            onChange={e => setContractFormData({ ...contractFormData, biddingProcess: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pregão Eletrônico</label>
                                        <input
                                            style={{ width: '100%', height: '44px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                            type="text"
                                            value={contractFormData.electronicAuction}
                                            onChange={e => setContractFormData({ ...contractFormData, electronicAuction: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Objeto / Título *</label>
                                    <input
                                        style={{ width: '100%', height: '44px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                        required
                                        type="text"
                                        value={contractFormData.title}
                                        onChange={e => setContractFormData({ ...contractFormData, title: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Valor Total (R$) *</label>
                                        <input
                                            style={{ width: '100%', height: '44px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                            required
                                            type="text"
                                            placeholder="R$ 0,00"
                                            value={getMaskedContractCurrencyValue(contractFormData.totalValue)}
                                            onChange={handleContractCurrencyInput}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Data Início</label>
                                            <input
                                                style={{ width: '100%', height: '44px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                                type="date"
                                                value={contractFormData.startDate}
                                                onChange={e => setContractFormData({ ...contractFormData, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Vencimento</label>
                                            <input
                                                style={{ width: '100%', height: '44px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '10px' }}
                                                type="date"
                                                value={contractFormData.endDate}
                                                onChange={e => setContractFormData({ ...contractFormData, endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Observações</label>
                                    <textarea
                                        style={{ width: '100%', minHeight: '80px', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '10px', fontFamily: 'inherit' }}
                                        value={contractFormData.notes}
                                        onChange={e => setContractFormData({ ...contractFormData, notes: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" className="cd-btn-secondary" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, height: '48px', justifyContent: 'center' }}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="cd-btn-primary" disabled={isSubmittingEdit} style={{ flex: 2, height: '48px' }}>
                                        {isSubmittingEdit ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ContractDetails;
