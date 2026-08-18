/**
 * Unidade suspensa: ninguém que trabalha nela entra.
 *
 * Diferente do teste vencido, que deixa consultar e recusa gravar. Aqui é
 * corte: quem administra decidiu suspender aquela operação, e meia porta
 * aberta — a equipe entrando pelo portal do funcionário — anula a decisão.
 *
 * A conta da plataforma nunca é barrada: é ela que suspende e libera.
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { condominios } from '../../drizzle/schema';
import { getDb } from '../db';

const TTL_MS = 60_000;
const cache = new Map<number, { bloqueio: { em: Date; motivo: string | null } | null; expiraEm: number }>();

export function invalidarCacheBloqueio(condominioId?: number): void {
  if (condominioId == null) cache.clear();
  else cache.delete(condominioId);
}

/** Bloqueio da organização, com o motivo para a mensagem da tela. */
export async function bloqueioDaOrganizacao(
  condominioId: number,
): Promise<{ em: Date; motivo: string | null } | null> {
  const agora = Date.now();
  const hit = cache.get(condominioId);
  if (hit && hit.expiraEm > agora) return hit.bloqueio;

  const db = await getDb();
  if (!db) return null;

  try {
    const [linha] = await db
      .select({
        bloqueadaEm: condominios.bloqueadaEm,
        motivoBloqueio: condominios.motivoBloqueio,
      })
      .from(condominios)
      .where(eq(condominios.id, condominioId))
      .limit(1);

    const bloqueio = linha?.bloqueadaEm
      ? { em: linha.bloqueadaEm, motivo: linha.motivoBloqueio ?? null }
      : null;

    cache.set(condominioId, { bloqueio, expiraEm: agora + TTL_MS });
    return bloqueio;
  } catch (erro) {
    // Banco fora ou migração pendente não pode virar bloqueio geral: seria
    // derrubar todo mundo por causa de um soluço de infraestrutura.
    console.error('[bloqueio] falha ao ler o estado da unidade:', erro);
    return null;
  }
}

/**
 * Das unidades informadas, as que não estão suspensas.
 *
 * Serve às telas que somam a rede (lista de O.S., calendário): a checagem da
 * requisição olha só a unidade ativa, então sem este filtro o registro de uma
 * unidade suspensa — que ninguém consegue abrir — reapareceria na soma.
 */
export async function unidadesNaoBloqueadas(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return ids;

  const db = await getDb();
  // Mesmo critério do bloqueio individual: falha de infra não vira corte.
  if (!db) return ids;

  try {
    const linhas = await db
      .select({ id: condominios.id })
      .from(condominios)
      .where(and(inArray(condominios.id, ids), isNull(condominios.bloqueadaEm)));

    return linhas.map((l) => l.id);
  } catch (erro) {
    console.error('[bloqueio] falha ao filtrar unidades suspensas:', erro);
    return ids;
  }
}

/** Mensagem que a pessoa vê ao esbarrar no bloqueio. */
export function mensagemDeBloqueio(motivo: string | null): string {
  return motivo?.trim() || 'Esta unidade está com o acesso suspenso. Fale com o suporte.';
}
