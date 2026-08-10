-- Agenda de Vencimentos passa a usar o modelo do Manutenção X.
--
-- O que muda em relação ao modelo antigo daqui:
--  * `tipo` deixa de ser enum de três valores. No MX é texto livre, com os
--    tipos de manutenção cadastrados pelo próprio usuário gravados como
--    "manutencao:<slug>" — enum não comporta isso.
--  * `avisos` guarda até três avisos por vencimento, cada um por dias de
--    antecedência OU data específica, com descrição e imagens próprias. A
--    tabela `vencimento_alertas` (cinco opções fixas) continua existindo para
--    não quebrar o alerta automático antigo, mas não é o que a tela usa.
--  * `emails`, `imagens` viram listas; `qtdNotificacoes` diz quantas vezes
--    notificar.
--  * `registroDescricao`/`registroStatus` + `vencimento_anexos` são o registro
--    de execução com fotos de antes e depois.
--
-- Idempotente: pode rodar em banco que já recebeu o DDL.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vencimentos' AND column_name = 'tipo' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE "vencimentos" ALTER COLUMN "tipo" TYPE varchar(100) USING "tipo"::text;
  END IF;
END $$;

ALTER TABLE "vencimentos" ADD COLUMN IF NOT EXISTS "avisos" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "vencimentos" ADD COLUMN IF NOT EXISTS "emails" text[] DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE "vencimentos" ADD COLUMN IF NOT EXISTS "qtdNotificacoes" integer DEFAULT 0 NOT NULL;
ALTER TABLE "vencimentos" ADD COLUMN IF NOT EXISTS "imagens" text[] DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE "vencimentos" ADD COLUMN IF NOT EXISTS "registroDescricao" text;
ALTER TABLE "vencimentos" ADD COLUMN IF NOT EXISTS "registroStatus" varchar(20);

-- Fotos e documentos do registro de execução, separados em antes e depois.
CREATE TABLE IF NOT EXISTS "vencimento_anexos" (
  "id" serial PRIMARY KEY,
  "vencimentoId" integer NOT NULL REFERENCES "vencimentos"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "nome" varchar(255),
  "tipo" varchar(20) DEFAULT 'imagem' NOT NULL,
  "fase" varchar(10) DEFAULT 'antes' NOT NULL,
  "autorId" integer,
  "autorNome" varchar(255),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_vencimento_anexos_vencimento"
  ON "vencimento_anexos" ("vencimentoId");

-- Tipos de manutenção cadastráveis. No MX a lista é global da instância; aqui
-- é por organização, senão uma unidade editaria a lista das outras 14.
CREATE TABLE IF NOT EXISTS "vencimento_tipos" (
  "id" serial PRIMARY KEY,
  "condominioId" integer NOT NULL REFERENCES "condominios"("id") ON DELETE CASCADE,
  "slug" varchar(120) NOT NULL,
  "nome" varchar(120) NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_vencimento_tipos_slug"
  ON "vencimento_tipos" ("condominioId", "slug");
