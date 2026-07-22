import React from 'react';

export const applyCpfMask = (val) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
};

export const applyCnsMask = (val) => val.replace(/\D/g, '').substring(0, 15);

export const applyCepMask = (val) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    return v;
};

export const applyPhoneMask = (val) => {
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

export const onlyNumbers = (val) => val ? val.replace(/\D/g, '') : null;

export const initialFormData = {
    code: '', full_name: '', birth_date: '', sex: '', cpf: '', rg: '', cns: '',
    phone: '', mobile: '', mother_name: '', father_name: '',
    zip_code: '', street: '', number: '', complement: '', district: '', city: 'Bezerros', state: 'PE',
    notes: '', is_active: true
};

export const validatePacienteForm = (formData, setFormErrors) => {
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

    if (setFormErrors) setFormErrors(errs);
    
    const firstErrorKey = Object.keys(errs)[0];
    if (firstErrorKey) {
        const el = document.getElementsByName(firstErrorKey)[0];
        if (el) el.focus();
    }
    return Object.keys(errs).length === 0;
};

export const handlePacienteChange = (e, setFormData, formErrors, setFormErrors) => {
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
    if (formErrors && formErrors[name] && setFormErrors) {
        setFormErrors(prev => ({ ...prev, [name]: null }));
    }
};

export const normalizePacienteDataForSave = (formData) => {
    const normalizeUppercase = (value) => 
        typeof value === 'string' ? value.trim().toLocaleUpperCase('pt-BR') : value;

    return {
        ...formData,
        full_name: normalizeUppercase(formData.full_name),
        mother_name: normalizeUppercase(formData.mother_name) || null,
        father_name: normalizeUppercase(formData.father_name) || null,
        rg: formData.rg ? formData.rg.trim().replace(/\s{2,}/g, ' ') || null : null,
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
};

const PacienteForm = ({ formData, formErrors, onChange, isSaving }) => {
    const [predictedCode, setPredictedCode] = React.useState('');

    React.useEffect(() => {
        let isMounted = true;
        if (!formData?.code) {
            import('../../services/api/laboratorioPacientes.service').then(module => {
                module.laboratorioPacientesService.estimarProximoCodigo().then(code => {
                    if (isMounted) setPredictedCode(code);
                });
            });
        }
        return () => { isMounted = false; };
    }, [formData?.code]);

    if (!formData) return null;
    
    return (
        <>
            <div className="lab-pac-form-section">
                <h3 className="lab-pac-section-title">1. Identificação</h3>
                <div className="lab-pac-form-grid">
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {formData.code ? 'CÓDIGO DO PACIENTE' : 'CÓDIGO PREVISTO'}
                            {!formData.code && (
                                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: '#e2e8f0', color: '#475569', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase' }}>
                                    Provisório
                                </span>
                            )}
                        </label>
                        <input 
                            type="text" 
                            className="lab-pac-form-input" 
                            disabled 
                            value={formData.code || predictedCode || 'Calculando...'} 
                            style={!formData.code ? { background: '#f8fafc', color: '#64748b' } : { fontWeight: 'bold' }}
                        />
                        {!formData.code && (
                            <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                                {isSaving ? 'Confirmando código...' : 'O código definitivo será confirmado ao salvar o paciente.'}
                            </div>
                        )}
                    </div>
                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="lab-pac-form-label">Nome completo *</label>
                        <input type="text" name="full_name" className="lab-pac-form-input" placeholder="Ex: Maria da Silva" value={formData.full_name} onChange={onChange} autoFocus disabled={isSaving} />
                        {formErrors?.full_name && <span className="lab-pac-form-error">{formErrors.full_name}</span>}
                    </div>
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">Data de nascimento *</label>
                        <input type="date" name="birth_date" className="lab-pac-form-input" value={formData.birth_date} onChange={onChange} max={new Date().toISOString().split('T')[0]} />
                        {formErrors?.birth_date && <span className="lab-pac-form-error">{formErrors.birth_date}</span>}
                    </div>
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">Sexo *</label>
                        <select name="sex" className="lab-pac-form-select" value={formData.sex} onChange={onChange}>
                            <option value="">Selecione...</option>
                            <option value="FEMININO">Feminino</option>
                            <option value="MASCULINO">Masculino</option>
                        </select>
                        {formErrors?.sex && <span className="lab-pac-form-error">{formErrors.sex}</span>}
                    </div>
                </div>
            </div>
            
            <div className="lab-pac-form-section">
                <h3 className="lab-pac-section-title">2. Documentos</h3>
                <div className="lab-pac-form-grid">
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">CPF</label>
                        <input type="text" name="cpf" className="lab-pac-form-input" placeholder="000.000.000-00" value={formData.cpf} onChange={onChange} />
                        {formErrors?.cpf && <span className="lab-pac-form-error">{formErrors.cpf}</span>}
                    </div>
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">RG</label>
                        <input type="text" name="rg" className="lab-pac-form-input" placeholder="Apenas números ou letras" value={formData.rg} onChange={onChange} />
                    </div>
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">CNS</label>
                        <input type="text" name="cns" className="lab-pac-form-input" placeholder="15 dígitos" value={formData.cns} onChange={onChange} maxLength="15" />
                        {formErrors?.cns && <span className="lab-pac-form-error">{formErrors.cns}</span>}
                    </div>
                </div>
            </div>

            <div className="lab-pac-form-section">
                <h3 className="lab-pac-section-title">3. Contato</h3>
                <div className="lab-pac-form-grid two-cols">
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">Celular</label>
                        <input type="text" name="mobile" className="lab-pac-form-input" placeholder="(00) 00000-0000" value={formData.mobile} onChange={onChange} />
                    </div>
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">Telefone</label>
                        <input type="text" name="phone" className="lab-pac-form-input" placeholder="(00) 0000-0000" value={formData.phone} onChange={onChange} />
                    </div>
                </div>
            </div>

            <div className="lab-pac-form-section">
                <h3 className="lab-pac-section-title">4. Filiação</h3>
                <div className="lab-pac-form-grid two-cols">
                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="lab-pac-form-label" style={{ color: '#0ea5e9' }}>Nome da mãe</label>
                        <input type="text" name="mother_name" className="lab-pac-form-input" placeholder="Ex: Maria José da Silva" value={formData.mother_name} onChange={onChange} />
                    </div>
                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="lab-pac-form-label">Nome do pai</label>
                        <input type="text" name="father_name" className="lab-pac-form-input" placeholder="Ex: João da Silva" value={formData.father_name} onChange={onChange} />
                    </div>
                </div>
            </div>

            <div className="lab-pac-form-section">
                <h3 className="lab-pac-section-title">5. Endereço</h3>
                <div className="lab-pac-form-grid">
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">CEP</label>
                        <input type="text" name="zip_code" className="lab-pac-form-input" placeholder="00000-000" value={formData.zip_code} onChange={onChange} />
                    </div>
                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="lab-pac-form-label">Logradouro</label>
                        <input type="text" name="street" className="lab-pac-form-input" placeholder="Ex: Rua das Flores" value={formData.street} onChange={onChange} />
                    </div>
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">Número</label>
                        <input type="text" name="number" className="lab-pac-form-input" placeholder="Ex: 123" value={formData.number} onChange={onChange} />
                    </div>
                    <div className="lab-pac-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="lab-pac-form-label">Complemento</label>
                        <input type="text" name="complement" className="lab-pac-form-input" placeholder="Ex: Apto 101" value={formData.complement} onChange={onChange} />
                    </div>
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">Bairro</label>
                        <input type="text" name="district" className="lab-pac-form-input" placeholder="Ex: Centro" value={formData.district} onChange={onChange} />
                    </div>
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">Cidade</label>
                        <input type="text" name="city" className="lab-pac-form-input" value={formData.city} onChange={onChange} />
                    </div>
                    <div className="lab-pac-form-group">
                        <label className="lab-pac-form-label">Estado</label>
                        <select name="state" className="lab-pac-form-select" value={formData.state} onChange={onChange}>
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
                        <textarea name="notes" className="lab-pac-form-textarea" placeholder="Observações adicionais..." value={formData.notes} onChange={onChange} maxLength="500"></textarea>
                    </div>
                    <div className="lab-pac-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input type="checkbox" id="is_active_chk" name="is_active" checked={formData.is_active} onChange={onChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                        <label htmlFor="is_active_chk" style={{ cursor: 'pointer', fontWeight: 600, color: '#334155' }}>Paciente ativo</label>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PacienteForm;
