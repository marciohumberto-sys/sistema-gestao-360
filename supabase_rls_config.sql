-- 1. Habilitar RLS nas tabelas
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas de segurança para multi-tenant (contracts e commitments)
-- Esta política usa o tenant_id injetado no JWT pelo Supabase Auth/Hooks

CREATE POLICY "Tenant can access own data" ON contracts
FOR ALL
TO authenticated
USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('request.jwt.claim.tenant_id', true)::uuid);

CREATE POLICY "Tenant can access own data" ON commitments
FOR ALL
TO authenticated
USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('request.jwt.claim.tenant_id', true)::uuid);

-- 3. POLÍTICA TEMPORÁRIA DE DESENVOLVIMENTO
-- ATENÇÃO: Esta política permite acesso total e deve ser REMOVIDA antes de ir para produção
-- ou quando a autenticação for implementada.

CREATE POLICY "DEV allow all" ON contracts
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "DEV allow all" ON commitments
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "DEV allow all" ON tenants
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "DEV allow all" ON user_tenants
FOR ALL
USING (true)
WITH CHECK (true);

-- Comentários para referência:
-- Para remover a política de DEV e ativar o isolamento real:
-- DROP POLICY "DEV allow all" ON contracts;
-- DROP POLICY "DEV allow all" ON commitments;
-- DROP POLICY "DEV allow all" ON tenants;
-- DROP POLICY "DEV allow all" ON user_tenants;
