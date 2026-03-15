import React from 'react';
import { Building2 } from 'lucide-react';
import { useFarmacia } from './FarmaciaContext';
import './FarmaciaModal.css';

/**
 * Badge discreto que exibe a unidade ativa e permite trocar via select.
 * Usado no header das páginas operacionais (Entradas, Saídas, Ajustes).
 */
const FarmaciaUnitBadge = () => {
    const { unidadeAtiva, setUnidadeAtiva, unidades } = useFarmacia();

    return (
        <div className="farmacia-unit-badge">
            <Building2 size={13} strokeWidth={2} />
            <span className="farmacia-unit-badge-label">Operando em:</span>
            <select
                className="farmacia-unit-select-inline"
                value={unidadeAtiva.id}
                onChange={e => setUnidadeAtiva(unidades.find(u => u.id === e.target.value))}
                title="Trocar unidade"
            >
                {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                ))}
            </select>
        </div>
    );
};

export default FarmaciaUnitBadge;
