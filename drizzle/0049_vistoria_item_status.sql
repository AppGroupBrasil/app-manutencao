-- Situações do item de vistoria passam a ser as do cliente, e não mais o par
-- conforme/não conforme: "intervencao_imediata" sozinho já estoura os 20
-- caracteres da coluna.
--
-- Idempotente.

ALTER TABLE "vistoria_itens" ALTER COLUMN "status" TYPE varchar(30);
