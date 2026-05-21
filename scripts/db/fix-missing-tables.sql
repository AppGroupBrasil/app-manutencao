-- Create missing tables that reference camelCase enums

CREATE TABLE IF NOT EXISTS "timeline_eventos" (
  "id" serial PRIMARY KEY,
  "timelineId" integer NOT NULL,
  "tipo" "timelineEventos_tipo" DEFAULT 'comentario',
  "descricao" text,
  "usuarioId" integer,
  "usuarioNome" varchar(255),
  "dadosAnteriores" text,
  "dadosNovos" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
