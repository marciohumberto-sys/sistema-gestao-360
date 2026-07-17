import React, { useState, useEffect } from 'react';
import { Loader2, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { laboratorioPacientesService } from '../../services/api/laboratorioPacientes.service';

const applyCpfMask = (val) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
};
const applyCnsMask = (val) => val.replace(/\D/g, '').substring(0, 15);
const applyCepMask = (val) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    return v;
};
const applyPhoneMask = (val) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) {
        return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (v.length > 6) {
        return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (v.length > 2) {
        return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (v.length > 0) {
        return v.replace(/^(\d{0,2})/, '($1');
    }
    return v;
};
const onlyNumbers = (val) => val ? val.replace(/\D/g, '') : null;

const initialFormData = {
    code: '', full_name: '', birth_date: '', sex: '', cpf: '', rg: '', cns: '',
    phone: '', mobile: '', mother_name: '', father_name: '',
    zip_code: '', street: '', number: '', complement: '', district: '', city: 'Bezerros', state: 'PE',
    notes: '', is_active: true
};

const PacienteFormModal = ({ isOpen, mode = 'create', patientId = null, onClose, onSuccess, onError }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [originalData, setOriginalData] = useState(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, cancelText: 'Cancelar', confirmText: 'Confirmar' });

    useEffect(() => {
        if (isOpen) {
            setFormErrors({});
            if (mode === 'create') {
                setFormData(initialFormData);
                setOriginalData(initialFormData);
                setLoading(false);
            } else if (mode === 'edit' && patientId) {
                loadPatient(patientId);
            }
        }
    }, [isOpen, mode, patientId]);

    const loadPatient = async (id) => {
        try {
            setLoading(true);
            const data = await laboratorioPacientesService.buscarPacientePorId(id);
            const editData = {
                code: data.code || '',
                full_name: data.full_name || '',
                birth_date: data.birth_date || '',
                sex: data.sex || '',
                cpf: data.cpf ? applyCpfMask(data.cpf) : '',
                rg: data.rg || '',
                cns: data.cns || '',
                phone: data.phone ? applyPhoneMask(data.phone) : '',
                mobile: data.mobile ? applyPhoneMask(data.mobile) : '',
                mother_name: data.mother_name || '',
                father_name: data.father_name || '',
                zip_code: data.zip_code ? applyCepMask(data.zip_code) : '',
                street: data.street || '',
                number: data.number || '',
                complement: data.complement || '',
                district: data.district || '',
                city: data.city || '',
                state: data.state || '',
                notes: data.notes || '',
                is_active: data.is_active
            };
            setFormData(editData);
            setOriginalData(editData);
        } catch (err) {
            if (onError) onError('Erro ao carregar dados do paciente');
        } finally {
            setLoading(false);
        }
    };

    const hasChanges = () => JSON.stringify(formData) !== JSON.stringify(originalData);

    const handleCloseModal = () => {
        if (hasChanges()) {
            setConfirmModal({
                open: true,
                title: 'Descartar alterações',
                message: 'Existem alterações não salvas. Deseja sair mesmo assim?',
                confirmText: 'Sair sem salvar',
                onConfirm: () => {
                    setConfirmModal({ open: false });
                    onClose();
                }
            });
        } else {
            onClose();
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let v = type === 'checkbox' ? checked : value;
        
        const upperCaseFields = ['full_name', 'mother_name', 'father_name', 'street', 'complement', 'district', 'city', 'state', 'notes'];

        if (upperCaseFields.includes(name) && typeof v === 'string') {
            v = v.toLocaleUpperCase('pt-BR');
        }

        if (name === 'full_name' || name === 'mother_name' || name === 'father_name') {
            v = v.replace(/\s{2,}/g, ' '); 
        } else if (name === 'cpf') {
            v = applyCpfMask(v);
        } else if (name === 'cns') {
            v = applyCnsMask(v);
        } else if (name === 'phone' || name === 'mobile') {
            v = applyPhoneMask(v);
        } else if (name === 'zip_code') {
            v = applyCepMask(v);
        }
        
        setFormData(prev => ({ ...prev, [name]: v }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const errs = {};
        if (!formData.full_name?.trim()) errs.full_name = 'Informe o nome completo.';
        if (!formData.birth_date) {
            errs.birth_date = 'Informe uma data de nascimento válida.';
        } else {
            const dateObj = new Date(formData.birth_date + 'T12:00:00');
            const now = new Date();
            if (dateObj > now) errs.birth_date = 'Não permitir data futura.';
        }
        if (!formData.sex) errs.sex = 'Informe o sexo.';
        
        const plainCpf = onlyNumbers(formData.cpf);
        if (plainCpf && plainCpf.length !== 11) errs.cpf = 'Informe um CPF válido.';
        
        const plainCns = onlyNumbers(formData.cns);
        if (plainCns && plainCns.length !== 15) errs.cns = 'Informe um CNS válido.';

        setFormErrors(errs);
        const firstErrorKey = Object.keys(errs)[0];
        if (firstErrorKey) {
            const el = document.getElementsByName(firstErrorKey)[0];
            if (el) el.focus();
        }
        return Object.keys(errs).length === 0;
    };

    const handleSave = async (forceSave = false) => {
        if (!validateForm()) {
            if (onError) onError('Verifique os campos obrigatórios');
            return;
        }

        if (!forceSave && mode === 'edit' && originalData.is_active && !formData.is_active) {
            setConfirmModal({
                open: true,
                title: 'Inativar paciente',
                message: 'Este paciente deixará de aparecer nas buscas padrão. Deseja continuar?',
                confirmText: 'Inativar paciente',
                onConfirm: () => {
                    setConfirmModal({ open: false });
                    handleSave(true);
                }
            });
            return;
        }

        setIsSaving(true);
        try {
            const normalizeUppercase = (value) => 
                typeof value === 'string' ? value.trim().toLocaleUpperCase('pt-BR') : value;

            const cleanData = {
                ...formData,
                full_name: normalizeUppercase(formData.full_name),
                mother_name: normalizeUppercase(formData.mother_name) || null,
                father_name: normalizeUppercase(formData.father_name) || null,
                rg: formData.rg.trim().replace(/\s{2,}/g, ' ') || null,
                cpf: onlyNumbers(formData.cpf) || null,
                cns: onlyNumbers(formData.cns) || null,
                phone: onlyNumbers(formData.phone) || null,
                mobile: onlyNumbers(formData.mobile) || null,
                zip_code: onlyNumbers(formData.zip_code) || null,
                street: normalizeUppercase(formData.street) || null,
                number: formData.number?.trim() || null,
                complement: normalizeUppercase(formData.complement) || null,
                district: normalizeUppercase(formData.district) || null,
                city: normalizeUppercase(formData.city) || null,
                state: normalizeUppercase(formData.state) || null,
                notes: normalizeUppercase(formData.notes) || null
            };

            if (!forceSave) {
                const dupCheck = await laboratorioPacientesService.verificarDuplicidadePaciente(cleanData, mode === 'edit' ? patientId : null);
                
                if (dupCheck.duplicadoForte) {
                    if (onError) onError(dupCheck.motivo);
                    setIsSaving(false);
                    return;
                }
                if (dupCheck.alerta) {
                    setConfirmModal({
                        open: true,
                        title: 'Possível duplicidade',
                        message: dupCheck.motivo,
                        confirmText: 'Salvar mesmo assim',
                        onConfirm: () => {
                            setConfirmModal({ open: false });
                            handleSave(true);
                        }
                    });
                    setIsSaving(false);
                    return;
                }
            }

            let resultPatient = null;
            if (mode === 'create') {
                resultPatient = await laboratorioPacientesService.criarPaciente(cleanData);
                if (onSuccess) onSuccess('Paciente cadastrado com sucesso.', resultPatient);
            } else {
                resultPatient = await laboratorioPacientesService.atualizarPaciente(patientId, cleanData);
                if (onSuccess) onSuccess('Paciente atualizado com sucesso.', resultPatient);
            }

            // onClose() will be called by parent usually, or we can call it here:
            // onClose(); // Wait, the parent's onSuccess should probably call onClose.

        } catch (err) {
            if (onError) onError('Não foi possível salvar o paciente. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="lab-modal-overlay" onClick={handleCloseModal} onKeyDown={(e) => e.key === 'Escape' && handleCloseModal()} tabIndex={-1}>
            <div className="lab-pac-modal-content" onClick={e => e.stopPropagation()}>
                <div className="lab-pac-modal-header">
                    <h2 className="lab-pac-modal-title">{mode === 'create' ? 'Novo paciente' : 'Editar paciente'}</h2>
                    <button className="lab-modal-close" onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><XCircle size={24} /></button>
                </div>
                <div className="lab-pac-modal-body">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                            <Loader2 size={32} className="spin" style={{ color: '#3b82f6' }} />
                        </div>
                    ) : (
                        <>
                            <div className="lab-pac-form-section">
                                <h3 className="lab-pac-section-title">1. Identificação</h3>
                                <div className="lab-pac-form-grid">
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Código do paciente</label>
                                        <input type="text" className="lab-pac-form-input" disabled value={formData.code || 'Gerado ao salvar'} />
                                    </div>
                                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="lab-pac-form-label">Nome completo *</label>
                                        <input type="text" name="full_name" className="lab-pac-form-input" placeholder="Ex: Maria da Silva" value={formData.full_name} onChange={handleChange} autoFocus />
                                        {formErrors.full_name && <span className="lab-pac-form-error">{formErrors.full_name}</span>}
                                    </div>
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Data de nascimento *</label>
                                        <input type="date" name="birth_date" className="lab-pac-form-input" value={formData.birth_date} onChange={handleChange} max={new Date().toISOString().split('T')[0]} />
                                        {formErrors.birth_date && <span className="lab-pac-form-error">{formErrors.birth_date}</span>}
                                    </div>
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Sexo *</label>
                                        <select name="sex" className="lab-pac-form-select" value={formData.sex} onChange={handleChange}>
                                            <option value="">Selecione...</option>
                                            <option value="FEMININO">Feminino</option>
                                            <option value="MASCULINO">Masculino</option>
                                        </select>
                                        {formErrors.sex && <span className="lab-pac-form-error">{formErrors.sex}</span>}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="lab-pac-form-section">
                                <h3 className="lab-pac-section-title">2. Documentos</h3>
                                <div className="lab-pac-form-grid">
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">CPF</label>
                                        <input type="text" name="cpf" className="lab-pac-form-input" placeholder="000.000.000-00" value={formData.cpf} onChange={handleChange} />
                                        {formErrors.cpf && <span className="lab-pac-form-error">{formErrors.cpf}</span>}
                                    </div>
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">RG</label>
                                        <input type="text" name="rg" className="lab-pac-form-input" placeholder="Apenas números ou letras" value={formData.rg} onChange={handleChange} />
                                    </div>
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">CNS</label>
                                        <input type="text" name="cns" className="lab-pac-form-input" placeholder="15 dígitos" value={formData.cns} onChange={handleChange} maxLength="15" />
                                        {formErrors.cns && <span className="lab-pac-form-error">{formErrors.cns}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="lab-pac-form-section">
                                <h3 className="lab-pac-section-title">3. Contato</h3>
                                <div className="lab-pac-form-grid two-cols">
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Celular</label>
                                        <input type="text" name="mobile" className="lab-pac-form-input" placeholder="(00) 00000-0000" value={formData.mobile} onChange={handleChange} />
                                    </div>
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Telefone</label>
                                        <input type="text" name="phone" className="lab-pac-form-input" placeholder="(00) 0000-0000" value={formData.phone} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="lab-pac-form-section">
                                <h3 className="lab-pac-section-title">4. Filiação</h3>
                                <div className="lab-pac-form-grid two-cols">
                                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="lab-pac-form-label" style={{ color: '#0ea5e9' }}>Nome da mãe</label>
                                        <input type="text" name="mother_name" className="lab-pac-form-input" placeholder="Ex: Maria José da Silva" value={formData.mother_name} onChange={handleChange} />
                                    </div>
                                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="lab-pac-form-label">Nome do pai</label>
                                        <input type="text" name="father_name" className="lab-pac-form-input" placeholder="Ex: João da Silva" value={formData.father_name} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="lab-pac-form-section">
                                <h3 className="lab-pac-section-title">5. Endereço</h3>
                                <div className="lab-pac-form-grid">
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">CEP</label>
                                        <input type="text" name="zip_code" className="lab-pac-form-input" placeholder="00000-000" value={formData.zip_code} onChange={handleChange} />
                                    </div>
                                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="lab-pac-form-label">Logradouro</label>
                                        <input type="text" name="street" className="lab-pac-form-input" placeholder="Ex: Rua das Flores" value={formData.street} onChange={handleChange} />
                                    </div>
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Número</label>
                                        <input type="text" name="number" className="lab-pac-form-input" placeholder="Ex: 123" value={formData.number} onChange={handleChange} />
                                    </div>
                                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="lab-pac-form-label">Complemento</label>
                                        <input type="text" name="complement" className="lab-pac-form-input" placeholder="Ex: Apto 101" value={formData.complement} onChange={handleChange} />
                                    </div>
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Bairro</label>
                                        <input type="text" name="district" className="lab-pac-form-input" placeholder="Ex: Centro" value={formData.district} onChange={handleChange} />
                                    </div>
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Cidade</label>
                                        <input type="text" name="city" className="lab-pac-form-input" value={formData.city} onChange={handleChange} />
                                    </div>
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Estado</label>
                                        <select name="state" className="lab-pac-form-select" value={formData.state} onChange={handleChange}>
                                            <option value="">Selecione...</option>
                                            <option value="PE">Pernambuco (PE)</option>
                                            <option value="PB">Paraíba (PB)</option>
                                            <option value="AL">Alagoas (AL)</option>
                                            <option value="SP">São Paulo (SP)</option>
                                            <option value="RJ">Rio de Janeiro (RJ)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="lab-pac-form-section">
                                <h3 className="lab-pac-section-title">6. Observações e Status</h3>
                                <div className="lab-pac-form-grid one-col">
                                    <div className="lab-pac-form-group">
                                        <label className="lab-pac-form-label">Observações</label>
                                        <textarea name="notes" className="lab-pac-form-textarea" placeholder="Observações adicionais..." value={formData.notes} onChange={handleChange} maxLength="500"></textarea>
                                    </div>
                                    <div className="lab-pac-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <input type="checkbox" id="is_active_chk" name="is_active" checked={formData.is_active} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                        <label htmlFor="is_active_chk" style={{ cursor: 'pointer', fontWeight: 600, color: '#334155' }}>Paciente ativo</label>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="lab-pac-modal-footer">
                    <button type="button" className="lab-btn lab-btn-outline" onClick={handleCloseModal} disabled={isSaving}>Cancelar</button>
                    <button type="button" className="lab-btn lab-btn-primary" onClick={() => handleSave(false)} disabled={isSaving}>
                        {isSaving ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
                        {mode === 'create' ? 'Salvar paciente' : 'Salvar alterações'}
                    </button>
                </div>
            </div>

            {/* Modal de Confirmação */}
            {confirmModal.open && (
                <div className="lab-modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="lab-modal-content" style={{ width: '400px', padding: '1.5rem', textAlign: 'center', background: '#fff', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
                        <AlertTriangle size={48} style={{ color: '#eab308', margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#1e293b' }}>{confirmModal.title}</h3>
                        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="lab-btn lab-btn-outline" style={{ flex: 1 }} onClick={() => setConfirmModal({ open: false })}>{confirmModal.cancelText}</button>
                            <button className="lab-btn lab-btn-primary" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }} onClick={confirmModal.onConfirm}>{confirmModal.confirmText}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PacienteFormModal;
