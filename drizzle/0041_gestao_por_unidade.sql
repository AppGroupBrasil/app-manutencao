-- Hierarquia gestor-chefe > gestor de unidade > funcionário.
--
-- `condominios.sindicoId` é uma coluna só: sem um vínculo explícito, cliente com
-- gestor-chefe sobre várias unidades não pode ter também um gestor por unidade.
-- `usuario_condominios` acrescenta esse segundo caminho de acesso, somado ao
-- dono em server/_core/tenant.ts.
--
-- Mesmo DDL aplicado por scripts/db/seed-asa.ts, para quem preferir rodar por fora.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "senhaProvisoria" boolean DEFAULT false NOT NULL;

ALTER TABLE "condominios" ADD COLUMN IF NOT EXISTS "tipoUnidade" varchar(20);

CREATE TABLE IF NOT EXISTS "usuario_condominios" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES "users" ("id"),
  "condominioId" integer NOT NULL REFERENCES "condominios" ("id"),
  "papel" varchar(20) DEFAULT 'gestor' NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Um vínculo por par: o seed depende disto para ser idempotente.
CREATE UNIQUE INDEX IF NOT EXISTS "usuario_condominios_user_condominio_idx"
  ON "usuario_condominios" ("userId", "condominioId");

-- Consulta de todo request autenticado: tenants do usuário.
CREATE INDEX IF NOT EXISTS "usuario_condominios_user_idx"
  ON "usuario_condominios" ("userId");
