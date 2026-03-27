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

const def = { quantidade: '', lote: '', validade: '', documento: '', observacao: '' };

const FarmaciaEntradaModal = ({ isOpen, onClose }) => {
    const { unidadeAtiva, registrarEntrada } = useFarmacia();
    const { tenantId } = useTenant();
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const [form, setForm] = useState(def);
    const [med, setMed]   = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    const loteRef = useRef(null);
    const valRef  = useRef(null);
    const qtdRef  = useRef(null);
    const docRef  = useRef(null);
    const obsRef  = useRef(null);

    const getErrorStyle = (hasError) => hasError ? {
        borderColor: 'var(--color-danger)',
        outline: 'none',
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)'
    } : {};

    // Auto focus após selecionar medicamento -> Vai para QUANTIDADE no modo ultra-rápido
    useEffect(() => {
        if (med && qtdRef.current) {
            setTimeout(() => {
                qtdRef.current.focus();
            }, 60);
        }
    }, [med]);

    useEffect(() => { 
        if (isOpen) { 
            setForm(def); 
            setMed(null);
            setIsSaving(false);
            setErrors({});
        } 
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const h = e => { if (e.key === 'Escape') onClose(false); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handle = e => {
        setForm(p => ({ ...p, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) {
            setErrors(p => ({ ...p, [e.target.name]: null }));
        }
    };

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
        if (!form.quantidade || Number(form.quantidade) <= 0) newErrs.quantidade = 'Informe uma quantidade válida';
        if (!form.lote || form.lote.trim() === '') newErrs.lote = 'Informe o lote';
        if (!form.validade || isNaN(Date.parse(form.validade))) newErrs.validade = 'Informe a validade';

        setErrors(newErrs);

        if (Object.keys(newErrs).length > 0) {
            if (newErrs.lote) loteRef.current?.focus();
            else if (newErrs.validade) valRef.current?.focus();
            else if (newErrs.quantidade) qtdRef.current?.focus();
            return;
        }

        if (isSaving) return;
        
        setIsSaving(true);
        try {
            // 1. Contexto do Usuário
            const { data: authData } = await supabase.auth.getUser();
            const user_id = authData?.user?.id;

            // 2. Contexto da Unidade e Secretaria
            const { data: unitData } = await supabase.from('units')
                .select('id, secretariat_id') // Tentativa de resgatar FK direta
                .ilike('name', unidadeAtiva?.label || 'UPA')
                .single();

            let targetSecretariatId = unitData?.secretariat_id;

            // Se a tabela units não pussuir FK direta pra secretaria, busca a principal do Tenant como fallback
            if (!targetSecretariatId) {
                const { data: secData } = await supabase.from('secretariats')
                    .select('id')
                    .eq('tenant_id', tenantId)
                    .limit(1);
                if (secData && secData.length > 0) targetSecretariatId = secData[0].id;
            }

            if (unitData && targetSecretariatId) {
                // Relational Persistence: Item Batches
                let targetBatchId = null;
                const { data: exBatch } = await supabase.from('item_batches')
                    .select('id')
                    .eq('tenant_id', tenantId)
                    .eq('inventory_item_id', med.id)
                    .ilike('batch_number', form.lote.trim())
                    .single();

                if (exBatch) {
                    targetBatchId = exBatch.id;
                } else {
                    const { data: newBatch, error: errBatch } = await supabase.from('item_batches')
                        .insert([{
                            tenant_id: tenantId,
                            inventory_item_id: med.id,
                            batch_number: form.lote.trim(),
                            expiration_date: form.validade
                        }])
                        .select('id')
                        .single();
                    
                    if (errBatch) {
                        setErrors({ submit: 'Falha ao registrar identificação do lote: ' + errBatch.message });
                        setIsSaving(false);
                        return;
                    }
                    targetBatchId = newBatch.id;
                }

                const extInfos = [];
                if (form.documento?.trim()) extInfos.push(`NF/Doc: ${form.documento.trim()}`);
                if (form.observacao?.trim()) extInfos.push(`Obs: ${form.observacao.trim()}`);
                
                const finalNotes = extInfos.length > 0 ? extInfos.join(' | ') : null;

                const payload = {
                    tenant_id: tenantId,
                    secretariat_id: targetSecretariatId,
                    created_by: user_id,
                    movement_type: 'ENTRY',
                    inventory_item_id: med.id,
                    unit_id: unitData.id,
                    quantity: Number(form.quantidade),
                    batch_id: targetBatchId,
                    notes: finalNotes
                };

                const { error } = await supabase.from('stock_movements').insert([payload]);
                if (!error) {
                    onClose(true); // O Toast unificado do Layout cuida do sucesso
                } else {
                    console.error('Erro detalhado no Supabase:', error);
                    setErrors({ submit: 'Falha ao registrar entrada (Integração com o Banco de Dados).' });
                }
            } else {
                setErrors({ submit: 'A Unidade ativa não pôde se vincular à Secretaria no banco.' });
            }
        } catch (e) {
            console.error('Erro ao registrar entrada:', e);
            setErrors({ submit: 'Ocorreu um erro inesperado ao processar os dados.' });
        } finally {
            setIsSaving(false); // only reached if error because onClose true unmounts/resets
        }
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextRef === 'submit') {
                handleConfirm();
            } else {
                nextRef.current?.focus();
            }
        }
    };

    return (
        <div className="farmacia-modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose(false)}>
            <div className="farmacia-modal">
                <div className="farmacia-modal-header">
                    <div>
                        <h2 className="farmacia-modal-title">Registrar Nova Entrada</h2>
                        <span className="farmacia-modal-subtitle">Unidade: {unidadeAtiva?.label || 'UPA'}</span>
                    </div>
                    <button className="farmacia-modal-close" onClick={() => onClose(false)}><X size={18} /></button>
                </div>
                <div className="farmacia-modal-body">
                    <div className="farmacia-modal-grid">
                        {/* Medicamento - Largura Total */}
                        <div className="farmacia-form-group col-span-2">
                            <label className="farmacia-form-label farmacia-label-lg">Medicamento / Material <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>*</span></label>
                            <div style={{ borderRadius: '8px', transition: 'all 0.2s ease', ...getErrorStyle(errors.med) }}>
                                <MedAutocomplete value={med} onSelect={m => { setMed(m); setErrors(p => ({ ...p, med: null })); }} autoFocus placeholder="Buscar medicamento..." />
                            </div>
                            {errors.med && <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600, display: 'block', marginTop: '4px' }}>{errors.med}</span>}
                            
                            {/* Bloco Contextual do Medicamento - Refinado para abrigar a Identidade do Item */}
                            {med && (
                                <div style={{ 
                                    marginTop: '10px', padding: '12px 14px', 
                                    background: 'rgba(0, 150, 125, 0.04)', borderRadius: '8px', 
                                    border: '1px solid rgba(0, 150, 125, 0.12)', fontSize: '0.8rem',
                                    display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)',
                                    animation: 'farmacia-fade-in 0.2s ease-out'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{med.descricao}</span>
                                        {med.codigo !== '-' && <span style={{ fontFamily: 'monospace', opacity: 0.7, fontSize: '0.8rem' }}>{med.codigo}</span>}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', paddingTop: '2px' }}>
                                        <div><span style={{ fontWeight: 500 }}>Estoque:</span> <strong style={{ color: 'var(--color-primary)', marginLeft: '4px' }}>156</strong></div>
                                        <div><span style={{ fontWeight: 500 }}>Último Lote:</span> <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>LT-2026-065</strong></div>
                                        <div><span style={{ fontWeight: 500 }}>Última Validade:</span> <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>12/2027</strong></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Linha 1: Lote | Validade */}
                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Lote <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>*</span></label>
                            <input 
                                ref={loteRef} 
                                type="text" 
                                name="lote" 
                                className="farmacia-form-input" 
                                value={form.lote} 
                                onChange={handle} 
                                onKeyDown={e => handleKeyDown(e, valRef)} 
                                placeholder="Ex: LT-2026-065" 
                                style={getErrorStyle(errors.lote)}
                            />
                            {errors.lote && <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600, display: 'block', marginTop: '4px' }}>{errors.lote}</span>}
                        </div>
                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Validade <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>*</span></label>
                            <input 
                                ref={valRef} 
                                type="date" 
                                name="validade" 
                                className="farmacia-form-input" 
                                value={form.validade} 
                                onChange={handle} 
                                onKeyDown={e => handleKeyDown(e, qtdRef)} 
                                style={getErrorStyle(errors.validade)}
                            />
                            {errors.validade && <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600, display: 'block', marginTop: '4px' }}>{errors.validade}</span>}
                        </div>
                        
                        {/* Linha 2: Quantidade | Documento */}
                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Quantidade <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>*</span></label>
                            <div className="farmacia-qty-row">
                                <input 
                                    ref={qtdRef} 
                                    type="number" 
                                    name="quantidade" 
                                    className="farmacia-form-input" 
                                    value={form.quantidade} 
                                    onChange={handle} 
                                    onKeyDown={e => handleKeyDown(e, 'submit')} 
                                    min="1" 
                                    style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', padding: '0.5rem 0.75rem', ...getErrorStyle(errors.quantidade) }}
                                />
                                {med && (
                                    <div className="farmacia-qty-unit-badge" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {med.unidade || 'UN'}
                                    </div>
                                )}
                            </div>
                            {errors.quantidade && <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600, display: 'block', marginTop: '4px' }}>{errors.quantidade}</span>}
                        </div>
                        <div className="farmacia-form-group" style={{ opacity: 0.85 }}>
                            <label className="farmacia-form-label" style={{ fontSize: '0.68rem' }}>NF / Documento (opcional)</label>
                            <input 
                                ref={docRef} 
                                type="text" 
                                name="documento" 
                                className="farmacia-form-input" 
                                value={form.documento} 
                                onChange={handle} 
                                onKeyDown={e => handleKeyDown(e, obsRef)} 
                                placeholder="P-12345" 
                                style={{ fontSize: '0.85rem' }}
                            />
                        </div>

                        {/* Linha 3: Observação em largura total */}
                        <div className="farmacia-form-group col-span-2" style={{ opacity: 0.85 }}>
                            <label className="farmacia-form-label" style={{ fontSize: '0.68rem' }}>Observação <span style={{ fontWeight: 400 }}>(Opcional)</span></label>
                            <textarea 
                                ref={obsRef} 
                                name="observacao" 
                                className="farmacia-form-textarea" 
                                value={form.observacao} 
                                onChange={handle} 
                                onKeyDown={e => handleKeyDown(e, 'submit')} 
                                placeholder="Observações operacionais..." 
                                style={{ fontSize: '0.85rem', minHeight: '60px' }}
                            />
                        </div>
                    </div>
                </div>

                {errors.submit && (
                    <div style={{ margin: '0 1.5rem 1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} />
                        {errors.submit}
                    </div>
                )}

                <div className="farmacia-modal-footer">
                    <button className="farmacia-modal-btn-cancel" onClick={() => onClose(false)} disabled={isSaving}>Cancelar</button>
                    <button 
                        className="farmacia-modal-btn-confirm farmacia-action-saida" 
                        onClick={handleConfirm} 
                        style={{ padding: '0.6rem 2rem' }}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Registrando...' : 'Registrar Entrada'}
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

export default FarmaciaEntradaModal;
