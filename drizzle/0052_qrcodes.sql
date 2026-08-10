-- Função QR Code: um código por local ou item; quem escaneia responde com
-- foto, descrição e localização, sem precisar de conta.
--
-- O `token` é o que vai no QR impresso — é ele que identifica o ponto na rota
-- pública, e por isso é aleatório e único, nunca o id sequencial.
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS "qrcodes" (
  "id" serial PRIMARY KEY,
  "condominioId" integer NOT NULL REFERENCES "condominios"("id") ON DELETE CASCADE,
  "protocolo" varchar(20),
  "token" varchar(64) NOT NULL UNIQUE,
  -- local | item
  "tipo" varchar(20) DEFAULT 'local' NOT NULL,
  "titulo" varchar(255) NOT NULL,
  "descricao" text,
  "ativo" boolean DEFAULT true NOT NULL,
  "criadoPorId" integer,
  "criadoPorNome" varchar(255),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_qrcodes_condominio" ON "qrcodes" ("condominioId");

CREATE TABLE IF NOT EXISTS "qrcode_respostas" (
  "id" serial PRIMARY KEY,
  "qrcodeId" integer NOT NULL REFERENCES "qrcodes"("id") ON DELETE CASCADE,
  "condominioId" integer NOT NULL REFERENCES "condominios"("id") ON DELETE CASCADE,
  "informanteNome" varchar(255) NOT NULL,
  "descricao" text,
  "imagens" text[] DEFAULT '{}'::text[] NOT NULL,
  "latitude" varchar(20),
  "longitude" varchar(20),
  "enderecoGeo" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_qrcode_respostas_qrcode" ON "qrcode_respostas" ("qrcodeId");
CREATE INDEX IF NOT EXISTS "idx_qrcode_respostas_condominio" ON "qrcode_respostas" ("condominioId");

INSERT INTO "condominio_funcoes" ("condominioId", "funcaoId", "habilitada")
SELECT c."id", 'qrcode', true
FROM "condominios" c
WHERE EXISTS (SELECT 1 FROM "condominio_funcoes" cf WHERE cf."condominioId" = c."id")
AND NOT EXISTS (
  SELECT 1 FROM "condominio_funcoes" cf
  WHERE cf."condominioId" = c."id" AND cf."funcaoId" = 'qrcode'
);
