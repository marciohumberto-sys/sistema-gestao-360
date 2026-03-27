import React, { useState, useEffect, useMemo } from 'react';
import { Landmark, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { contractsService } from '../../services/api/contracts.service';
import { secretariatsService } from '../../services/api/secretariats.service';
import { empenhosService } from '../../services/api/empenhos.service';
import { ofsService } from '../../services/api/ofs.service';
import { contractItemsService } from '../../services/api/contractItems.service';
import { allocationsService } from '../../services/api/allocations.service';
import { useTenant } from '../../context/TenantContext';

const NovaOfModal = ({ isOpen, onClose, initialContractId = null }) => {
    const navigate = useNavigate();
    const { tenantId } = useTenant();

    const [contracts, setContracts] = useState([]);
    const [selectedContractId, setSelectedContractId] = useState(initialContractId || '');
    const [secretariats, setSecretariats] = useState([]);
    const [participatingSecretariats, setParticipatingSecretariats] = useState([]);
    const [selectedSecretariatId, setSelectedSecretariatId] = useState('');
    const [empenhos, setEmpenhos] = useState([]);
    const [availableCommitments, setAvailableCommitments] = useState([]);
    const [selectedCommitmentId, setSelectedCommitmentId] = useState('');
    
    const [isLoadingContracts, setIsLoadingContracts] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isCreatingOf, setIsCreatingOf] = useState(false);

    const formatExactCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value || 0);
    };

    // Load initial contracts if none provided
    useEffect(() => {
        const fetchContracts = async () => {
            if (!tenantId || initialContractId) return;
            try {
                setIsLoadingContracts(true);
                const data = await contractsService.list(tenantId);
                setContracts(data.filter(c => c.status !== 'RESCINDIDO'));
            } catch (error) {
                console.error("Erro ao carregar contratos:", error);
            } finally {
                setIsLoadingContracts(false);
            }
        };

        if (isOpen) fetchContracts();
    }, [isOpen, tenantId, initialContractId]);

    // Update selectedContractId if initialContractId changes
    useEffect(() => {
        if (initialContractId) {
            setSelectedContractId(initialContractId);
        }
    }, [initialContractId]);

    // Load secretariats and commitments when contract changes
    useEffect(() => {
        const fetchContractData = async () => {
            if (!selectedContractId || !tenantId) {
                setSecretariats([]);
                setParticipatingSecretariats([]);
                setEmpenhos([]);
                return;
            }

            try {
                setIsLoadingData(true);
                const [secData, empData, itemsData] = await Promise.all([
                    secretariatsService.listSecretariats(tenantId),
                    empenhosService.listByContract(selectedContractId),
                    contractItemsService.listContractItems(selectedContractId, tenantId)
                ]);

                setSecretariats(secData);
                setEmpenhos(empData || []);

                // Filter participating secretariats
                const itemIds = itemsData.map(i => i.id);
                if (itemIds.length > 0) {
                    const allocs = await allocationsService.listAllocationsByItemIds(itemIds, tenantId);
                    const secIdsWithAlloc = new Set(allocs.filter(a => (a.quantity_allocated || 0) > 0).map(a => a.secretariat_id));
                    setParticipatingSecretariats(secData.filter(s => secIdsWithAlloc.has(s.id)));
                } else {
                    setParticipatingSecretariats([]);
                }

                // Reset selections
                setSelectedSecretariatId('');
                setSelectedCommitmentId('');
                setAvailableCommitments([]);

            } catch (error) {
                console.error("Erro ao carregar dados do contrato:", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        if (isOpen && selectedContractId) fetchContractData();
    }, [isOpen, selectedContractId, tenantId]);

    const handleConfirmCreateOf = async () => {
        if (!selectedContractId || !selectedSecretariatId || isCreatingOf) return;

        setIsCreatingOf(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const newOf = await ofsService.createOf(
                tenantId,
                selectedContractId,
                selectedSecretariatId,
                today,
                selectedCommitmentId || null
            );
            
            onClose();
            navigate(`/compras/ordens-fornecimento/${newOf.id}`);
        } catch (error) {
            console.error("Erro ao gerar OF:", error);
            alert("Erro ao gerar OF: " + error.message);
        } finally {
            setIsCreatingOf(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: '480px' }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(15, 74, 68, 0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Landmark size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Gerar OF</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Configure os dados de origem para a nova OF</p>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body" style={{ padding: '1.5rem 2rem' }}>
                    
                    {!initialContractId && (
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Contrato *</label>
                            <select 
                                value={selectedContractId} 
                                onChange={e => setSelectedContractId(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
                                required
                                disabled={isLoadingContracts}
                            >
                                <option value="">Selecione um contrato...</option>
                                {contracts.map(c => (
                                    <option key={c.id} value={c.id}>{c.number} - {c.title}</option>
                                ))}
                            </select>
                            {isLoadingContracts && <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#3b82f6' }}>Carregando contratos...</p>}
                        </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '1.25rem', opacity: !selectedContractId ? 0.6 : 1 }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Secretaria *</label>
                        <select 
                            value={selectedSecretariatId} 
                            disabled={!selectedContractId || isLoadingData}
                            onChange={e => {
                                const secId = e.target.value;
                                setSelectedSecretariatId(secId);
                                const filtered = empenhos.filter(emp => emp.secretariat_id === secId && emp.status !== 'CANCELADO' && (emp.current_balance || 0) > 0);
                                setAvailableCommitments(filtered);
                                if (filtered.length === 1) {
                                    setSelectedCommitmentId(filtered[0].id);
                                } else {
                                    setSelectedCommitmentId('');
                                }
                            }}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: selectedContractId ? '#fff' : '#f8fafc' }}
                            required
                        >
                            <option value="">
                                {isLoadingData ? 'Carregando secretarias...' : !selectedContractId ? 'Selecione um contrato primeiro' : 'Selecione uma secretaria...'}
                            </option>
                            {participatingSecretariats.map(sec => (
                                <option key={sec.id} value={sec.id}>{sec.name}</option>
                            ))}
                        </select>
                        {selectedContractId && !isLoadingData && participatingSecretariats.length === 0 && (
                             <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#ef4444' }}>Este contrato não possui itens com rateio definido.</p>
                        )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, opacity: !selectedSecretariatId ? 0.6 : 1 }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Vincular Empenho</label>
                        <select 
                            value={selectedCommitmentId} 
                            onChange={e => setSelectedCommitmentId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: selectedSecretariatId ? '#fff' : '#f8fafc' }}
                            disabled={!selectedSecretariatId || isLoadingData}
                        >
                            <option value="">Sem vínculo inicial (Rascunho)</option>
                            {availableCommitments.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.number} - Saldo: {formatExactCurrency(emp.current_balance || 0)}
                                </option>
                            ))}
                        </select>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                            {availableCommitments.length === 0 && selectedSecretariatId 
                                ? "Nenhum empenho com saldo disponível para esta secretaria."
                                : "Vincular um empenho agora acelera a emissão da OF."}
                        </p>
                    </div>
                </div>
                <div className="modal-footer" style={{ padding: '1.25rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button className="cd-btn-secondary" onClick={onClose} disabled={isCreatingOf} style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
                    <button 
                        className="btn-primary" 
                        onClick={handleConfirmCreateOf}
                        disabled={!selectedSecretariatId || isCreatingOf}
                        style={{ 
                            padding: '0 1.5rem', 
                            height: '44px',
                            borderRadius: '10px', 
                            border: 'none', 
                            background: 'var(--color-primary)', 
                            color: '#fff', 
                            cursor: 'pointer', 
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                            opacity: (!selectedSecretariatId || isCreatingOf) ? 0.6 : 1,
                            boxShadow: '0 2px 4px rgba(10, 37, 64, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                            if (!selectedSecretariatId || isCreatingOf) return;
                            e.currentTarget.style.background = 'var(--color-secondary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(10, 37, 64, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(10, 37, 64, 0.1)';
                        }}
                    >
                        {isCreatingOf ? 'Gerando...' : 'Confirmar e Gerar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NovaOfModal;
