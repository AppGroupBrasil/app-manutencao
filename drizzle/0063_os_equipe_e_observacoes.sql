-- Equipe designada e observações adicionais na O.S.
--
-- A O.S. já tinha responsáveis individuais; o que faltava era dizer QUAL
-- EQUIPE ficou com o serviço, que é como o cliente distribui trabalho — e é
-- pelo supervisor dessa equipe que o aviso sai.
--
-- Colunas opcionais: O.S. antiga e cliente que não usa equipe seguem igual.

ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "equipeId" integer;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "observacoes" text;

-- Equipe apagada não pode levar a O.S. junto nem deixar id apontando para o
-- nada: o vínculo simplesmente se desfaz e o histórico da ordem continua.
DO $$
BEGIN
  ALTER TABLE "ordens_servico"
    ADD CONSTRAINT "ordens_servico_equipeId_equipes_id_fk"
    FOREIGN KEY ("equipeId") REFERENCES "equipes"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_ordens_servico_equipe" ON "ordens_servico" ("equipeId");
