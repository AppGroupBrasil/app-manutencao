/**
 * Desliga, nas unidades do segmento `educacional`, os módulos que a ASA não usa.
 *
 * Nada é removido do sistema: o módulo continua no catálogo e ativo para
 * clientes de condomínio. Aqui só se apaga o registro de habilitação do tenant,
 * o que faz o item sumir do menu e o servidor recusar a rota (403).
 *
 * O pacote padrão do segmento já foi ajustado em shared/modules/registry.ts —
 * este script existe para as unidades que foram criadas antes disso.
 *
 * Uso:  npx tsx scripts/db/ocultar-modulos-asa.ts [--dry-run]
 */
import 'dotenv/config';
import postgres from 'postgres';

const OCULTAR = [
  // Comunicação inteira
  'avisos',
  'comunicados',
  'notificacoes',
  'notificar-morador',
  // Agenda: fica só a agenda de vencimentos
  'eventos',
  'reservas',
  // Operacional
  'leitura-medidores',
  'controle-pragas',
  'jardinagem',
  // Interativo inteiro
  'votacoes',
  'classificados',
  'achados-perdidos',
  'caronas',
  // Publicidade e projetos
  'publicidade',
  'revistas',
];

const dryRun = process.argv.includes('--dry-run');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 30 });

const unidades = await sql<{ id: number; nome: string }[]>`
  SELECT id, nome FROM condominios WHERE segmento = 'educacional' ORDER BY id
`;

if (unidades.length === 0) {
  console.log('Nenhuma unidade com segmento educacional.');
  await sql.end();
  process.exit(0);
}

const ids = unidades.map((u) => u.id);

const antes = await sql<{ funcaoId: string; n: number }[]>`
  SELECT "funcaoId", count(*)::int AS n
  FROM condominio_funcoes
  WHERE "condominioId" = ANY(${ids}) AND habilitada = true AND "funcaoId" = ANY(${OCULTAR})
  GROUP BY "funcaoId" ORDER BY "funcaoId"
`;

console.log(`Unidades educacionais: ${unidades.length}`);
console.log(`Módulos ligados que serão desligados: ${antes.length}`);
for (const a of antes) console.log(`   - ${a.funcaoId} (em ${a.n} unidade(s))`);

if (dryRun) {
  console.log('\n--dry-run: nada foi alterado.');
  await sql.end();
  process.exit(0);
}

const alterados = await sql`
  UPDATE condominio_funcoes
  SET habilitada = false, "updatedAt" = now()
  WHERE "condominioId" = ANY(${ids}) AND habilitada = true AND "funcaoId" = ANY(${OCULTAR})
  RETURNING id
`;

const restantes = await sql<{ n: number }[]>`
  SELECT count(*)::int AS n
  FROM condominio_funcoes
  WHERE "condominioId" = ANY(${ids}) AND habilitada = true
`;

console.log(`\nLinhas desligadas: ${alterados.length}`);
console.log(`Módulos ainda ligados nas unidades: ${restantes[0].n} (${restantes[0].n / unidades.length} por unidade)`);
console.log('Reinicie o app ou aguarde o cache de módulos expirar para ver na tela.');

await sql.end();
