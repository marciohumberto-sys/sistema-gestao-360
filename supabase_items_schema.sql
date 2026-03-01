-- A) Criar tabela secretariats
CREATE TABLE IF NOT EXISTS public.secretariats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B) Criar tabela contract_items
CREATE TABLE IF NOT EXISTS public.contract_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    item_number text,
    description text NOT NULL,
    unit text,
    unit_price numeric DEFAULT 0,
    total_quantity numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C) Criar tabela contract_item_allocations
CREATE TABLE IF NOT EXISTS public.contract_item_allocations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    contract_item_id uuid NOT NULL REFERENCES public.contract_items(id) ON DELETE CASCADE,
    secretariat_id uuid NOT NULL REFERENCES public.secretariats(id) ON DELETE CASCADE,
    quantity_allocated numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionando FKs para a tabela tenants
ALTER TABLE public.secretariats 
    ADD CONSTRAINT secretariats_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.contract_items 
    ADD CONSTRAINT contract_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.contract_item_allocations 
    ADD CONSTRAINT contract_item_allocations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


-- Habilitar RLS nas novas tabelas para manter a conformidade (Usando a mesma política DEV temporária)
ALTER TABLE public.secretariats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_item_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DEV allow all on secretariats" ON public.secretariats FOR ALL USING (true);
CREATE POLICY "DEV allow all on contract_items" ON public.contract_items FOR ALL USING (true);
CREATE POLICY "DEV allow all on contract_item_allocations" ON public.contract_item_allocations FOR ALL USING (true);
