import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileText, TrendingUp, Eye, FileCheck, AlertCircle, Plus, PenSquare } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { invoicesService } from '../services/api/invoices.service';
import { useTenant } from '../context/TenantContext';
import { formatLocalDate } from '../utils/dateUtils';
import NovaNfModal from './components/NovaNfModal';
import EdicaoNfModal from './components/EdicaoNfModal';
import './NotasFiscais.css';

const NotasFiscais = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { tenantId } = useTenant();

    // Data State
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modals
    const [isNovaNfModalOpen, setIsNovaNfModalOpen] = useState(false);
    const [edicaoNfId, setEdicaoNfId] = useState(null);
    const [feedback, setFeedback] = useState(null);

    const loadData = async () => {
        if (!tenantId) return;
        try {
            setIsLoading(true);
            const data = await invoicesService.list(tenantId);
            setInvoices(data || []);
        } catch (error) {
            console.error("Erro ao carregar notas fiscais:", error);
            showFeedback('error', 'Erro ao carregar dados remotos.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (location.state?.openModal === 'nova-nf') {
            setIsNovaNfModalOpen(true);
            // Clear state so it doesn't reopen on refresh/navigation back
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        loadData();
    }, [tenantId]);

    const showFeedback = (type, message) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 3000);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const hasFinancialPendency = (inv) => {
        return !inv.liquidation_number || !inv.liquidation_date || !inv.payment_date;
    };

    // Filter Engine
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesNf = inv.number?.toLowerCase().includes(query);
                const matchesContract = inv.contract?.number?.toLowerCase().includes(query);
                const matchesOf = inv.of?.number?.toLowerCase().includes(query);
                const matchesCommitment = inv.commitment?.number?.toLowerCase().includes(query);
                const matchesSupplier = inv.contract?.supplier_name?.toLowerCase().includes(query);

                if (!matchesNf && !matchesContract && !matchesOf && !matchesCommitment && !matchesSupplier) return false;
            }

            if (statusFilter === 'PENDING') {
                if (!hasFinancialPendency(inv)) return false;
            } else if (statusFilter === 'OK') {
                if (hasFinancialPendency(inv)) return false;
            }

            return true;
        });
    }, [invoices, searchQuery, statusFilter]);

    // Summary Calculations
    const totalNfs = filteredInvoices.length;
    const nfsPending = filteredInvoices.filter(hasFinancialPendency).length;
    const nfsOk = totalNfs - nfsPending;
    const valorTotalNfs = filteredInvoices.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0);

    return (
        <div className="ct-container" style={{ overflowY: 'auto' }}>
            {/* Header */}
            <header className="ct-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="ct-title">Notas Fiscais</h1>
                    <p className="ct-subtitle">Gestão e acompanhamento de faturamentos das OFs</p>
                </div>
                <button 
                    className="btn-primary" 
                    onClick={() => setIsNovaNfModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#00967d', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                    <Plus size={20} /> Registrar NF
                </button>
            </header>

            {/* Summary Cards */}
            <div className="summary-cards-grid">
                <div className="summary-card">
                    <div className="summary-card-icon blue">
                        <FileText size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Total de NFs</div>
                        <div className="summary-card-value">{totalNfs}</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-card-icon amber">
                        <AlertCircle size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Com Pendência Financeira</div>
                        <div className="summary-card-value" style={nfsPending > 0 ? { color: '#d97706' } : {}}>
                            {nfsPending}
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-card-icon green">
                        <FileCheck size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Sem Pendência Financeira</div>
                        <div className="summary-card-value" style={{ color: '#0f8b4d' }}>
                            {nfsOk}
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-card-icon purple">
                        <TrendingUp size={24} />
                    </div>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Volume Faturado</div>
                        <div className="summary-card-value">{formatCurrency(valorTotalNfs)}</div>
                    </div>
                </div>
            </div>

            {/* Feedback Message */}
            {feedback && (
                <div style={{
                    position: 'fixed', top: '24px', right: '24px', padding: '16px 24px', borderRadius: '8px',
                    background: feedback.type === 'success' ? '#0b7035' : '#7f1d1d', color: 'white',
                    display: 'flex', alignItems: 'center', gap: '12px', zIndex: 9999, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}>
                    {feedback.type === 'success' ? <FileCheck size={24} /> : <AlertCircle size={24} />}
                    <span style={{ fontWeight: 500 }}>{feedback.message}</span>
                </div>
            )}

            <div className="main-content-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '24px', height: 'auto', overflow: 'visible', flex: 'none' }}>
                {/* Filters */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar por NF, Contrato, OF, Empenho ou Fornecedor..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                        />
                    </div>
                    <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', minWidth: '200px' }}
                    >
                        <option value="ALL">Todos os Registros</option>
                        <option value="PENDING">Com Pendência Financeira</option>
                        <option value="OK">Cadastro Completo</option>
                    </select>
                </div>

                {/* Data Table */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.875rem', width: '80px', whiteSpace: 'nowrap' }}>Nº NF</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center', width: '90px', whiteSpace: 'nowrap' }}>Emissão</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.875rem', width: '90px', whiteSpace: 'nowrap' }}>Contrato</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.875rem', width: '18%', whiteSpace: 'nowrap' }}>OF / Empenho</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>Fornecedor</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right', width: '120px', whiteSpace: 'nowrap' }}>Total</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center', width: '130px', whiteSpace: 'nowrap' }}>PENDÊNCIA</th>
                                <th style={{ padding: '12px 24px 12px 16px', color: '#475569', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center', width: '100px', whiteSpace: 'nowrap' }}>AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando notas fiscais...</td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhuma nota fiscal encontrada.</td></tr>
                            ) : (
                                filteredInvoices.map(inv => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{inv.number}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatLocalDate(inv.issue_date)}</td>
                                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{inv.contract?.number || '-'}</td>
                                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>OF {inv.of?.number || '-'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>Emp {inv.commitment?.number || '-'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={inv.contract?.supplier_name}>
                                            {inv.contract?.supplier_name || '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                            {formatCurrency(inv.total_amount)}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {hasFinancialPendency(inv) ? (
                                                <span className="badge-pendencia" title="Aguardando liquidação/pagamento"><AlertCircle size={14} /> Pendente</span>
                                            ) : (
                                                <span className="badge-ok"><FileCheck size={14} /> Sem pendência</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                {hasFinancialPendency(inv) ? (
                                                    <button 
                                                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                        title="Completar Informações Financeiras"
                                                        onClick={() => setEdicaoNfId(inv.id)}
                                                        onMouseOver={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#1d4ed8'; }}
                                                        onMouseOut={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}
                                                    >
                                                        <PenSquare size={16} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                        title="Visualizar Detalhes"
                                                        onClick={() => setEdicaoNfId(inv.id)}
                                                        onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                                                        onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            <NovaNfModal 
                isOpen={isNovaNfModalOpen} 
                onClose={() => setIsNovaNfModalOpen(false)} 
                onSuccess={() => {
                    setIsNovaNfModalOpen(false);
                    showFeedback('success', 'Nota Fiscal Registrada com Sucesso!');
                    loadData();
                }}
            />

            <EdicaoNfModal 
                isOpen={!!edicaoNfId}
                nfId={edicaoNfId}
                onClose={() => setEdicaoNfId(null)}
                onSuccess={() => {
                    setEdicaoNfId(null);
                    showFeedback('success', 'Dados da Nota Fiscal Atualizados!');
                    loadData();
                }}
            />
        </div>
    );
};

export default NotasFiscais;
