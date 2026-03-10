-- Migration script for Contract Module Adjustments

-- 1. Add new columns to the `contracts` table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS object_description TEXT,
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS manager_reg VARCHAR(50),
ADD COLUMN IF NOT EXISTS tech_fiscal_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS tech_fiscal_reg VARCHAR(50),
ADD COLUMN IF NOT EXISTS admin_fiscal_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS admin_fiscal_reg VARCHAR(50),
ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS rescission_date DATE,
ADD COLUMN IF NOT EXISTS rescission_notes TEXT,
ADD COLUMN IF NOT EXISTS rescission_pdf_url TEXT;

-- 2. Create `contract_history` table
CREATE TABLE IF NOT EXISTS public.contract_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'VALUE_CHANGE', 'RESCISSION', 'STATUS_CHANGE'
    old_value NUMERIC(15, 2),
    new_value NUMERIC(15, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id ON public.contract_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_tenant_id ON public.contract_history(tenant_id);

-- Enable RLS on contract_history
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_history
CREATE POLICY "Users can view history of their tenant" 
ON public.contract_history FOR SELECT 
USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can create history in their tenant" 
ON public.contract_history FOR INSERT 
WITH CHECK (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));

-- 3. Storage Bucket for Contracts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracts_files', 'contracts_files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for contracts_files bucket
CREATE POLICY "Users can view their tenant contract files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'contracts_files' AND (auth.uid() = owner OR owner IS NULL));

CREATE POLICY "Users can upload contract files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'contracts_files' AND auth.uid() = owner);

CREATE POLICY "Users can update their contract files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'contracts_files' AND auth.uid() = owner);

CREATE POLICY "Users can delete their contract files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'contracts_files' AND auth.uid() = owner);
