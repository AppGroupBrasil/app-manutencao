-- Link público de leitura para checklist, manutenção, ocorrência e vistoria.
--
-- A ordem de serviço já tinha o dela (`shareToken`), e é o que faz o QR abrir
-- no celular de quem está no local sem pedir login. As quatro funções rápidas
-- não tinham — o QR não existia justamente porque não havia para onde apontar.
--
-- Os registros que já existem recebem token agora; os novos ganham na criação.

DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['checklists', 'manutencoes', 'ocorrencias', 'vistorias']
  LOOP
    CONTINUE WHEN to_regclass(tabela) IS NULL;

    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS "shareToken" varchar(64)',
      tabela
    );

    -- md5 de valores aleatórios: sem extensão extra no banco e sem colisão
    -- prática, e o índice único abaixo garante o resto.
    EXECUTE format(
      'UPDATE %I SET "shareToken" = md5(random()::text || clock_timestamp()::text || id::text) '
      || 'WHERE "shareToken" IS NULL',
      tabela
    );

    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I ("shareToken")',
      'idx_' || tabela || '_share_token',
      tabela
    );
  END LOOP;
END $$;
