/**
 * Script de migração manual — contorna o drizzle-kit push quando ele trava.
 * Usa a mesma DATABASE_URL do .env via postgres.js (mesmo driver do projeto)
 * 
 * Uso: node migrate-manual.mjs
 */
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 30 });

const migrations = [
  // 1. Colunas de login do funcionário
  `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "loginEmail" varchar(255)`,
  `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "loginUsuario" varchar(255)`,
  `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "senha" varchar(255)`,
  `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "loginAtivo" boolean DEFAULT false`,
  `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "ultimoLogin" timestamp`,
  `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "resetToken" varchar(64)`,
  `ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS "resetTokenExpira" timestamp`,

  // 2. Novos enums (criar se não existirem)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statusNotificacaoInfracao') THEN
      CREATE TYPE "statusNotificacaoInfracao" AS ENUM ('pendente', 'respondida', 'resolvida', 'arquivada');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autorTipoInfracao') THEN
      CREATE TYPE "autorTipoInfracao" AS ENUM ('sindico', 'morador', 'funcionario', 'administradora');
    END IF;
  END $$`,

  // 3. Expandir enum templatesNotificacao_categoria (adicionar valores que faltam)
  `DO $$ BEGIN
    BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'aviso'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'evento'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'manutencao'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'assembleia'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'vencimento'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "templatesNotificacao_categoria" ADD VALUE IF NOT EXISTS 'custom'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END $$`,
];

async function run() {
  try {
    // Testar conexão
    await sql`SELECT 1`;
    console.log('✅ Conectado ao banco de dados');

    for (const query of migrations) {
      const label = query.replace(/\s+/g, ' ').substring(0, 80);
      try {
        await sql.unsafe(query);
        console.log(`✅ ${label}...`);
      } catch (err) {
        console.error(`❌ ${label}...`);
        console.error(`   ${err.message}`);
      }
    }

    // Verificar resultado
    const rows = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'funcionarios' 
        AND column_name IN ('loginEmail', 'loginUsuario', 'senha', 'loginAtivo', 'ultimoLogin', 'resetToken', 'resetTokenExpira')
      ORDER BY column_name
    `;
    console.log('\n📋 Colunas de login no DB:', rows.map(r => r.column_name).join(', '));
    console.log('✅ Migração concluída!');
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
  } finally {
    await sql.end();
  }
}

run();
