-- Lista de Tarefas, no modelo do Manutenção X.
--
-- Nenhuma das duas existia aqui: `tarefas_simples` deste projeto é outra coisa
-- (rascunho de vistoria/manutenção), não tarefa recorrente atribuída a alguém.
--
-- Espelha `tarefas_agendadas` e `tarefas_execucoes` do MX.
-- Idempotente.

CREATE TABLE IF NOT EXISTS "tarefas_agendadas" (
  "id" serial PRIMARY KEY,
  "condominioId" integer NOT NULL REFERENCES "condominios"("id") ON DELETE CASCADE,
  "titulo" varchar(255) NOT NULL,
  "descricao" text,
  "funcionarioId" integer,
  "funcionarioNome" varchar(255),
  "bloco" varchar(50),
  "local" varchar(255),
  "recorrencia" varchar(20) DEFAULT 'unica' NOT NULL,
  -- 0=domingo … 6=sábado, como no MX
  "diasSemana" integer[] DEFAULT '{}'::integer[] NOT NULL,
  "dataEspecifica" date,
  "diaMes" integer,
  "prioridade" varchar(20) DEFAULT 'media' NOT NULL,
  "criadoPorId" integer,
  "criadoPorNome" varchar(255),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tarefas_agendadas_condominio"
  ON "tarefas_agendadas" ("condominioId");
CREATE INDEX IF NOT EXISTS "idx_tarefas_agendadas_funcionario"
  ON "tarefas_agendadas" ("funcionarioId");

CREATE TABLE IF NOT EXISTS "tarefas_execucoes" (
  "id" serial PRIMARY KEY,
  "tarefaId" integer NOT NULL REFERENCES "tarefas_agendadas"("id") ON DELETE CASCADE,
  "funcionarioId" integer,
  "funcionarioNome" varchar(255),
  "status" varchar(20) DEFAULT 'pendente' NOT NULL,
  "fotos" text[] DEFAULT '{}'::text[] NOT NULL,
  "observacao" text,
  "dataExecucao" date DEFAULT CURRENT_DATE NOT NULL,
  "horaExecucao" varchar(10),
  "latitude" varchar(20),
  "longitude" varchar(20),
  "audioUrl" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tarefas_execucoes_tarefa"
  ON "tarefas_execucoes" ("tarefaId");

-- Módulo novo nasce desligado para quem já tem configuração explícita gravada,
-- e as 15 unidades da ASA têm. Sem estas linhas a função existe mas fica
-- invisível para elas.
INSERT INTO "condominio_funcoes" ("condominioId", "funcaoId", "habilitada")
SELECT c."id", f."funcaoId", true
FROM "condominios" c
CROSS JOIN (VALUES ('tarefas-agendadas')) AS f("funcaoId")
WHERE EXISTS (
  SELECT 1 FROM "condominio_funcoes" cf WHERE cf."condominioId" = c."id"
)
AND NOT EXISTS (
  SELECT 1 FROM "condominio_funcoes" cf
  WHERE cf."condominioId" = c."id" AND cf."funcaoId" = f."funcaoId"
);
