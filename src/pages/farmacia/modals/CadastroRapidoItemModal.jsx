import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { useTenant } from '../../../context/TenantContext';
import { useAuth } from '../../../context/AuthContext';
import { inventoryService } from '../../../services/api/inventory.service';
import { supabase } from '../../../lib/supabase';
import '../FarmaciaModal.css';

const CadastroRapidoItemModal = ({ isOpen, onClose, onSuccess, initialName = '' }) => {
    const { tenantId } = useTenant();
    const [categories, setCategories] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [formData, setFormData] = useState({
        name: '',
        item_type: 'MEDICAMENTO',
        category_id: '',
        unit_of_measure: 'UN',
        controls_batch: true,
        controls_expiration: true,
        minimum_stock: '',
        item_form: '',
        notes: ''
    });

    // Toggle advanced section
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: initialName,
                item_type: 'MEDICAMENTO',
                category_id: '',
                unit_of_measure: 'UN',
                controls_batch: true,
                controls_expiration: true,
                minimum_stock: '',
                item_form: '',
                notes: ''
            });
            setShowAdvanced(false);
            setErrors({});
            fetchCategories();
        }
    }, [isOpen, initialName, tenantId]);

    const fetchCategories = async () => {
        try {
            if (!tenantId) return; // Wait for tenantId
            const data = await inventoryService.getActiveCategories(tenantId);
            setCategories(data || []);
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSave = async () => {
        const newErrors = {};
        if (!formData.name || formData.name.trim() === '') newErrors.name = 'Nome obrigatório';
        if (!formData.item_type) newErrors.item_type = 'Tipo de item obrigatório';
        if (!formData.category_id) newErrors.category_id = 'Categoria obrigatória';
        if (!formData.unit_of_measure) newErrors.unit_of_measure = 'Unidade obrigatória';

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return;

        setIsSaving(true);
        try {
            // Find appropriate secretariat for Farmácia
            // Assuming we take the first available secretariat if not passed, 
            // but items usually belong to tenant. The requirement asks for secretariat_id.
            const { data: secData } = await supabase.from('secretariats')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1);

            const secretariat_id = secData?.length > 0 ? secData[0].id : null;

            const payload = {
                tenant_id: tenantId,
                secretariat_id: secretariat_id,
                name: formData.name,
                item_type: formData.item_type,
                category_id: formData.category_id,
                unit_of_measure: formData.unit_of_measure,
                controls_batch: formData.controls_batch,
                controls_expiration: formData.controls_expiration,
                minimum_stock: formData.minimum_stock ? Number(formData.minimum_stock) : null,
                item_form: formData.item_form,
                notes: formData.notes
            };

            const newItem = await inventoryService.createItemFast(payload);
            
            // Map the item the same way MedAutocomplete maps the suggestions
            const mappedItem = {
                id: newItem.id,
                codigo: newItem.code || '-',
                descricao: newItem.name,
                unidade: newItem.unit_of_measure || 'UN'
            };

            onSuccess(mappedItem);
        } catch (error) {
            console.error('Erro ao salvar item rápido:', error);
            setErrors({ submit: error.message || 'Falha ao cadastrar item.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="farmacia-modal-overlay" style={{ zIndex: 1100 }}>
            <div className="farmacia-modal" style={{ maxWidth: '500px' }}>
                <div className="farmacia-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                        <h2 className="farmacia-modal-title" style={{ fontSize: '1.15rem' }}>Cadastrar Novo Item</h2>
                        <span className="farmacia-modal-subtitle">Cadastro rápido (Módulo Farmácia)</span>
                    </div>
                    <button className="farmacia-modal-close" onClick={onClose} disabled={isSaving}>
                        <X size={18} />
                    </button>
                </div>
                
                <div className="farmacia-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '70vh' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Nome do Item <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input 
                                type="text" 
                                name="name" 
                                className="farmacia-form-input" 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="Ex: Dipirona Sódica 500mg" 
                                style={errors.name ? { borderColor: 'var(--color-danger)' } : {}}
                            />
                            {errors.name && <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600 }}>{errors.name}</span>}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="farmacia-form-group" style={{ flex: 1 }}>
                                <label className="farmacia-form-label">Tipo <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                <select 
                                    name="item_type" 
                                    className="farmacia-form-input" 
                                    value={formData.item_type} 
                                    onChange={handleChange}
                                >
                                    <option value="MEDICAMENTO">Medicamento</option>
                                    <option value="MATERIAL">Material</option>
                                    <option value="INSUMO">Insumo</option>
                                </select>
                            </div>
                            <div className="farmacia-form-group" style={{ flex: 1 }}>
                                <label className="farmacia-form-label">Categoria <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                <select 
                                    name="category_id" 
                                    className="farmacia-form-input" 
                                    value={formData.category_id} 
                                    onChange={handleChange}
                                    style={errors.category_id ? { borderColor: 'var(--color-danger)' } : {}}
                                >
                                    <option value="">Selecione...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                {errors.category_id && <span style={{ color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600 }}>{errors.category_id}</span>}
                            </div>
                        </div>

                        <div className="farmacia-form-group">
                            <label className="farmacia-form-label">Unidade de Medida <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input 
                                type="text" 
                                name="unit_of_measure" 
                                className="farmacia-form-input" 
                                value={formData.unit_of_measure} 
                                onChange={handleChange} 
                                placeholder="Ex: CX, FR, UN" 
                            />
                        </div>

                        {/* Seção Opcional */}
                        <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--border-light)', paddingTop: '1rem' }}>
                            <button 
                                type="button" 
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: showAdvanced ? '1rem' : '0'
                                }}
                            >
                                {showAdvanced ? 'Ocultar Opções Avançadas' : 'Vincular Opções Avançadas (Controles, Mínimos...)'}
                            </button>

                            {showAdvanced && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'farmacia-fade-in 0.3s ease' }}>
                                    
                                    <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                                            <input type="checkbox" name="controls_batch" checked={formData.controls_batch} onChange={handleChange} />
                                            <span>Controlar Lote</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                                            <input type="checkbox" name="controls_expiration" checked={formData.controls_expiration} onChange={handleChange} />
                                            <span>Controlar Validade</span>
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="farmacia-form-group" style={{ flex: 1 }}>
                                            <label className="farmacia-form-label">Formato</label>
                                            <input 
                                                type="text" 
                                                name="item_form" 
                                                className="farmacia-form-input" 
                                                value={formData.item_form} 
                                                onChange={handleChange} 
                                                placeholder="Ex: Comprimido" 
                                            />
                                        </div>
                                        <div className="farmacia-form-group" style={{ flex: 1 }}>
                                            <label className="farmacia-form-label">Estoque Mín.</label>
                                            <input 
                                                type="number" 
                                                name="minimum_stock" 
                                                className="farmacia-form-input" 
                                                value={formData.minimum_stock} 
                                                onChange={handleChange} 
                                                placeholder="0" 
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="farmacia-form-group">
                                        <label className="farmacia-form-label">Observações</label>
                                        <textarea 
                                            name="notes" 
                                            className="farmacia-form-textarea" 
                                            value={formData.notes} 
                                            onChange={handleChange} 
                                            placeholder="..." 
                                            style={{ minHeight: '60px' }}
                                        />
                                    </div>

                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {errors.submit && (
                    <div style={{ margin: '0 1.5rem 1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} />
                        {errors.submit}
                    </div>
                )}

                <div className="farmacia-modal-footer" style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid var(--border-light)' }}>
                    <button className="farmacia-modal-btn-cancel" onClick={onClose} disabled={isSaving}>Cancelar</button>
                    <button 
                        className="farmacia-modal-btn-confirm farmacia-action-saida" 
                        onClick={handleSave} 
                        style={{ padding: '0.6rem 2rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        disabled={isSaving}
                    >
                        <Save size={16} />
                        {isSaving ? 'Cadastrando...' : 'Cadastrar novo item'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CadastroRapidoItemModal;
