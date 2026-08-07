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
import { and, eq } from 'drizzle-orm';
import {
  catalogoDoTenant,
  getModulo,
  modulosPadraoDoSegmento,
  tenantPodeVerModulo,
  type ModuloManifest,
  type Segmento,
} from '../../shared/modules/registry';
import { condominioFuncoes, condominios } from '../../drizzle/schema';
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

  // Sem configuração explícita: cai no pacote padrão do segmento (opt-in).
  // Nunca "tudo habilitado" — senão todo módulo novo vazaria para todos.
  let segmento: Segmento = 'condominio';
  try {
    const [org] = await db
      .select({ segmento: condominios.segmento })
      .from(condominios)
      .where(eq(condominios.id, tenantId))
      .limit(1);
    segmento = (org?.segmento as Segmento) || 'condominio';
  } catch (erro) {
    // Coluna `segmento` ainda não existe (migration pendente): mantém o
    // comportamento antigo em vez de derrubar o cliente.
    console.error('[modules] coluna segmento indisponível, usando padrão:', erro);
  }

  return new Set(modulosPadraoDoSegmento(segmento));
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

/** Segmento gravado na organização (fallback: generico). */
export async function getSegmentoDoTenant(tenantId: number): Promise<Segmento> {
  const db = await getDb();
  if (!db) return 'generico';

  const [org] = await db
    .select({ segmento: condominios.segmento })
    .from(condominios)
    .where(eq(condominios.id, tenantId))
    .limit(1);

  return (org?.segmento as Segmento) || 'generico';
}

/** Grava o pacote padrão do segmento para um tenant recém-criado. */
export async function seedModulosDoTenant(
  tenantId: number,
  segmento?: Segmento,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const segmentoAlvo = segmento ?? (await getSegmentoDoTenant(tenantId));

  const existentes = await db
    .select({ funcaoId: condominioFuncoes.funcaoId })
    .from(condominioFuncoes)
    .where(eq(condominioFuncoes.condominioId, tenantId));

  const jaGravados = new Set(existentes.map((e) => e.funcaoId));
  const alvo = modulosPadraoDoSegmento(segmentoAlvo).filter((id) => !jaGravados.has(id));

  if (alvo.length > 0) {
    await db.insert(condominioFuncoes).values(
      alvo.map((funcaoId) => ({ condominioId: tenantId, funcaoId, habilitada: true })),
    );
  }

  invalidarCacheModulos(tenantId);
  return alvo.length;
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
