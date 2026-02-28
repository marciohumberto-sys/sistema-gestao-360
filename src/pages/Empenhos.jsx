import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, FileText, CheckCircle, AlertTriangle, TrendingUp, MoreVertical } from 'lucide-react';
import { empenhosService } from '../services/api/empenhos.service';
import './Contratos.css'; // Reutilizando a arquitetura premium já criada

const Empenhos = () => {
    const [empenhos, setEmpenhos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters & Sorting state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('RECENTE'); // RECENTE, MAIOR_VALOR

    // Fetch data
    useEffect(() => {
        let isMounted = true;
        const loadEmpenhos = async () => {
            try {
                setIsLoading(true);
                const data = await empenhosService.list();
                if (isMounted) {
                    setEmpenhos(data);
                }
            } catch (error) {
                console.error("Erro ao carregar empenhos:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        loadEmpenhos();
        return () => { isMounted = false; };
    }, []);

    // Helper formatting
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Intl.DateTimeFormat('pt-BR').format(new Date(isoString));
    };

    // Filter and Sort Engine
    const filteredAndSortedEmpenhos = useMemo(() => {
        let result = [...empenhos];

        // 1. Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(e =>
                e.number.toLowerCase().includes(query) ||
                e.description.toLowerCase().includes(query)
            );
        }

        // 2. Status filter
        if (statusFilter !== 'ALL') {
            result = result.filter(e => e.status === statusFilter);
        }

        // 3. Sorting
        result.sort((a, b) => {
            if (sortBy === 'MAIOR_VALOR') {
                return b.value - a.value;
            } else if (sortBy === 'RECENTE') {
                return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
            }
            return 0;
        });

        return result;
    }, [empenhos, searchQuery, statusFilter, sortBy]);

    // UI Handlers
    const handleNewEmpenho = () => {
        alert("Emitir Novo Empenho em breve!");
    };

    return (
        <div className="ct-container">
            {/* Header */}
            <header className="ct-header">
                <div>
                    <h1 className="ct-title">Empenhos</h1>
                    <p className="ct-subtitle">Controle de notas de empenho e saldo comprometido</p>
                </div>
                <button className="ct-primary-btn" onClick={handleNewEmpenho}>
                    <Plus size={18} />
                    <span>Novo Empenho</span>
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
                                placeholder="Buscar por nº do empenho ou descrição..."
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
                            <option value="EMPENHADO">Empenhados</option>
                            <option value="LIQUIDADO">Liquidados</option>
                            <option value="PAGO">Pagos</option>
                        </select>

                        <select
                            className="filter-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="RECENTE">Emissão mais recente</option>
                            <option value="MAIOR_VALOR">Maior valor</option>
                        </select>
                    </div>
                </section>

                {/* Data Table */}
                <section className="table-section">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Empenho</th>
                                    <th>Descrição / Contrato</th>
                                    <th>Datas</th>
                                    <th>Valor</th>
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
                                                <h3>Buscando empenhos...</h3>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredAndSortedEmpenhos.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="empty-state">
                                            <div className="empty-state-content">
                                                <FileText size={48} />
                                                <h3>Nenhum empenho encontrado</h3>
                                                <p>Cadastre o primeiro empenho ou ajuste os filtros.</p>
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
                                    filteredAndSortedEmpenhos.map(emp => (
                                        <tr key={emp.id} className="clickable-row">
                                            <td>
                                                <span className="td-number">{emp.number}</span>
                                            </td>
                                            <td>
                                                <span className="title-text" title={emp.description}>{emp.description}</span>
                                                <span className="td-title" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Vinculado a: {emp.contractId}</span>
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
                                                <span className="val-total">{formatCurrency(emp.value)}</span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${emp.status.toLowerCase()}`}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="action-cell-btn" title="Opções">
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
                        Exibindo {filteredAndSortedEmpenhos.length} de {empenhos.length} empenhos encontrados
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Empenhos;
