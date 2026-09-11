/**
 * Em quais unidades um funcionário trabalha — ver e marcar.
 *
 * A ficha guarda a unidade de origem (`funcionarios.condominioId`) e as demais
 * vivem em `funcionario_condominios`. Quem foi cadastrado antes de a marcação
 * de unidades existir na tela não tem linha nenhuma ali, e por isso abre o
 * portal preso a uma unidade só — é o caso que este script resolve, sem obrigar
 * o gestor a refazer a ficha.
 *
 * Uso:
 *   pnpm tsx scripts/db/unidades-do-funcionario.ts --buscar=andre
 *   pnpm tsx scripts/db/unidades-do-funcionario.ts --funcionario=12 --espelhar=8 --dry-run
 *   pnpm tsx scripts/db/unidades-do-funcionario.ts --funcionario=12 --todas-do-cliente
 *   pnpm tsx scripts/db/unidades-do-funcionario.ts --funcionario=12 --unidades=3,4,5
 *
 * `--espelhar` copia as unidades de um colega — é o pedido de sempre ("deixa
 * fulano enxergando o mesmo que beltrano"), e evita digitar ids à mão.
 *
 * Só grava dentro do cliente: as unidades oferecidas são as que têm o mesmo
 * dono (`condominios.sindicoId`) da unidade da ficha. Id de outro cliente é
 * recusado, nunca gravado — vínculo assim entregaria a um funcionário a base de
 * quem ele não atende.
 *
 * Nada é apagado: o script só acrescenta o que falta e reativa o que estava
 * desligado. Tirar unidade continua sendo decisão do gestor, na tela.
 */
import 'dotenv/config';
import postgres from 'postgres';

const dryRun = process.argv.includes('--dry-run');
const todasDoCliente = process.argv.includes('--todas-do-cliente');

const valor = (nome: string): string =>
  process.argv.find((a) => a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=').trim() ?? '';

const buscar = valor('buscar');
const funcionarioId = Number(valor('funcionario'));
const espelharId = Number(valor('espelhar'));
const unidadesInformadas = valor('unidades')
  .split(',')
  .map((n) => Number(n.trim()))
  .filter((n) => Number.isInteger(n) && n > 0);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

if (!buscar && !Number.isInteger(funcionarioId)) {
  console.error(
    'Informe --buscar=<parte do nome> para ver, ou --funcionario=<id> com --espelhar=<id>, --todas-do-cliente ou --unidades=1,2,3.',
  );
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 30 });

interface Ficha {
  id: number;
  nome: string;
  condominioId: number;
  ativo: boolean | null;
  loginAtivo: boolean | null;
  loginEmail: string | null;
  unidadeDaFicha: string | null;
  donoId: number | null;
}

/** Ficha, unidade de origem e quem responde por ela. */
async function ficha(id: number): Promise<Ficha | null> {
  const [linha] = await sql<Ficha[]>`
    SELECT f."id", f."nome", f."condominioId", f."ativo", f."loginAtivo", f."loginEmail",
           c."nome" AS "unidadeDaFicha", c."sindicoId" AS "donoId"
    FROM "funcionarios" f
    LEFT JOIN "condominios" c ON c."id" = f."condominioId"
    WHERE f."id" = ${id}
  `;
  return linha ?? null;
}

/** Unidades já marcadas, ativas ou não — desligada volta a ligar. */
async function vinculos(id: number) {
  return sql<{ condominioId: number; ativo: boolean | null; nome: string | null }[]>`
    SELECT v."condominioId", v."ativo", c."nome"
    FROM "funcionario_condominios" v
    LEFT JOIN "condominios" c ON c."id" = v."condominioId"
    WHERE v."funcionarioId" = ${id}
    ORDER BY c."nome"
  `;
}

/** Todas as unidades do mesmo dono: é o alcance máximo permitido aqui. */
async function unidadesDoCliente(donoId: number) {
  return sql<{ id: number; nome: string }[]>`
    SELECT c."id", c."nome"
    FROM "condominios" c
    WHERE c."sindicoId" = ${donoId}
    ORDER BY c."nome"
  `;
}

