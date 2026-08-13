/**
 * Deixa o andamento da O.S. com os quatro passos combinados, mais o
 * cancelamento, nas organizações informadas.
 *
 * Só o que nasce depois desta versão recebe o conjunto novo: organização que
 * já usou a tela tem os status antigos gravados e continuaria com eles. Aqui o
 * conjunto é reescrito e cada O.S. existente é remapeada pelo nome do status
 * antigo — nenhuma ordem fica sem andamento.
 *
 * Status criado à mão pela unidade (fora da lista antiga) é preservado: ele foi
 * decisão de alguém, não default nosso.
 *
 * Unidade criada a partir desta versão já nasce com o conjunto certo
 * (`prepararUnidade`): o script existe para as que vieram antes.
 *
 * Uso:  pnpm tsx scripts/db/status-os-cliente.ts --organizacoes=1,2,3 --dry-run
 *       pnpm tsx scripts/db/status-os-cliente.ts --organizacoes=1,2,3
 */
import 'dotenv/config';
import postgres from 'postgres';

const dryRun = process.argv.includes('--dry-run');

const argOrganizacoes = process.argv.find((a) => a.startsWith('--organizacoes='));
const organizacoes = (argOrganizacoes?.split('=')[1] ?? '')
  .split(',')
  .map((n) => Number(n.trim()))
  .filter((n) => Number.isInteger(n) && n > 0);

if (organizacoes.length === 0) {
  console.error('Informe as organizações: --organizacoes=1,2,3');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 30 });

/** O conjunto combinado com o cliente. A ordem é a que a tela mostra. */
const NOVOS = [
  { nome: 'Aguardando início', ordem: 1, cor: '#3B82F6', icone: 'FolderOpen', isFinal: false },
  { nome: 'Em execução', ordem: 2, cor: '#F97316', icone: 'Wrench', isFinal: false },
  { nome: 'Finalizada parcialmente', ordem: 3, cor: '#EAB308', icone: 'CircleDashed', isFinal: false },
  { nome: 'Finalizada totalmente', ordem: 4, cor: '#10B981', icone: 'CheckCircle2', isFinal: true },
  { nome: 'Cancelada', ordem: 5, cor: '#EF4444', icone: 'XCircle', isFinal: true },
];

/**
 * De onde cada O.S. antiga vai parar. Chave em minúsculas: o nome pode ter
 * sido gravado com acento e caixa diferentes ao longo do tempo.
 */
const DE_PARA: Record<string, string> = {
  aberta: 'Aguardando início',
  'em análise': 'Aguardando início',
  'em analise': 'Aguardando início',
  aprovada: 'Aguardando início',
  'aguardando material': 'Aguardando início',
  'em execução': 'Em execução',
  'em execucao': 'Em execução',
  concluída: 'Finalizada totalmente',
  concluida: 'Finalizada totalmente',
  cancelada: 'Cancelada',
};

type Status = { id: number; nome: string; isPadrao: boolean | null };

