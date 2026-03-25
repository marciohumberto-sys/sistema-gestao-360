import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { commitmentsService } from '../services/api/commitments.service';
import { ofsService } from '../services/api/ofs.service';
import { ArrowLeft, Loader2, FileText, Activity, Eye } from 'lucide-react';
import { formatLocalDate } from '../utils/dateUtils';
import './EmpenhoDetails.css';

const EmpenhoDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { tenantId } = useTenant();

    const [commitment, setCommitment] = useState(null);
    const [movements, setMovements] = useState([]);
    const [linkedOfs, setLinkedOfs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resumo');

    useEffect(() => {
        const loadDetails = async () => {
            if (!id || !tenantId) return;
            try {
                setIsLoading(true);
                const [commData, movData, ofsData] = await Promise.all([
                    commitmentsService.getById(id),
                    commitmentsService.getMovements(id),
                    ofsService.listByCommitment(id)
                ]);
                setCommitment(commData);
                setMovements(movData);
                setLinkedOfs(ofsData);
            } catch (error) {
                console.error("Erro ao carregar detalhes do empenho:", error);
            } finally {
                setIsLoading(false);
            }
        };

        let isMounted = true;
        if (isMounted) loadDetails();
        return () => { isMounted = false; };
    }, [id, tenantId]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    if (isLoading) {
        return (
            <div className="empenho-details-container ct-container">
                <div style={{ paddingBottom: '2rem' }}>
                    <div style={{ width: '150px', height: '20px', background: 'var(--bg-muted-light)', borderRadius: '4px', marginBottom: '1rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
                    <div className="ed-header-card" style={{ opacity: 0.7 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ width: '250px', height: '32px', background: 'var(--bg-muted)', borderRadius: '6px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                            <div style={{ width: '380px', height: '20px', background: 'var(--bg-muted)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                        </div>
                    </div>
                </div>
                <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', opacity: 0.5 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="summary-card" style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ width: '80px', height: '14px', background: 'var(--bg-muted)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                            <div style={{ width: '120px', height: '28px', background: 'var(--bg-muted)', borderRadius: '6px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!commitment) {
        return (
            <div className="ct-container">
                <div className="ed-empty-state">
                    <h3>Empenho não encontrado</h3>
                    <button className="ct-secondary-btn" onClick={() => navigate('/compras/empenhos')} style={{ marginTop: '1rem' }}>
                        Voltar para Empenhos
                    </button>
                </div>
            </div>
        );
    }

    const { 
        initial_amount, 
        added_amount, 
        annulled_amount, 
        consumed_amount, 
        current_balance 
    } = commitment;

    return (
        <div className="empenho-details-container ct-container">
            {/* Header / Navigate Back */}
            <div>
                <button 
                    onClick={() => navigate('/compras/empenhos')} 
                    className="ct-secondary-btn" 
                    style={{ border: 'none', background: 'transparent', paddingLeft: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <ArrowLeft size={16} /> Voltar para Empenhos
                </button>

                <div className="ed-header-card">
                    <div className="ed-header-info">
                        <h1 className="ed-title">
                            Empenho {commitment.number}
                            <span className={`status-badge ${commitment.status.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                                {commitment.status}
                            </span>
                        </h1>
                        <div className="ed-subtitle">
                            <strong>{commitment.contract?.number}</strong> - {commitment.contract?.title}
                        </div>
                    </div>
                    
                    <div className="ed-header-balance">
                        <div className="ed-balance-label">Saldo Atual</div>
                        <div className="ed-balance-value">{formatCurrency(current_balance)}</div>
                    </div>
                </div>
            </div>

            {/* Values Summary Cards */}
            <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <div className="summary-card" style={{ padding: '1rem' }}>
                    <div className="summary-card-content">
                        <div className="summary-card-title">Valor Inicial</div>
                        <div className="summary-card-value" style={{ fontSize: '1.125rem' }}>{formatCurrency(initial_amount)}</div>
                    </div>
                </div>
                <div className="summary-card" style={{ padding: '1rem' }}>
                    <div className="summary-card-content">
                        <div className="summary-card-title" style={{ color: '#16a34a' }}>+ Adições</div>
                        <div className="summary-card-value" style={{ fontSize: '1.125rem' }}>{formatCurrency(added_amount)}</div>
                    </div>
                </div>
                <div className="summary-card" style={{ padding: '1rem' }}>
                    <div className="summary-card-content">
                        <div className="summary-card-title" style={{ color: '#ef4444' }}>- Anulações</div>
                        <div className="summary-card-value" style={{ fontSize: '1.125rem' }}>{formatCurrency(annulled_amount)}</div>
                    </div>
                </div>
                <div className="summary-card" style={{ padding: '1rem' }}>
                    <div className="summary-card-content">
                        <div className="summary-card-title" style={{ color: '#4f46e5' }}>- Consumido</div>
                        <div className="summary-card-value" style={{ fontSize: '1.125rem' }}>{formatCurrency(consumed_amount)}</div>
                    </div>
                </div>
                <div className="summary-card" style={{ padding: '1rem', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <div className="summary-card-content">
                        <div className="summary-card-title" style={{ color: '#15803d' }}>= Saldo Final</div>
                        <div className="summary-card-value" style={{ fontSize: '1.125rem', color: '#16a34a' }}>{formatCurrency(current_balance)}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="ed-tabs">
                <button 
                    className={`ed-tab ${activeTab === 'resumo' ? 'active' : ''}`}
                    onClick={() => setActiveTab('resumo')}
                >
                    <FileText size={16} /> Resumo
                </button>
                <button 
                    className={`ed-tab ${activeTab === 'movimentacoes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('movimentacoes')}
                >
                    <Activity size={16} /> Movimentações ({movements.length})
                </button>
                <button 
                    className={`ed-tab ${activeTab === 'ofs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ofs')}
                >
                    <FileText size={16} /> OFs Vinculadas
                </button>
            </div>

            {/* Tab Contents */}
            <div className="ed-tab-content">
                {activeTab === 'resumo' && (
                    <div className="ed-summary-grid">
                        <div className="ed-summary-field">
                            <span className="ed-summary-label">Contrato Vinculado</span>
                            <span className="ed-summary-value">{commitment.contract?.number} - {commitment.contract?.title}</span>
                            <span className="ed-summary-value" style={{ fontSize: '0.8125rem', color: '#64748b' }}>Fornecedor: {commitment.contract?.supplier_name}</span>
                        </div>
                        <div className="ed-summary-field">
                            <span className="ed-summary-label">Secretaria Solicitante</span>
                            <span className="ed-summary-value">{commitment.secretariat?.name || '-'}</span>
                        </div>
                        <div className="ed-summary-field">
                            <span className="ed-summary-label">Data de Emissão</span>
                            <span className="ed-summary-value">{formatLocalDate(commitment.issue_date)}</span>
                        </div>
                        <div className="ed-summary-field" style={{ gridColumn: 'span 2' }}>
                            <span className="ed-summary-label">Observações</span>
                            <span className="ed-summary-value">{commitment.notes || 'Nenhuma observação informada.'}</span>
                        </div>
                    </div>
                )}

                {activeTab === 'movimentacoes' && (
                    movements.length === 0 ? (
                        <div className="ed-empty-state">
                            <Activity size={48} />
                            <h3>Sem movimentações</h3>
                            <p>Este empenho ainda não possui histórico financeiro.</p>
                        </div>
                    ) : (
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Tipo</th>
                                    <th>Descrição</th>
                                    <th>Valor (R$)</th>
                                    <th>Saldo Anterior</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Saldo Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    // 1. Sort chronologically (oldest to newest) to calculate running balances
                                    const chronological = [...movements].sort((a, b) => {
                                        const dA = new Date(a.movement_date || a.created_at).getTime();
                                        const dB = new Date(b.movement_date || b.created_at).getTime();
                                        return dA - dB;
                                    });

                                    // 2. Calculate running balances
                                    let runningBalance = 0;
                                    const enrichedMovements = chronological.map(m => {
                                        const rawType = (m.movement_type || '').toUpperCase();
                                        const isAddition = rawType.includes('INITIAL') || rawType.includes('INICIAL') || rawType.includes('CREATED') || rawType.includes('ADD') || rawType.includes('ACRÉSCIMO') || rawType.includes('ACRESCIMO') || rawType.includes('ADICAO');
                                        const isSubtraction = rawType.includes('ANNULMENT') || rawType.includes('ANULAÇÃO') || rawType.includes('ANULACAO') || rawType.includes('CONSUMPTION') || rawType.includes('CONSUMO');
                                        
                                        const amount = m.amount != null ? Number(m.amount) : 0;
                                        
                                        const valOld = runningBalance;
                                        
                                        if (isAddition) {
                                            runningBalance += amount;
                                        } else if (isSubtraction) {
                                            runningBalance -= amount;
                                        } // if reversal or unknown, assume it might not directly affect total or needs special logic, but keeping standard addition/subtraction for now
                                        
                                        const valNew = runningBalance;
                                        
                                        return {
                                            ...m,
                                            computed_old_balance: valOld,
                                            computed_new_balance: valNew,
                                            valAmount: amount
                                        };
                                    });

                                    // 3. Reverse back for display (newest first)
                                    const displayMovements = enrichedMovements.reverse();

                                    return displayMovements.map(m => {
                                        const rawType = (m.movement_type || '').toUpperCase();
                                        
                                        // Mapping technical/raw types to administrative reading
                                        let badge = { text: m.movement_type, class: 'initial' };
                                        
                                        if (rawType.includes('INITIAL') || rawType.includes('INICIAL') || rawType.includes('CREATED')) {
                                            badge = { text: 'Empenho inicial', class: 'initial' };
                                        } else if (rawType.includes('ADDITION') || rawType.includes('ACRÉSCIMO') || rawType.includes('ACRESCIMO') || rawType.includes('ADICAO') || rawType.includes('ADD')) {
                                            badge = { text: 'Adição', class: 'addition' };
                                        } else if (rawType.includes('ANNULMENT') || rawType.includes('ANULAÇÃO') || rawType.includes('ANULACAO')) {
                                            badge = { text: 'Anulação', class: 'annulment' };
                                        } else if (rawType.includes('CONSUMPTION') || rawType.includes('CONSUMO')) {
                                            badge = { text: 'Consumo por OF', class: 'consumption' };
                                        } else if (rawType.includes('REVERSAL') || rawType.includes('ESTORNO')) {
                                            badge = { text: 'Estorno de OF', class: 'reversal' };
                                        }

                                        // Fallback text check based on description if type is ambiguous
                                        const desc = (m.description || '').toLowerCase();
                                        if (badge.text === m.movement_type) {
                                            if (desc.includes('anula') || desc.includes('cancel')) badge = { text: 'Anulação', class: 'annulment' };
                                            if (desc.includes('adi') || desc.includes('acr')) badge = { text: 'Adição', class: 'addition' };
                                        }
                                    


                                    return (
                                        <tr key={m.id}>
                                            <td style={{ fontSize: '0.875rem' }}>{formatLocalDate(m.movement_date || m.created_at)}</td>
                                            <td>
                                                <span className={`movement-type-badge ${badge.class}`}>
                                                    {badge.text}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.875rem', color: '#475569' }}>{m.description}</td>
                                            <td style={{ fontWeight: 600, color: badge.class === 'annulment' || badge.class === 'consumption' ? '#ef4444' : '#16a34a' }}>
                                                {formatCurrency(m.valAmount)}
                                            </td>
                                            <td style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                                                {formatCurrency(m.computed_old_balance)}
                                            </td>
                                            <td style={{ fontWeight: 500, color: '#0f172a' }}>
                                                {formatCurrency(m.computed_new_balance)}
                                            </td>
                                        </tr>
                                    );
                                });
                                })()}
                            </tbody>
                        </table>
                    )
                )}

                {activeTab === 'ofs' && (
                    linkedOfs.length === 0 ? (
                        <div className="ed-empty-state">
                            <FileText size={48} />
                            <h3>Nenhuma OF Vinculada</h3>
                            <p>Este empenho ainda não foi utilizado para emissão de Ordens de Fornecimento.</p>
                        </div>
                    ) : (
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Status</th>
                                    <th>Data de Emissão</th>
                                    <th>Valor Total</th>
                                    <th style={{ textAlign: 'right' }}>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {linkedOfs.map(of => (
                                    <tr key={of.id}>
                                        <td style={{ fontWeight: 600 }}>{of.number}</td>
                                        <td>
                                            <span className={`status-badge ${(of.status || 'DRAFT').toLowerCase()}`}>
                                                {of.status === 'ISSUED' ? 'EMITIDA' : of.status === 'CANCELED' ? 'CANCELADA' : 'RASCUNHO'}
                                            </span>
                                        </td>
                                        <td>{of.issue_date ? formatLocalDate(of.issue_date) : '-'}</td>
                                        <td style={{ fontWeight: 600, fontStyle: of.status === 'DRAFT' ? 'italic' : 'normal', color: of.status === 'DRAFT' ? '#64748b' : 'inherit' }}>
                                            {of.status === 'DRAFT' ? 'OF em edição' : formatCurrency(of.total_amount)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="ct-icon-btn" 
                                                onClick={() => navigate(`/compras/ordens-fornecimento/${of.id}`)}
                                                title="Ver Detalhes da OF"
                                                style={{ padding: '4px', color: '#6366f1' }}
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>

        </div>
    );
};

export default EmpenhoDetails;