/** Quem a busca encontrou, com o que cada um enxerga hoje. */
async function mostrarBusca(texto: string) {
  const achados = await sql<{ id: number; nome: string; condominioId: number; unidade: string | null; loginEmail: string | null }[]>`
    SELECT f."id", f."nome", f."condominioId", f."loginEmail", c."nome" AS "unidade"
    FROM "funcionarios" f
    LEFT JOIN "condominios" c ON c."id" = f."condominioId"
    WHERE unaccent(lower(f."nome")) LIKE unaccent(lower(${`%${texto}%`}))
    ORDER BY f."nome"
  `.catch(
    // `unaccent` é extensão: sem ela, busca simples — o nome digitado sem
    // acento simplesmente não casa, e o script diz isso em vez de quebrar.
    () => sql<{ id: number; nome: string; condominioId: number; unidade: string | null; loginEmail: string | null }[]>`
      SELECT f."id", f."nome", f."condominioId", f."loginEmail", c."nome" AS "unidade"
      FROM "funcionarios" f
      LEFT JOIN "condominios" c ON c."id" = f."condominioId"
      WHERE lower(f."nome") LIKE lower(${`%${texto}%`})
      ORDER BY f."nome"
    `,
  );

  if (achados.length === 0) {
    console.log(`Nenhum funcionário com "${texto}" no nome.`);
    return;
  }

  for (const f of achados) {
    const marcadas = await vinculos(f.id);
    const ativas = marcadas.filter((m) => m.ativo !== false);
    console.log(
      `\n#${f.id} ${f.nome}${f.loginEmail ? ` (${f.loginEmail})` : ''}` +
        `\n  unidade da ficha: ${f.unidade ?? '—'} (${f.condominioId})` +
        `\n  também marcado em: ${
          ativas.length === 0
            ? 'nenhuma outra'
            : ativas.map((m) => `${m.nome ?? '?'} (${m.condominioId})`).join(', ')
        }` +
        `\n  portal mostra: ${ativas.length + 1} unidade(s)`,
    );
  }
}

async function marcar() {
  const alvo = await ficha(funcionarioId);
  if (!alvo) throw new Error(`Funcionário ${funcionarioId} não encontrado.`);
  if (!alvo.donoId) {
    throw new Error(
      `A unidade ${alvo.condominioId} da ficha de ${alvo.nome} não tem dono definido; sem isso não dá para saber quais unidades são do mesmo cliente.`,
    );
  }

  const doCliente = await unidadesDoCliente(alvo.donoId);
  const permitidas = new Map(doCliente.map((u) => [u.id, u.nome]));

  let pedidas: number[];
  if (Number.isInteger(espelharId) && espelharId > 0) {
    const modelo = await ficha(espelharId);
    if (!modelo) throw new Error(`Funcionário ${espelharId} (o espelho) não encontrado.`);
    const marcadasDoModelo = await vinculos(espelharId);
    pedidas = [
      modelo.condominioId,
      ...marcadasDoModelo.filter((m) => m.ativo !== false).map((m) => m.condominioId),
    ];
    console.log(`Espelhando ${modelo.nome} (#${modelo.id}): ${pedidas.length} unidade(s).`);
  } else if (todasDoCliente) {
    pedidas = doCliente.map((u) => u.id);
  } else {
    pedidas = unidadesInformadas;
  }

  if (pedidas.length === 0) {
    throw new Error('Nenhuma unidade escolhida: use --espelhar, --todas-do-cliente ou --unidades.');
  }

  const deOutroCliente = [...new Set(pedidas)].filter((id) => !permitidas.has(id));
  if (deOutroCliente.length > 0) {
    throw new Error(
      `As unidades ${deOutroCliente.join(', ')} não são do cliente de ${alvo.nome}. Nada foi gravado.`,
    );
  }

  const jaTem = await vinculos(funcionarioId);
  const ativos = new Set(jaTem.filter((m) => m.ativo !== false).map((m) => m.condominioId));
  const desligados = new Set(jaTem.filter((m) => m.ativo === false).map((m) => m.condominioId));

  // A unidade da ficha já vem do portal; marcar de novo só duplicaria linha.
  const faltando = [...new Set(pedidas)].filter(
    (id) => id !== alvo.condominioId && !ativos.has(id),
  );

  console.log(
    `\n${alvo.nome} (#${alvo.id})` +
      `\n  unidade da ficha: ${alvo.unidadeDaFicha ?? '—'} (${alvo.condominioId})` +
      `\n  já marcado em: ${ativos.size === 0 ? 'nenhuma outra' : [...ativos].join(', ')}` +
      `\n  a marcar agora: ${faltando.length === 0 ? 'nada — já está completo' : faltando.map((id) => `${permitidas.get(id)} (${id})`).join(', ')}`,
  );

  if (faltando.length === 0) return;

  if (dryRun) {
    console.log('\n--dry-run: nada gravado.');
    return;
  }

  for (const id of faltando) {
    if (desligados.has(id)) {
      await sql`
        UPDATE "funcionario_condominios"
        SET "ativo" = true, "updatedAt" = now()
        WHERE "funcionarioId" = ${funcionarioId} AND "condominioId" = ${id}
      `;
    } else {
      await sql`
        INSERT INTO "funcionario_condominios" ("funcionarioId", "condominioId", "ativo")
        VALUES (${funcionarioId}, ${id}, true)
      `;
    }
  }

  const agora = await vinculos(funcionarioId);
  const ativasAgora = agora.filter((m) => m.ativo !== false);
  console.log(
    `\nPronto: o portal de ${alvo.nome} passa a mostrar ${ativasAgora.length + 1} unidade(s).`,
  );
}

try {
  if (buscar) await mostrarBusca(buscar);
  else await marcar();
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
} finally {
  await sql.end();
}
