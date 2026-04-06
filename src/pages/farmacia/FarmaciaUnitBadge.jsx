import React from 'react';
import { Building2 } from 'lucide-react';
import { useFarmacia } from './FarmaciaContext';
import { useAuth } from '../../context/AuthContext';
import './FarmaciaModal.css';

/**
 * Badge que exibe a unidade ativa.
 * - Usuário com escopo de unidade única: exibe apenas o badge informativo (seletor bloqueado).
 * - SUPERADMIN ou usuário com escopo multiunidade real: exibe o seletor completo.
 * - Enquanto a unidade não está resolvida: exibe "Carregando...".
 */
const FarmaciaUnitBadge = () => {
    const { unidadeAtiva, setUnidadeAtiva, unidades, isUnitResolved } = useFarmacia();
    const { scopes, isSuperAdmin } = useAuth();

    // Determina se o usuário tem acesso a múltiplas unidades na Farmácia
    // Normaliza module_key para comparação robusta (case-insensitive)
    const farmaciaScopes = (scopes || []).filter(s =>
        s.module_key?.toLowerCase() === 'farmacia' && s.unit_id
    );
    const uniqueUnitIds = [...new Set(farmaciaScopes.map(s => s.unit_id))];
    const isMultiUnit = isSuperAdmin || uniqueUnitIds.length > 1;

    // Enquanto ainda resolvendo
    if (!isUnitResolved) {
        return (
            <div className="farmacia-unit-badge">
                <Building2 size={13} strokeWidth={2} />
                <span className="farmacia-unit-badge-label" style={{ opacity: 0.6 }}>Carregando unidade...</span>
            </div>
        );
    }

    // Usuário sem unidade resolvida
    if (!unidadeAtiva) {
        return (
            <div className="farmacia-unit-badge" style={{ color: 'var(--color-danger)' }}>
                <Building2 size={13} strokeWidth={2} />
                <span className="farmacia-unit-badge-label">Sem unidade vinculada</span>
            </div>
        );
    }

    // Usuário de unidade única → badge somente leitura, sem seletor
    if (!isMultiUnit) {
        return (
            <div className="farmacia-unit-badge">
                <Building2 size={13} strokeWidth={2} />
                <span className="farmacia-unit-badge-label">Unidade:</span>
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    {unidadeAtiva.label}
                </span>
            </div>
        );
    }

    // SUPERADMIN ou multiunidade real → seletor completo
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
