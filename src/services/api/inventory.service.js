import { supabase } from '../../lib/supabase';

export const inventoryService = {
    /**
     * Traz as categorias ativas do tenant logado
     */
    async getActiveCategories(tenantId) {
        const { data, error } = await supabase
            .from('item_categories')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('name');
            
        if (error) throw error;
        return data;
    },

    /**
     * Fluxo Rápido: Valida duplicidade, gera código incremental local e insere
     */
    async createItemFast(payload) {
        if (!payload.name) throw new Error("Nome do item é obrigatório.");
        
        const normalizedName = payload.name.trim().replace(/\s+/g, ' ').toUpperCase();
        console.log("[DEBUG] createItemFast - Nome original:", payload.name, " | Normalizado:", normalizedName);

        // 1. Checar duplicidade de nome (Ignora case)
        const { data: existing } = await supabase
            .from('inventory_items')
            .select('id')
            .eq('tenant_id', payload.tenant_id)
            .ilike('name', normalizedName)
            .limit(1);

        if (existing && existing.length > 0) {
            throw new Error("Já existe um item com esse nome.");
        }

        // 2. Escolher prefixo
        let prefix = 'MT';
        if (payload.item_type === 'MEDICAMENTO') prefix = 'MD';
        else if (payload.item_type === 'INSUMO') prefix = 'IN';

        // 3. Buscar todos os códigos atuais com este prefixo para calcular o maior numericamente
        const { data: allCodesData, error: allCodesError } = await supabase
            .from('inventory_items')
            .select('code')
            .eq('tenant_id', payload.tenant_id)
            .ilike('code', `${prefix}%`);

        if (allCodesError) throw allCodesError;

        let maxNumber = 0;
        
        if (allCodesData && allCodesData.length > 0) {
            allCodesData.forEach(item => {
                if (item.code) {
                    const numPart = item.code.substring(prefix.length);
                    const parsed = parseInt(numPart, 10);
                    if (!isNaN(parsed) && parsed > maxNumber) {
                        maxNumber = parsed;
                    }
                }
            });
        }
        
        let newNumber = maxNumber + 1;
        // Formata para mínimo de 3 dígitos: MD001, MD131, MD1000
        let newCode = `${prefix}${String(newNumber).padStart(3, '0')}`;

        console.log(`[DEBUG] Prefix: ${prefix}, Highest Number: ${maxNumber}, Extracted From: all codes, Final Code: ${newCode}`);

        // 4. Implementar um retry simples em caso de colisão no insert
        let attempts = 0;
        const maxAttempts = 5;
        let finalData = null;
        let lastError = null;

        while (attempts < maxAttempts) {
            const insertPayload = {
                ...payload,
                name: normalizedName,
                code: newCode,
                is_active: true
            };

            const { data, error } = await supabase
                .from('inventory_items')
                .insert([insertPayload])
                .select()
                .single();

            if (error) {
                lastError = error;
                // Supabase (PostgreSQL) unique constraint violation code is '23505'
                if (error.code === '23505' || (error.message && error.message.includes('already exists'))) {
                    attempts++;
                    console.log(`[DEBUG] Colisão detectada ao inserir código ${newCode} (Tentativa ${attempts} de ${maxAttempts})`);
                    newNumber++;
                    newCode = `${prefix}${String(newNumber).padStart(3, '0')}`;
                    continue;
                } else {
                    throw error;
                }
            } else {
                finalData = data;
                break;
            }
        }

        if (!finalData) {
            console.error("[DEBUG] Falha ao tentar criar código único após várias tentativas:", lastError);
            throw new Error("Não foi possível gerar um código único após múltiplas tentativas. Verifique com o suporte.");
        }

        return finalData;
    },

    /**
     * Fluxo Edição: Atualiza os dados de um item existente
     */
    async updateItemFast(itemId, payload, tenantId) {
        if (!payload.name) throw new Error("Nome do item é obrigatório.");
        
        const normalizedName = payload.name.trim().replace(/\s+/g, ' ').toUpperCase();

        // 1. Checar duplicidade de nome (ignora colisão com o próprio item)
        const { data: existing } = await supabase
            .from('inventory_items')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('name', normalizedName)
            .neq('id', itemId)
            .limit(1);

        if (existing && existing.length > 0) {
            throw new Error("Já existe outro item com esse nome.");
        }

        const updatePayload = {
            ...payload,
            name: normalizedName
        };

        const { data, error } = await supabase
            .from('inventory_items')
            .update(updatePayload)
            .eq('id', itemId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) {
            console.error("Erro ao atualizar item:", error);
            throw new Error("Falha ao atualizar o item.");
        }

        return data;
    }
};
