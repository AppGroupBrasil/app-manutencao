/**
 * Carga inicial do cliente ASA: unidades, gestores de unidade e gestor-chefe.
 *
 * Fonte: "Lista de unidades de atendimento - simplificada - jun26.xlsx"
 * (15 unidades, um gestor por unidade). Os dados estão transcritos aqui, e não
 * lidos da planilha, para que a carga seja auditável e repetível sem depender
 * de um arquivo na máquina de quem roda.
 *
 * Estrutura criada:
 *   gestor-chefe ──(usuario_condominios: chefe)──> 15 unidades
 *   gestor de unidade ──(usuario_condominios: gestor)──> 1 unidade
 *   funcionários entram depois, cadastrados por cada gestor.
 *
 * Idempotente: identifica unidade pelo código e usuário pelo e-mail. Rodar de
 * novo atualiza cadastro e vínculos, e **nunca** rebaixa uma senha já trocada
 * pelo usuário para a senha padrão.
 *
 * Uso:  pnpm db:seed-asa -- --dry-run
 *       pnpm db:seed-asa
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import postgres from 'postgres';
import { modulosPadrao } from '../../shared/modules/registry';

const dryRun = process.argv.includes('--dry-run');

const SEGMENTO = 'educacional' as const;

/** Senha de implantação. Toda conta criada aqui nasce obrigada a trocá-la. */
const SENHA_PADRAO = process.env.SENHA_PADRAO ?? '123456';

/**
 * Vocabulário do cliente. Sobrescreve as chaves de i18n para esta organização:
 * "administradora" vira gestor-chefe, "condomínio" vira unidade e "porteiro"
 * vira funcionário. Ver docs/personalizacao-por-cliente.md.
 */
const LABELS: Record<string, string> = {
  'vocab.organizacao': 'Unidade',
  'vocab.organizacaoPlural': 'Unidades',
  'vocab.gestorChefe': 'Gestor-chefe',
  'vocab.gestor': 'Gestor',
  'vocab.funcionario': 'Funcionário',
  'vocab.funcionarioPlural': 'Funcionários',
};

const CIDADE = 'São Paulo';
const ESTADO = 'SP';

interface Unidade {
  codigo: string;
  tipo: string | null;
  nome: string;
  endereco: string;
  gestor: string;
  email: string;
  /** Telefone fixo da unidade. */
  telefone: string | null;
  /** Celular do gestor. */
  celular: string | null;
}

