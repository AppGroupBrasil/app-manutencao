-- Ordens de Serviço: o que o Manutenção X tem e faltava aqui.
--
--  * `osAutoNotificar` na organização: ao criar a O.S., todos os funcionários
--    da unidade recebem notificação no aplicativo. É desligado por padrão —
--    ligar avisa gente, então não pode valer sem alguém pedir.
--  * `notificarOsEmail` no funcionário: quem recebe o e-mail de abertura.
--    Ligado por padrão, igual ao MX, onde a tela desmarca quem não quer.
--  * Avaliação da O.S. concluída (nota de 1 a 5 e comentário).
--
-- Idempotente.

ALTER TABLE "condominios" ADD COLUMN IF NOT EXISTS "osAutoNotificar" boolean DEFAULT false NOT NULL;
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "notificarOsEmail" boolean DEFAULT true NOT NULL;

ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "avaliacaoNota" integer;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "avaliacaoComentario" text;
