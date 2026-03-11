import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Calendar, TrendingUp, AlertCircle, FileText, AlertTriangle, UploadCloud, Link as LinkIcon, ExternalLink, Download, Clock, FileWarning, FileCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { contractsService } from '../services/api/contracts.service';
import { secretariatsService } from '../services/api/secretariats.service';
import { filesService } from '../services/api/files.service';
import { useTenant } from '../context/TenantContext';
import { formatLocalDate, getTodayLocalDateString, getDaysDiffFromToday } from '../utils/dateUtils';
import './Contratos.css';

const Contratos = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { tenantId } = useTenant();
    const [contracts, setContracts] = useState([]);
    const [secretariats, setSecretariats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [contractToDelete, setContractToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
    const [formData, setFormData] = useState({
        number: '',
        code: '',
        title: '',
        supplierName: '',
        totalValue: '',
        startDate: '',
        endDate: '',
        secretariat_id: '',
        biddingProcess: '',
        electronicAuction: '',
        notes: '',
        contract_object: '',
        cnpj: '',
        address: '',
        managerName: '',
        manager_registration: '',
        technical_fiscal_name: '',
        technical_fiscal_registration: '',
        administrative_fiscal_name: '',
        administrative_fiscal_registration: '',
        contract_pdf_url: '',
        rescinded_at: '',
        rescission_notes: '',
        rescission_pdf_url: ''
    });

    const [contractFile, setContractFile] = useState(null);
    const [rescissionFile, setRescissionFile] = useState(null);
    const [isRescissionActive, setIsRescissionActive] = useState(false);
    const [isPdfSectionExpanded, setIsPdfSectionExpanded] = useState(false);

    const formatCnpj = (value) => {
        const digits = value.replace(/\D/g, '');
        return digits
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .substring(0, 18);
    };

    const loadContracts = async () => {
        if (!tenantId) return;
        try {
            setIsLoading(true);
            const data = await contractsService.list(tenantId);
            setContracts(data);
        } catch (error) {
            console.error("Erro ao carregar contratos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSecretariats = async () => {
        if (!tenantId) return;
        try {
            const data = await secretariatsService.listSecretariats(tenantId);
            setSecretariats(data);
        } catch (error) {
            console.error("Erro ao carregar secretarias:", error);
        }
    };

    // Filters & Sorting state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('VENCIMENTO_PROX'); // VENCIMENTO_PROX, MAIOR_VALOR, RECENTE

    // Fetch data
    useEffect(() => {
        // Prevent body scroll (Double scroll fix)
        document.body.style.overflow = 'hidden';

        loadContracts();
        loadSecretariats();

        // Check for pending filter in URL
        const params = new URLSearchParams(location.search);
        if (params.get('pending') === '1') {
            setStatusFilter('PENDENTE');
        }

        return () => {
            document.body.style.overflow = 'unset'; // Restore scroll
        };
    }, [tenantId, location.search]);

    // Helper formatting
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
    };

    const formatDate = (isoString) => {
        return formatLocalDate(isoString);
    };

    const getBalanceColor = (balance, total) => {
        if (balance === 0) return 'var(--danger-color, #d92d20)'; // Red
        const pct = (balance / total) * 100;
        if (pct <= 30) return 'var(--warning-color-dark, #b75c00)'; // Orange
        return 'var(--success-color-dark, #0f8b4d)'; // Green
    };

    const sanitizeFilename = (name) => {
        if (!name) return "";
        return name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, "-") // Espaços por hífen
            .replace(/[^a-z0-9._-]/g, "") // Mantém alphanumeric, ponto, underscore, hífen
            .replace(/-+/g, "-") // Remove hífens consecutivos
            .replace(/^-+|-+$/g, ""); // Remove hífens no início/fim
    };

    // Alert Logic
    const getContractAlerts = (contract) => {
        const alerts = [];
        const daysDiff = getDaysDiffFromToday(contract.dateRange?.endDate);

        if (contract.status === 'RESCINDIDO') {
            alerts.push({ id: 'rescinded', icon: <AlertCircle size={14} color="#d92d20" />, label: 'Contrato Rescindido' });
        } else if (daysDiff !== null) {
            if (daysDiff < 0) {
                alerts.push({ id: 'expired', icon: <Clock size={14} color="#d92d20" />, label: daysDiff === -1 ? 'Vencido há 1 dia' : `Vencido há ${Math.abs(daysDiff)} dias` });
            } else if (daysDiff <= 30) {
                const expirationWarning = daysDiff === 0
                    ? 'Vence hoje'
                    : (daysDiff === 1 ? 'Vencendo em 1 dia' : `Vencendo em ${daysDiff} dias`);
                alerts.push({ id: 'expiring', icon: <Clock size={14} color="#f79009" />, label: expirationWarning });
            }
        }

        if (!contract.contract_pdf_url) {
            alerts.push({ id: 'no-pdf', icon: <FileWarning size={14} color="#667085" />, label: 'Sem PDF anexado' });
        }

        if (contract.isPending) {
            alerts.push({ id: 'pending-items', icon: <AlertTriangle size={14} color="#eab308" />, label: 'Sem itens cadastrados' });
        }

        return alerts;
    };

    const getFilenameFromUrl = (url) => {
        if (!url) return "";
        try {
            // Extrai a última parte da URL
            const parts = url.split('/');
            const lastPart = decodeURIComponent(parts[parts.length - 1]);
            // Remove o timestamp (ex: 123456789_nome.pdf -> nome.pdf)
            return lastPart.replace(/^\d+_/, "");
        } catch (e) {
            return "documento.pdf";
        }
    };

    // Filter and Sort Engine
    const filteredAndSortedContracts = useMemo(() => {
        let result = [...contracts];

        // 1. Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.number.toLowerCase().includes(query) ||
                c.title.toLowerCase().includes(query) ||
                c.supplierName.toLowerCase().includes(query)
            );
        }

        // 2. Status filter
        if (statusFilter !== 'ALL') {
            if (statusFilter === 'PENDENTE') {
                result = result.filter(c => c.isPending);
            } else {
                result = result.filter(c => c.status === statusFilter);
            }
        }

        // 3. Sorting
        result.sort((a, b) => {
            if (sortBy === 'VENCIMENTO_PROX') {
                return new Date(a.dateRange.endDate).getTime() - new Date(b.dateRange.endDate).getTime();
            } else if (sortBy === 'MAIOR_VALOR') {
                return b.totalValue - a.totalValue;
            } else if (sortBy === 'RECENTE') {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            return 0;
        });

        return result;
    }, [contracts, searchQuery, statusFilter, sortBy]);

    // UI Handlers
    const handleNewContract = () => {
        setEditingContract(null);
        setContractFile(null);
        setRescissionFile(null);
        setIsRescissionActive(false);
        setIsPdfSectionExpanded(false);
        setFormData({
            number: '',
            code: '',
            title: '',
            supplierName: '',
            totalValue: '',
            startDate: '',
            endDate: '',
            secretariat_id: '',
            biddingProcess: '',
            electronicAuction: '',
            notes: '',
            contract_object: '',
            cnpj: '',
            address: '',
            managerName: '',
            manager_registration: '',
            technical_fiscal_name: '',
            technical_fiscal_registration: '',
            administrative_fiscal_name: '',
            administrative_fiscal_registration: '',
            contract_pdf_url: '',
            rescinded_at: '',
            rescission_notes: '',
            rescission_pdf_url: ''
        });
        setIsModalOpen(true);
    };

    const handleEditContract = (contract) => {
        setEditingContract(contract);
        setIsPdfSectionExpanded(false);

        // Se a rescisão estiver sendo ativada agora e não tiver data, sugerir a data de hoje
        const today = getTodayLocalDateString();

        setFormData({
            number: contract.number,
            code: contract.code || '',
            title: contract.title,
            supplierName: contract.supplierName,
            totalValue: contract.totalValue, // Mantemos como número para a máscara tratar
            startDate: contract.dateRange.startDate || '',
            endDate: contract.dateRange.endDate || '',
            status: contract.status,
            secretariat_id: contract.secretariat_id || '',
            biddingProcess: contract.biddingProcess || '',
            electronicAuction: contract.electronicAuction || '',
            notes: contract.notes || '',
            contract_object: contract.contract_object || '',
            cnpj: contract.cnpj || '',
            address: contract.address || '',
            managerName: contract.managerName || '',
            manager_registration: contract.manager_registration || '',
            technical_fiscal_name: contract.technical_fiscal_name || '',
            technical_fiscal_registration: contract.technical_fiscal_registration || '',
            administrative_fiscal_name: contract.administrative_fiscal_name || '',
            administrative_fiscal_registration: contract.administrative_fiscal_registration || '',
            contract_pdf_url: contract.contract_pdf_url || '',
            rescinded_at: contract.rescinded_at || today,
            rescission_notes: contract.rescission_notes || '',
            rescission_pdf_url: contract.rescission_pdf_url || ''
        });

        setContractFile(null);
        setRescissionFile(null);
        setIsRescissionActive(!!contract.rescinded_at);
        setIsModalOpen(true);
    };

    const handleDeleteContract = async (id) => {
        try {
            await contractsService.remove(id);
            await loadContracts();
            setContractToDelete(null);
        } catch (error) {
            console.error("Erro ao excluir contrato:", error);
            alert("Erro ao excluir contrato: " + error.message);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingContract(null);
        setContractFile(null);
        setRescissionFile(null);
        setIsRescissionActive(false);
        setIsPdfSectionExpanded(false);
        setFormData({
            number: '',
            code: '',
            title: '',
            supplierName: '',
            totalValue: '',
            startDate: '',
            endDate: '',
            secretariat_id: '',
            biddingProcess: '',
            electronicAuction: '',
            notes: '',
            contract_object: '',
            cnpj: '',
            address: '',
            managerName: '',
            manager_registration: '',
            technical_fiscal_name: '',
            technical_fiscal_registration: '',
            administrative_fiscal_name: '',
            administrative_fiscal_registration: '',
            contract_pdf_url: '',
            rescinded_at: '',
            rescission_notes: '',
            rescission_pdf_url: ''
        });
    };

    const handleCurrencyInput = (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Keep only digits
        if (value === "") {
            setFormData({ ...formData, totalValue: "" });
            return;
        }
        const floatValue = parseInt(value, 10) / 100;
        setFormData({ ...formData, totalValue: floatValue });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!tenantId) return;

        setIsSubmitting(true);
        try {
            let finalContract_pdf_url = formData.contract_pdf_url;
            let finalRescission_pdf_url = formData.rescission_pdf_url;

            // Handle file uploads
            if (contractFile) {
                const sanitizedName = sanitizeFilename(contractFile.name);
                const path = `${tenantId}/${Date.now()}_${sanitizedName}`;
                const { publicUrl, error: uploadError } = await filesService.uploadFile(contractFile, 'contracts_files', path);
                if (uploadError) throw new Error("Erro no upload do arquivo do contrato.");
                finalContract_pdf_url = publicUrl;
            }

            if (isRescissionActive && rescissionFile) {
                const sanitizedName = sanitizeFilename(rescissionFile.name);
                const path = `${tenantId}/${Date.now()}_${sanitizedName}`;
                const { publicUrl, error: uploadError } = await filesService.uploadFile(rescissionFile, 'contracts_files', path);
                if (uploadError) throw new Error("Erro no upload do arquivo de rescisão.");
                finalRescission_pdf_url = publicUrl;
            }

            const payload = {
                number: formData.number,
                code: formData.code,
                title: formData.title,
                supplierName: formData.supplierName,
                totalValue: parseFloat(formData.totalValue) || 0,
                dateRange: {
                    startDate: formData.startDate,
                    endDate: formData.endDate
                },
                secretariat_id: formData.secretariat_id,
                biddingProcess: formData.biddingProcess,
                electronicAuction: formData.electronicAuction,
                notes: formData.notes,
                contract_object: formData.contract_object,
                cnpj: formData.cnpj,
                address: formData.address,
                managerName: formData.managerName,
                manager_registration: formData.manager_registration,
                technical_fiscal_name: formData.technical_fiscal_name,
                technical_fiscal_registration: formData.technical_fiscal_registration,
                administrative_fiscal_name: formData.administrative_fiscal_name,
                administrative_fiscal_registration: formData.administrative_fiscal_registration,
                contract_pdf_url: finalContract_pdf_url,
                status: isRescissionActive ? 'RESCINDIDO' : (editingContract && editingContract.status === 'RESCINDIDO' ? 'ATIVO' : (editingContract ? editingContract.status : 'ATIVO')),
                // Optional conditional payload inclusion if applicable
                ...(isRescissionActive && {
                    rescinded_at: formData.rescinded_at,
                    rescission_notes: formData.rescission_notes,
                    rescission_pdf_url: finalRescission_pdf_url
                }),
                ...(!isRescissionActive && editingContract && {
                    rescinded_at: null,
                    rescission_notes: null,
                    rescission_pdf_url: null
                })
            };

            if (editingContract) {
                await contractsService.update(editingContract.id, payload);
                setFeedback({ type: 'success', message: 'Contrato atualizado com sucesso!' });
            } else {
                const { error } = await contractsService.createContract(payload, tenantId);
                if (error) throw error;
                setFeedback({ type: 'success', message: 'Contrato criado com sucesso!' });
            }
            
            setTimeout(() => setFeedback(null), 3000);

            handleCloseModal();
            await loadContracts();
            // Only navigate if creating? Actually, staying on page is fine for both.
            if (!editingContract) navigate('/contratos');

        } catch (error) {
            console.error(editingContract ? "Erro ao atualizar contrato:" : "Erro ao criar contrato:", error);
            alert((editingContract ? "Erro ao atualizar contrato: " : "Erro ao criar contrato: ") + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="ct-container">
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
            
            {/* Header */}
            <header className="ct-header">
                <div>
                    <h1 className="ct-title">Contratos</h1>
                    <p className="ct-subtitle">Gestão e acompanhamento de vigência e saldos</p>
                </div>
                <button className="ct-primary-btn" onClick={handleNewContract}>
                    <Plus size={18} />
                    <span>Novo Contrato</span>
                </button>
            </header>

            <div className="main-content-card">
                {/* Filters Bar */}
                <section className="filters-toolbar">
                    <div className="filters-row">
                        <div className="filter-search">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nº, título ou fornecedor..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">Todos os Status</option>
                            <option value="ATIVO">Ativos</option>
                            <option value="PENDENTE">Pendentes (Operacional)</option>
                            <option value="VENCENDO">Vencendo</option>
                            <option value="VENCIDO">Vencidos</option>
                            <option value="SUSPENSO">Suspensos</option>
                            <option value="CANCELADO">Cancelados</option>
                            <option value="RESCINDIDO">Rescindidos</option>
                        </select>

                        <select
                            className="filter-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="VENCIMENTO_PROX">Vencimento mais próximo</option>
                            <option value="MAIOR_VALOR">Maior valor</option>
                            <option value="RECENTE">Atualização recente</option>
                        </select>
                    </div>

                </section>

                {/* Data Table */}
                <section className="table-section">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Contrato</th>
                                    <th>Fornecedor</th>
                                    <th>Vigência</th>
                                    <th>Valores</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="loading-state">
                                            <div className="loading-state-content">
                                                <TrendingUp size={48} className="animate-pulse" />
                                                <h3>Carregando contratos...</h3>
                                                <p>Conectando à base de dados segura.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredAndSortedContracts.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="empty-state">
                                            <div className="empty-state-content">
                                                <FileText size={48} />
                                                <h3>Nenhum contrato encontrado</h3>
                                                <p>Ajuste os filtros ou cadastre o primeiro contrato para começar.</p>
                                                {(searchQuery || statusFilter !== 'ALL') && (
                                                    <button
                                                        className="clear-filters-btn"
                                                        onClick={() => {
                                                            setSearchQuery('');
                                                            setStatusFilter('ALL');
                                                        }}
                                                    >
                                                        Limpar busca
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedContracts.map(contract => (
                                        <tr
                                            key={contract.id}
                                            onClick={() => navigate(`/contratos/${contract.id}`)}
                                            style={{ cursor: 'pointer' }}
                                            className="clickable-row"
                                        >
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '300px' }}>
                                                    <span className="td-number" style={{ whiteSpace: 'nowrap' }}>{contract.number}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className="title-text" title={contract.title}>{contract.title}</span>
                                                        {getContractAlerts(contract).length > 0 && (
                                                            <div className="ct-alerts-list" style={{ marginLeft: 0 }}>
                                                                {getContractAlerts(contract).map(alert => (
                                                                    <div key={alert.id} className="ct-alert-icon">
                                                                        {alert.icon}
                                                                        <span className="premium-tooltip">{alert.label}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="td-title">{contract.supplierName}</span>
                                            </td>
                                            <td className="td-dates">
                                                <div className="date-range-compact">
                                                    <span>{formatDate(contract.dateRange.startDate)}</span>
                                                    <span style={contract.status === 'VENCIDO' ? { color: 'var(--danger-color, #d92d20)', fontWeight: 700 } : undefined}>
                                                        {formatDate(contract.dateRange.endDate)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="td-values">
                                                <span className="val-total">{formatCurrency(contract.totalValue)}</span>
                                                <span className="val-balance" style={{ color: getBalanceColor(contract.balanceValue, contract.totalValue) }}>
                                                    Saldo {formatCurrency(contract.balanceValue)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${contract.status.toLowerCase()}`}>
                                                    {contract.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <div className="action-buttons-group">
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditContract(contract);
                                                        }}
                                                    >
                                                        <Edit2 size={18} />
                                                        <span className="premium-tooltip">Editar</span>
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setContractToDelete(contract);
                                                        }}
                                                    >
                                                        <Trash2 size={18} />
                                                        <span className="premium-tooltip">Excluir</span>
                                                    </button>
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
                        Exibindo {filteredAndSortedContracts.length} de {contracts.length} contratos
                    </div>
                </section>
            </div>

            {/* Modal Novo Contrato */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingContract ? "Editar Contrato" : "Cadastro de Contrato"}</h2>
                            <button className="close-btn" onClick={handleCloseModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <form id="newContractForm" onSubmit={handleSubmit}>
                                {/* Identificação */}
                                <div className="contract-form-section">
                                    <div className="section-title">Identificação</div>
                                    <div className="contract-form-grid">
                                        <div className="form-group">
                                            <label htmlFor="formNumber">Número do Contrato *</label>
                                            <input id="formNumber" required type="text" placeholder="Ex: 001/2026" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="formCode">Código / Ref</label>
                                            <input id="formCode" type="text" placeholder="Ex: CT-001" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="formSupplier">Fornecedor *</label>
                                            <input id="formSupplier" required type="text" placeholder="Nome da empresa" value={formData.supplierName} onChange={e => setFormData({ ...formData, supplierName: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="formUnit">Secretaria Responsável *</label>
                                            <select
                                                id="formUnit"
                                                required
                                                className="form-select"
                                                value={formData.secretariat_id}
                                                onChange={e => setFormData({ ...formData, secretariat_id: e.target.value })}
                                            >
                                                <option value="">Selecione uma secretaria</option>
                                                {secretariats.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="formBidding">Processo Licitatório</label>
                                            <input id="formBidding" type="text" placeholder="Ex: 010/2025" value={formData.biddingProcess} onChange={e => setFormData({ ...formData, biddingProcess: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="formAuction">Pregão Eletrônico</label>
                                            <input id="formAuction" type="text" placeholder="Ex: 005/2025" value={formData.electronicAuction} onChange={e => setFormData({ ...formData, electronicAuction: e.target.value })} />
                                        </div>
                                        <div className="form-group full-width">
                                            <label htmlFor="formTitle">Título *</label>
                                            <input id="formTitle" required type="text" placeholder="Nome curto do contrato (Ex: Locação de Veículos)" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                        </div>
                                        <div className="form-group full-width" style={{ marginTop: '1.25rem' }}>
                                            <label htmlFor="formObject">Objeto do Contrato</label>
                                            <input
                                                id="formObject"
                                                type="text"
                                                placeholder="Descrição resumida do objeto do contrato"
                                                value={formData.contract_object}
                                                onChange={e => setFormData({ ...formData, contract_object: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="formCnpj">CNPJ</label>
                                            <input
                                                id="formCnpj"
                                                type="text"
                                                placeholder="00.000.000/0000-00"
                                                value={formData.cnpj}
                                                onChange={e => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="formAddress">Endereço</label>
                                            <input id="formAddress" type="text" placeholder="Rua, Número, Bairro, Cidade" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                        </div>
                                        <div className="form-group full-width" style={{ marginTop: '0.5rem' }}>
                                            <div
                                                className={`collapsible-header ${isPdfSectionExpanded ? 'expanded' : ''}`}
                                                onClick={() => setIsPdfSectionExpanded(!isPdfSectionExpanded)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 14px',
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: isPdfSectionExpanded ? '8px 8px 0 0' : '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    marginBottom: isPdfSectionExpanded ? '0' : '1rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                                                    <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                                                    Documento do Contrato (PDF)
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '10px' }}>
                                                    {isPdfSectionExpanded ? '▼' : '◀'}
                                                </div>
                                            </div>

                                            {isPdfSectionExpanded && (
                                                <div className="collapsible-content" style={{ padding: '15px', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', background: '#fff', marginBottom: '1rem' }}>
                                                    <label htmlFor="contract-pdf-upload" className={`upload-card ${contractFile ? 'has-file' : ''}`}>
                                                        <div className="upload-icon-wrapper">
                                                            {contractFile ? <FileText size={24} /> : <UploadCloud size={24} />}
                                                        </div>
                                                        <div className="upload-info">
                                                            <p className="upload-text-main">
                                                                {contractFile ? 'Arquivo selecionado' : 'Clique para anexar o PDF do contrato'}
                                                            </p>
                                                            <p className="upload-text-sub">ou arraste o arquivo aqui</p>
                                                        </div>

                                                        {contractFile ? (
                                                            <div className="file-name-display">
                                                                <FileText size={14} /> {contractFile.name}
                                                            </div>
                                                        ) : formData.contract_pdf_url ? (
                                                            <div className="existing-file-info" style={{ width: '100%', marginBottom: '10px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', color: '#15803d', marginBottom: '12px' }}>
                                                                    <FileText size={18} />
                                                                    <span style={{ fontWeight: 500, fontSize: '13px' }}>{getFilenameFromUrl(formData.contract_pdf_url)}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(formData.contract_pdf_url, '_blank'); }}
                                                                        className="btn-action-small"
                                                                        style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }}
                                                                    >
                                                                        <ExternalLink size={14} /> Visualizar
                                                                    </button>
                                                                    <a
                                                                        href={formData.contract_pdf_url}
                                                                        download={getFilenameFromUrl(formData.contract_pdf_url)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit', height: '32px' }}
                                                                    >
                                                                        <Download size={14} /> Baixar
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        onClick={async (e) => {
                                                                            e.preventDefault(); e.stopPropagation();
                                                                            if (window.confirm("Tem certeza que deseja remover o documento PDF deste contrato? Esta ação é irreversível.")) {
                                                                                try {
                                                                                    // Extract path from URL
                                                                                    const url = formData.contract_pdf_url;
                                                                                    const pathMatch = url.match(/\/storage\/v1\/object\/public\/contracts_files\/(.+)$/);
                                                                                    const path = pathMatch ? decodeURIComponent(pathMatch[1]) : null;

                                                                                    if (path) {
                                                                                        await filesService.deleteFile('contracts_files', path);
                                                                                    }

                                                                                    if (editingContract) {
                                                                                        await contractsService.update(editingContract.id, { ...editingContract, contract_pdf_url: null });
                                                                                    }

                                                                                    setFormData({ ...formData, contract_pdf_url: null });
                                                                                    setContractFile(null);
                                                                                    if (editingContract) {
                                                                                        await loadContracts();
                                                                                    }
                                                                                } catch (err) {
                                                                                    console.error("Erro ao remover PDF:", err);
                                                                                    alert("Erro ao remover arquivo: " + err.message);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="btn-action-small"
                                                                        style={{ padding: '6px 12px', background: '#fff', border: '1px solid #fecdd3', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '32px', color: '#d92d20' }}
                                                                    >
                                                                        <Trash2 size={14} /> Remover
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : null}

                                                        <div className="upload-btn-styled" style={formData.contract_pdf_url && !contractFile ? { marginTop: '8px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', height: '32px', padding: '0 12px', fontSize: '12px' } : {}}>
                                                            {contractFile || formData.contract_pdf_url ? 'Substituir PDF' : 'Selecionar PDF'}
                                                        </div>

                                                        <input
                                                            id="contract-pdf-upload"
                                                            type="file"
                                                            accept="application/pdf"
                                                            onChange={e => setContractFile(e.target.files[0])}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Responsáveis */}
                                <div className="contract-form-section">
                                    <div className="section-title">Responsáveis pelo contrato</div>
                                    <div className="contract-form-grid" style={{ gap: '0.75rem' }}>
                                        <div className="form-group full-width" style={{ marginBottom: '0.25rem' }}>
                                            <label>Gestor do Contrato</label>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <input style={{ flex: 3 }} type="text" placeholder="Nome" value={formData.managerName} onChange={e => setFormData({ ...formData, managerName: e.target.value })} />
                                                <input style={{ flex: 1 }} type="text" placeholder="Ex: 123456" value={formData.manager_registration} onChange={e => setFormData({ ...formData, manager_registration: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="form-group full-width" style={{ marginBottom: '0.25rem' }}>
                                            <label>Fiscal Técnico</label>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <input style={{ flex: 3 }} type="text" placeholder="Nome" value={formData.technical_fiscal_name} onChange={e => setFormData({ ...formData, technical_fiscal_name: e.target.value })} />
                                                <input style={{ flex: 1 }} type="text" placeholder="Ex: 123456" value={formData.technical_fiscal_registration} onChange={e => setFormData({ ...formData, technical_fiscal_registration: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="form-group full-width" style={{ marginBottom: '0.25rem' }}>
                                            <label>Fiscal Administrativo</label>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <input style={{ flex: 3 }} type="text" placeholder="Nome" value={formData.administrative_fiscal_name} onChange={e => setFormData({ ...formData, administrative_fiscal_name: e.target.value })} />
                                                <input style={{ flex: 1 }} type="text" placeholder="Ex: 123456" value={formData.administrative_fiscal_registration} onChange={e => setFormData({ ...formData, administrative_fiscal_registration: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Valores */}
                                <div className="contract-form-section">
                                    <div className="section-title">Valores e Observações</div>
                                    <div className="contract-form-grid">
                                        <div className="form-group">
                                            <label htmlFor="formTotalValue">Valor Total (R$) *</label>
                                            <input
                                                id="formTotalValue"
                                                required
                                                type="text"
                                                placeholder="R$ 0,00"
                                                value={getMaskedCurrencyValue(formData.totalValue)}
                                                onChange={handleCurrencyInput}
                                            />
                                        </div>
                                        <div className="form-group full-width">
                                            <label htmlFor="formNotes">Observações</label>
                                            <textarea
                                                id="formNotes"
                                                rows="3"
                                                placeholder="Notas adicionais sobre o contrato..."
                                                value={formData.notes}
                                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Vigência */}
                                <div className="contract-form-section">
                                    <div className="section-title">Vigência</div>
                                    <div className="contract-form-grid">
                                        <div className="form-group">
                                            <label htmlFor="formStart">Data de Início</label>
                                            <input id="formStart" required type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="formEnd">Data de Vencimento</label>
                                            <input id="formEnd" required type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* Bloco de Rescisão - Somente em Edição */}
                                {editingContract && (
                                    <div className="contract-form-section" style={{ background: isRescissionActive ? '#fff1f2' : 'transparent', border: isRescissionActive ? '1px solid #fecdd3' : '1px solid var(--border-light)', transition: 'all 0.3s', borderRadius: '8px', padding: '1.5rem', marginTop: '1rem' }}>
                                        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
                                            <input
                                                type="checkbox"
                                                id="chkRescisao"
                                                checked={isRescissionActive}
                                                onChange={e => setIsRescissionActive(e.target.checked)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <label htmlFor="chkRescisao" style={{ cursor: 'pointer', color: 'var(--danger-color, #d92d20)', fontWeight: 600, margin: 0 }}>Rescisão do contrato</label>
                                        </div>

                                        {isRescissionActive && (
                                            <div className="contract-form-grid" style={{ marginTop: '1.5rem' }}>
                                                <div className="form-group">
                                                    <label htmlFor="formRescDate">Data da rescisão *</label>
                                                    <input id="formRescDate" required={isRescissionActive} type="date" value={formData.rescinded_at} onChange={e => setFormData({ ...formData, rescinded_at: e.target.value })} />
                                                </div>
                                                <div className="form-group full-width">
                                                    <label htmlFor="formRescNotes">Observação</label>
                                                    <textarea
                                                        id="formRescNotes"
                                                        rows="2"
                                                        placeholder="Motivos ou observações sobre a rescisão..."
                                                        value={formData.rescission_notes}
                                                        onChange={e => setFormData({ ...formData, rescission_notes: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fecdd3', fontFamily: 'inherit' }}
                                                    />
                                                </div>
                                                <div className="form-group full-width">
                                                    <label>PDF da rescisão</label>
                                                    <label htmlFor="rescission-pdf-upload" className={`upload-card ${rescissionFile ? 'has-file' : ''}`} style={{ borderColor: isRescissionActive ? '#fecdd3' : '#cbd5e1' }}>
                                                        <div className="upload-icon-wrapper" style={{ color: '#d92d20', background: '#fef2f2' }}>
                                                            {rescissionFile ? <FileText size={24} /> : <UploadCloud size={24} />}
                                                        </div>
                                                        <div className="upload-info">
                                                            <p className="upload-text-main">
                                                                {rescissionFile ? 'Arquivo selecionado' : 'Clique para anexar o PDF da rescisão'}
                                                            </p>
                                                            <p className="upload-text-sub">ou arraste o arquivo aqui</p>
                                                        </div>

                                                        {rescissionFile ? (
                                                            <div className="file-name-display" style={{ background: '#fecdd3', color: '#991b1b' }}>
                                                                <FileText size={14} /> {rescissionFile.name}
                                                            </div>
                                                        ) : formData.rescission_pdf_url ? (
                                                            <div className="existing-file-info" style={{ width: '100%', marginBottom: '10px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3', color: '#d92d20', marginBottom: '12px' }}>
                                                                    <FileText size={18} />
                                                                    <span style={{ fontWeight: 500, fontSize: '13px' }}>{getFilenameFromUrl(formData.rescission_pdf_url)}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(formData.rescission_pdf_url, '_blank'); }}
                                                                        className="btn-action-small"
                                                                        style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }}
                                                                    >
                                                                        <ExternalLink size={14} /> Visualizar
                                                                    </button>
                                                                    <a
                                                                        href={formData.rescission_pdf_url}
                                                                        download={getFilenameFromUrl(formData.rescission_pdf_url)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit', height: '32px' }}
                                                                    >
                                                                        <Download size={14} /> Baixar
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        onClick={async (e) => {
                                                                            e.preventDefault(); e.stopPropagation();
                                                                            if (window.confirm("Tem certeza que deseja remover o PDF da rescisão? Esta ação é irreversível.")) {
                                                                                try {
                                                                                    // Extract path from URL
                                                                                    const url = formData.rescission_pdf_url;
                                                                                    const pathMatch = url.match(/\/storage\/v1\/object\/public\/contracts_files\/(.+)$/);
                                                                                    const path = pathMatch ? decodeURIComponent(pathMatch[1]) : null;

                                                                                    if (path) {
                                                                                        await filesService.deleteFile('contracts_files', path);
                                                                                    }

                                                                                    if (editingContract) {
                                                                                        await contractsService.update(editingContract.id, { ...editingContract, rescission_pdf_url: null });
                                                                                    }

                                                                                    setFormData({ ...formData, rescission_pdf_url: null });
                                                                                    setRescissionFile(null);
                                                                                    if (editingContract) {
                                                                                        await loadContracts();
                                                                                    }
                                                                                } catch (err) {
                                                                                    console.error("Erro ao remover PDF da rescisão:", err);
                                                                                    alert("Erro ao remover arquivo: " + err.message);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="btn-action-small"
                                                                        style={{ padding: '6px 12px', background: '#fff', border: '1px solid #fecdd3', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '32px', color: '#d92d20' }}
                                                                    >
                                                                        <Trash2 size={14} /> Remover
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : null}

                                                        <div className="upload-btn-styled" style={formData.rescission_pdf_url && !rescissionFile ? { marginTop: '8px', background: '#fff1f2', color: '#d92d20', border: '1px solid #fecdd3', height: '32px', padding: '0 12px', fontSize: '12px' } : {}}>
                                                            {rescissionFile || formData.rescission_pdf_url ? 'Substituir PDF' : 'Selecionar PDF'}
                                                        </div>

                                                        <input
                                                            id="rescission-pdf-upload"
                                                            type="file"
                                                            accept="application/pdf"
                                                            onChange={e => setRescissionFile(e.target.files[0])}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={handleCloseModal} disabled={isSubmitting}>Cancelar</button>
                            <button type="submit" form="newContractForm" className="btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? (editingContract ? 'Salvando...' : 'Criando...') : (editingContract ? 'Salvar Alterações' : 'Criar Contrato')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmação de Exclusão */}
            {contractToDelete && (
                <div className="modal-overlay" onClick={() => setContractToDelete(null)}>
                    <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ background: '#fef2f2', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#ef4444' }}>
                                <Trash2 size={32} />
                            </div>
                            <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Excluir Contrato?</h3>
                            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                Esta ação irá remover permanentemente o contrato <strong>{contractToDelete.number}</strong> e todos os seus itens e alocações vinculados.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setContractToDelete(null)}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none' }}
                                    onClick={() => handleDeleteContract(contractToDelete.id)}
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contratos;
