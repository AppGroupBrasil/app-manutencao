-- Exclusão passa a ser permissão própria do funcionário, separada de "criar".
-- Padrão negado: quem já tinha acesso continua criando, mas só apaga depois que
-- o gestor ligar a chave.
ALTER TABLE "funcionario_funcoes"
  ADD COLUMN IF NOT EXISTS "podeExcluir" boolean DEFAULT false NOT NULL;
