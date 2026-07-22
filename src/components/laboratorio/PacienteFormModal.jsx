import React, { useState, useEffect } from 'react';
import { Loader2, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { laboratorioPacientesService } from '../../services/api/laboratorioPacientes.service';
import PacienteForm, { initialFormData, validatePacienteForm, handlePacienteChange, normalizePacienteDataForSave, applyCpfMask, applyPhoneMask, applyCepMask } from './PacienteForm';

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

    const handleChange = (e) => handlePacienteChange(e, setFormData, formErrors, setFormErrors);

    const handleSave = async (forceSave = false) => {
        if (!validatePacienteForm(formData, setFormErrors)) {
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
            const cleanData = normalizePacienteDataForSave(formData);

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
                        <PacienteForm 
                            formData={formData} 
                            formErrors={formErrors} 
                            onChange={handleChange} 
                            isSaving={isSaving}
                        />
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
