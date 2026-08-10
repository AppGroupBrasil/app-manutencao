-- Quadro de Atividades, no modelo do Manutenção X.
--
-- Diferença deliberada em relação a lá: aqui a atividade pode apontar para um
-- registro que já existe no sistema — ordem de serviço, vencimento, checklist,
-- vistoria ou manutenção. `origemTipo`/`origemId` guardam esse vínculo, e o
-- título é copiado para o quadro continuar legível mesmo que a origem mude.
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS "quadro_atividades" (
  "id" serial PRIMARY KEY,
  "condominioId" integer NOT NULL REFERENCES "condominios"("id") ON DELETE CASCADE,
  "titulo" varchar(255) NOT NULL,
  "descricao" text,
  -- a_fazer | em_andamento | em_revisao | concluido
  "status" varchar(20) DEFAULT 'a_fazer' NOT NULL,
  "prioridade" varchar(20) DEFAULT 'media' NOT NULL,
  -- diaria | semanal | mensal | anual | data_especifica
  "rotina" varchar(20) DEFAULT 'diaria' NOT NULL,
  "dataEspecifica" date,
  "responsavelId" integer,
  "responsavelNome" varchar(255),
  -- Vínculo com o que já existe: os | vencimento | checklist | vistoria | manutencao
  "origemTipo" varchar(20),
  "origemId" integer,
  "ordem" integer DEFAULT 0 NOT NULL,
  "criadoPorId" integer,
  "criadoPorNome" varchar(255),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_quadro_atividades_condominio"
  ON "quadro_atividades" ("condominioId");
CREATE INDEX IF NOT EXISTS "idx_quadro_atividades_status"
  ON "quadro_atividades" ("status");

INSERT INTO "condominio_funcoes" ("condominioId", "funcaoId", "habilitada")
SELECT c."id", 'quadro-atividades', true
FROM "condominios" c
WHERE EXISTS (SELECT 1 FROM "condominio_funcoes" cf WHERE cf."condominioId" = c."id")
AND NOT EXISTS (
  SELECT 1 FROM "condominio_funcoes" cf
  WHERE cf."condominioId" = c."id" AND cf."funcaoId" = 'quadro-atividades'
);
