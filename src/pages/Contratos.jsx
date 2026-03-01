import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Calendar, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { contractsService } from '../services/api/contracts.service';
import { secretariatsService } from '../services/api/secretariats.service';
import { useTenant } from '../context/TenantContext';
import './Contratos.css';

const Contratos = () => {
    const navigate = useNavigate();
    const { tenantId } = useTenant();
    const [contracts, setContracts] = useState([]);
    const [secretariats, setSecretariats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [contractToDelete, setContractToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
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

        return () => {
            document.body.style.overflow = 'unset'; // Restore scroll
        };
    }, [tenantId]);

    // Helper formatting
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Intl.DateTimeFormat('pt-BR').format(new Date(isoString));
    };

    const getBalanceColor = (balance, total) => {
        if (balance === 0) return 'var(--danger-color, #d92d20)'; // Red
        const pct = (balance / total) * 100;
        if (pct <= 30) return 'var(--warning-color-dark, #b75c00)'; // Orange
        return 'var(--success-color-dark, #0f8b4d)'; // Green
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
            result = result.filter(c => c.status === statusFilter);
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
        setIsModalOpen(true);
    };

    const handleEditContract = (contract) => {
        setEditingContract(contract);
        setFormData({
            number: contract.number,
            code: contract.code || '',
            title: contract.title,
            supplierName: contract.supplierName,
            totalValue: contract.totalValue, // Mantemos como número para a máscara tratar
            startDate: contract.dateRange.startDate || '',
            endDate: contract.dateRange.endDate || '',
            status: contract.status,
            responsibleUnit: contract.responsibleUnit || '',
            biddingProcess: contract.biddingProcess || '',
            electronicAuction: contract.electronicAuction || '',
            notes: contract.notes || ''
        });
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
        setFormData({
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
                responsibleUnit: formData.responsibleUnit,
                biddingProcess: formData.biddingProcess,
                electronicAuction: formData.electronicAuction,
                notes: formData.notes,
                status: editingContract ? editingContract.status : 'ATIVO'
            };

            if (editingContract) {
                await contractsService.update(editingContract.id, payload);
            } else {
                const { error } = await contractsService.createContract(payload, tenantId);
                if (error) throw error;
            }

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
                            <option value="VENCENDO">Vencendo</option>
                            <option value="VENCIDO">Vencidos</option>
                            <option value="SUSPENSO">Suspensos</option>
                            <option value="CANCELADO">Cancelados</option>
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
                                                <span className="td-number">{contract.number}</span>
                                                <span className="title-text" title={contract.title}>{contract.title}</span>
                                            </td>
                                            <td>
                                                <span className="td-title">{contract.supplierName}</span>
                                            </td>
                                            <td className="td-dates">
                                                <div>
                                                    <span className="date-end" style={{ color: contract.status === 'VENCIDO' ? 'var(--danger-color, #d92d20)' : 'inherit' }}>
                                                        Vence: {formatDate(contract.dateRange.endDate)}
                                                    </span>
                                                    <span className="date-start">
                                                        Início: {formatDate(contract.dateRange.startDate)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="td-values">
                                                <span className="val-total">{formatCurrency(contract.totalValue)}</span>
                                                <span className="val-balance" style={{ color: getBalanceColor(contract.balanceValue, contract.totalValue) }}>
                                                    Saldo: {formatCurrency(contract.balanceValue)}
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
                                                        title="Editar"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditContract(contract);
                                                        }}
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        title="Excluir"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setContractToDelete(contract);
                                                        }}
                                                    >
                                                        <Trash2 size={18} />
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
                            <h2>{editingContract ? "Editar Contrato" : "Novo Contrato"}</h2>
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
                                                value={formData.responsibleUnit}
                                                onChange={e => setFormData({ ...formData, responsibleUnit: e.target.value })}
                                            >
                                                <option value="">Selecione uma secretaria</option>
                                                {secretariats.map(s => (
                                                    <option key={s.id} value={s.name}>{s.name}</option>
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
                                            <label htmlFor="formTitle">Objeto / Título *</label>
                                            <input id="formTitle" required type="text" placeholder="Resumo do objeto contratado" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
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
                                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', fontFamily: 'inherit' }}
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
