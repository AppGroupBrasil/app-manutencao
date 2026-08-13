-- Calendário e Chamados em Aberto viraram módulos do registry.
--
-- Sem esta migração as duas telas sumiriam sozinhas de quem já usa o sistema:
-- organização com configuração gravada recebe módulo novo DESLIGADO (é o
-- opt-in que impede função nova de vazar para todo mundo). Como hoje as duas
-- aparecem para todos, o estado que preserva o comportamento é "ligado".
--
-- Organização sem nenhuma linha em `condominio_funcoes` não entra aqui: ela
-- cai no pacote padrão do segmento, onde os dois módulos já estão.

INSERT INTO "condominio_funcoes" ("condominioId", "funcaoId", "habilitada")
SELECT DISTINCT cf."condominioId", novo."funcaoId", true
FROM "condominio_funcoes" cf
CROSS JOIN (VALUES ('calendario'), ('painel-pendencias')) AS novo("funcaoId")
WHERE NOT EXISTS (
  SELECT 1
  FROM "condominio_funcoes" existente
  WHERE existente."condominioId" = cf."condominioId"
    AND existente."funcaoId" = novo."funcaoId"
);
