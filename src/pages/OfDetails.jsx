import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ofsService } from '../services/api/ofs.service';
import { commitmentsService } from '../services/api/commitments.service';
import { ArrowLeft, FileText, CheckCircle, XCircle, Trash2, Plus, AlertCircle, Play, Printer, Download } from 'lucide-react';
import './OfDetails.css';

const OfDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { tenantId } = useTenant();
    const { user } = useAuth();

    const [ofData, setOfData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal state for Add Item
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [editItemId, setEditItemId] = useState(null);
    const [newItemObj, setNewItemObj] = useState({
        contract_item_id: '',
        item_number: '',
        description: '',
        unit: 'UN',
        quantity: 1,
        unit_price: 0
    });

    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [eligibleCommitments, setEligibleCommitments] = useState([]);
    const [isLoadingCommitments, setIsLoadingCommitments] = useState(false);
    const [contractItems, setContractItems] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [otherOfs, setOtherOfs] = useState([]);
    const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);
    const [selectedSignatory, setSelectedSignatory] = useState(null);
    const [signatoryContext, setSignatoryContext] = useState('emission'); // 'emission' or 'preview'

    const loadData = async () => {
        if (!tenantId || !id) return;
        try {
            setIsLoading(true);
            const data = await ofsService.getById(id);
            // Sort items by creation
            if (data.items) {
                data.items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }
            setOfData(data);
            
            if (data.contract_id) {
                const { data: cItems } = await supabase.from('contract_items').select('*').eq('contract_id', data.contract_id).eq('tenant_id', tenantId);
                setContractItems(cItems || []);

                const itemIds = (cItems || []).map(i => i.id);

                // Fetch allocations for this secretariat using item IDs (contract_id column doesn't exist in this table)
                if (itemIds.length > 0) {
                    const { data: allocs } = await supabase
                        .from('contract_item_allocations')
                        .select('*')
                        .in('contract_item_id', itemIds)
                        .eq('secretariat_id', data.secretariat_id)
                        .eq('tenant_id', tenantId);
                    setAllocations(allocs || []);
                } else {
                    setAllocations([]);
                }

                // Fetch other OFs (ISSUED and DRAFT) to calculate balanced consumed for THIS secretariat
                const { data: oOfs } = await supabase
                    .from('ofs')
                    .select('id, status, items:of_items(contract_item_id, quantity)')
                    .eq('contract_id', data.contract_id)
                    .eq('secretariat_id', data.secretariat_id)
                    .eq('tenant_id', tenantId)
                    .neq('status', 'CANCELED')
                    .neq('status', 'CANCELLED');
                setOtherOfs(oOfs || []);
            }
        } catch (error) {
            console.error("Erro ao carregar OF:", error);
            setFeedback({ type: 'error', message: 'Erro ao carregar dados da OF.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, tenantId]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
    };

    const getStatusLabel = (status) => {
        if (!status) return '-';
        switch(status.toUpperCase()) {
            case 'DRAFT': return 'Rascunho';
            case 'ISSUED': return 'Emitida';
            case 'CANCELLED':
            case 'CANCELED': return 'Cancelada';
            default: return status;
        }
    };

    const handleIssueOf = async () => {
        if (!selectedSignatory) {
            setSignatoryContext('emission');
            setIsSignatoryModalOpen(true);
            return;
        }

        try {
            setIsSubmitting(true);
            await ofsService.issueOf(id, tenantId, selectedSignatory);
            setFeedback({ type: 'success', message: 'Reserva emitida com sucesso!' });
            setIsSignatoryModalOpen(false);
            setSelectedSignatory(null);
            await loadData();
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: error.message || 'Erro ao emitir a OF.' });
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleCancelOf = async () => {
        if (!tenantId || !user?.id) {
            setFeedback({ type: 'error', message: 'Erro de sessão: IDs necessários não encontrados.' });
            return;
        }

        try {
            setIsSubmitting(true);
            await ofsService.cancelOf(id, tenantId, user.id);
            setFeedback({ type: 'success', message: 'OF cancelada com sucesso!' });
            await loadData();
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: error.message || 'Erro ao cancelar a OF.' });
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            
            // Validation: Quantity vs Balance
            const selectedContractItemId = newItemObj.contract_item_id;
            const requestedQty = Math.floor(Number(newItemObj.quantity));
            if (requestedQty <= 0) {
                throw new Error("A quantidade deve ser um número inteiro maior que zero.");
            }
            
            const allocation = allocations.find(a => a.contract_item_id === selectedContractItemId);
            if (!allocation) {
                throw new Error("Não há rateio cadastrado para esta secretaria neste item.");
            }

            const allocatedQty = Number(allocation.quantity_allocated || 0);
            
            // Calculate consumed from other OFs
            let consumedQty = 0;
            otherOfs.forEach(of => {
                if (of.id === id) return; // Skip current OF
                const item = of.items?.find(i => i.contract_item_id === selectedContractItemId);
                if (item) {
                    consumedQty += Number(item.quantity || 0);
                }
            });

            if (editItemId) {
                const currentItem = ofData.items.find(i => i.id === editItemId);
                // If quantity hasn't increased, no need for intensive balance check
                if (requestedQty > (currentItem?.quantity || 0)) {
                    if (allocatedQty - consumedQty < requestedQty) {
                        throw new Error(`Quantidade informada excede o saldo disponível deste item no contrato (Disponível: ${allocatedQty - consumedQty}).`);
                    }
                }

                await ofsService.updateOfItem(editItemId, tenantId, {
                    ...newItemObj,
                    description_snapshot: newItemObj.description,
                    unit_snapshot: newItemObj.unit,
                    unit_price_snapshot: Number(newItemObj.unit_price)
                });
                await ofsService.recalculateOfTotal(id, tenantId);
                setFeedback({ type: 'success', message: 'Item atualizado.' });
            } else {
                let nextItemNumber = "1";
                if (ofData && ofData.items && ofData.items.length > 0) {
                    const maxNumber = Math.max(...ofData.items.map(item => Number(item.item_number) || 0));
                    nextItemNumber = String(maxNumber + 1);
                }

                await ofsService.addOfItem({
                    tenant_id: tenantId,
                    of_id: id,
                    contract_item_id: newItemObj.contract_item_id,
                    item_number: nextItemNumber,
                    description: newItemObj.description,
                    unit: newItemObj.unit || 'UN',
                    quantity: requestedQty,
                    unit_price: Number(newItemObj.unit_price),
                    description_snapshot: newItemObj.description,
                    unit_snapshot: newItemObj.unit,
                    unit_price_snapshot: Number(newItemObj.unit_price)
                });
                await ofsService.recalculateOfTotal(id, tenantId);
                setFeedback({ type: 'success', message: 'Item adicionado.' });
            }
            
            setIsAddItemModalOpen(false);
            setEditItemId(null);
            setNewItemObj({ contract_item_id: '', item_number: '', description: '', unit: 'UN', quantity: 1, unit_price: 0 });
            await loadData();
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: error.message || 'Erro ao processar item.' });
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Tem certeza que deseja remover este item?')) return;
        try {
            setIsLoading(true);
            await ofsService.deleteOfItem(itemId, tenantId);
            await ofsService.recalculateOfTotal(id, tenantId);
            setFeedback({ type: 'success', message: 'Item removido.' });
            await loadData();
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: error.message || 'Erro ao remover item.' });
        } finally {
            setIsLoading(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleEditItemClick = (item) => {
        if (!isDraft) return;
        setEditItemId(item.id);
        setNewItemObj({
            contract_item_id: item.contract_item_id || '',
            item_number: item.item_number || '',
            description: item.description || '',
            unit: item.unit || 'UN',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0
        });
        setIsAddItemModalOpen(true);
    };

    const handleOpenLinkModal = async () => {
        setIsLinkModalOpen(true);
        setIsLoadingCommitments(true);
        try {
            const allCommitments = await commitmentsService.list(tenantId);
            const filtered = allCommitments.filter(c => 
                c.status === 'EMPENHADO' && 
                c.contract_id === ofData?.contract_id &&
                c.secretariat_id === ofData?.secretariat_id
            );
            setEligibleCommitments(filtered);
        } catch (error) {
            console.error('Erro ao buscar empenhos:', error);
            setFeedback({ type: 'error', message: 'Erro ao carregar empenhos.' });
        } finally {
            setIsLoadingCommitments(false);
        }
    };

    const handleLinkCommitment = async (commitmentId) => {
        try {
            setIsSubmitting(true);
            await ofsService.updateOf(id, tenantId, { commitment_id: commitmentId });
            setFeedback({ type: 'success', message: 'Empenho vinculado com sucesso.' });
            setIsLinkModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: error.message || 'Erro ao vincular empenho.' });
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleRemoveLink = async () => {
        if (!window.confirm('Tem certeza que deseja remover o vínculo deste empenho?')) return;
        try {
            setIsLoading(true);
            await ofsService.updateOf(id, tenantId, { commitment_id: null });
            setFeedback({ type: 'success', message: 'Vínculo do empenho removido.' });
            await loadData();
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: error.message || 'Erro ao remover vínculo de empenho.' });
        } finally {
            setIsLoading(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handlePrintPdf = () => {
        if (!selectedSignatory) {
            setSignatoryContext('preview');
            setIsSignatoryModalOpen(true);
            return;
        }

        let url = `/compras/of-preview/${id}`;
        if (selectedSignatory) {
            const params = new URLSearchParams();
            params.set('sigName', selectedSignatory.name || '');
            params.set('sigRole', selectedSignatory.role || '');
            params.set('sigReg', selectedSignatory.reg || '');
            url += `?${params.toString()}`;
        }
        
        setIsSignatoryModalOpen(false);
        window.open(url, '_blank');
    };

    if (isLoading && !ofData) {
        return <div className="p-8 text-center text-slate-500">Carregando detalhes...</div>;
    }

    if (!ofData) {
        return (
            <div className="p-8 text-center text-slate-500">
                <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                <h2>Ordem de Fornecimento não encontrada</h2>
                <p style={{ marginTop: '0.5rem' }}>O registro que você tenta acessar não existe ou foi removido.</p>
                <button 
                    className="btn-secondary" 
                    onClick={() => navigate('/compras/ordens-fornecimento')}
                    style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                    <ArrowLeft size={16} /> Voltar para a lista
                </button>
            </div>
        );
    }

    const { items = [], commitment } = ofData;
    const currentStatus = (ofData.status || 'DRAFT').toUpperCase();
    const isDraft = currentStatus === 'DRAFT';
    const isIssued = currentStatus === 'ISSUED';
    const isCanceled = currentStatus === 'CANCELED' || currentStatus === 'CANCELLED';

    const renderFeedback = () => {
        if (!feedback) return null;
        return (
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                padding: '1.5rem 2rem',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                backgroundColor: 'white',
                color: feedback.type === 'success' ? '#16a34a' : '#dc2626',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: `2px solid ${feedback.type === 'success' ? '#dcfce7' : '#fee2e2'}`,
                minWidth: '300px',
                textAlign: 'center'
            }}>
                {feedback.type === 'success' ? 
                    <CheckCircle size={48} strokeWidth={2.5} /> : 
                    <AlertCircle size={48} strokeWidth={2.5} />
                }
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{feedback.message}</span>
            </div>
        );
    };

    return (
        <div className="ct-container empenho-details-container" style={{ overflowY: 'auto', paddingRight: '0.5rem', paddingBottom: '2rem' }}>
            {renderFeedback()}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <button className="back-link" onClick={() => navigate('/compras/ordens-fornecimento')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
                    <ArrowLeft size={16} /> Voltar para Ordens de Fornecimento
                </button>
                
                <div>
                    {(isDraft || isCanceled) && (
                        <button 
                            className="btn-secondary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={handlePrintPdf}
                        >
                            <Printer size={16} /> Visualizar PDF
                        </button>
                    )}
                    {isIssued && (
                        <button 
                            className="btn-primary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={handlePrintPdf}
                        >
                            <Download size={16} /> Baixar PDF Oficial
                        </button>
                    )}
                </div>
            </div>

            {/* Cabeçalho */}
            <div className="ed-header-card">
                <div className="ed-header-info">
                    <h1 className="ed-title">
                        <FileText size={24} style={{ color: '#3b82f6' }} />
                        Reserva de Saldo (OF nº {ofData.number})
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span className={`status-badge ${(ofData.status || 'draft').toLowerCase()}`}>
                            {getStatusLabel(ofData.status)}
                        </span>
                        <span className="ed-subtitle" style={{ fontSize: '0.85rem' }}>
                            Data de Emissão: <span style={{ color: '#0f172a', fontWeight: 500 }}>{formatDate(ofData.issue_date)}</span>
                        </span>
                    </div>
                </div>

                <div className="ed-header-balance">
                    <div className="ed-balance-label">Valor Total da Reserva</div>
                    <div className="ed-balance-value">
                        {formatCurrency(ofData.total_amount)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Base Legal */}
                <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} style={{ color: '#64748b' }} /> Base Legal
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Contrato</span>
                            <span style={{ color: '#0f172a', fontWeight: 500, fontSize: '0.95rem' }}>{ofData.contract?.number} - {ofData.contract?.title}</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Secretaria</span>
                            <span style={{ color: '#0f172a', fontWeight: 500, fontSize: '0.95rem' }}>
                                {ofData.secretariat?.name || ofData.contract?.secretariat?.name || 'Não informada'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Empenhos Vinculados (Lista de Empenhos preparados para N:M) */}
                <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={18} style={{ color: '#16a34a' }} /> Empenhos Vinculados
                        </h2>
                        {isDraft && (
                            <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={handleOpenLinkModal} disabled={isSubmitting}>
                                <Plus size={14} /> Vincular Empenho
                            </button>
                        )}
                    </div>

                    {commitment ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Simulando o array com o único empenho atual */}
                            {[commitment].map(emp => (
                                <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>Empenho {emp.number}</span>
                                            <span className={`status-badge ${emp.status.toLowerCase()}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                                {emp.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Saldo Disponível Global</span>
                                        <span style={{ fontWeight: 600, color: '#16a34a', fontSize: '1rem', display: 'block', marginBottom: '8px' }}>{formatCurrency(emp.current_balance)}</span>
                                        {isDraft && (
                                            <button 
                                                onClick={handleRemoveLink} 
                                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                                                disabled={isSubmitting}
                                            >
                                                Remover Vínculo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                            <AlertCircle size={32} style={{ margin: '0 auto 0.5rem', color: '#cbd5e1' }} />
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhum empenho vinculado a esta OF.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabela de Itens */}
            <div className="main-content-card" style={{ padding: '2rem', height: 'auto', overflow: 'visible', flex: 'none' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Itens da OF</h2>
                
                {items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <FileText size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                        <p style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 500, color: '#0f172a' }}>Esta OF ainda não possui itens cadastrados.</p>
                        {isDraft && (
                            <button 
                                className="btn-primary" 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }}
                                onClick={() => {
                                    setEditItemId(null);
                                    setNewItemObj({ item_number: '', description: '', unit: 'UN', quantity: 1, unit_price: 0 });
                                    setIsAddItemModalOpen(true);
                                }}
                            >
                                <Plus size={16} /> Adicionar Item
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ width: '60px', textAlign: 'center' }}>Item</th>
                                    <th>Descrição do Produto/Serviço</th>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Und</th>
                                    <th style={{ width: '80px', textAlign: 'right' }}>Qtd</th>
                                    <th style={{ width: '130px', textAlign: 'right' }}>Valor Unit.</th>
                                    <th style={{ width: '130px', textAlign: 'right' }}>Valor Total</th>
                                    <th style={{ width: '150px' }}>Empenho Vinculado</th>
                                    {isDraft && <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td style={{ textAlign: 'center' }}>{item.item_number}</td>
                                        <td>{item.description}</td>
                                        <td style={{ textAlign: 'center' }}>{item.unit}</td>
                                        <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 500, color: '#0f172a' }}>{formatCurrency(item.total_price)}</td>
                                        <td>
                                            <span style={{ fontSize: '0.85rem', color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                                                {commitment ? commitment.number : '-'}
                                            </span>
                                        </td>
                                        {isDraft && (
                                            <td>
                                                <div className="items-table-actions" style={{ justifyContent: 'center' }}>
                                                    <button 
                                                        onClick={() => handleEditItemClick(item)}
                                                        className="action-button icon-only" 
                                                        title="Editar Item"
                                                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="action-button danger" 
                                                        title="Remover Item"
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {isDraft && items.length > 0 && (
                    <div className="add-item-bar" onClick={() => {
                        setEditItemId(null);
                        setNewItemObj({ contract_item_id: '', item_number: '', description: '', unit: 'UN', quantity: 1, unit_price: 0 });
                        setIsAddItemModalOpen(true);
                    }}>
                        <Plus size={18} style={{ marginRight: '8px' }} /> Adicionar Item
                    </div>
                )}

                <div className="of-action-buttons">
                    {isDraft && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            {(!commitment) && (
                                <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500 }}>Vincule um empenho antes de emitir a OF.</span>
                            )}
                            {(items.length === 0) && (
                                <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500 }}>Adicione ao menos um item para emitir a OF.</span>
                            )}
                            <button 
                                className="btn-primary" 
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={handleIssueOf}
                                disabled={isSubmitting || items.length === 0 || !commitment}
                                title={!commitment ? "Vincule um empenho antes de emitir" : (items.length === 0 ? "Adicione ao menos um item antes de emitir" : "")}
                            >
                                <Play size={16} fill="currentColor" /> {isSubmitting ? 'Emitindo...' : 'Emitir Reserva (OF)'}
                            </button>
                        </div>
                    )}
                    
                    {isIssued && (
                        <button 
                            className="btn-secondary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}
                            onClick={handleCancelOf}
                            disabled={isSubmitting}
                        >
                            <XCircle size={16} /> {isSubmitting ? 'Cancelando...' : 'Cancelar OF'}
                        </button>
                    )}
                </div>
            </div>

            {/* Modal Add Item */}
            {isAddItemModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{editItemId ? 'Editar Item da OF' : 'Adicionar Item à OF'}</h2>
                            <button onClick={() => { setIsAddItemModalOpen(false); setEditItemId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={24} /></button>
                        </div>
                        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Item do Contrato</label>
                                <select 
                                    required 
                                    value={newItemObj.contract_item_id || ''} 
                                    onChange={(e) => {
                                        const selectedId = e.target.value;
                                        const selectedItem = contractItems.find(i => i.id === selectedId);
                                        if (selectedItem) {
                                            setNewItemObj({
                                                ...newItemObj,
                                                contract_item_id: selectedId,
                                                item_number: selectedItem.item_number || '',
                                                description: selectedItem.description,
                                                unit: selectedItem.unit,
                                                unit_price: selectedItem.unit_price
                                            });
                                        } else {
                                            setNewItemObj({...newItemObj, contract_item_id: ''});
                                        }
                                    }}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff' }}
                                >
                                    <option value="">Selecione um item do contrato</option>
                                    {contractItems.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.item_number ? `${item.item_number} - ` : ''}{item.description}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Descrição / Discriminação</label>
                                <input readOnly required type="text" value={newItemObj.description} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Acondicionamento</label>
                                    <input readOnly required type="text" value={newItemObj.unit} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Qtd</label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            required 
                                            type="number" 
                                            min="1" 
                                            step="1" 
                                            value={newItemObj.quantity} 
                                            onChange={e => {
                                                const val = e.target.value === '' ? '' : Math.floor(Number(e.target.value)) || 0;
                                                setNewItemObj({...newItemObj, quantity: val});
                                            }} 
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                                        />
                                        {newItemObj.contract_item_id && (
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                                                Saldo Disponível: <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                                    {(() => {
                                                        const alloc = allocations.find(a => a.contract_item_id === newItemObj.contract_item_id);
                                                        if (!alloc) return '0';
                                                        let consumed = 0;
                                                        otherOfs.forEach(of => {
                                                            if (of.id === id) return;
                                                            const it = of.items?.find(i => i.contract_item_id === newItemObj.contract_item_id);
                                                            if (it) consumed += Number(it.quantity || 0);
                                                        });
                                                        return Math.floor(Number(alloc.quantity_allocated || 0) - consumed);
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Val. Unit</label>
                                    <input readOnly required type="number" min="0.01" step="0.01" value={newItemObj.unit_price} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Empenho vinculado</label>
                                    <input type="text" value={commitment ? commitment.number : 'Nenhum empenho vinculado'} readOnly style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9', color: '#64748b' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>Valor Total do Item</label>
                                    <div style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', fontWeight: 600, color: '#0f172a' }}>
                                        {formatCurrency((Number(newItemObj.quantity) || 0) * (Number(newItemObj.unit_price) || 0))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsAddItemModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Adicionar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal Vincular Empenho */}
            {isLinkModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Vincular Empenho à OF</h2>
                            <button onClick={() => setIsLinkModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={24} /></button>
                        </div>
                        
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>Selecione um empenho válido associado ao contrato <strong>{ofData.contract?.number}</strong> e secretaria <strong>{ofData.secretariat?.name}</strong>.</p>
                        </div>

                        {isLoadingCommitments ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Buscando empenhos elegíveis...</div>
                        ) : eligibleCommitments.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', background: '#f1f5f9', borderRadius: '8px' }}>
                                Não há empenhos elegíveis para este contrato/secretaria.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {eligibleCommitments.map(emp => (
                                    <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', transition: 'border-color 0.2s' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem', marginBottom: '4px' }}>Empenho Nº {emp.number}</div>
                                            <span className={`status-badge ${emp.status.toLowerCase()}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                                {emp.status}
                                            </span>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Saldo Disponível Global</span>
                                                <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '1.1rem' }}>{formatCurrency(emp.current_balance)}</span>
                                            </div>
                                            <button 
                                                className="btn-primary" 
                                                style={{ padding: '0.35rem 1rem', fontSize: '0.85rem' }}
                                                onClick={() => handleLinkCommitment(emp.id)}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? '...' : 'Selecionar'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                            <button type="button" className="btn-secondary" onClick={() => setIsLinkModalOpen(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Seleção de Assinante */}
            {isSignatoryModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Selecione o Assinante Responsável</h2>
                            <button onClick={() => setIsSignatoryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={24} /></button>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Escolha quem assinará a Ordem de Fornecimento. Esta informação constará no documento final.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                { role: 'Gestor do Contrato', name: ofData?.contract?.manager_name, reg: ofData?.contract?.manager_registration },
                                { role: 'Fiscal Técnico', name: ofData?.contract?.technical_fiscal_name, reg: ofData?.contract?.technical_fiscal_registration },
                                { role: 'Fiscal Administrativo', name: ofData?.contract?.administrative_fiscal_name, reg: ofData?.contract?.administrative_fiscal_registration }
                            ].map((opt, idx) => (
                                <button
                                    key={idx}
                                    className="signatory-option"
                                    onClick={() => setSelectedSignatory(opt)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        padding: '1rem',
                                        border: selectedSignatory?.role === opt.role ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        background: selectedSignatory?.role === opt.role ? '#eff6ff' : 'white',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                >
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{opt.role}</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{opt.name || 'Não cadastrado'}</span>
                                    {opt.reg && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Matrícula: {opt.reg}</span>}
                                </button>
                            ))}
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button type="button" className="btn-secondary" onClick={() => setIsSignatoryModalOpen(false)}>Cancelar</button>
                            <button 
                                type="button" 
                                className="btn-primary" 
                                onClick={signatoryContext === 'preview' ? handlePrintPdf : handleIssueOf}
                                disabled={isSubmitting || !selectedSignatory || !selectedSignatory.name}
                            >
                                {signatoryContext === 'preview' 
                                    ? 'Visualizar PDF' 
                                    : (isSubmitting ? 'Emitindo...' : 'Confirmar e Emitir OF')
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfDetails;
