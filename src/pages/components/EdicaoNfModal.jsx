import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { invoicesService } from '../../services/api/invoices.service';
import { useTenant } from '../../context/TenantContext';
import { formatLocalDate } from '../../utils/dateUtils';

const EdicaoNfModal = ({ isOpen, nfId, onClose, onSuccess }) => {
    const { tenantId } = useTenant();

    const [isLoading, setIsLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [nf, setNf] = useState(null);

    const [formData, setFormData] = useState({
        liquidation_number: '',
        liquidation_date: '',
        payment_date: ''
    });

    useEffect(() => {
        if (isOpen && nfId && tenantId) {
            loadNf();
        }
    }, [isOpen, nfId, tenantId]);

    const loadNf = async () => {
        try {
            setIsLoading(true);
            setErrorMsg(null);
            const data = await invoicesService.getById(nfId);
            setNf(data);
            setFormData({
                liquidation_number: data.liquidation_number || '',
                liquidation_date: data.liquidation_date ? data.liquidation_date.split('T')[0] : '',
                payment_date: data.payment_date ? data.payment_date.split('T')[0] : '',
                notes: data.notes || ''
            });
        } catch (error) {
            setErrorMsg('Erro ao carregar detalhes da NF.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSubmitting(true);
            setErrorMsg(null);

            await invoicesService.updateComplementaryData(nfId, tenantId, formData);
            if (onSuccess) onSuccess();
            else onClose();
        } catch (error) {
            setErrorMsg('Erro ao salvar dados financeiros: ' + error.message);
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
                    <h2><FileText size={24} color="#00967d" /> Detalhes da Nota Fiscal</h2>
                    <button onClick={onClose} className="close-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color="#64748b" />
                    </button>
                </div>

                <div className="nf-modal-body">
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando dados da NF...</div>
                    ) : errorMsg ? (
                        <div style={{ padding: '16px', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px' }}>{errorMsg}</div>
                    ) : nf && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div className="conferencia-box">
                                <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#0f172a' }}>Identificação</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                                    <div>
                                        <div className="conferencia-label">Nº da NF</div>
                                        <div className="conferencia-value">{nf.number}</div>
                                    </div>
                                    <div>
                                        <div className="conferencia-label">Data de Emissão</div>
                                        <div className="conferencia-value">{formatLocalDate(nf.issue_date)}</div>
                                    </div>
                                    <div>
                                        <div className="conferencia-label">Contrato</div>
                                        <div className="conferencia-value">{nf.contract?.number}</div>
                                    </div>
                                    <div>
                                        <div className="conferencia-label">Fornecedor</div>
                                        <div className="conferencia-value">{nf.contract?.supplier_name}</div>
                                    </div>
                                    <div>
                                        <div className="conferencia-label">OF Relacionada</div>
                                        <div className="conferencia-value">{nf.of?.number || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="conferencia-label">Empenho</div>
                                        <div className="conferencia-value">{nf.commitment?.number || '-'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="conferencia-box">
                                <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#0f172a' }}>Itens Faturados</h3>
                                <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                                    <table className="nf-items-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ textAlign: 'left', padding: '8px' }}>Descrição do Item</th>
                                                <th style={{ textAlign: 'right', padding: '8px' }}>Qtd Faturada</th>
                                                <th style={{ textAlign: 'right', padding: '8px' }}>V. Unitário</th>
                                                <th style={{ textAlign: 'right', padding: '8px' }}>V. Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {nf.items?.map(item => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '8px' }}>
                                                        <div style={{ fontWeight: 500 }}>{item.description_snapshot || 'Sem descrição'}</div>
                                                        {item.item_number && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Item N° {item.item_number}</div>}
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: '8px' }}>{item.quantity} {item.unit_snapshot || ''}</td>
                                                    <td style={{ textAlign: 'right', padding: '8px' }}>{formatCurrency(item.unit_price)}</td>
                                                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: 500 }}>{formatCurrency(item.total_price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'right', padding: '24px 8px 16px', fontWeight: 600, fontSize: '1rem', color: '#334155' }}>Total da Nota Fiscal:</td>
                                                <td style={{ textAlign: 'right', padding: '24px 8px 16px', fontWeight: 700, fontSize: '1.25rem', color: '#00967d' }}>{formatCurrency(nf.total_amount)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="conferencia-box" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    {(!nf.liquidation_number || !nf.liquidation_date || !nf.payment_date) ? (
                                        <AlertCircle size={20} color="#d97706" />
                                    ) : (
                                        <CheckCircle size={20} color="#16a34a" />
                                    )}
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Dados Financeiros (Complementares)</h3>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Nº Liquidação</label>
                                        <input 
                                            type="text" 
                                            value={formData.liquidation_number} 
                                            onChange={e => setFormData({...formData, liquidation_number: e.target.value})}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                            placeholder="Ex: L-2023/45"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Data da Liquidação</label>
                                        <input 
                                            type="date" 
                                            value={formData.liquidation_date} 
                                            onChange={e => setFormData({...formData, liquidation_date: e.target.value})}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Data do Pagamento</label>
                                        <input 
                                            type="date" 
                                            value={formData.payment_date} 
                                            onChange={e => setFormData({...formData, payment_date: e.target.value})}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                        />
                                    </div>
                                </div>

                                {(() => {
                                    const isEditMode = !nf.liquidation_number || !nf.liquidation_date || !nf.payment_date;
                                    return (
                                        <>
                                            {isEditMode && (
                                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Observações (Opcional)</label>
                                                    <textarea 
                                                        value={formData.notes} 
                                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                                        style={{ width: '100%', minHeight: '80px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'inherit', resize: 'vertical' }}
                                                        placeholder="Adicione observações adicionais sobre o pagamento ou detalhes financeiro..."
                                                    />
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                            
                            {(() => {
                                const isEditMode = !nf.liquidation_number || !nf.liquidation_date || !nf.payment_date;
                                return !isEditMode && nf.notes && (
                                    <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '32px', paddingTop: '24px' }}>
                                        <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <FileText size={14} /> Observações Adicionais
                                        </h3>
                                        <div style={{ fontSize: '0.875rem', color: '#334155', whiteSpace: 'pre-wrap', marginTop: '8px', lineHeight: '1.5' }}>
                                            {nf.notes}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                <div className="nf-modal-footer">
                    <button onClick={onClose} disabled={submitting} style={{ padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                        Fechar
                    </button>
                    {!isLoading && nf && (!nf.liquidation_number || !nf.liquidation_date || !nf.payment_date) && (
                        <button onClick={handleSave} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#00967d', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                            <Save size={18} /> {submitting ? 'Salvando...' : 'Salvar Dados Financeiros'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EdicaoNfModal;
