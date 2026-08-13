/**
 * Habilitação de módulos por tenant.
 *
 * Duas perguntas distintas, ambas respondidas aqui:
 *  1. O módulo EXISTE para este cliente?  -> registry (`visibilidade`/`tenants`)
 *  2. O módulo está LIGADO para este cliente? -> tabela `condominio_funcoes`
 *
 * Um módulo restrito a outro tenant responde "não" para (1) e por isso nunca
 * aparece em catálogo, menu ou API — mesmo que alguém force o ID na chamada.
 */
import { and, eq, inArray } from 'drizzle-orm';
import {
  catalogoDoTenant,
  getModulo,
  modulosPadrao,
  tenantPodeVerModulo,
  type ModuloManifest,
} from '../../shared/modules/registry';
import { condominioFuncoes } from '../../drizzle/schema';
import { getDb } from '../db';

/**
 * Cache curto — evita uma query por procedure numa mesma navegação.
 *
 * É por processo: com várias réplicas, ligar/desligar um módulo leva até
 * `TTL_MS` para valer em todas. Aceitável para configuração de catálogo.
 */
const TTL_MS = 30_000;
const cache = new Map<number, { ids: Set<string>; expiraEm: number }>();

export function invalidarCacheModulos(tenantId?: number): void {
  if (tenantId == null) cache.clear();
  else cache.delete(tenantId);
}

/**
 * `null` significa "não foi possível determinar" (banco fora, migration ainda
 * não aplicada). Nesse caso o portão de módulo não bloqueia: a falha real
 * aparece no próprio handler, com mensagem adequada, em vez de virar um
 * "módulo não disponível" enganoso.
 */
async function carregarHabilitados(tenantId: number): Promise<Set<string> | null> {
  const db = await getDb();
  if (!db) return null;

  let linhas: { funcaoId: string; habilitada: boolean | null }[];
  try {
    linhas = await db
      .select({ funcaoId: condominioFuncoes.funcaoId, habilitada: condominioFuncoes.habilitada })
      .from(condominioFuncoes)
      .where(eq(condominioFuncoes.condominioId, tenantId));
  } catch (erro) {
    console.error('[modules] falha ao ler condominio_funcoes:', erro);
    return null;
  }

  if (linhas.length > 0) {
    return new Set(linhas.filter((l) => l.habilitada).map((l) => l.funcaoId));
  }

  // Sem configuração explícita: cai no pacote padrão do sistema (opt-in).
  // Nunca "tudo habilitado" — senão todo módulo novo vazaria para todos, e o
  // legado de condomínio voltaria para a tela de quem nunca pediu.
  return new Set(modulosPadrao());
}

async function habilitadosOuNulo(tenantId: number): Promise<Set<string> | null> {
  const agora = Date.now();
  const hit = cache.get(tenantId);
  if (hit && hit.expiraEm > agora) return hit.ids;

  const ids = await carregarHabilitados(tenantId);
  // Estado indeterminado não entra no cache: queremos reavaliar no próximo request.
  if (ids) cache.set(tenantId, { ids, expiraEm: agora + TTL_MS });
  return ids;
}

/** IDs habilitados E visíveis para o tenant. */
export async function getModulosHabilitados(tenantId: number): Promise<string[]> {
  const ids = await habilitadosOuNulo(tenantId);
  const visiveis = catalogoDoTenant(tenantId);

  // Indeterminado: devolve o catálogo visível para não esvaziar a interface.
  if (!ids) return visiveis.map((m) => m.id);

  // Intersecção com o catálogo visível: um módulo restrito a outro cliente
  // permanece desligado mesmo que exista linha habilitada no banco.
  return visiveis.filter((m) => ids.has(m.id)).map((m) => m.id);
}

export async function isModuloHabilitado(tenantId: number, moduloId: string): Promise<boolean> {
  const modulo = getModulo(moduloId);
  // Estas duas checagens são estáticas (registry) e valem mesmo com o banco
  // fora: módulo inexistente ou restrito a outro cliente nunca passa.
  if (!modulo) return false;
  if (!tenantPodeVerModulo(modulo, tenantId)) return false;

  const ids = await habilitadosOuNulo(tenantId);
  if (!ids) return true;

  return ids.has(moduloId);
}

