-- Fluxo de manutenção com prazo, programação e baixa confirmada.
--
-- O pedido: o gestor da unidade registra a necessidade com data máxima; o
-- gerente programa a data e a equipe; a equipe dá baixa; o gestor confirma; o
-- gerente finaliza. Tudo dentro da própria O.S. — o que muda são datas e
-- carimbos de quem fez cada passo.
--
-- Todas as colunas são opcionais e `etapa` nasce nula: O.S. antiga e cliente
-- que não usa o fluxo continuam funcionando exatamente como antes.

ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "prazoLimite" date;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "dataProgramada" date;

-- solicitada | programada | baixa_pedida | baixa_confirmada | finalizada.
-- Texto e não enum de propósito: etapa nova não exige alterar tipo do banco.
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "etapa" varchar(20);

ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "baixaEm" timestamp;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "baixaPorId" integer;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "baixaPorNome" varchar(255);
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "baixaObservacao" text;

ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "baixaConfirmadaEm" timestamp;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "baixaConfirmadaPorId" integer;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "baixaConfirmadaPorNome" varchar(255);

-- Índice do calendário: ele varre por unidade e por dia programado/prazo.
CREATE INDEX IF NOT EXISTS "idx_os_calendario"
  ON "ordens_servico" ("condominioId", "dataProgramada", "prazoLimite");

-- A chave que liga o fluxo, por unidade. Desligada, nada muda para o cliente.
ALTER TABLE "condominios"
  ADD COLUMN IF NOT EXISTS "osFluxoConfirmacao" boolean DEFAULT false NOT NULL;
