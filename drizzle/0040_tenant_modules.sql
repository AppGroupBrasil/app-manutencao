-- Isolamento de módulos por tenant.
-- Idempotente: pode ser reaplicado sem efeito colateral.

-- 1. Segmento de mercado e sobrescrita de vocabulário por organização
ALTER TABLE "condominios" ADD COLUMN IF NOT EXISTS "segmento" varchar(50) DEFAULT 'condominio';
ALTER TABLE "condominios" ADD COLUMN IF NOT EXISTS "labels" json;

-- 2. Remover duplicatas de (condominioId, funcaoId) antes do índice único.
--    Mantém a linha mais recente e preserva "habilitada = true" se qualquer
--    duplicata estiver ligada, para não desligar módulo de cliente em produção.
UPDATE "condominio_funcoes" cf
SET "habilitada" = true
WHERE EXISTS (
  SELECT 1 FROM "condominio_funcoes" d
  WHERE d."condominioId" = cf."condominioId"
    AND d."funcaoId" = cf."funcaoId"
    AND d."habilitada" = true
);

DELETE FROM "condominio_funcoes" a
USING "condominio_funcoes" b
WHERE a."condominioId" = b."condominioId"
  AND a."funcaoId" = b."funcaoId"
  AND a."id" < b."id";

-- 3. Índice único: garante upsert seguro por (tenant, módulo)
CREATE UNIQUE INDEX IF NOT EXISTS "condominio_funcoes_tenant_funcao_uq"
  ON "condominio_funcoes" ("condominioId", "funcaoId");

-- 4. Índice de leitura (middleware consulta por tenant a cada requisição)
CREATE INDEX IF NOT EXISTS "condominio_funcoes_tenant_idx"
  ON "condominio_funcoes" ("condominioId");

-- ATENÇÃO: a materialização dos módulos dos tenants existentes NÃO está aqui.
-- Ela usa o registry (shared/modules/registry.ts) como fonte de verdade.
--
-- Na prática você não precisa aplicar este arquivo à mão: `pnpm
-- db:materializar-modulos` executa este mesmo DDL (idempotente) e em seguida a
-- materialização, na ordem correta. O arquivo existe para manter o histórico
-- do schema junto das demais migrations.
