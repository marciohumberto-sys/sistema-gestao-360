import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFarmacia } from '../FarmaciaContext';
import { useTenant } from '../../../context/TenantContext';
import { supabase } from '../../../lib/supabase';
import { mockMotivosAjuste } from '../../../mocks/farmaciaMocks';
import MedAutocomplete from '../components/MedAutocomplete';
import '../FarmaciaModal.css';

const def = { quantidadeAnterior: '', quantidadeAjustada: '', motivo: '', observacao: '' };

const FarmaciaAjusteModal = ({ isOpen, onClose }) => {
    const { unidadeAtiva, estoqueLocal } = useFarmacia();
    const { tenantId } = useTenant();
    const [form, setForm] = useState(def);
    const [med, setMed]   = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const qtyRef = useRef(null);
    const mtvRef = useRef(null);
    const obsRef = useRef(null);

    useEffect(() => { 
        if (isOpen) { 
            setForm(def); 
            setMed(null); 
            setIsSaving(false);
        } 
    }, [isOpen]);

    // Auto focus após selecionar medicamento -> Vai para QUANTIDADE AJUSTADA
    useEffect(() => {
        if (med && qtyRef.current) {
            setTimeout(() => {
                qtyRef.current.focus();
            }, 60);
        }
    }, [med]);

    useEffect(() => {
        if (!isOpen) return;
        const h = e => { if (e.key === 'Escape') onClose(false); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [isOpen, onClose]);

    useEffect(() => {
        const fetchBalance = async () => {
            if (med?.id && unidadeAtiva?.label) {
                try {
                    const { data: unitData } = await supabase.from('units').select('id').ilike('name', unidadeAtiva.label).single();
                    if (unitData) {
                        const { data: moves } = await supabase.from('stock_movements')
                            .select('quantity')
                            .eq('inventory_item_id', med.id)
                            .eq('unit_id', unitData.id);
                        
                        if (moves) {
                            const dbBalance = moves.reduce((sum, mv) => sum + mv.quantity, 0);
                            setForm(prev => ({ ...prev, quantidadeAnterior: String(dbBalance) }));
                        } else {
                            setForm(prev => ({ ...prev, quantidadeAnterior: '0' }));
                        }
                    }
                } catch(e) {
                    console.error('Falha ao auditar saldo base.', e);
                }
            }
        };
        fetchBalance();
    }, [med, unidadeAtiva]);

    // ============================================
    // Conditional render moves down, AFTER all hooks
    // ============================================
    if (!isOpen) return null;

    const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleConfirm = async () => {
        if (!med || !form.quantidadeAjustada || !form.motivo) return;
        
        const diff = (parseFloat(form.quantidadeAjustada) || 0) - (parseFloat(form.quantidadeAnterior) || 0);
        if (diff === 0) {
            alert('A diferença é zero. Nenhuma alteração a registrar.');
            return;
        }

        if (isSaving) return;
        setIsSaving(true);

        try {
            const { data: authData } = await supabase.auth.getUser();
            const user_id = authData?.user?.id;

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
                const finalNotes = form.observacao ? `${form.motivo} - ${form.observacao}` : form.motivo;

                const { error } = await supabase.from('stock_movements').insert({
                    tenant_id: tenantId,
                    secretariat_id: targetSecretariatId,
                    created_by: user_id,
                    inventory_item_id: med.id,
                    unit_id: unitData.id,
                    quantity: diff,
                    movement_type: 'ADJUSTMENT',
                    notes: finalNotes
                });

                if(!error) {
                    onClose(true);
                } else {
                    console.error('Erro detalhado no Supabase:', error);
                    alert('Falha ao registrar ajuste no Supabase.');
                }
            } else {
                alert('Unidade não mapeada para ajuste.');
            }
        } catch(e) {
            console.error(e);
            alert('Erro inesperado ao registrar ajuste.');
        } finally {
            setIsSaving(false);
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

    const handleSelectMed = item => {
        setMed(item);
        if (!item) {
            setForm(prev => ({ ...prev, quantidadeAnterior: '' }));
        }
    };

    const antes = parseFloat(form.quantidadeAnterior) || 0;
    const isEditing = form.quantidadeAjustada !== '';
    const apos  = isEditing ? (parseFloat(form.quantidadeAjustada) || 0) : antes;
    const diff  = apos - antes;
    const isNeutral = !isEditing || diff === 0;
    const diffClass = diff > 0 && !isNeutral ? 'positive' : diff < 0 && !isNeutral ? 'negative' : 'neutral';
    const diffLabel = isNeutral ? '0' : (diff > 0 ? `+${diff}` : `${diff}`);

    return (
        <div className="farmacia-modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose(false)}>
            <div className="farmacia-modal">
                <div className="farmacia-modal-header">
                    <div>
                        <h2 className="farmacia-modal-title">Novo Ajuste</h2>
                        <span className="farmacia-modal-subtitle">Ajuste em {unidadeAtiva?.label || 'UPA'}</span>
                    </div>
                    <button className="farmacia-modal-close" onClick={() => onClose(false)}><X size={18} /></button>
                </div>
                <div className="farmacia-modal-body">
                    <div className="farmacia-modal-grid">
                        <div className="farmacia-form-group col-span-2">
                            <label className="farmacia-form-label farmacia-label-lg">Medicamento / Material</label>
                            <div style={{ borderRadius: '8px', transition: 'all 0.2s ease' }}>
                                <MedAutocomplete value={med} onSelect={handleSelectMed} autoFocus placeholder="Buscar medicamento..." />
                            </div>
                            
                            {/* Bloco Contextual do Medicamento - Refinado para abrigar a Identidade do Item (Padrão Entradas) */}
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
                                        <div><span style={{ fontWeight: 500 }}>Estoque atual:</span> <strong style={{ color: 'var(--color-primary)', marginLeft: '4px' }}>{form.quantidadeAnterior || '0'}</strong></div>
                                        <div><span style={{ fontWeight: 500 }}>Último Lote:</span> <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>LT-2026-065</strong></div>
                                        <div><span style={{ fontWeight: 500 }}>Última Validade:</span> <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>12/2027</strong></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Linha 1: Qtd Anterior | Qtd Ajustada */}
                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Quantidade Anterior</label>
                            <div className="farmacia-qty-row">
                                <input 
                                    type="number" 
                                    className="farmacia-form-input" 
                                    value={form.quantidadeAnterior} 
                                    readOnly 
                                    disabled
                                    placeholder="0" 
                                    style={{ background: 'var(--bg-muted-light)', color: 'var(--text-muted)' }}
                                />
                                {med && (
                                    <div className="farmacia-qty-unit-badge" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {med.unidade}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Quantidade Ajustada</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div className="farmacia-qty-row">
                                    <input 
                                        ref={qtyRef}
                                        type="number" 
                                        name="quantidadeAjustada" 
                                        className="farmacia-form-input" 
                                        value={form.quantidadeAjustada} 
                                        onChange={handle}
                                        onKeyDown={e => {
                                            if (e.key === '.' || e.key === ',' || e.key === '-') e.preventDefault();
                                            handleKeyDown(e, mtvRef);
                                        }}
                                        onPaste={e => {
                                            const paste = e.clipboardData.getData('text');
                                            if (!/^\d+$/.test(paste)) e.preventDefault();
                                        }}
                                        min="0" 
                                        step="1"
                                        style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}
                                    />
                                    {med && (
                                        <div className="farmacia-qty-unit-badge" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            {med.unidade}
                                        </div>
                                    )}
                                </div>
                                {med && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '2px' }}>
                                        <button 
                                            type="button" 
                                            onClick={() => setForm(p => ({ ...p, quantidadeAjustada: '0' }))}
                                            style={{ 
                                                background: 'var(--bg-muted-light)', 
                                                border: '1px solid var(--border)', 
                                                fontSize: '0.7rem', 
                                                fontWeight: 600, 
                                                color: 'var(--text-muted)', 
                                                cursor: 'pointer', 
                                                padding: '2px 8px', 
                                                borderRadius: '4px', 
                                                transition: 'all 0.2s'
                                            }}
                                            className="hover-bg-muted"
                                        >
                                            Zerar estoque
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Linha 2: Diferença e Motivo Lado a Lado */}
                        <div className="farmacia-form-group col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="farmacia-form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Diferença no estoque</label>
                            <div style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: isNeutral ? 'var(--bg-body)' : (diff > 0 ? 'rgba(0, 150, 125, 0.05)' : 'rgba(239, 68, 68, 0.05)'),
                                border: isNeutral ? '1px solid var(--border)' : `1px solid ${diff > 0 ? 'rgba(0, 150, 125, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                borderRadius: '8px',
                                color: isNeutral ? 'var(--text-muted)' : (diff > 0 ? 'var(--color-secondary)' : '#dc2626'),
                                fontWeight: 700, 
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span>{isNeutral ? '0' : diffLabel}</span>
                                
                                <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    background: isNeutral ? 'var(--bg-muted)' : (diff > 0 ? 'var(--color-secondary)' : '#dc2626'),
                                    color: isNeutral ? 'var(--text-muted)' : '#fff',
                                }}>
                                    {isNeutral ? 'Sem alteração' : (diff > 0 ? 'Ajuste Positivo' : 'Ajuste Negativo')}
                                </span>
                            </div>
                        </div>

                        <div className="farmacia-form-group col-span-1">
                            <label className="farmacia-form-label">Motivo</label>
                            <select 
                                ref={mtvRef}
                                name="motivo" 
                                className="farmacia-form-select" 
                                value={form.motivo} 
                                onChange={handle}
                                onKeyDown={e => handleKeyDown(e, obsRef)}
                            >
                                <option value="">Selecionar...</option>
                                {mockMotivosAjuste.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        
                        {/* Linha 4: Observação */}
                        <div className="farmacia-form-group col-span-2" style={{ opacity: 0.85 }}>
                            <label className="farmacia-form-label" style={{ fontSize: '0.68rem' }}>Observação <span style={{ fontWeight: 400 }}>(Opcional)</span></label>
                            <textarea 
                                ref={obsRef}
                                name="observacao" 
                                className="farmacia-form-textarea" 
                                value={form.observacao} 
                                onChange={handle} 
                                onKeyDown={e => handleKeyDown(e, 'submit')}
                                placeholder="Descreva o motivo do ajuste..." 
                                style={{ fontSize: '0.85rem', minHeight: '44px', padding: '8px 12px' }}
                            />
                        </div>
                    </div>
                </div>
                <div className="farmacia-modal-footer">
                    <button className="farmacia-modal-btn-cancel" onClick={() => onClose(false)} disabled={isSaving}>Cancelar</button>
                    <button 
                        className="farmacia-modal-btn-confirm farmacia-action-saida" 
                        onClick={handleConfirm}
                        disabled={isSaving || !med || !form.quantidadeAjustada || !form.motivo || isNeutral}
                        style={{ padding: '0.6rem 2rem' }}
                    >
                        {isSaving ? 'Salvando...' : 'Confirmar Ajuste'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FarmaciaAjusteModal;
