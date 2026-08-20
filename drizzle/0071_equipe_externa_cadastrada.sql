-- A empresa de fora vira equipe cadastrada.
--
-- Ela era texto digitado na O.S.: o nome se repetia a cada ordem, saía escrito
-- de um jeito diferente cada vez e nunca aparecia no cadastro. Agora é uma
-- equipe como as outras — entra no mesmo seletor, atende as mesmas unidades e
-- pode ser designada sem redigitar nada.
--
-- O que a diferencia é não ter funcionário dentro: quem recebe o aviso da O.S.
-- é o e-mail da empresa, e não o supervisor do time.
--
-- `ordens_servico.equipeExterna` fica onde está: são as ordens que já foram
-- gravadas com o nome digitado, e apagar isso reescreveria o histórico.

ALTER TABLE "equipes" ADD COLUMN IF NOT EXISTS "externa" boolean NOT NULL DEFAULT false;
ALTER TABLE "equipes" ADD COLUMN IF NOT EXISTS "email" varchar(255);
ALTER TABLE "equipes" ADD COLUMN IF NOT EXISTS "whatsapp" varchar(20);
