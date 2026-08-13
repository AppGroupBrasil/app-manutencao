-- Teste grátis de 7 dias para quem se cadastra sozinho.
--
-- Fica no dono da conta, não na organização: o teste é do cliente, e ele pode
-- abrir mais de uma unidade dentro do período.
--
-- `NULL` significa **sem prazo** — é o caso de todo cliente aberto pela conta
-- da plataforma, que é venda assistida e não passa por teste. Por isso a
-- coluna nasce nula e ninguém que já usa o sistema é afetado.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trialAte" timestamp;

CREATE INDEX IF NOT EXISTS "idx_users_trial" ON "users" ("trialAte");
