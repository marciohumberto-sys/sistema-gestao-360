import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    MoreVertical,
    FileText,
    DollarSign,
    Clock,
    Calendar,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { contractsService } from '../services/api/contracts.service';
import { empenhosService } from '../services/api/empenhos.service';
import './ContractDetails.css';

const ContractDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [contract, setContract] = useState(null);
    const [empenhos, setEmpenhos] = useState([]);
    const [isLoadingContract, setIsLoadingContract] = useState(true);
    const [isLoadingEmpenhos, setIsLoadingEmpenhos] = useState(true);
    const [error, setError] = useState(false);

    const [activeTab, setActiveTab] = useState('geral');

    // Força a exibição da barra de rolagem (evita layout shift ao trocar de abas)
    useEffect(() => {
        document.body.style.overflowY = 'scroll';
        return () => {
            document.body.style.overflowY = 'auto';
        };
    }, []);

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

        if (id) {
            fetchContract();
            fetchEmpenhos();
        }

        return () => { isMounted = false; };
    }, [id]);

    const formatCurrency = (value) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
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
            {/* Context Navigation */}
            <nav className="cd-breadcrumb">
                <button className="cd-back-link" onClick={() => navigate('/contratos')}>
                    <ChevronLeft size={16} /> Contratos
                </button>
                <span className="cd-crumb-separator">/</span>
                <span className="cd-crumb-current">{contract.number}</span>
            </nav>

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
                        <button className="cd-btn-secondary">Editar</button>
                        <button className="cd-btn-primary">Gerar OF</button>
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
                                <p className="cd-detail-text">Fornecimento referenciado conforme processo licitatório vinculado. ({contract.title})</p>
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
                                <label>Unidade Responsável</label>
                                <span>Não informada</span>
                            </div>
                            <div className="cd-detail-group">
                                <label>Processo Licitatório</label>
                                <span>Não informado</span>
                            </div>
                            <div className="cd-detail-group full">
                                <label>Observações</label>
                                <span className="empty-value">Nenhuma observação registrada neste contrato.</span>
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
                                <div className="data-table-wrapper" style={{ boxShadow: 'none' }}>
                                    <table className="data-table">
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
                </div>
            </section>
        </div>
    );
};

export default ContractDetails;