const UNIDADES: Unidade[] = [
  { codigo: 'BV', tipo: 'CEI', nome: 'Bela Vista', endereco: 'R. Humaitá, 500 - Bela Vista', gestor: 'Benedita Batista', email: 'benedita.batista@asatransforma.org.br', telefone: '(11) 2339-7177', celular: '(11) 97627-9021' },
  { codigo: 'LI', tipo: 'CEI', nome: 'Lar Infantil', endereco: 'R. Oscar Pinheiro Coelho, 309 - Caxingui', gestor: 'Kátia Moraes', email: 'katia.moraes@asatransforma.org.br', telefone: '(11) 2386-8750', celular: '(11) 98644-2057' },
  { codigo: 'SA', tipo: 'CEI', nome: 'Santo Agostinho', endereco: 'R. Clementine Brenne, 412 - Paraisópolis', gestor: 'Lívia Medeiros', email: 'livia.medeiros@asatransforma.org.br', telefone: '(11) 2386-4037', celular: '(11) 98576-0075' },
  { codigo: 'SH', tipo: 'CEI', nome: 'Santa Helena', endereco: 'R. Prof. Dorival Dias Minhoto, 115 - Lauzane Paulista', gestor: 'Ângela Infante', email: 'angela.infante2@asatransforma.org.br', telefone: '(11) 2256-7997', celular: '(11) 97630-4442' },
  { codigo: 'SF', tipo: 'CEI', nome: 'São Francisco', endereco: 'R. João Millam, 132 - Jd. Ester', gestor: 'Alessandra Silva', email: 'alessandra.silva@asatransforma.org.br', telefone: '(11) 3476-4167', celular: '(11) 95988-1959' },
  { codigo: 'GC', tipo: 'CCA', nome: 'Gaetano e Carmela', endereco: 'R. Visconde de Inhaúma, 284 - Vila da Saúde', gestor: 'Flora Silva', email: 'flora.silva@asatransforma.org.br', telefone: '(11) 2387-7276', celular: '(11) 97617-0204' },
  { codigo: 'SM', tipo: 'CCA', nome: 'Santa Mônica', endereco: 'R. Oscar Pinheiro, 266 - Caxingui', gestor: 'Soraia Matos', email: 'soraia.matos@asatransforma.org.br', telefone: '(11) 3721-4146', celular: '(11) 98947-9086' },
  { codigo: 'SJ', tipo: 'CCA', nome: 'São José', endereco: 'Al. Joaquim de Mattos, 157 - Lauzane Paulista', gestor: 'Felipe Silva', email: 'felipe.silva@asatransforma.org.br', telefone: '(11) 2236-8464', celular: '(11) 97623-7674' },
  { codigo: 'PS', tipo: 'CCA', nome: 'Pássaros', endereco: 'R. Mariana Belizária da Conceição, 85 - Jd. Ester', gestor: 'Edneia Maceno', email: 'edneia.maceno@asatransforma.org.br', telefone: '(11) 2387-1141', celular: '(11) 97621-8210' },
  { codigo: 'PRI', tipo: 'CCA', nome: 'Primavera', endereco: 'R. Dona Vitú Giorgi, 130 - Paraisópolis', gestor: 'Gervasio Filho', email: 'gervasio.filho@asatransforma.org.br', telefone: '(11) 3743-9703', celular: '(11) 97618-3329' },
  { codigo: 'LSA', tipo: 'CDI', nome: 'Lar Santo Alberto', endereco: 'R. Professor Dorival Dias Minhoto, 231 - Lauzane Paulista', gestor: 'Sandra Costa', email: 'sandra.costa@asatransforma.org.br', telefone: '(11) 2236-1418', celular: '(11) 97625-6281' },
  { codigo: 'SLG', tipo: 'CEI', nome: 'São Luis Gonzaga', endereco: 'R. Gertrudes Cunha, 30 - Jd. Ester Yolanda', gestor: 'Miriam Eller', email: 'miriam.eller@asatransforma.org.br', telefone: '(11) 3719-1955', celular: '(11) 94937-0295' },
  // Única unidade com domínio de e-mail próprio; a planilha traz só o celular.
  { codigo: 'PRV', tipo: 'CCINTER', nome: 'Projeto Viver', endereco: 'R. Clementine Brenne, 857 - Jd. Colombo', gestor: 'Kelly', email: 'kelly@projetoviver.org.br', telefone: null, celular: '(11) 96071-1813' },
  { codigo: 'BRC', tipo: null, nome: 'Brechó', endereco: 'R. Fradique Coutinho, 352 - Pinheiros', gestor: 'Nice Silva', email: 'nice.silva@asatransforma.org.br', telefone: '(11) 2835-7276', celular: '(11) 95988-1916' },
  // A planilha traz "patrícia.silva@" — acento não é válido em e-mail de login.
  { codigo: 'CTR', tipo: null, nome: 'Central Pinheiros', endereco: 'R. Fradique Coutinho, 352 - Pinheiros', gestor: 'Patrícia Silva', email: 'patricia.silva@asatransforma.org.br', telefone: '(11) 3887-1112', celular: '(11) 95988-2229' },
];

/**
 * Gestor-chefe: dono das 15 unidades e único acesso que enxerga todas.
 * Não vem da planilha — informado pelo cliente. `CHEFE_NOME`/`CHEFE_EMAIL`
 * sobrescrevem, caso o nome completo saia diferente do que está aqui.
 */
const CHEFE_NOME = process.env.CHEFE_NOME?.trim() || 'Francisco Lima';
const CHEFE_EMAIL =
  process.env.CHEFE_EMAIL?.trim().toLowerCase() || 'francisco.lima@asatransforma.org.br';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 30 });

