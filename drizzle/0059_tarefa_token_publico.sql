-- Link público de leitura também para a lista de tarefas, para o QR do cartão
-- apontar para algum lugar. Mesma solução das outras funções.
ALTER TABLE "tarefas_agendadas"
  ADD COLUMN IF NOT EXISTS "shareToken" varchar(64);

UPDATE "tarefas_agendadas"
  SET "shareToken" = md5(random()::text || clock_timestamp()::text || id::text)
  WHERE "shareToken" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_tarefas_agendadas_share_token"
  ON "tarefas_agendadas" ("shareToken");
