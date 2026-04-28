import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, FileText, FileCheck, AlertCircle, TrendingUp, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { invoicesService } from '../../services/api/invoices.service';
import { ofsService } from '../../services/api/ofs.service';
import { contractsService } from '../../services/api/contracts.service';
import { useTenant } from '../../context/TenantContext';

const NovaNfModal = ({ isOpen, onClose, onSuccess }) => {
    const { tenantId } = useTenant();

    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Context Data
    const [contracts, setContracts] = useState([]);
    const [ofs, setOfs] = useState([]);
    const [ofItems, setOfItems] = useState([]);

    // Form State
    const [nfData, setNfData] = useState({
        number: '',
        issue_date: new Date().toISOString().split('T')[0],
        contract_id: '',
        of_id: '',
    });

    const [selectedOf, setSelectedOf] = useState(null);
    const [selectedContract, setSelectedContract] = useState(null);

    // Items Faturamento
    // key: of_item_id, value: quantity_to_invoice
    const [faturamento, setFaturamento] = useState({});

    useEffect(() => {
        if (isOpen && tenantId) {
            loadInitialData();
            resetState();
        }
    }, [isOpen, tenantId]);

    const resetState = () => {
        setCurrentStep(1);
        setNfData({
            number: '',
            issue_date: new Date().toISOString().split('T')[0],
            contract_id: '',
            of_id: '',
        });
        setSelectedOf(null);
        setSelectedContract(null);
        setOfItems([]);
        setFaturamento({});
        setErrorMsg(null);
    };

    const loadInitialData = async () => {
        try {
            const contData = await contractsService.list(tenantId);
            setContracts(contData || []);
        } catch (error) {
            setErrorMsg('Erro ao carregar contratos válidos.');
        }
    };

    const loadOfsForContract = async (contractId) => {
        try {
            setIsLoading(true);
            const { data } = await ofsService.listByContract ? await ofsService.listByContract(contractId) : []; // fallback if method isn't robust
            // We just fetch from general or filtered
            // Actually, listByContract doesn't take tenantId usually, but we can filter from general list.
            const allOfs = await ofsService.list(tenantId);
            const contractOfs = allOfs.filter(o => o.contract_id === contractId && o.status === 'ISSUED' && o.is_active === true);
            setOfs(contractOfs);
        } catch (error) {
            setErrorMsg('Erro ao carregar OFs deste contrato.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadOfDetails = async (ofId) => {
        try {
            setIsLoading(true);
            const ofFull = await ofsService.getById(ofId);
            setSelectedOf(ofFull);

            // Buscar itens consolidados
            const items = await invoicesService.getOfItemsWithInvoicedBalances(ofId, tenantId);
            setOfItems(items);

            // Inicializar faturamento com zero
            const initialFat = {};
            items.forEach(i => {
                initialFat[i.id] = 0;
            });
            setFaturamento(initialFat);

        } catch (error) {
            setErrorMsg('Erro ao carregar detalhes da OF.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleContractChange = (e) => {
        const cid = e.target.value;
        setNfData(prev => ({ ...prev, contract_id: cid, of_id: '' }));
        setSelectedOf(null);
        setOfItems([]);
        const contract = contracts.find(c => c.id === cid);
        setSelectedContract(contract);

        if (cid) {
            loadOfsForContract(cid);
        } else {
            setOfs([]);
        }
    };

    const handleOfChange = (e) => {
        const ofid = e.target.value;
        setNfData(prev => ({ ...prev, of_id: ofid }));
        if (ofid) {
            loadOfDetails(ofid);
        } else {
            setSelectedOf(null);
            setOfItems([]);
        }
    };

    const handleNextStep = () => {
        setErrorMsg(null);
        if (currentStep === 1) {
            if (!nfData.number || !nfData.issue_date || !nfData.contract_id || !nfData.of_id) {
                setErrorMsg('Preencha os dados de identificação obrigatórios.');
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            const hasValue = Object.values(faturamento).some(qtd => qtd > 0);
            if (!hasValue) {
                setErrorMsg('Fature pelo menos 1 item para continuar com a emissão da NF.');
                return;
            }

            const isInvalid = ofItems.some(item => {
                const f = faturamento[item.id] || 0;
                return f > item.quantity_balance;
            });

            if (isInvalid) {
                setErrorMsg('Há itens faturados acima do saldo faturável da OF.');
                return;
            }

            setCurrentStep(3);
        }
    };

    const nfTotalAmount = ofItems.reduce((acc, item) => {
        const qtd = faturamento[item.id] || 0;
        return acc + (qtd * Number(item.unit_price || 0));
    }, 0);

    const handleSave = async () => {
        if (nfTotalAmount <= 0) {
            setErrorMsg('O valor total da Nota Fiscal deve ser maior que zero.');
            return;
        }

        try {
            setSubmitting(true);
            setErrorMsg(null);

            const itemsPayload = ofItems
                .filter(item => faturamento[item.id] > 0)
                .map(item => ({
                    of_item_id: item.id,
                    contract_item_id: item.contract_item_id || null,
                    item_number: item.item_number || null,
                    description_snapshot: item.description || null,
                    unit_snapshot: item.unit || null,
                    quantity: faturamento[item.id],
                    unit_price: item.unit_price,
                    total_price: faturamento[item.id] * item.unit_price
                }));

            const headerPayload = {
                ...nfData,
                commitment_id: selectedOf?.commitment_id || null,
                secretariat_id: selectedOf?.secretariat_id || null,
                total_amount: nfTotalAmount,
                contract_number_snapshot: selectedContract?.number || null,
                of_number_snapshot: selectedOf?.number || null,
                supplier_name_snapshot: selectedOf?.contract?.supplier_name || selectedContract?.supplier_name || null,
                supplier_document_snapshot: selectedOf?.contract?.cnpj || selectedContract?.cnpj || null,
                commitment_number_snapshot: selectedOf?.commitment?.number || null,
                secretariat_name_snapshot: selectedOf?.secretariat?.name || null
            };

            await invoicesService.createInvoice(tenantId, headerPayload, itemsPayload);
            onSuccess();
        } catch (error) {
            setErrorMsg(error.message || 'Erro inesperado ao salvar.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="nf-modal-overlay">
            <div className="nf-modal-content">
                <div className="nf-modal-header">
                    <h2><FilePlus size={24} color="#00967d" /> Registrar Nota Fiscal</h2>
                    <button onClick={onClose} className="close-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color="#64748b" />
                    </button>
                </div>

                <div className="nf-modal-body">
                    {/* Stepper */}
                    <div className="wizard-steps">
                        <div className={`wizard-step ${currentStep >= 1 ? (currentStep > 1 ? 'completed' : 'active') : ''}`}>
                            <div className="step-indicator">1</div>
                            <div className="step-label">Identificação</div>
                        </div>
                        <div className={`wizard-step ${currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'active') : ''}`}>
                            <div className="step-indicator">2</div>
                            <div className="step-label">Itens (OF)</div>
                        </div>
                        <div className={`wizard-step ${currentStep >= 3 ? 'active' : ''}`}>
                            <div className="step-indicator">3</div>
                            <div className="step-label">Resumo e Salvar</div>
                        </div>
                    </div>

                    {errorMsg && (
                        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={20} />
                            {errorMsg}
                        </div>
                    )}

                    {currentStep === 1 && (
                        <div className="step-content form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group highlighted" style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label" style={{ fontWeight: 600 }}>Número da Nota Fiscal *</label>
                                    <input 
                                        type="text" 
                                        className="form-input form-control" 
                                        value={nfData.number} 
                                        onChange={e => setNfData({...nfData, number: e.target.value})} 
                                        placeholder="Ex: 123456" 
                                        style={{ width: '100%', padding: '10px' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label" style={{ fontWeight: 600 }}>Data da Emissão (NF) *</label>
                                    <input 
                                        type="date" 
                                        className="form-input form-control" 
                                        value={nfData.issue_date} 
                                        onChange={e => setNfData({...nfData, issue_date: e.target.value})} 
                                        style={{ width: '100%', padding: '10px' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Contrato *</label>
                                <select className="form-select form-control" value={nfData.contract_id} onChange={handleContractChange} style={{ width: '100%', padding: '10px' }}>
                                    <option value="">Selecione o Contrato</option>
                                    {contracts.map(c => (
                                        <option key={c.id} value={c.id}>{c.number} - {c.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ordem de Fornecimento *</label>
                                <select className="form-select form-control" value={nfData.of_id} onChange={handleOfChange} disabled={!nfData.contract_id || isLoading} style={{ width: '100%', padding: '10px' }}>
                                    <option value="">{isLoading ? 'Carregando...' : 'Selecione a OF'}</option>
                                    {ofs.map(o => (
                                        <option key={o.id} value={o.id}>OF Nº {o.number}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && selectedOf && (
                        <div className="step-content">
                            <div className="conferencia-box">
                                <div className="conferencia-header">
                                    <div className="conferencia-item">
                                        <span className="conferencia-label">Contrato</span>
                                        <span className="conferencia-value">{selectedContract?.number}</span>
                                    </div>
                                    <div className="conferencia-item">
                                        <span className="conferencia-label">Fornecedor</span>
                                        <span className="conferencia-value">{selectedOf?.contract?.supplier_name || selectedContract?.supplier_name || 'N/A'}</span>
                                    </div>
                                    <div className="conferencia-item">
                                        <span className="conferencia-label">OF & Empenho</span>
                                        <span className="conferencia-value">OF {selectedOf.number} / Emp {selectedOf.commitment?.number || 'S/N'}</span>
                                    </div>
                                    <div className="conferencia-item">
                                        <span className="conferencia-label">Total da OF</span>
                                        <span className="conferencia-value">{formatCurrency(selectedOf.total_amount)}</span>
                                    </div>
                                </div>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#1e293b' }}>Definir Quantidades a Faturar</h4>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="nf-items-table">
                                        <thead>
                                            <tr>
                                                <th>Descrição do Item</th>
                                                <th style={{ textAlign: 'right' }}>Qtd. Total (OF)</th>
                                                <th style={{ textAlign: 'right' }}>Já Faturado</th>
                                                <th style={{ textAlign: 'right' }}>Saldo Restante</th>
                                                <th style={{ textAlign: 'right', width: '120px' }}>A Faturar (NF)</th>
                                                <th style={{ textAlign: 'right' }}>Total Faturado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ofItems.map(item => {
                                                const fatNow = faturamento[item.id] || 0;
                                                const maxRestante = item.quantity_balance;
                                                const isUnid = item.unit?.toUpperCase() === 'UNID';
                                                return (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <div style={{ fontWeight: 500 }}>{item.description}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>V. Unit: {formatCurrency(item.unit_price)}</div>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                                                        <td style={{ textAlign: 'right', color: item.quantity_invoiced > 0 ? '#00967d' : 'inherit' }}>{item.quantity_invoiced}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{maxRestante}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max={maxRestante} 
                                                                step={isUnid ? "1" : "0.01"}
                                                                className="qtd-input" 
                                                                value={faturamento[item.id] === 0 ? '' : faturamento[item.id]}
                                                                onChange={(e) => {
                                                                    let val = Number(e.target.value);
                                                                    if (isUnid) {
                                                                        val = Math.floor(val);
                                                                    }
                                                                    if (val < 0) val = 0;
                                                                    if (val > maxRestante) val = maxRestante;
                                                                    setFaturamento(prev => ({...prev, [item.id]: val}));
                                                                }}
                                                                placeholder="0"
                                                                disabled={maxRestante === 0}
                                                            />
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: fatNow > 0 ? '#00967d' : '#94a3b8' }}>
                                                            {formatCurrency(fatNow * item.unit_price)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 600, padding: '16px' }}>Total Calculado da NF:</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.25rem', color: '#0f172a', padding: '16px' }}>{formatCurrency(nfTotalAmount)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="step-content">
                            <div className="conferencia-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                <h3 style={{ marginTop: 0, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={20} /> Resumo da Nota Fiscal Pronta para Registrar
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
                                    <div><strong>Nº da NF:</strong> {nfData.number}</div>
                                    <div><strong>Data:</strong> {nfData.issue_date}</div>
                                    <div><strong>Contrato:</strong> {selectedContract?.number}</div>
                                    <div><strong>Fornecedor:</strong> {selectedOf?.contract?.supplier_name || selectedContract?.supplier_name || 'N/A'}</div>
                                    <div><strong>Nº OF Associada:</strong> {selectedOf?.number}</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}><strong>Total da NF:</strong> {formatCurrency(nfTotalAmount)}</div>
                                </div>
                            </div>

                            <div style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', display: 'flex', gap: '12px' }}>
                                <AlertCircle size={24} color="#d97706" style={{ flexShrink: 0 }} />
                                <div>
                                    <strong style={{ color: '#92400e', display: 'block', marginBottom: '4px' }}>Pendência Financeira</strong>
                                    <p style={{ margin: 0, color: '#b45309', fontSize: '0.875rem' }}>
                                        Você poderá registrar os dados de <strong>Liquidação</strong> e <strong>Pagamento</strong> após criar a NF no menu <strong>Edição Complementar</strong>. O registro ficará com um alerta de pendência até lá.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                <div className="nf-modal-footer">
                    {currentStep > 1 && (
                        <button className="btn-secondary" onClick={() => setCurrentStep(currentStep - 1)} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                            <ChevronLeft size={18} /> Voltar
                        </button>
                    )}
                    <button className="btn-secondary" onClick={onClose} disabled={submitting} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                        Cancelar
                    </button>
                    {currentStep < 3 ? (
                        <button className="btn-primary" onClick={handleNextStep} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#00967d', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                            Avançar <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button className="btn-primary" onClick={handleSave} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#00967d', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                            {submitting ? 'Salvando...' : 'Confirmar e Salvar NF'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// Add lucide-react manual import to avoid broken icon import
import { FilePlus } from 'lucide-react';

export default NovaNfModal;
