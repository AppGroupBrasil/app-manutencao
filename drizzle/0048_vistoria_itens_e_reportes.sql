-- Vistoria no modelo do Manutenção X: vistoria com itens.
--
-- A tabela `vistorias` daqui já existia, mas sem itens — e no MX a vistoria é
-- justamente uma lista de itens, cada um com situação (conforme, não conforme,
-- atenção), observação, fotos e antes/depois.
--
-- O reporte de problema também deixa de ser exclusivo do checklist: no MX a
-- tabela `reportes` atende checklist e vistoria. Por isso `checklist_reportes`
-- vira `reportes` e ganha as colunas de vistoria. A renomeação é segura porque
-- a tabela nasceu nesta mesma leva de trabalho e não foi para produção.
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS "vistoria_itens" (
  "id" serial PRIMARY KEY,
  "vistoriaId" integer NOT NULL REFERENCES "vistorias"("id") ON DELETE CASCADE,
  "local" varchar(255),
  "descricao" varchar(500) NOT NULL,
  "status" varchar(20) DEFAULT 'pendente' NOT NULL,
  "prioridade" varchar(20) DEFAULT 'media' NOT NULL,
  "observacao" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "fotoAntes" text,
  "descAntes" text,
  "fotoDepois" text,
  "descDepois" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_vistoria_itens_vistoria"
  ON "vistoria_itens" ("vistoriaId");

CREATE TABLE IF NOT EXISTS "vistoria_item_anexos" (
  "id" serial PRIMARY KEY,
  "itemId" integer NOT NULL REFERENCES "vistoria_itens"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "nome" varchar(255),
  "tipo" varchar(20) DEFAULT 'imagem' NOT NULL,
  "autorId" integer,
  "autorNome" varchar(255),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_vistoria_item_anexos_item"
  ON "vistoria_item_anexos" ("itemId");

-- `checklist_reportes` passa a atender também vistoria.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checklist_reportes')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reportes') THEN
    ALTER TABLE "checklist_reportes" RENAME TO "reportes";
  END IF;
END $$;

ALTER TABLE "reportes" ADD COLUMN IF NOT EXISTS "vistoriaId" integer REFERENCES "vistorias"("id") ON DELETE SET NULL;
ALTER TABLE "reportes" ADD COLUMN IF NOT EXISTS "vistoriaItemId" integer REFERENCES "vistoria_itens"("id") ON DELETE SET NULL;

-- Módulo `vistorias` já existe no registry; garante que esteja ligado para quem
-- tem configuração explícita gravada.
INSERT INTO "condominio_funcoes" ("condominioId", "funcaoId", "habilitada")
SELECT c."id", 'vistorias', true
FROM "condominios" c
WHERE EXISTS (SELECT 1 FROM "condominio_funcoes" cf WHERE cf."condominioId" = c."id")
AND NOT EXISTS (
  SELECT 1 FROM "condominio_funcoes" cf
  WHERE cf."condominioId" = c."id" AND cf."funcaoId" = 'vistorias'
);
