-- Protocolo em todas as funções, para o Quadro de Atividades importar por número.
--
-- Vencimentos, Lista de Tarefas e o próprio Quadro não tinham protocolo.
-- Ganham agora, com prefixo por função: digitar "VNC-000012" já diz de onde
-- veio, e não colide com nada.
--
-- Os protocolos que já existiam (checklist, manutenção, vistoria) ficam como
-- estão: são seis dígitos aleatórios e podem estar impressos ou compartilhados.
-- Como esses três podem coincidir entre si, a busca por protocolo devolve
-- todos os achados e deixa a escolha para quem está usando.
--
-- Idempotente.

ALTER TABLE "vencimentos" ADD COLUMN IF NOT EXISTS "protocolo" varchar(20);
ALTER TABLE "tarefas_agendadas" ADD COLUMN IF NOT EXISTS "protocolo" varchar(20);
ALTER TABLE "quadro_atividades" ADD COLUMN IF NOT EXISTS "protocolo" varchar(20);

-- Registros anteriores recebem protocolo derivado do id, que é estável.
UPDATE "vencimentos" SET "protocolo" = 'VNC-' || lpad("id"::text, 6, '0') WHERE "protocolo" IS NULL;
UPDATE "tarefas_agendadas" SET "protocolo" = 'TRF-' || lpad("id"::text, 6, '0') WHERE "protocolo" IS NULL;
UPDATE "quadro_atividades" SET "protocolo" = 'ATV-' || lpad("id"::text, 6, '0') WHERE "protocolo" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_vencimentos_protocolo" ON "vencimentos" ("protocolo");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tarefas_agendadas_protocolo" ON "tarefas_agendadas" ("protocolo");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_quadro_atividades_protocolo" ON "quadro_atividades" ("protocolo");
