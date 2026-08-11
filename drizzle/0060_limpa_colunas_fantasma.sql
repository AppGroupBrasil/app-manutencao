-- Limpeza das colunas criadas em tempo de execução pelos antigos
-- `ensureSignatureColumns()` / `ensureExtraColumns()`.
--
-- Aquele código rodava DDL de MySQL a cada boot. No Postgres, identificador sem
-- aspas vira minúsculo: nasceu uma segunda coluna ao lado da verdadeira
-- ("assinaturaTecnico" e "assinaturatecnico"). As minúsculas nunca receberam
-- valor — o Drizzle sempre escreveu na versão com aspas.
--
-- O código que criava isso saiu junto nesta versão; aqui só se recolhe o lixo.

ALTER TABLE "checklists"       DROP COLUMN IF EXISTS assinaturatecnico;
ALTER TABLE "checklists"       DROP COLUMN IF EXISTS assinaturasolicitante;
ALTER TABLE "ocorrencias"      DROP COLUMN IF EXISTS assinaturatecnico;
ALTER TABLE "ocorrencias"      DROP COLUMN IF EXISTS assinaturasolicitante;
ALTER TABLE "vistorias"        DROP COLUMN IF EXISTS assinaturatecnico;
ALTER TABLE "vistorias"        DROP COLUMN IF EXISTS assinaturasolicitante;
ALTER TABLE "tarefas_simples"  DROP COLUMN IF EXISTS assinaturatecnico;
ALTER TABLE "tarefas_simples"  DROP COLUMN IF EXISTS assinaturasolicitante;
ALTER TABLE "tarefas_simples"  DROP COLUMN IF EXISTS prazoconclusao;
ALTER TABLE "tarefas_simples"  DROP COLUMN IF EXISTS custoestimado;

-- A rota pública das funções personalizadas criava esta coluna sozinha, a cada
-- chamada. Agora ela é responsabilidade da migração.
ALTER TABLE "funcoes_personalizadas" ADD COLUMN IF NOT EXISTS "shareToken" varchar(64);
