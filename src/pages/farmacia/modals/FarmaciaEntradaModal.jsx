import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFarmacia } from '../FarmaciaContext';
import MedAutocomplete from '../components/MedAutocomplete';
import '../FarmaciaModal.css';

const def = { quantidade: '', lote: '', validade: '', documento: '', observacao: '' };

const FarmaciaEntradaModal = ({ isOpen, onClose }) => {
    const { unidadeAtiva, registrarEntrada } = useFarmacia();
    const [form, setForm] = useState(def);
    const [med, setMed]   = useState(null);

    const loteRef = useRef(null);
    const valRef  = useRef(null);
    const qtdRef  = useRef(null);
    const docRef  = useRef(null);
    const obsRef  = useRef(null);

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
        } 
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const h = e => { if (e.key === 'Escape') onClose(false); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleConfirm = () => {
        if (!med || !form.quantidade) return;
        
        const payload = {
            data: new Date().toISOString(),
            medicamento: med.descricao,
            codigo: med.codigo,
            lote: form.lote,
            validade: form.validade,
            quantidade: Number(form.quantidade),
            unidade: unidadeAtiva?.label || 'UPA',
            unidadeId: unidadeAtiva?.id || 'upa',
            responsavel: 'João Mendes', // Simulado
            setor: 'Almoxarifado Central',
            observacao: form.observacao,
            documento: form.documento
        };

        registrarEntrada(payload);
        onClose(true);
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
                            <label className="farmacia-form-label farmacia-label-lg">Medicamento / Material</label>
                            <MedAutocomplete value={med} onSelect={setMed} autoFocus placeholder="Buscar medicamento..." />
                            
                            {/* Bloco Contextual do Medicamento */}
                            {med && (
                                <div style={{ 
                                    marginTop: '10px', padding: '12px 16px', 
                                    background: 'rgba(0, 150, 125, 0.04)', borderRadius: '10px', 
                                    border: '1px solid rgba(0, 150, 125, 0.12)', fontSize: '0.8rem',
                                    display: 'flex', flexWrap: 'wrap', gap: '1.25rem', color: 'var(--text-muted)'
                                }}>
                                    <div><span style={{ fontWeight: 500 }}>Estoque atual:</span> <strong style={{ color: 'var(--color-secondary)' }}>156</strong></div>
                                    <div><span style={{ fontWeight: 500 }}>Último lote:</span> <strong style={{ color: 'var(--text)' }}>LT-2026-065</strong></div>
                                    <div><span style={{ fontWeight: 500 }}>Última validade:</span> <strong style={{ color: 'var(--text)' }}>12/2027</strong></div>
                                </div>
                            )}
                        </div>

                        {/* Linha 1: Lote | Validade */}
                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Lote</label>
                            <input 
                                ref={loteRef} 
                                type="text" 
                                name="lote" 
                                className="farmacia-form-input" 
                                value={form.lote} 
                                onChange={handle} 
                                onKeyDown={e => handleKeyDown(e, valRef)} 
                                placeholder="Ex: LT-2026-065" 
                            />
                        </div>
                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Validade</label>
                            <input 
                                ref={valRef} 
                                type="date" 
                                name="validade" 
                                className="farmacia-form-input" 
                                value={form.validade} 
                                onChange={handle} 
                                onKeyDown={e => handleKeyDown(e, qtdRef)} 
                            />
                        </div>
                        
                        {/* Linha 2: Quantidade | Documento */}
                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Quantidade</label>
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
                                    style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}
                                />
                                {med && (
                                    <div className="farmacia-qty-unit-badge" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {med.unidade}
                                    </div>
                                )}
                            </div>
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
                <div className="farmacia-modal-footer">
                    <button className="farmacia-modal-btn-cancel" onClick={() => onClose(false)}>Cancelar</button>
                    <button 
                        className="farmacia-modal-btn-confirm farmacia-action-saida" 
                        onClick={handleConfirm} 
                        style={{ padding: '0.6rem 2rem' }}
                        disabled={!med || !form.quantidade}
                    >
                        Registrar Entrada
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FarmaciaEntradaModal;
