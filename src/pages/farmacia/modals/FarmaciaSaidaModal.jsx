import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useFarmacia } from '../FarmaciaContext';
import { useTenant } from '../../../context/TenantContext';
import { useAuth } from '../../../context/AuthContext';
import { canWriteFarmacia } from '../../../utils/farmaciaAcl';
import MedAutocomplete from '../components/MedAutocomplete';
import FarmaciaAlertModal from '../components/FarmaciaAlertModal';
import { supabase } from '../../../lib/supabase';
import '../FarmaciaModal.css';

const FarmaciaSaidaModal = ({ isOpen, onClose }) => {
    const { unidadeAtiva } = useFarmacia();
    const { tenantId } = useTenant();
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const [med, setMed]       = useState(null);
    const [qty, setQty]       = useState(1); 
    const [obs, setObs]       = useState('');
    const [errors, setErrors] = useState({});
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    const getErrorStyle = (hasError) => hasError ? {
        borderColor: 'var(--color-danger)',
        outline: 'none',
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)'
    } : {};
    
    // Integração Real - Supabase
    const [estoqueReal, setEstoqueReal] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingBalance, setIsFetchingBalance] = useState(false);

    const qtyInputRef = useRef(null);

    // Reset ao Abrir
    useEffect(() => {
        if (isOpen) { 
            setMed(null); setQty(1); setObs(''); 
            setEstoqueReal(0);
            setErrors({});
        }
    }, [isOpen]);

    // Handle Esc
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose(false);
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Auto-focus QTY
    useEffect(() => {
        if (med && qtyInputRef.current) {
            setTimeout(() => {
                qtyInputRef.current.focus();
                qtyInputRef.current.select();
            }, 100);
        }
    }, [med]);

    // Cálculo Tático de Saldo - Real Data
    useEffect(() => {
        const fetchBalance = async () => {
            if (med?.id && unidadeAtiva?.label) {
                setIsFetchingBalance(true);
                try {
                    const { data: unitData } = await supabase.from('units').select('id').ilike('name', unidadeAtiva.label).single();
                    if (unitData) {
                        const { data: moves } = await supabase.from('stock_movements')
                            .select('quantity')
                            .eq('inventory_item_id', med.id)
                            .eq('unit_id', unitData.id);
                        
                        if (moves) {
                            const dbBalance = moves.reduce((sum, mv) => sum + mv.quantity, 0);
                            setEstoqueReal(dbBalance);
                        } else {
                            setEstoqueReal(0);
                        }
                    }
                } catch(e) {
                    console.error('Falha ao auditar saldo base.', e);
                } finally {
                    setIsFetchingBalance(false);
                }
            }
        };
        fetchBalance();
    }, [med, unidadeAtiva]);

    if (!isOpen) return null;

    const estoque   = estoqueReal;
    const semEstoque  = med && estoque <= 0;
    const ruptura = med && (semEstoque || qty > estoque);

    const isBtnDisabled = !med || !qty || Number(qty) <= 0;

    // Submissão Orgânica para o Banco
    const handleConfirm = async () => {
        if (!canWriteFarmacia(role)) {
            setAlertConfig({
                isOpen: true,
                title: 'Acesso restrito',
                message: 'Seu perfil possui acesso apenas para visualização. Esta ação não está disponível.',
                type: 'error'
            });
            return;
        }

        const newErrs = {};
        if (!med) newErrs.med = 'Selecione um medicamento';
        if (!qty || Number(qty) <= 0) newErrs.quantidade = 'Informe uma quantidade válida';

        setErrors(newErrs);

        if (Object.keys(newErrs).length > 0) {
            if (newErrs.quantidade && qtyInputRef.current) qtyInputRef.current.focus();
            return;
        }

        if (isSaving || isFetchingBalance) return;
        setIsSaving(true);

        try {
            // Contexto do Usuário
            const { data: authData } = await supabase.auth.getUser();
            const user_id = authData?.user?.id;
            const user_meta = authData?.user?.user_metadata || {};
            const responsible_name = user_meta.full_name
                || user_meta.name
                || (authData?.user?.email ? authData.user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Farmacêutico');

            // Contexto da Unidade e Secretaria
            const { data: unitData } = await supabase.from('units')
                .select('id, secretariat_id')
                .ilike('name', unidadeAtiva?.label || 'UPA')
                .single();

            let targetSecretariatId = unitData?.secretariat_id;
            if (!targetSecretariatId) {
                const { data: secData } = await supabase.from('secretariats')
                    .select('id')
                    .eq('tenant_id', tenantId)
                    .limit(1);
                if (secData && secData.length > 0) targetSecretariatId = secData[0].id;
            }

            if (unitData && targetSecretariatId) {
                // Empacotar o responsável dentro de notes para preservar nome legível sem alterar o banco
                // Formato: 'Observação do usuário||RESP:Nome Sobrenome'
                const finalNotes = obs
                    ? `${obs}||RESP:${responsible_name}`
                    : `||RESP:${responsible_name}`;

                const { error } = await supabase.from('stock_movements').insert({
                    tenant_id: tenantId,
                    secretariat_id: targetSecretariatId,
                    created_by: user_id,
                    inventory_item_id: med.id,
                    unit_id: unitData.id,
                    quantity: -Math.abs(qty),
                    movement_type: 'EXIT',
                    notes: finalNotes
                });

                if(!error) {
                    onClose(true); // Toast renderizado globalmente
                } else {
                    console.error('Erro detalhado no Supabase:', error);
                    setErrors({ submit: 'Falha ao registrar saída (banco de dados).' });
                }
            } else {
                setErrors({ submit: 'Unidade não mapeada para remoção.' });
            }
        } catch(e) {
            console.error(e);
            setErrors({ submit: 'Ocorreu um erro ao registrar a dispensação.' });
        } finally {
            setIsSaving(false);
        }
    };

    const decrement = () => { setQty(q => Math.max(1, (Number(q)||1) - 1)); if (errors.quantidade) setErrors(p => ({ ...p, quantidade: null })); };
    const increment = () => { setQty(q => (Number(q)||0) + 1); if (errors.quantidade) setErrors(p => ({ ...p, quantidade: null })); };
    const handleQtyChange = e => { 
        const val = e.target.value; 
        setQty(val === '' ? '' : parseInt(val, 10)); 
        if (errors.quantidade) setErrors(p => ({ ...p, quantidade: null })); 
    };

    return (
        <div className="farmacia-modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose(false)}>
            <div className="farmacia-modal farmacia-modal-dispensacao farmacia-modal-compact">
                <div className="farmacia-modal-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h2 className="farmacia-modal-title" style={{ fontSize: '1.25rem' }}>Dispensação de Medicamentos</h2>
                        <span className="farmacia-modal-subtitle">Unidade: <strong style={{ color: 'var(--color-primary)' }}>{unidadeAtiva?.label || 'Farmácia Central'}</strong></span>
                    </div>
                    <button className="farmacia-modal-close" onClick={() => onClose(false)}><X size={18} /></button>
                </div>

                <div className="farmacia-modal-body" style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="farmacia-form-group">
                        <label className="farmacia-form-label" style={{ marginBottom: '2px', fontWeight: 700, fontSize: '0.8rem' }}>Medicamento / Material <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>*</span></label>
                        <div style={{ borderRadius: '8px', transition: 'all 0.2s ease', ...getErrorStyle(errors.med) }}>
                            <MedAutocomplete 
                                value={med} 
                                onSelect={m => { setMed(m); setErrors(p => ({ ...p, med: null })); }}
                                autoFocus 
                                placeholder={med ? "Buscar outro medicamento..." : "Digite o nome da medicação..."}
                                className={med ? 'med-search-discreet' : ''}
                            />
                        </div>
                        {errors.med && <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600, display: 'block', marginTop: '4px' }}>{errors.med}</span>}
                    </div>

                    {med && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'farmacia-fade-in 0.2s' }}>
                            <div className="farmacia-focal-card compact" style={{ opacity: isFetchingBalance ? 0.5 : 1 }}>
                                <div className="farmacia-focal-header" style={{ marginBottom: '4px' }}>
                                    <div className="focal-item-name" style={{ fontSize: '1.05rem' }}>{med.descricao}</div>
                                    <div className="focal-item-meta">
                                        <span className="focal-item-unit">Registro Sistêmico Selecionado</span>
                                    </div>
                                </div>
                                
                                <div className="focal-stock-badge-compact">
                                    <span>Saldo Físico Audito: <strong>{estoque.toLocaleString('pt-BR')}</strong></span>
                                </div>

                                <div className="farmacia-qty-sub-block">
                                    <label className="farmacia-form-label" style={{ fontSize: '11px', marginBottom: '4px', color: 'var(--text-primary)' }}>QUANTIDADE PARA DISPENSAR</label>
                                        <div className="farmacia-qty-stepper compact-stepper" style={{ ...getErrorStyle(errors.quantidade) }}>
                                            <button type="button" className="farmacia-stepper-btn" onClick={decrement} disabled={qty <= 1}>−</button>
                                            <input 
                                                ref={qtyInputRef}
                                                type="number" 
                                                className="farmacia-stepper-input" 
                                                value={qty} 
                                                onChange={handleQtyChange} 
                                                style={{ outline: 'none' }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleConfirm();
                                                    }
                                                }}
                                                min={1} 
                                            />
                                            <button type="button" className="farmacia-stepper-btn" onClick={increment}>+</button>
                                        </div>
                                    {errors.quantidade && <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600, display: 'block', marginTop: '4px' }}>{errors.quantidade}</span>}
                                </div>
                            </div>

                            {!semEstoque && !isFetchingBalance && (
                                <div className="farmacia-compact-projection">
                                    <div className="compact-projection-row">
                                        <div className="compact-projection-group-start">
                                            <div className="compact-item">Haver Útil: <strong>{estoque}</strong></div>
                                            <div className="compact-sep">|</div>
                                            <div className="compact-item">Baixa: <strong>-{qty}</strong></div>
                                        </div>
                                        <div className="compact-projection-group-end">
                                            <div className="compact-item focal">Saldo Final Estimado: <strong className={qty > estoque ? 'critical' : 'success'}>{(estoque - qty).toLocaleString('pt-BR')}</strong></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {ruptura && !isFetchingBalance && (
                                <div className="farmacia-alert-rupture-compact" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)'}}>
                                    <AlertTriangle size={14} color="#d97706" />
                                    <span style={{fontWeight: 600}}>
                                        {semEstoque 
                                            ? 'Atenção: Estoque completamente zerado nesta base. O registro será permitido.' 
                                            : 'Atenção: Saída acima do saldo disponível. O estoque ficará negativo.'
                                        }
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label" style={{ fontSize: '10px', marginBottom: '2px' }}>Destino / Observação</label>
                                    <input type="text" className="farmacia-form-input compact" style={{ height: '32px' }} value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {errors.submit && (
                    <div style={{ margin: '0 20px 12px', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} />
                        {errors.submit}
                    </div>
                )}

                <div className="farmacia-modal-footer">
                    <button className="farmacia-modal-btn-cancel-premium" style={{ height: '42px', fontSize: '13px' }} onClick={() => onClose(false)} disabled={isSaving}>Cancelar / Fechar</button>
                    <button className="farmacia-modal-btn-confirm-premium" style={{ height: '42px', fontSize: '14px', padding: '0 24px', opacity: (isSaving || isBtnDisabled) ? 0.5 : 1, cursor: (isSaving || isBtnDisabled) ? 'not-allowed' : 'pointer' }}
                        onClick={handleConfirm} disabled={isSaving || isBtnDisabled}>
                        {isSaving ? 'Registrando Dispensa...' : 'Autorizar Saída'}
                    </button>
                </div>
            </div>

            <FarmaciaAlertModal 
                isOpen={alertConfig.isOpen} 
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    );
};

export default FarmaciaSaidaModal;
