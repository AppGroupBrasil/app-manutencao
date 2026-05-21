/**
 * Migração via pool do servidor (contorna ETIMEDOUT do drizzle-kit)
 * Usa tsx para importar diretamente do projeto com postgres.js raw client
 */
import "dotenv/config";
import postgres from "postgres";

async function run() {
  const client = postgres(process.env.DATABASE_URL!, {
    max: 1,
    idle_timeout: 60,
    connect_timeout: 60,
  });

  // Testar conexão
  await client`SELECT 1`;
  console.log("✅ Conectado ao banco via postgres.js");

  const migrations: Array<{ label: string; query: string }> = [
    {
      label: 'ADD loginEmail',
      query: `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "loginEmail" varchar(255)`,
    },
    {
      label: 'ADD loginUsuario',
      query: `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "loginUsuario" varchar(255)`,
    },
    {
      label: 'ADD senha',
      query: `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "senha" varchar(255)`,
    },
    {
      label: 'ADD loginAtivo',
      query: `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "loginAtivo" boolean DEFAULT false`,
    },
    {
      label: 'ADD ultimoLogin',
      query: `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "ultimoLogin" timestamp`,
    },
    {
      label: 'ADD resetToken',
      query: `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "resetToken" varchar(64)`,
    },
    {
      label: 'ADD resetTokenExpira',
      query: `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "resetTokenExpira" timestamp`,
    },
    {
      label: 'CREATE ENUM statusNotificacaoInfracao',
      query: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statusNotificacaoInfracao') THEN
          CREATE TYPE "statusNotificacaoInfracao" AS ENUM ('pendente', 'respondida', 'resolvida', 'arquivada');
        END IF;
      END $$`,
    },
    {
      label: 'CREATE ENUM autorTipoInfracao',
      query: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autorTipoInfracao') THEN
          CREATE TYPE "autorTipoInfracao" AS ENUM ('sindico', 'morador', 'funcionario', 'administradora');
        END IF;
      END $$`,
    },
    {
      label: 'EXPAND ENUM templatesNotificacao_categoria',
      query: `DO $$ BEGIN
        BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'aviso'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'evento'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'manutencao'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'assembleia'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'vencimento'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'custom'; EXCEPTION WHEN duplicate_object THEN NULL; END;
      END $$`,
    },
  ];

  for (const m of migrations) {
    try {
      await client.unsafe(m.query);
      console.log(`✅ ${m.label}`);
    } catch (err: any) {
      console.error(`❌ ${m.label}: ${err.message}`);
    }
  }

  // Verificar resultado
  const cols = await client`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'funcionarios' 
      AND column_name IN ('loginEmail','loginUsuario','senha','loginAtivo','ultimoLogin','resetToken','resetTokenExpira')
    ORDER BY column_name
  `;
  console.log('\n📋 Colunas de login:', cols.map((r: any) => r.column_name).join(', '));
  console.log('✅ Migração concluída!');
  await client.end();
  process.exit(0);
}

run().catch(e => { console.error("❌", e.message); process.exit(1); });
