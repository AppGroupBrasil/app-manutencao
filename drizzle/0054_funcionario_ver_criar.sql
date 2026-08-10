-- Permissão do funcionário deixa de ser um sim/não e passa a separar o que ele
-- VÊ do que ele pode CRIAR.
--
-- `habilitada` continua sendo a chave-mestra da função: desligada, some da tela
-- dele. `podeCriar` diz se além de ver ele registra. Ambas nascem ligadas —
-- quem cadastra um funcionário espera que ele trabalhe, não que fique preso.
--
-- Idempotente.

ALTER TABLE "funcionario_funcoes" ADD COLUMN IF NOT EXISTS "podeCriar" boolean DEFAULT true NOT NULL;

-- Linhas antigas nasceram só com `habilitada`: mantém o comportamento atual.
UPDATE "funcionario_funcoes" SET "podeCriar" = true WHERE "podeCriar" IS NULL;
