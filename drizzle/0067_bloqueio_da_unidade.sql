-- Bloqueio na unidade, e não só na conta do dono.
--
-- Bloquear o gestor fechava uma porta e deixava a outra aberta: a equipe entra
-- pelo portal do funcionário, que não passa pela conta dele. Cliente suspenso
-- continuava operando normalmente pelas mãos dos funcionários.
--
-- Com a marca na organização, o corte vale para todos que trabalham nela —
-- dono, gestor de unidade e equipe. Nulo é o estado normal: nenhuma
-- organização existente é afetada.

ALTER TABLE "condominios" ADD COLUMN IF NOT EXISTS "bloqueadaEm" timestamp;
ALTER TABLE "condominios" ADD COLUMN IF NOT EXISTS "motivoBloqueio" varchar(255);

CREATE INDEX IF NOT EXISTS "idx_condominios_bloqueio" ON "condominios" ("bloqueadaEm");
