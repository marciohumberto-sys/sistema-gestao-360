import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockEstoqueItems } from '../../mocks/farmaciaMocks';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const FarmaciaContext = createContext(null);

/**
 * Retorna true se o usuário tiver acesso a múltiplas unidades da Farmácia.
 * Usado para decidir se o seletor de unidade deve ser exibido.
 */
export const isMultiUnitFarmacia = (isSuperAdmin, farmaciaScopes) => {
    if (isSuperAdmin) return true;
    const uniqueUnitIds = [...new Set(farmaciaScopes.map(s => s.unit_id).filter(Boolean))];
    return uniqueUnitIds.length > 1;
};

export const FarmaciaProvider = ({ children }) => {
    const { scopes, isSuperAdmin } = useAuth();

    // null = não resolvido ainda; { id, label } = unidade do usuário logado
    const [unidadeAtiva, setUnidadeAtiva] = useState(null);
    // Lista de unidades disponíveis para o usuário (1 item para escopo fixo, N para multiunidade)
    const [unidades, setUnidades] = useState([]);
    // true quando a resolução terminou (com ou sem resultado)
    const [isUnitResolved, setIsUnitResolved] = useState(false);

    const [openModal, setOpenModal] = useState(null);
    const [dataRefreshKey, setDataRefreshKey] = useState(0);
    const triggerDataRefresh = () => setDataRefreshKey(prev => prev + 1);

    // Cópia mutável do estoque para feedback visual em tempo real (mock only)
    const [estoqueLocal, setEstoqueLocal] = useState(
        () => mockEstoqueItems.map(i => ({ ...i, estoquePorUnidade: { ...(i.estoquePorUnidade || {}) } }))
    );

    // Estado global de entradas (histórico)
    const [entradasLocal, setEntradasLocal] = useState([]);
    const [lastAddedId, setLastAddedId] = useState(null);

    // =====================================================================
    // Resolução da unidade ativa a partir do scope real do usuário logado
    // =====================================================================
    useEffect(() => {
        // Aguarda o AuthContext terminar de carregar os scopes
        // scopes === undefined significa que ainda não foi populado
        if (scopes === undefined) return;

        const resolveUnit = async () => {
            try {
                if (isSuperAdmin) {
                    // SUPERADMIN: acessa todas as unidades do tenant
                    const { data: allUnits } = await supabase
                        .from('units')
                        .select('id, name')
                        .order('name');

                    const unidadesDisponiveis = (allUnits || []).map(u => ({
                        id: u.id,
                        label: u.name
                    }));
                    setUnidades(unidadesDisponiveis);
                    // SUPERADMIN inicia com a primeira unidade disponível para navegação
                    setUnidadeAtiva(unidadesDisponiveis[0] || null);
                    setIsUnitResolved(true);
                    return;
                }

                // Filtra escopos do módulo Farmácia de forma robusta (case-insensitive)
                const farmaciaScopes = (scopes || []).filter(s =>
                    s.module_key?.toLowerCase() === 'farmacia' && s.unit_id
                );

                if (farmaciaScopes.length === 0) {
                    // Usuário sem escopo de unidade na Farmácia → bloqueia gravação
                    console.warn('[Farmácia] Usuário sem unit_id no escopo de Farmácia.');
                    setUnidadeAtiva(null);
                    setUnidades([]);
                    setIsUnitResolved(true);
                    return;
                }

                // Obtém os UUIDs únicos de unidade do escopo do usuário
                const unitIds = [...new Set(farmaciaScopes.map(s => s.unit_id))];

                // Busca os dados reais dessas unidades no banco
                const { data: unitRows, error: unitError } = await supabase
                    .from('units')
                    .select('id, name')
                    .in('id', unitIds);

                if (unitError) throw unitError;

                const unidadesDisponiveis = (unitRows || []).map(u => ({
                    id: u.id,
                    label: u.name
                }));

                setUnidades(unidadesDisponiveis);

                if (unidadesDisponiveis.length === 0) {
                    // Scopes existem mas os UUIDs não batem com nenhuma unit → bloqueia
                    console.warn('[Farmácia] unit_id do scope não encontrado na tabela units.');
                    setUnidadeAtiva(null);
                } else if (unidadesDisponiveis.length === 1) {
                    // Escopo único → fixa e trava a unidade
                    setUnidadeAtiva(unidadesDisponiveis[0]);
                } else {
                    // Multiunidade real (ex: GESTOR com acesso a UPA + UMSJ) → padrão = primeira
                    setUnidadeAtiva(unidadesDisponiveis[0]);
                }

            } catch (e) {
                console.error('[Farmácia] Falha ao resolver unidade ativa:', e);
                // Em caso de erro, mantém null — não usa UPA como fallback
                setUnidadeAtiva(null);
            } finally {
                setIsUnitResolved(true);
            }
        };

        resolveUnit();
    }, [scopes, isSuperAdmin]);

    const registrarEntrada = (novaEntrada) => {
        const id = Date.now();
        const entradaComId = { ...novaEntrada, id };
        setEntradasLocal(prev => [entradaComId, ...prev]);
        setLastAddedId(id);
        
        if (novaEntrada.codigo) {
            atualizarEstoque(novaEntrada.codigo, novaEntrada.quantidade, novaEntrada.unidadeId);
        }

        setTimeout(() => setLastAddedId(null), 3000);
        return id;
    };

    const atualizarEstoque = (codigo, delta, unidadeId) => {
        // unidadeId aqui é o label/id do mock (uso interno apenas para feedback visual)
        const uid = unidadeId || 'upa';
        setEstoqueLocal(prev => prev.map(item => {
            if (item.codigo !== codigo) return item;
            const atualUnidade = item.estoquePorUnidade?.[uid] ?? 0;
            return {
                ...item,
                estoqueAtual: Math.max(0, item.estoqueAtual + delta),
                estoquePorUnidade: { ...item.estoquePorUnidade, [uid]: Math.max(0, atualUnidade + delta) },
            };
        }));
    };

    return (
        <FarmaciaContext.Provider value={{
            unidadeAtiva,
            setUnidadeAtiva,
            unidades,
            isUnitResolved,
            openModal, setOpenModal,
            dataRefreshKey, triggerDataRefresh,
            estoqueLocal, atualizarEstoque,
            entradasLocal, setEntradasLocal, registrarEntrada, lastAddedId
        }}>
            {children}
        </FarmaciaContext.Provider>
    );
};

export const useFarmacia = () => {
    const ctx = useContext(FarmaciaContext);
    if (!ctx) throw new Error('useFarmacia deve ser usado dentro de FarmaciaProvider');
    return ctx;
};
