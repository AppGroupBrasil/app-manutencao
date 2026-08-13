-- Acessos do gestor e exclusão de cliente.
--
-- `users.lastSignedIn` só guarda o último acesso, então não respondia à
-- pergunta que a plataforma faz na hora de cobrar: "esse cliente está usando?".
-- Uma linha por entrada resolve, e é barata — login é evento raro comparado a
-- qualquer outra escrita do sistema.
--
-- `excluidoEm` é exclusão em duas etapas: some da lista e não entra mais, mas
-- o dado fica. Apagar de verdade um cliente significa varrer cinquenta tabelas
-- e é irreversível — com um toque na tela, cedo ou tarde alguém apaga o
-- cliente errado.

CREATE TABLE IF NOT EXISTS "usuario_acessos" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "em" timestamp DEFAULT now() NOT NULL,
  "ip" varchar(45)
);

CREATE INDEX IF NOT EXISTS "idx_usuario_acessos_user_em"
  ON "usuario_acessos" ("userId", "em");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "excluidoEm" timestamp;
