import React, { createContext, useContext, useState } from 'react';
import { mockUnidades, mockEstoqueItems } from '../../mocks/farmaciaMocks';

const FarmaciaContext = createContext(null);

export const FarmaciaProvider = ({ children }) => {
    const [unidadeAtiva, setUnidadeAtiva] = useState(mockUnidades[0]);
    const [openModal, setOpenModal] = useState(null); // null | 'entrada' | 'saida' | 'ajuste'
    const [dataRefreshKey, setDataRefreshKey] = useState(0);

    const triggerDataRefresh = () => setDataRefreshKey(prev => prev + 1);

    // Cópia mutável do estoque para feedback visual em tempo real (mock only)
    const [estoqueLocal, setEstoqueLocal] = useState(
        () => mockEstoqueItems.map(i => ({ ...i, estoquePorUnidade: { ...(i.estoquePorUnidade || {}) } }))
    );

    // Estado global de entradas (histórico)
    const [entradasLocal, setEntradasLocal] = useState([]);
    const [lastAddedId, setLastAddedId] = useState(null);

    const registrarEntrada = (novaEntrada) => {
        const id = Date.now();
        const entradaComId = { ...novaEntrada, id };
        setEntradasLocal(prev => [entradaComId, ...prev]);
        setLastAddedId(id);
        
        // Se houver código de medicamento, atualiza o estoque global
        if (novaEntrada.codigo) {
            atualizarEstoque(novaEntrada.codigo, novaEntrada.quantidade, novaEntrada.unidadeId);
        }

        // Limpa o destaque após alguns segundos
        setTimeout(() => setLastAddedId(null), 3000);
        
        return id;
    };

    const atualizarEstoque = (codigo, delta, unidadeId) => {
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
            unidadeAtiva, setUnidadeAtiva, unidades: mockUnidades,
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
