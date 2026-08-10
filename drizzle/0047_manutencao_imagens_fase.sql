-- Galeria de antes e depois na manutenção.
--
-- `manutencao_imagens` só tinha legenda e ordem, então não havia como separar
-- as fotos em antes e depois. A coluna nasce com 'antes' para o que já existe:
-- foto antiga sem classificação aparece no primeiro lado em vez de sumir.
--
-- Idempotente.

ALTER TABLE "manutencao_imagens" ADD COLUMN IF NOT EXISTS "fase" varchar(10) DEFAULT 'antes' NOT NULL;
