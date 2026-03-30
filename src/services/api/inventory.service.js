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

        // 3. Buscar o maior código atual com este string (ex: 'MD0005')
        const { data: latest } = await supabase
            .from('inventory_items')
            .select('code')
            .eq('tenant_id', payload.tenant_id)
            .ilike('code', `${prefix}%`)
            .order('code', { ascending: false })
            .limit(1);

        let newNumber = 1;
        if (latest && latest.length > 0 && latest[0].code) {
            const numPart = latest[0].code.replace(prefix, '');
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed)) {
                newNumber = parsed + 1;
            }
        }
        
        // Formata para 3-4 dígitos dependendo, melhor padronizar em 4 dígitos: MD0001
        const newCode = `${prefix}${String(newNumber).padStart(4, '0')}`;

        // 4. Montar Payload
        const insertPayload = {
            ...payload,
            name: normalizedName,
            code: newCode,
            is_active: true
        };

        // 5. Inserir
        const { data, error } = await supabase
            .from('inventory_items')
            .insert([insertPayload])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
