-- Data de abertura do chamado, escolhida por quem registra.
--
-- `createdAt` é quando a linha entrou no banco — serve para ordenar e auditar,
-- e não pode ser mexido. O que o cliente precisa é outra coisa: o dia em que o
-- pedido chegou, que muitas vezes é anterior ao dia em que alguém sentou para
-- cadastrar. Sem esta coluna, uma O.S. registrada na segunda sobre um problema
-- de sexta aparece como se tivesse nascido na segunda.
--
-- Nula na O.S. antiga: a tela cai em `createdAt` quando não houver data.

ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "dataAbertura" date;
