import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, MoreVertical, Calendar, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { contractsService } from '../services/api/contracts.service';
import './Contratos.css';

const Contratos = () => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters & Sorting state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('VENCIMENTO_PROX'); // VENCIMENTO_PROX, MAIOR_VALOR, RECENTE

    // Fetch data
    useEffect(() => {
        // Prevent body scroll (Double scroll fix)
        document.body.style.overflow = 'hidden';

        let isMounted = true;
        const loadContracts = async () => {
            try {
                setIsLoading(true);
                const data = await contractsService.list();
                if (isMounted) {
                    setContracts(data);
                }
            } catch (error) {
                console.error("Erro ao carregar contratos:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        loadContracts();
        return () => {
            isMounted = false;
            document.body.style.overflow = 'unset'; // Restore scroll
        };
    }, []);

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
        alert("Criar novo contrato: Em breve!"); // Replace with modal/toast later
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
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="action-cell-btn"
                                                    title="Opções"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        console.log("Opções de", contract.number);
                                                    }}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
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
        </div>
    );
};

export default Contratos;
