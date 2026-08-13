/**
 * Teste grátis de 7 dias.
 *
 * Quem se cadastra sozinho ganha prazo; cliente aberto pela plataforma nasce
 * sem prazo (`users.trialAte` nulo) e nunca é bloqueado.
 *
 * O prazo é do **dono da organização**, não de quem está clicando: o gestor de
 * unidade e o funcionário de um cliente em teste param junto com ele, senão a
 * conta bloqueada continuaria operando pelas mãos da equipe.
 *
 * Vencido, o sistema vira somente leitura. Consultar continua liberado — a
 * pessoa precisa enxergar o que cadastrou para decidir se contrata — e só a
 * gravação é recusada.
 */
import { eq } from 'drizzle-orm';
import { condominios, users } from '../../drizzle/schema';
import { getDb } from '../db';

export const DIAS_DE_TESTE = 7;

/** Fim do teste para quem se cadastra agora. */
export function fimDoTeste(inicio = new Date()): Date {
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + DIAS_DE_TESTE);
  return fim;
}

/** Dias inteiros que ainda faltam. Zero quando venceu. */
export function diasRestantes(trialAte?: Date | string | null): number | null {
  if (!trialAte) return null;
  const fim = new Date(trialAte);
  if (Number.isNaN(fim.getTime())) return null;
  const faltam = Math.ceil((fim.getTime() - Date.now()) / 86_400_000);
  return Math.max(0, faltam);
}

/**
 * Cache curto do prazo por organização.
 *
 * Sem ele seriam duas consultas em toda gravação do sistema. Um minuto de
 * atraso para o bloqueio começar a valer não muda nada para ninguém.
 */
const TTL_MS = 60_000;
const cache = new Map<number, { trialAte: Date | null; expiraEm: number }>();

export function invalidarCacheTeste(condominioId?: number): void {
  if (condominioId == null) cache.clear();
  else cache.delete(condominioId);
}

/** Fim do teste do dono desta organização (`null` = sem prazo). */
export async function trialDaOrganizacao(condominioId: number): Promise<Date | null> {
  const agora = Date.now();
  const hit = cache.get(condominioId);
  if (hit && hit.expiraEm > agora) return hit.trialAte;

  const db = await getDb();
  if (!db) return null;

  try {
    const [linha] = await db
      .select({ trialAte: users.trialAte })
      .from(condominios)
      .innerJoin(users, eq(users.id, condominios.sindicoId))
      .where(eq(condominios.id, condominioId))
      .limit(1);

    const trialAte = linha?.trialAte ?? null;
    cache.set(condominioId, { trialAte, expiraEm: agora + TTL_MS });
    return trialAte;
  } catch (erro) {
    // Falha ao consultar não pode virar bloqueio: banco fora ou migração
    // pendente deixariam o cliente pagante sem gravar, com a mensagem errada
    // ("seu teste terminou"). Na dúvida, libera.
    console.error('[teste] falha ao ler o prazo do cliente:', erro);
    return null;
  }
}

/** A organização está com o teste vencido? */
export async function testeVencido(condominioId: number): Promise<boolean> {
  const trialAte = await trialDaOrganizacao(condominioId);
  if (!trialAte) return false;
  return new Date(trialAte).getTime() < Date.now();
}
