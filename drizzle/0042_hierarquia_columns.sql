-- `hierarquia`/`criadoPor*` estavam só em drizzle/schema.ts: nenhuma migration ou
-- snapshot cria essas colunas. Em banco que nunca recebeu o DDL à mão, qualquer
-- `select ... from users` (login inclusive) falha por coluna inexistente.
--
-- Idempotente: pode rodar em banco que já tem as colunas.

DO $$ BEGIN
  CREATE TYPE "hierarquia" AS ENUM ('admin_master', 'admin', 'responsavel', 'funcionario');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hierarquia" "hierarquia" DEFAULT 'funcionario';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "criadoPorUserId" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "senhaProvisoria" boolean DEFAULT false NOT NULL;

ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "hierarquia" "hierarquia" DEFAULT 'funcionario';
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "criadoPorId" integer;
