import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getTenantSlug } from '../utils/getTenantSlug';

interface TenantContextType {
    tenantId: string | null;
    tenantSlug: string | null;
    loading: boolean;
    error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [tenantSlug, setTenantSlug] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTenant = async () => {
            const slug = getTenantSlug();
            setTenantSlug(slug);

            try {
                const { data, error: supabaseError } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('slug', slug)
                    .maybeSingle();

                if (supabaseError) {
                    console.error('Error fetching tenant:', supabaseError);
                    setError(`Error fetching tenant: ${supabaseError.message}`);
                } else if (data) {
                    setTenantId(data.id);
                } else {
                    setError('Tenant not found');
                }
            } catch (err) {
                console.error('Unexpected error fetching tenant:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTenant();
    }, []);

    return (
        <TenantContext.Provider value={{ tenantId, tenantSlug, loading, error }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};


