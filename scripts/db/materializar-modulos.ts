/**
 * Prepara o banco para o isolamento de módulos por tenant.
 *
 * Faz tudo na ordem correta, de forma idempotente:
 *   1. cria as colunas `segmento` e `labels` em `condominios`;
 *   2. remove duplicatas de (condominioId, funcaoId) e cria o índice único;
 *   3. materializa os módulos de cada organização existente.
 *
 * Por que o passo 3 existe: até agora, organização SEM linhas em
 * `condominio_funcoes` recebia "tudo habilitado" por default. Ao inverter para
 * opt-in, essas organizações ficariam sem nada. O script grava explicitamente o
 * estado atual para que a virada seja transparente.
 *
 * Uso:  pnpm db:materializar-modulos -- --dry-run
 *       pnpm db:materializar-modulos
 */
import 'dotenv/config';
import postgres from 'postgres';
import { MODULOS, isModuloRestrito } from '../../shared/modules/registry';

const dryRun = process.argv.includes('--dry-run');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 30 });

// Só módulos públicos: um módulo restrito a um cliente não deve ser ligado em massa.
const MODULOS_PUBLICOS = MODULOS.filter((m) => !isModuloRestrito(m)).map((m) => m.id);

async function prepararEsquema() {
  console.log('1) Esquema');

  await sql.unsafe(
    `ALTER TABLE "condominios" ADD COLUMN IF NOT EXISTS "segmento" varchar(50) DEFAULT 'condominio'`,
  );
  await sql.unsafe(`ALTER TABLE "condominios" ADD COLUMN IF NOT EXISTS "labels" json`);
  console.log('   colunas segmento/labels OK');

  // Preserva "ligado" antes de descartar duplicatas, para não desligar
  // módulo de cliente em produção.
  await sql.unsafe(`
    UPDATE "condominio_funcoes" cf SET "habilitada" = true
    WHERE EXISTS (
      SELECT 1 FROM "condominio_funcoes" d
      WHERE d."condominioId" = cf."condominioId"
        AND d."funcaoId" = cf."funcaoId"
        AND d."habilitada" = true
    )
  `);

  const [{ count: duplicatas }] = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM (
      SELECT "condominioId", "funcaoId" FROM "condominio_funcoes"
      GROUP BY 1, 2 HAVING COUNT(*) > 1
    ) t
  `;
  if (Number(duplicatas) > 0) {
    console.log(`   removendo ${duplicatas} pares duplicados`);
    await sql.unsafe(`
      DELETE FROM "condominio_funcoes" a
      USING "condominio_funcoes" b
      WHERE a."condominioId" = b."condominioId"
        AND a."funcaoId" = b."funcaoId"
        AND a."id" < b."id"
    `);
  }

  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "condominio_funcoes_tenant_funcao_uq"
      ON "condominio_funcoes" ("condominioId", "funcaoId")
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS "condominio_funcoes_tenant_idx"
      ON "condominio_funcoes" ("condominioId")
  `);
  console.log('   índices OK');
}

async function materializar() {
  console.log('\n2) Materialização');

  const tenants = await sql<{ id: number; nome: string }[]>`
    SELECT id, nome FROM condominios ORDER BY id
  `;
  console.log(`   ${tenants.length} organizações, ${MODULOS_PUBLICOS.length} módulos públicos\n`);

  let totalInserido = 0;
  let tenantsTocados = 0;

  for (const tenant of tenants) {
    const existentes = await sql<{ funcaoId: string }[]>`
      SELECT "funcaoId" FROM condominio_funcoes WHERE "condominioId" = ${tenant.id}
    `;
    const jaGravados = new Set(existentes.map((e) => e.funcaoId));
    const faltando = MODULOS_PUBLICOS.filter((id) => !jaGravados.has(id));

    if (faltando.length === 0) {
      console.log(`   #${tenant.id} ${tenant.nome} — já materializado (${jaGravados.size})`);
      continue;
    }

    // Organização que nunca foi configurada vinha operando com TUDO ligado.
    // Preservamos esse estado. Organização já configurada recebe os módulos
    // novos DESLIGADOS — evita que módulo novo apareça sem o cliente pedir.
    const nuncaConfigurada = jaGravados.size === 0;

    if (!dryRun) {
      await sql`
        INSERT INTO condominio_funcoes ("condominioId", "funcaoId", "habilitada")
        SELECT ${tenant.id}, x, ${nuncaConfigurada}
        FROM unnest(${faltando}::text[]) AS x
        ON CONFLICT ("condominioId", "funcaoId") DO NOTHING
      `;
    }

    totalInserido += faltando.length;
    tenantsTocados++;
    console.log(
      `   #${tenant.id} ${tenant.nome} — +${faltando.length} ` +
        `${nuncaConfigurada ? 'HABILITADOS (nunca configurada)' : 'desabilitados (já configurada)'}`,
    );
  }

  console.log(
    `\n${dryRun ? '[dry-run] ' : ''}${totalInserido} registros em ${tenantsTocados} organizações.`,
  );
}

async function run() {
  await sql`SELECT 1`;
  console.log(`Conectado.${dryRun ? ' MODO DRY-RUN — nada será gravado.' : ''}\n`);

  // O esquema precisa existir mesmo em dry-run: sem o índice único, o INSERT
  // com ON CONFLICT falharia. DDL é idempotente e não altera dados.
  await prepararEsquema();
  await materializar();

  await sql.end();
}

run().catch(async (err) => {
  console.error('Falhou:', err);
  await sql.end();
  process.exit(1);
});
