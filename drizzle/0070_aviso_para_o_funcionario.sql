-- O aviso passa a chegar em quem executa o serviço.
--
-- `notificacoes` só endereçava conta de gestor (`users`). O funcionário entra
-- pelo portal e vive em `funcionarios`: designar a equipe dele mandava e-mail e
-- nada mais — no aplicativo, a ordem simplesmente não existia até alguém
-- avisar por fora.
--
-- Uma coluna nova em vez de uma tabela nova: é a mesma caixa de avisos, com
-- outro destinatário. O sino do gestor filtra por `userId` e não enxerga linha
-- de funcionário; o do portal filtra por `funcionarioId` e não enxerga a dele.
-- Nenhum aviso existente muda de dono.

ALTER TABLE "notificacoes"
  ADD COLUMN IF NOT EXISTS "funcionarioId" integer
  REFERENCES "funcionarios" ("id") ON DELETE CASCADE;

-- Aviso de funcionário não tem conta de usuário para apontar.
ALTER TABLE "notificacoes" ALTER COLUMN "userId" DROP NOT NULL;

-- Sem isto, uma linha sem destinatário nenhum passaria e ficaria invisível para
-- os dois lados — o pior defeito possível numa caixa de avisos: some sem erro.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notificacoes_tem_destinatario'
  ) THEN
    ALTER TABLE "notificacoes"
      ADD CONSTRAINT "notificacoes_tem_destinatario"
      CHECK ("userId" IS NOT NULL OR "funcionarioId" IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_notificacoes_funcionario"
  ON "notificacoes" ("funcionarioId", "lida");
