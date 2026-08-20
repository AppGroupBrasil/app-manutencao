-- A equipe passa a atender mais de uma unidade.
--
-- "Facilities" é uma equipe da rede: atende as 15 unidades do cliente. Presa a
-- uma unidade, ela não aparecia no campo "Equipe designada" das ordens das
-- outras — e o servidor recusava a designação, com razão, porque o aviso sairia
-- para o time de outra unidade.
--
-- `equipes.condominioId` continua sendo a unidade dona: é por ela que o
-- isolamento entre clientes é feito. Esta tabela responde outra pergunta —
-- "quais unidades esta equipe atende".
--
-- A carga inicial mantém tudo como está hoje: cada equipe atende a unidade em
-- que foi criada. Quem quiser espalhar uma equipe pela rede marca as unidades
-- na tela; quem não mexer não vê diferença.

CREATE TABLE IF NOT EXISTS "equipe_unidades" (
  "id" serial PRIMARY KEY,
  "equipeId" integer NOT NULL REFERENCES "equipes" ("id") ON DELETE CASCADE,
  "condominioId" integer NOT NULL REFERENCES "condominios" ("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Par único: a mesma unidade marcada duas vezes duplicaria a equipe na lista.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_equipe_unidades_par"
  ON "equipe_unidades" ("equipeId", "condominioId");

-- A consulta quente é "equipes desta unidade", feita a cada abertura de O.S.
CREATE INDEX IF NOT EXISTS "idx_equipe_unidades_unidade"
  ON "equipe_unidades" ("condominioId");

INSERT INTO "equipe_unidades" ("equipeId", "condominioId")
SELECT "id", "condominioId" FROM "equipes"
ON CONFLICT DO NOTHING;