async function prepararEsquema(): Promise<void> {
  console.log('1) Esquema');

  await sql.unsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "senhaProvisoria" boolean DEFAULT false NOT NULL`,
  );
  await sql.unsafe(
    `ALTER TABLE "condominios" ADD COLUMN IF NOT EXISTS "tipoUnidade" varchar(20)`,
  );
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "usuario_condominios" (
      "id" serial PRIMARY KEY,
      "userId" integer NOT NULL REFERENCES "users" ("id"),
      "condominioId" integer NOT NULL REFERENCES "condominios" ("id"),
      "papel" varchar(20) DEFAULT 'gestor' NOT NULL,
      "ativo" boolean DEFAULT true NOT NULL,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    )
  `);
  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "usuario_condominios_user_condominio_idx"
      ON "usuario_condominios" ("userId", "condominioId")
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS "usuario_condominios_user_idx"
      ON "usuario_condominios" ("userId")
  `);

  console.log('   colunas, tabela de vínculo e índices OK');
}

/**
 * Cria o usuário se não existir; se existir, só completa cadastro.
 * Nunca sobrescreve a senha de quem já entrou e trocou — rodar o seed de novo
 * não devolve a conta para a senha padrão.
 */
async function upsertUsuario(
  nome: string,
  email: string,
  telefone: string | null,
  tipoConta: 'administradora' | 'sindico',
): Promise<number> {
  const [existente] = await sql<{ id: number }[]>`
    SELECT "id" FROM "users" WHERE lower("email") = ${email} LIMIT 1
  `;

  if (existente) {
    if (!dryRun) {
      await sql`
        UPDATE "users"
        SET "name" = ${nome},
            "phone" = COALESCE(${telefone}, "phone"),
            "updatedAt" = now()
        WHERE "id" = ${existente.id}
      `;
    }
    console.log(`   = ${email} (já existia, id ${existente.id})`);
    return existente.id;
  }

  if (dryRun) {
    console.log(`   + ${email} (${nome}) — seria criado`);
    return -1;
  }

  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  const openId = `local_${crypto.randomBytes(16).toString('hex')}`;

  // `hierarquia` fica no default ('funcionario'), igual a qualquer síndico
  // criado pelo cadastro comum. Elevar para 'responsavel' não daria nenhuma
  // função a mais — as telas do cliente não olham hierarquia — e liberaria as
  // rotas de `hierarquia.*` (excluir/bloquear/alterarHierarquia), que só
  // comparam nível e não têm escopo de organização. Quem manda aqui é o papel
  // em `usuario_condominios`.
  const [criado] = await sql<{ id: number }[]>`
    INSERT INTO "users" (
      "openId", "email", "name", "phone", "senha", "loginMethod",
      "role", "tipoConta", "senhaProvisoria", "lastSignedIn"
    ) VALUES (
      ${openId}, ${email}, ${nome}, ${telefone}, ${senhaHash}, 'local',
      'sindico', ${tipoConta}, true, now()
    )
    RETURNING "id"
  `;

  console.log(`   + ${email} (${nome}) — id ${criado.id}`);
  return criado.id;
}

/** Cria a unidade se não existir; identifica pelo código dentro do cliente. */
async function upsertUnidade(unidade: Unidade, chefeId: number): Promise<number> {
  const [existente] = await sql<{ id: number }[]>`
    SELECT "id" FROM "condominios"
    WHERE "codigo" = ${unidade.codigo} AND "sindicoId" = ${chefeId}
    LIMIT 1
  `;

  if (existente) {
    if (!dryRun) {
      await sql`
        UPDATE "condominios"
        SET "nome" = ${unidade.nome},
            "endereco" = ${unidade.endereco},
            "cidade" = ${CIDADE},
            "estado" = ${ESTADO},
            "tipoUnidade" = ${unidade.tipo},
            "telefoneContato" = ${unidade.telefone},
            "segmento" = ${SEGMENTO},
            "labels" = ${sql.json(LABELS)},
            "updatedAt" = now()
        WHERE "id" = ${existente.id}
      `;
    }
    console.log(`   = ${unidade.codigo} ${unidade.nome} (já existia, id ${existente.id})`);
    return existente.id;
  }

  if (dryRun) {
    console.log(`   + ${unidade.codigo} ${unidade.nome} — seria criada`);
    return -1;
  }

  const [criada] = await sql<{ id: number }[]>`
    INSERT INTO "condominios" (
      "codigo", "nome", "endereco", "cidade", "estado", "tipoUnidade",
      "telefoneContato", "segmento", "labels", "sindicoId", "cadastroToken"
    ) VALUES (
      ${unidade.codigo}, ${unidade.nome}, ${unidade.endereco}, ${CIDADE}, ${ESTADO},
      ${unidade.tipo}, ${unidade.telefone}, ${SEGMENTO}, ${sql.json(LABELS)},
      ${chefeId}, ${crypto.randomBytes(16).toString('hex')}
    )
    RETURNING "id"
  `;

  console.log(`   + ${unidade.codigo} ${unidade.nome} — id ${criada.id}`);
  return criada.id;
}

async function vincular(userId: number, condominioId: number, papel: 'chefe' | 'gestor'): Promise<void> {
  if (dryRun || userId < 0 || condominioId < 0) return;

  await sql`
    INSERT INTO "usuario_condominios" ("userId", "condominioId", "papel")
    VALUES (${userId}, ${condominioId}, ${papel})
    ON CONFLICT ("userId", "condominioId")
    DO UPDATE SET "papel" = ${papel}, "ativo" = true, "updatedAt" = now()
  `;
}

/**
 * Grava os módulos do segmento. Sem isto a unidade nasceria dependendo do
 * fallback, e qualquer módulo novo no registry mudaria o que o cliente vê.
 */
async function seedModulos(condominioId: number): Promise<number> {
  if (dryRun || condominioId < 0) return 0;

  const alvo = modulosPadrao();

  const existentes = await sql<{ funcaoId: string }[]>`
    SELECT "funcaoId" FROM "condominio_funcoes" WHERE "condominioId" = ${condominioId}
  `;
  const jaGravados = new Set(existentes.map((e) => e.funcaoId));
  const faltantes = alvo.filter((id) => !jaGravados.has(id));

  if (faltantes.length > 0) {
    await sql`
      INSERT INTO "condominio_funcoes" ${sql(
        faltantes.map((funcaoId) => ({ condominioId, funcaoId, habilitada: true })),
      )}
    `;
  }

  return faltantes.length;
}

async function main(): Promise<void> {
  console.log(`Carga ASA — ${UNIDADES.length} unidades${dryRun ? ' (DRY RUN)' : ''}\n`);

  await prepararEsquema();

  console.log('\n2) Gestor-chefe');
  const chefeId = await upsertUsuario(CHEFE_NOME, CHEFE_EMAIL, null, 'administradora');

  console.log('\n3) Unidades e gestores');
  let modulosGravados = 0;
  for (const unidade of UNIDADES) {
    const condominioId = await upsertUnidade(unidade, chefeId);
    const gestorId = await upsertUsuario(
      unidade.gestor,
      unidade.email.toLowerCase(),
      unidade.celular,
      'sindico',
    );

    await vincular(chefeId, condominioId, 'chefe');
    await vincular(gestorId, condominioId, 'gestor');
    modulosGravados += await seedModulos(condominioId);
  }

  console.log('\nResumo');
  console.log(`   unidades: ${UNIDADES.length}`);
  console.log(`   gestores: ${UNIDADES.length} (+1 gestor-chefe)`);
  console.log(`   módulos gravados: ${modulosGravados}`);
  if (!dryRun) {
    console.log(`\n   Senha padrão: ${SENHA_PADRAO} — trocada obrigatoriamente no 1º acesso.`);
  }
}

main()
  .then(() => sql.end())
  .catch(async (erro) => {
    console.error('\nFalhou:', erro);
    await sql.end();
    process.exit(1);
  });
