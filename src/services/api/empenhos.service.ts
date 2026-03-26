import { supabase } from '../../lib/supabase';
import { Commitment } from '../../types';

export const empenhosService = {
    list: async (): Promise<Commitment[]> => {
        const { data, error } = await supabase
            .from('commitments')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    listByContract: async (contractId: string): Promise<Commitment[]> => {
        const { data, error } = await supabase
            .from('commitments')
            .select('*')
            .eq('contract_id', contractId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    getMetrics: async (): Promise<{ totalValue: number; count: number; activeValue: number }> => {
        // This can be kept as placeholder or implemented with a real query if needed.
        // For now, keeping signature to avoid breaks but focusing on listByContract.
        const { data, error } = await supabase
            .from('commitments')
            .select('initial_amount, added_amount, annulled_amount, status');
        if (error) throw error;
        
        const metrics = (data || []).reduce((acc, c) => {
            const val = (c.initial_amount || 0) + (c.added_amount || 0) - (c.annulled_amount || 0);
            acc.totalValue += val;
            acc.count += 1;
            if (c.status !== 'PAGO') acc.activeValue += val;
            return acc;
        }, { totalValue: 0, count: 0, activeValue: 0 });

        return metrics;
    },
    totalByContract: async (contractId: string): Promise<{ total: number }> => {
        const { data, error } = await supabase
            .from('commitments')
            .select('initial_amount, added_amount, annulled_amount')
            .eq('contract_id', contractId);
        if (error) throw error;
        
        const total = (data || []).reduce((sum, c) => 
            sum + (c.initial_amount || 0) + (c.added_amount || 0) - (c.annulled_amount || 0), 0);
            
        return { total };
    }
};
