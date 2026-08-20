-- Serviço entregue a quem não é da casa.
--
-- Nem toda ordem vai para uma equipe cadastrada: parte é feita por empresa
-- terceirizada, que não tem funcionário no sistema e não deve ter. Sem lugar
-- para isso, o gerente deixava "nenhuma equipe" e escrevia o nome do terceiro
-- na observação, onde nenhuma tela lê.
--
-- Texto livre e não um cadastro: é o nome de quem foi daquela vez. Preenchido,
-- `equipeId` fica nulo — as duas colunas descrevem o mesmo campo da tela, e a
-- ordem só tem um responsável pelo serviço.

ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "equipeExterna" varchar(255);