/** Catálogo que o admin do tenant pode ver e configurar. */
export function getCatalogoVisivel(tenantId: number): ModuloManifest[] {
  return catalogoDoTenant(tenantId);
}

/** Grava o pacote padrão para um tenant recém-criado. */
export async function seedModulosDoTenant(tenantId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const existentes = await db
    .select({ funcaoId: condominioFuncoes.funcaoId })
    .from(condominioFuncoes)
    .where(eq(condominioFuncoes.condominioId, tenantId));

  const jaGravados = new Set(existentes.map((e) => e.funcaoId));
  const alvo = modulosPadrao().filter((id) => !jaGravados.has(id));

  if (alvo.length > 0) {
    await db.insert(condominioFuncoes).values(
      alvo.map((funcaoId) => ({ condominioId: tenantId, funcaoId, habilitada: true })),
    );
  }

  invalidarCacheModulos(tenantId);
  return alvo.length;
}

/**
 * Grava vários módulos de um tenant de uma vez.
 *
 * Existe para a rede de unidades: uma organização com 45 módulos × 15 unidades
 * daria quase 700 idas ao banco pelo caminho de um módulo por vez, e a
 * requisição estoura antes de terminar. Aqui são três comandos por
 * organização, independentemente do tamanho da lista.
 *
 * Módulo fora do catálogo visível do tenant é ignorado em silêncio — é o mesmo
 * critério de `setModuloHabilitado`, que recusa um a um.
 */
export async function setModulosHabilitados(
  tenantId: number,
  itens: { funcaoId: string; habilitada: boolean }[],
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const permitidos = itens.filter((i) => {
    const modulo = getModulo(i.funcaoId);
    return modulo && tenantPodeVerModulo(modulo, tenantId);
  });
  if (permitidos.length === 0) return 0;

  const existentes = await db
    .select({ funcaoId: condominioFuncoes.funcaoId })
    .from(condominioFuncoes)
    .where(eq(condominioFuncoes.condominioId, tenantId));

  const jaGravados = new Set(existentes.map((e) => e.funcaoId));

  const novos = permitidos.filter((i) => !jaGravados.has(i.funcaoId));
  if (novos.length > 0) {
    await db.insert(condominioFuncoes).values(
      novos.map((i) => ({
        condominioId: tenantId,
        funcaoId: i.funcaoId,
        habilitada: i.habilitada,
      })),
    );
  }

  for (const valor of [true, false]) {
    const ids = permitidos
      .filter((i) => i.habilitada === valor && jaGravados.has(i.funcaoId))
      .map((i) => i.funcaoId);
    if (ids.length === 0) continue;

    await db
      .update(condominioFuncoes)
      .set({ habilitada: valor, updatedAt: new Date() })
      .where(
        and(
          eq(condominioFuncoes.condominioId, tenantId),
          inArray(condominioFuncoes.funcaoId, ids),
        ),
      );
  }

  invalidarCacheModulos(tenantId);
  return permitidos.length;
}

/** Liga/desliga um módulo respeitando a visibilidade do registry. */
export async function setModuloHabilitado(
  tenantId: number,
  moduloId: string,
  habilitada: boolean,
): Promise<void> {
  const modulo = getModulo(moduloId);
  if (!modulo || !tenantPodeVerModulo(modulo, tenantId)) {
    throw new Error('Módulo indisponível para esta organização.');
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [existente] = await db
    .select({ id: condominioFuncoes.id })
    .from(condominioFuncoes)
    .where(
      and(
        eq(condominioFuncoes.condominioId, tenantId),
        eq(condominioFuncoes.funcaoId, moduloId),
      ),
    )
    .limit(1);

  if (existente) {
    await db
      .update(condominioFuncoes)
      .set({ habilitada, updatedAt: new Date() })
      .where(eq(condominioFuncoes.id, existente.id));
  } else {
    await db
      .insert(condominioFuncoes)
      .values({ condominioId: tenantId, funcaoId: moduloId, habilitada });
  }

  invalidarCacheModulos(tenantId);
}
