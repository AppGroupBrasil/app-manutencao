-- Protocolo passa a ser emitido pelo banco, por sequence.
--
-- Antes cada função sorteava um número (ou lia max(id)) e conferia se já
-- existia: entre a leitura e a gravação cabe outra requisição, e duas pessoas
-- registrando ao mesmo tempo geravam o mesmo protocolo. `nextval` é atômico e
-- nunca repete, nem sob concorrência.
--
-- Cada sequence começa acima do maior número já usado na tabela, para não
-- colidir com o que foi gravado no modelo antigo.

DO $$
DECLARE
  alvo record;
  maximo bigint;
  atual bigint;
BEGIN
  FOR alvo IN
    SELECT * FROM (VALUES
      ('reportes',          'protocolo_reporte'),
      ('ordens_servico',    'protocolo_os'),
      ('quadro_atividades', 'protocolo_atividade'),
      ('tarefas_agendadas', 'protocolo_tarefa'),
      ('vencimentos',       'protocolo_vencimento'),
      ('qrcodes',           'protocolo_qrcode'),
      ('qrcode_respostas',  'protocolo_qrcode_resposta'),
      ('tarefas_simples',   'protocolo_tarefa_simples'),
      ('timelines',         'protocolo_timeline')
    ) AS v(tabela, sequencia)
  LOOP
    CONTINUE WHEN to_regclass(alvo.tabela) IS NULL;

    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', alvo.sequencia);

    -- Só o último grupo de dígitos interessa: "OS-260810-3475" -> 3475.
    EXECUTE format(
      'SELECT COALESCE(MAX(sufixo::bigint), 0) FROM ('
      || 'SELECT regexp_replace(protocolo, ''^.*-'', '''') AS sufixo FROM %I WHERE protocolo IS NOT NULL'
      || ') t WHERE sufixo ~ ''^[0-9]+$''',
      alvo.tabela
    ) INTO maximo;

    -- Nunca recua: se a sequence já passou do maior protocolo (porque houve
    -- exclusão de registros), reaplicar a migração não pode devolver números
    -- que já foram entregues.
    SELECT COALESCE(
      (SELECT last_value FROM pg_sequences
        WHERE schemaname = 'public' AND sequencename = alvo.sequencia), 0)
      INTO atual;

    maximo := GREATEST(maximo, atual);
    PERFORM setval(alvo.sequencia, GREATEST(maximo, 1), maximo > 0);
  END LOOP;
END $$;

-- Checklist, manutenção, ocorrência e vistoria mostram só o número, sem
-- prefixo. Com uma sequence para cada, as quatro começariam em 000001 e o
-- mesmo protocolo apontaria para quatro registros diferentes — a busca por
-- protocolo do Quadro de Atividades ficaria ambígua em toda importação. Uma
-- sequence só, dividida pelas quatro, mantém o formato de seis dígitos e
-- garante que o número identifica um registro único.
DO $$
DECLARE
  maximo bigint;
  atual bigint;
BEGIN
  CREATE SEQUENCE IF NOT EXISTS protocolo_funcao_rapida;

  SELECT COALESCE(MAX(sufixo::bigint), 0) INTO maximo FROM (
    SELECT regexp_replace(protocolo, '^.*-', '') AS sufixo
      FROM checklists WHERE protocolo IS NOT NULL
    UNION ALL
    SELECT regexp_replace(protocolo, '^.*-', '')
      FROM manutencoes WHERE protocolo IS NOT NULL
    UNION ALL
    SELECT regexp_replace(protocolo, '^.*-', '')
      FROM ocorrencias WHERE protocolo IS NOT NULL
    UNION ALL
    SELECT regexp_replace(protocolo, '^.*-', '')
      FROM vistorias WHERE protocolo IS NOT NULL
  ) t WHERE sufixo ~ '^[0-9]+$';

  SELECT COALESCE(
    (SELECT last_value FROM pg_sequences
      WHERE schemaname = 'public' AND sequencename = 'protocolo_funcao_rapida'), 0)
    INTO atual;

  maximo := GREATEST(maximo, atual);
  PERFORM setval('protocolo_funcao_rapida', GREATEST(maximo, 1), maximo > 0);
END $$;

-- Sequences por função, criadas numa versão anterior desta migração.
DROP SEQUENCE IF EXISTS protocolo_checklist;
DROP SEQUENCE IF EXISTS protocolo_manutencao;
DROP SEQUENCE IF EXISTS protocolo_ocorrencia;
DROP SEQUENCE IF EXISTS protocolo_vistoria;

-- Rede de segurança: as demais tabelas de protocolo já têm índice único; estas
-- duas ficaram de fora. Se houver duplicado herdado, o índice não é criado e o
-- aviso aparece no log — a sequence acima já impede duplicado novo.
DO $$
DECLARE
  alvo record;
  duplicados bigint;
BEGIN
  FOR alvo IN
    SELECT * FROM (VALUES
      ('qrcodes',        'idx_qrcodes_protocolo_unico'),
      ('ordens_servico', 'idx_ordens_servico_protocolo_unico')
    ) AS v(tabela, indice)
  LOOP
    CONTINUE WHEN to_regclass(alvo.tabela) IS NULL;

    EXECUTE format(
      'SELECT COUNT(*) FROM (SELECT protocolo FROM %I WHERE protocolo IS NOT NULL '
      || 'GROUP BY protocolo HAVING COUNT(*) > 1) d',
      alvo.tabela
    ) INTO duplicados;

    IF duplicados > 0 THEN
      RAISE NOTICE 'Protocolos duplicados em %: % — indice unico nao criado.', alvo.tabela, duplicados;
    ELSE
      EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (protocolo)', alvo.indice, alvo.tabela);
    END IF;
  END LOOP;
END $$;
