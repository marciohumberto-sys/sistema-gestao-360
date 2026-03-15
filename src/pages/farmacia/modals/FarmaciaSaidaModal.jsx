import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, AlertTriangle, Activity } from 'lucide-react';
import { mockHistoricoDispensacoes } from '../../../mocks/farmaciaMocks';
import { useFarmacia } from '../FarmaciaContext';
import MedAutocomplete from '../components/MedAutocomplete';
import '../FarmaciaModal.css';

const FarmaciaSaidaModal = ({ isOpen, onClose }) => {
    const { unidadeAtiva, estoqueLocal } = useFarmacia();
    const [med, setMed]       = useState(null);
    const [qty, setQty]       = useState(1); // default 1 (ajuste 2)
    const [paciente, setPaciente] = useState('');
    const [obs, setObs]       = useState('');

    const [showHistory, setShowHistory] = useState(false);
    const historyRef = useRef(null);
    const qtyInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) { 
            setMed(null); setQty(1); setPaciente(''); setObs(''); 
            setShowHistory(false);
        }
    }, [isOpen]);

    // Auto-scroll para o histórico quando abrir
    useEffect(() => {
        if (showHistory && historyRef.current) {
            setTimeout(() => {
                historyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [showHistory]);

    // Handle Esc key to close modal
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose(false);
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Auto-focus na quantidade ao selecionar o medicamento
    useEffect(() => {
        if (med && qtyInputRef.current) {
            setTimeout(() => {
                qtyInputRef.current.focus();
                qtyInputRef.current.select();
            }, 50);
        }
    }, [med]);

    if (!isOpen) return null;

    const uid       = unidadeAtiva?.id || 'upa';
    const itemLocal = med ? estoqueLocal.find(i => i.codigo === med.codigo) : null;
    const estoque   = itemLocal?.estoquePorUnidade?.[uid] ?? itemLocal?.estoqueAtual ?? Infinity;
    const semEstoque  = itemLocal && estoque === 0;
    const statusLocal = !itemLocal ? null
        : estoque === 0 ? 'SEM_ESTOQUE'
        : estoque < (itemLocal.estoqueMinimo ?? 0) ? 'ABAIXO_MINIMO'
        : 'NORMAL';
    const ruptura = med && (semEstoque || qty > estoque);

    const historico = med
        ? (mockHistoricoDispensacoes[med.codigo] || []).filter(h => h.local === unidadeAtiva?.label)
        : [];

    const stockClass = statusLocal === 'SEM_ESTOQUE' ? 'danger'
        : statusLocal === 'ABAIXO_MINIMO' ? 'warning' : 'ok';

    const handleConfirm = () => {
        if (!med || semEstoque || qty > estoque) return;
        onClose(true, { codigo: med.codigo, quantidade: qty, unidadeId: uid });
    };

    // Stepper (ajuste 1): min=1, botão − desabilitado quando qty=1
    const decrement = () => setQty(q => Math.max(1, q - 1));
    const increment = () => setQty(q => q + 1);
    const handleQtyChange = e => { const v = parseInt(e.target.value, 10); setQty(isNaN(v) || v < 1 ? 1 : v); };

    return (
        <div className="farmacia-modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose(false)}>
            <div className="farmacia-modal farmacia-modal-dispensacao farmacia-modal-compact">
                <div className="farmacia-modal-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h2 className="farmacia-modal-title" style={{ fontSize: '1.25rem' }}>Dispensação de Medicamentos</h2>
                        <span className="farmacia-modal-subtitle">Unidade: <strong style={{ color: 'var(--color-primary)' }}>{unidadeAtiva?.label || 'UPA'}</strong></span>
                    </div>
                    <button className="farmacia-modal-close" onClick={() => onClose(false)}><X size={18} /></button>
                </div>

                <div className="farmacia-modal-body" style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* 1. BUSCA DE MEDICAMENTO */}
                    <div className="farmacia-form-group">
                        <label className="farmacia-form-label" style={{ marginBottom: '2px', fontWeight: 700, fontSize: '0.8rem' }}>Medicamento / Material</label>
                        <MedAutocomplete 
                            value={med} 
                            onSelect={setMed} 
                            autoFocus 
                            placeholder={med ? "Buscar outro medicamento..." : "Digite medicamento ou código (MD001)..."}
                            className={med ? 'med-search-discreet' : ''}
                        />
                    </div>

                    {med && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'farmacia-fade-in 0.2s' }}>
                            {/* 2. MEDICAMENTO SELECIONADO (Mais compacto) */}
                            <div className="farmacia-focal-card compact">
                                <div className="farmacia-focal-header" style={{ marginBottom: '4px' }}>
                                    <div className="focal-item-name" style={{ fontSize: '1.05rem' }}>{itemLocal?.descricao}</div>
                                    <div className="focal-item-meta">
                                        <span className="farmacia-code-badge" style={{ fontSize: '10px' }}>{itemLocal?.codigo}</span>
                                        <span className="focal-item-unit">• {itemLocal?.unidade}</span>
                                    </div>
                                </div>
                                
                                <div className="focal-stock-badge-compact">
                                    <span>Estoque: <strong>{estoque.toLocaleString('pt-BR')}</strong></span>
                                </div>

                                {/* 3. QUANTIDADE PARA DISPENSAR (Integrada e em Destaque) */}
                                <div className="farmacia-qty-sub-block">
                                    <label className="farmacia-form-label" style={{ fontSize: '11px', marginBottom: '4px', color: 'var(--text-primary)' }}>QUANTIDADE PARA DISPENSAR</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div className="farmacia-qty-stepper compact-stepper">
                                            <button type="button" className="farmacia-stepper-btn" onClick={decrement} disabled={qty <= 1}>−</button>
                                            <input 
                                                ref={qtyInputRef}
                                                type="number" 
                                                className="farmacia-stepper-input" 
                                                value={qty} 
                                                onChange={handleQtyChange} 
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
                                        <span className="farmacia-qty-pill-refined">
                                            {qty} {qty === 1 ? itemLocal?.unidade.toLowerCase() : (itemLocal?.unidade.toLowerCase().endsWith('l') ? itemLocal?.unidade.toLowerCase()+'is' : itemLocal?.unidade.toLowerCase()+'s')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 4. RESUMO DE SALDO (Painel Destacado) */}
                            {!semEstoque && (
                                <div className="farmacia-compact-projection">
                                    <div className="compact-projection-row">
                                        <div className="compact-projection-group-start">
                                            <div className="compact-item">Disponível: <strong>{estoque}</strong></div>
                                            <div className="compact-sep">|</div>
                                            <div className="compact-item">Saída: <strong>-{qty}</strong></div>
                                        </div>
                                        <div className="compact-projection-group-end">
                                            <div className="compact-item focal">Saldo Final: <strong className={qty > estoque ? 'critical' : 'success'}>{(estoque - qty).toLocaleString('pt-BR')}</strong></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {ruptura && !semEstoque && (
                                <div className="farmacia-alert-rupture-compact">
                                    <AlertTriangle size={14} />
                                    <span>Superior ao estoque disponível.</span>
                                </div>
                            )}

                            {/* 5 & 6. PACIENTE / OBSERVAÇÃO */}
                            <div className="farmacia-modal-grid-compact" style={{ gap: '8px' }}>
                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label" style={{ fontSize: '10px', marginBottom: '2px' }}>Paciente</label>
                                    <input type="text" className="farmacia-form-input compact" style={{ height: '32px' }} value={paciente} onChange={e => setPaciente(e.target.value)} placeholder="Opcional" />
                                </div>
                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label" style={{ fontSize: '10px', marginBottom: '2px' }}>Observação</label>
                                    <input type="text" className="farmacia-form-input compact" style={{ height: '32px' }} value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
                                </div>
                            </div>

                            {/* 7. ÚLTIMAS DISPENSAÇÕES (Accordion) */}
                            <div className="farmacia-collapsible-section" style={{ marginTop: '0px' }} ref={historyRef}>
                                <button type="button" className={`collapsible-header ${showHistory ? 'active' : ''}`} onClick={() => setShowHistory(!showHistory)}>
                                    <span className="arrow">{showHistory ? '▾' : '▸'}</span>
                                    Últimas dispensações na unidade
                                </button>
                                {showHistory && (
                                    <div className="collapsible-content">
                                        <div className="hist-list-compact">
                                            {historico.length > 0 ? (
                                                historico.slice(0, 3).map((h, i) => (
                                                    <div key={i} className="hist-row-compact">
                                                        <span className="h-date">{new Date(h.data).toLocaleDateString('pt-BR')}</span>
                                                        <span className="h-qty">-{h.quantidade} {h.unidadeMedida}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="hist-empty-msg">Sem registros</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="farmacia-modal-footer">
                    <button className="farmacia-modal-btn-cancel-premium" style={{ height: '42px', fontSize: '13px' }} onClick={() => onClose(false)}>Cancelar</button>
                    <button className="farmacia-modal-btn-confirm-premium" style={{ height: '42px', fontSize: '14px', padding: '0 24px' }}
                        onClick={handleConfirm} disabled={ruptura || !med || semEstoque}>
                        Confirmar Dispensação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FarmaciaSaidaModal;
