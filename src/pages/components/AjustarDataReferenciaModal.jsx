import React, { useState, useEffect } from 'react';
import { Calendar, FileText, XCircle } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { ofsService } from '../../services/api/ofs.service';
import { formatLocalDate } from '../../utils/dateUtils';

const AjustarDataReferenciaModal = ({ isOpen, onClose, ofData, onSuccess }) => {
    const { tenantId } = useTenant();
    const { user } = useAuth();
    
    const [newIssueDate, setNewIssueDate] = useState('');
    const [newRefMonth, setNewRefMonth] = useState('');
    const [newRefYear, setNewRefYear] = useState('');
    const [justification, setJustification] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen && ofData) {
            setNewIssueDate(ofData.issue_date || '');
            
            // For references, if they exist, use them. Otherwise, try to extract from issue_date as fallback.
            if (ofData.reference_month) {
                setNewRefMonth(ofData.reference_month);
            } else if (ofData.issue_date) {
                const date = new Date(ofData.issue_date);
                if (!isNaN(date.getTime())) {
                    setNewRefMonth(date.toISOString().split('-')[1]);
                }
            } else {
                setNewRefMonth('');
            }
            
            if (ofData.reference_year) {
                setNewRefYear(ofData.reference_year);
            } else if (ofData.issue_date) {
                const date = new Date(ofData.issue_date);
                if (!isNaN(date.getTime())) {
                    setNewRefYear(date.getFullYear().toString());
                }
            } else {
                setNewRefYear(new Date().getFullYear().toString());
            }
            
            setJustification('');
            setErrorMsg('');
        }
    }, [isOpen, ofData]);

    if (!isOpen || !ofData) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!newIssueDate) {
            setErrorMsg('A nova data de emissão é obrigatória.');
            return;
        }
        if (!newRefMonth || !newRefYear) {
            setErrorMsg('O mês e o ano de referência são obrigatórios.');
            return;
        }
        if (!justification || justification.trim().length < 30) {
            setErrorMsg('A justificativa é obrigatória e deve ter pelo menos 30 caracteres.');
            return;
        }

        try {
            setIsSubmitting(true);
            
            let oldMonth = ofData.reference_month || null;
            let oldYear = ofData.reference_year || null;
            
            // Fallback for old references based on issue date if empty
            if (!oldMonth && ofData.issue_date) {
                const date = new Date(ofData.issue_date);
                if (!isNaN(date.getTime())) oldMonth = date.toISOString().split('-')[1];
            }
            if (!oldYear && ofData.issue_date) {
                const date = new Date(ofData.issue_date);
                if (!isNaN(date.getTime())) oldYear = date.getFullYear().toString();
            }

            await ofsService.adjustDateAndReference(ofData.id, tenantId, user.id, {
                new_issue_date: newIssueDate,
                new_reference_month: newRefMonth,
                new_reference_year: newRefYear,
                justification: justification.trim(),
                old_issue_date: ofData.issue_date,
                old_reference_month: oldMonth,
                old_reference_year: oldYear,
                status: ofData.status
            });

            onSuccess();
        } catch (error) {
            console.error('Erro ao ajustar data/referência:', error);
            setErrorMsg(error.message || 'Ocorreu um erro ao realizar o ajuste. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const months = [
        { value: '01', label: 'Janeiro' },
        { value: '02', label: 'Fevereiro' },
        { value: '03', label: 'Março' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Maio' },
        { value: '06', label: 'Junho' },
        { value: '07', label: 'Julho' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Setembro' },
        { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' },
        { value: '12', label: 'Dezembro' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#eef2ff', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.125rem', fontWeight: 600 }}>Ajustar Data e Referência</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>OF {ofData.number}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                    >
                        <XCircle size={24} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {errorMsg && (
                        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <XCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: '#475569', fontWeight: 600 }}>Dados Atuais</h4>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: '#64748b' }}>
                            <div>
                                <strong style={{ color: '#334155' }}>Data de Emissão:</strong> {ofData.issue_date ? formatLocalDate(ofData.issue_date) : '-'}
                            </div>
                            <div>
                                <strong style={{ color: '#334155' }}>Referência:</strong> {ofData.reference_month && ofData.reference_year ? `${ofData.reference_month}/${ofData.reference_year}` : 'Não definida (usa data emissão)'}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                                Nova Data de Emissão *
                            </label>
                            <input
                                type="date"
                                value={newIssueDate}
                                onChange={(e) => setNewIssueDate(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                                    Novo Mês de Referência *
                                </label>
                                <select
                                    value={newRefMonth}
                                    onChange={(e) => setNewRefMonth(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                                    disabled={isSubmitting}
                                >
                                    <option value="" disabled>Selecione o mês</option>
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                                    Novo Ano de Referência *
                                </label>
                                <select
                                    value={newRefYear}
                                    onChange={(e) => setNewRefYear(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                                    disabled={isSubmitting}
                                >
                                    <option value="" disabled>Selecione o ano</option>
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                                Justificativa do Ajuste *
                            </label>
                            <textarea
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                placeholder="Informe o motivo administrativo para este ajuste de data/referência (mínimo 30 caracteres)..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '100px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                                disabled={isSubmitting}
                            />
                            <div style={{ fontSize: '0.75rem', color: justification.trim().length < 30 ? '#ef4444' : '#10b981', marginTop: '4px', textAlign: 'right' }}>
                                {justification.trim().length} / 30 caracteres
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                            <button 
                                type="button"
                                className="btn-secondary" 
                                onClick={onClose} 
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                style={{ background: '#4338ca', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                                disabled={isSubmitting || justification.trim().length < 30 || !newIssueDate || !newRefMonth || !newRefYear}
                            >
                                {isSubmitting ? (
                                    <>Salvando...</>
                                ) : (
                                    <><FileText size={16} /> Salvar Ajuste</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AjustarDataReferenciaModal;
