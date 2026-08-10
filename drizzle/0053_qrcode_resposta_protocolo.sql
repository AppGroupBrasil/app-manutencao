-- A resposta do QR Code vira um registro de primeira classe: tem protocolo,
-- situação e pode ser puxada para o Quadro de Atividades como qualquer outra
-- função. Sem isso ela seria só um texto solto no banco.
--
-- Idempotente.

ALTER TABLE "qrcode_respostas" ADD COLUMN IF NOT EXISTS "protocolo" varchar(20);
-- nova | em_andamento | resolvida
ALTER TABLE "qrcode_respostas" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'nova' NOT NULL;
ALTER TABLE "qrcode_respostas" ADD COLUMN IF NOT EXISTS "informanteContato" varchar(120);

UPDATE "qrcode_respostas" SET "protocolo" = 'QRR-' || lpad("id"::text, 6, '0') WHERE "protocolo" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_qrcode_respostas_protocolo"
  ON "qrcode_respostas" ("protocolo");
