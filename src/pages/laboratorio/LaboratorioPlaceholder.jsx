import React from 'react';
import { Beaker } from 'lucide-react';

const LaboratorioPlaceholder = ({ title }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh', color: '#64748b' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Beaker size={40} strokeWidth={2} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{title || 'Em Construção'}</h2>
            <p style={{ fontSize: '1rem', color: '#475569', textAlign: 'center', maxWidth: '400px' }}>
                Esta tela do módulo Laboratório é um mock visual e será implementada nas próximas etapas do projeto.
            </p>
        </div>
    );
};

export default LaboratorioPlaceholder;
