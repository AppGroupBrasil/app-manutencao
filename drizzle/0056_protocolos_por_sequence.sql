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
BEGIN
  FOR alvo IN
    SELECT * FROM (VALUES
      ('checklists',        'protocolo_checklist'),
      ('manutencoes',       'protocolo_manutencao'),
      ('ocorrencias',       'protocolo_ocorrencia'),
      ('vistorias',         'protocolo_vistoria'),
      ('reportes',          'protocolo_reporte'),
      ('ordens_servico',    'protocolo_os'),
      ('quadro_atividades', 'protocolo_atividade'),
      ('tarefas_agendadas', 'protocolo_tarefa'),
      ('vencimentos',       'protocolo_vencimento'),
      ('qrcodes',           'protocolo_qrcode'),
      ('qrcode_respostas',  'protocolo_qrcode_resposta')
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

    PERFORM setval(alvo.sequencia, GREATEST(maximo, 1), maximo > 0);
  END LOOP;
END $$;

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
