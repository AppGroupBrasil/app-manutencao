-- Checklist no formato do Manutenção X.
--
-- O que existia aqui: item com `descricao`, `completo` e uma `observacao`
-- única. O que o MX tem e faltava:
--  * antes e depois POR ITEM (foto + descrição de cada lado);
--  * anexos por item — aqui as imagens eram do checklist inteiro;
--  * reporte de problema, que lá vira registro próprio com protocolo,
--    status e prioridade (tabela `reportes`).
--
-- Idempotente.

ALTER TABLE "checklist_itens" ADD COLUMN IF NOT EXISTS "fotoAntes" text;
ALTER TABLE "checklist_itens" ADD COLUMN IF NOT EXISTS "descAntes" text;
ALTER TABLE "checklist_itens" ADD COLUMN IF NOT EXISTS "fotoDepois" text;
ALTER TABLE "checklist_itens" ADD COLUMN IF NOT EXISTS "descDepois" text;

CREATE TABLE IF NOT EXISTS "checklist_item_anexos" (
  "id" serial PRIMARY KEY,
  "itemId" integer NOT NULL REFERENCES "checklist_itens"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "nome" varchar(255),
  "tipo" varchar(20) DEFAULT 'imagem' NOT NULL,
  "autorId" integer,
  "autorNome" varchar(255),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_checklist_item_anexos_item"
  ON "checklist_item_anexos" ("itemId");

-- Problema reportado a partir de um item do checklist. `itemDesc` é copiado em
-- vez de referenciado: o reporte sobrevive à edição ou exclusão do item, como
-- no Manutenção X.
CREATE TABLE IF NOT EXISTS "checklist_reportes" (
  "id" serial PRIMARY KEY,
  "condominioId" integer NOT NULL REFERENCES "condominios"("id") ON DELETE CASCADE,
  "checklistId" integer REFERENCES "checklists"("id") ON DELETE SET NULL,
  "itemId" integer REFERENCES "checklist_itens"("id") ON DELETE SET NULL,
  "protocolo" varchar(20) NOT NULL UNIQUE,
  "itemDesc" text,
  "descricao" text NOT NULL,
  "status" varchar(20) DEFAULT 'aberto' NOT NULL,
  "prioridade" varchar(20) DEFAULT 'media' NOT NULL,
  "imagens" text[] DEFAULT '{}'::text[] NOT NULL,
  "criadoPorId" integer,
  "criadoPorNome" varchar(255),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_checklist_reportes_condominio"
  ON "checklist_reportes" ("condominioId");
CREATE INDEX IF NOT EXISTS "idx_checklist_reportes_status"
  ON "checklist_reportes" ("status");