async function configurar(condominioId: number) {
  const antigos = await sql<Status[]>`
    SELECT "id", "nome", "isPadrao" FROM "os_status"
    WHERE "condominioId" = ${condominioId}
  `;

  const [org] = await sql<{ nome: string }[]>`
    SELECT "nome" FROM "condominios" WHERE "id" = ${condominioId} LIMIT 1
  `;

  // Id errado na linha de comando não pode passar batido: sem organização, o
  // script criaria status órfãos e ninguém veria o engano.
  if (!org) {
    throw new Error(`Organização ${condominioId} não existe.`);
  }

  console.log(`\n• ${org.nome} (id ${condominioId}) — ${antigos.length} status hoje`);

  // 1) Garante os cinco, reaproveitando a linha que já tem o nome (mesmo com
  //    caixa diferente: "Em Execução" vira "Em execução" na mesma linha, e não
  //    numa segunda).
  const porNome = new Map(antigos.map((s) => [s.nome.toLowerCase(), s]));
  const idsNovos = new Map<string, number>();
  /** Ids que ficam de pé no fim. O que sobra é candidato a sair. */
  const idsFinais = new Set<number>();

  for (const novo of NOVOS) {
    const existente = porNome.get(novo.nome.toLowerCase());
    if (existente) {
      idsNovos.set(novo.nome, existente.id);
      idsFinais.add(existente.id);
      if (!dryRun) {
        await sql`
          UPDATE "os_status"
          SET "nome" = ${novo.nome}, "ordem" = ${novo.ordem}, "cor" = ${novo.cor},
              "icone" = ${novo.icone}, "isFinal" = ${novo.isFinal}, "ativo" = true,
              "updatedAt" = now()
          WHERE "id" = ${existente.id}
        `;
      }
      console.log(`   = ${novo.nome}`);
      continue;
    }

    if (dryRun) {
      // Id fictício só para a simulação conseguir mostrar o remapeamento
      // abaixo; sem ele o dry-run esconderia justamente a parte arriscada.
      idsNovos.set(novo.nome, -novo.ordem);
      console.log(`   + ${novo.nome} (criaria)`);
      continue;
    }

    const [criado] = await sql<{ id: number }[]>`
      INSERT INTO "os_status" ("condominioId", "nome", "cor", "icone", "ordem", "isFinal", "isPadrao", "ativo")
      VALUES (${condominioId}, ${novo.nome}, ${novo.cor}, ${novo.icone}, ${novo.ordem}, ${novo.isFinal}, true, true)
      RETURNING "id"
    `;
    idsNovos.set(novo.nome, criado.id);
    idsFinais.add(criado.id);
    console.log(`   + ${novo.nome}`);
  }

  // 2) Remapeia as O.S. que apontam para um status que vai sair.
  //    A comparação é por id, não por nome: reaproveitar uma linha e depois
  //    procurá-la pelo nome antigo apagaria justamente a linha que acabou de
  //    receber as O.S.
  const aRemover = antigos.filter(
    (s) => !idsFinais.has(s.id) && s.isPadrao && DE_PARA[s.nome.toLowerCase()],
  );

  for (const velho of aRemover) {
    const destino = DE_PARA[velho.nome.toLowerCase()];
    const idDestino = idsNovos.get(destino);
    if (!idDestino) continue;

    const [{ count }] = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM "ordens_servico" WHERE "statusId" = ${velho.id}
    `;

    console.log(`   ~ "${velho.nome}" → "${destino}" (${count} O.S.)`);
    if (dryRun) continue;

    await sql`
      UPDATE "ordens_servico" SET "statusId" = ${idDestino}, "updatedAt" = now()
      WHERE "statusId" = ${velho.id}
    `;
    await sql`DELETE FROM "os_status" WHERE "id" = ${velho.id}`;
  }

  // 3) O que não é padrão nosso continua vivo: foi decisão da unidade.
  const manuais = antigos.filter((s) => !idsFinais.has(s.id) && !s.isPadrao);
  for (const manual of manuais) {
    console.log(`   · mantido (criado pela unidade): ${manual.nome}`);
  }

  // 4) Padrão antigo sem destino no de-para (renomeado pela unidade, por
  //    exemplo) também fica: apagar levaria junto as O.S. que apontam para ele.
  const semDestino = antigos.filter(
    (s) => !idsFinais.has(s.id) && s.isPadrao && !DE_PARA[s.nome.toLowerCase()],
  );
  for (const s of semDestino) {
    console.log(`   · mantido (sem equivalente no de-para): ${s.nome}`);
  }

}

async function main() {
  console.log(
    dryRun
      ? 'Simulação (nada será gravado)\n'
      : 'Aplicando o andamento combinado da O.S.\n',
  );

  for (const id of organizacoes) {
    await configurar(id);
  }

  console.log('\nPronto.');
  await sql.end();
}

main().catch(async (erro) => {
  console.error(erro);
  await sql.end();
  process.exit(1);
});
