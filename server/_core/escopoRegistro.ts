/**
 * Escopo por registro: garante que o id recebido pertence a uma organização do
 * usuário autenticado.
 *
 * O portão de módulo (`moduloProcedure`) responde "este cliente pode usar
 * vistorias?". Este responde "esta vistoria é de uma organização dele?". Sem
 * ele, rotas como `getById({ id })` leem qualquer registro da base, de qualquer
 * cliente, bastando adivinhar o número.
 *
 * A checagem é contra TODAS as organizações do usuário, não contra a ativa:
 * um síndico com duas organizações abre registros das duas sem precisar trocar
 * de contexto.
 *
 * Registro inexistente não vira FORBIDDEN: deixamos passar para o handler
 * devolver o "não encontrado" de sempre.
 */
import { TRPCError } from '@trpc/server';
import { eq, inArray } from 'drizzle-orm';
import { getDb } from '../db';
import type { TenantAccess } from './tenant';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Tabela = any;

export type ResolucaoTenant =
  | { tipo: 'direto'; tabela: Tabela }
  | { tipo: 'via'; tabela: Tabela; fk: string; pai: Tabela };

function nomeDaTabela(t: Tabela): string {
  return t?.[Symbol.for('drizzle:Name')] ?? t?.__nome ?? '(tabela)';
}

/**
 * A tabela tem `condominioId`.
 *
 * Valida no carregamento do módulo: uma tabela sem `condominioId` aqui viraria
 * um SELECT de coluna indefinida em produção. Melhor falhar no boot.
 */
export function direto(tabela: Tabela): ResolucaoTenant {
  if (!tabela?.condominioId) {
    throw new Error(
      `escopoRegistro: "${nomeDaTabela(tabela)}" não tem condominioId. Use via(tabela, fk, pai).`,
    );
  }
  return { tipo: 'direto', tabela };
}

/** A tabela não tem `condominioId`; resolve pelo pai via chave estrangeira. */
export function via(tabela: Tabela, fk: string, pai: Tabela): ResolucaoTenant {
  if (!tabela?.[fk]) {
    throw new Error(
      `escopoRegistro: "${nomeDaTabela(tabela)}" não tem a coluna "${fk}".`,
    );
  }
  if (!pai?.condominioId) {
    throw new Error(
      `escopoRegistro: o pai "${nomeDaTabela(pai)}" não tem condominioId; ele próprio precisa ser resolvido por outro pai.`,
    );
  }
  return { tipo: 'via', tabela, fk, pai };
}

/** Campo do input -> como descobrir o tenant daquele registro. */
export type MapaEscopo = Record<string, ResolucaoTenant>;

/**
 * Tenants dos registros encontrados. Registros inexistentes simplesmente não
 * aparecem no resultado. `null` = não foi possível consultar (banco fora).
 */
async function tenantsDosRegistros(
  resolucao: ResolucaoTenant,
  ids: number[],
): Promise<number[] | null> {
  const db = await getDb();
  // Banco fora: não transformamos falha de infra em erro de permissão.
  if (!db) return null;

  const condicao = (coluna: Tabela) =>
    ids.length === 1 ? eq(coluna, ids[0]) : inArray(coluna, ids);

  if (resolucao.tipo === 'direto') {
    const linhas = await db
      .select({ tenant: resolucao.tabela.condominioId })
      .from(resolucao.tabela)
      .where(condicao(resolucao.tabela.id));
    return linhas.map((l: { tenant: number | null }) => l.tenant).filter((t): t is number => t != null);
  }

  const linhas = await db
    .select({ tenant: resolucao.pai.condominioId })
    .from(resolucao.tabela)
    .innerJoin(resolucao.pai, eq(resolucao.pai.id, resolucao.tabela[resolucao.fk]))
    .where(condicao(resolucao.tabela.id));
  return linhas.map((l: { tenant: number | null }) => l.tenant).filter((t): t is number => t != null);
}

/**
 * Coleta os valores de um campo no input, incluindo os que vêm dentro de
 * arrays de objetos — é o caso de `reorder({ fotos: [{ id, ordem }] })`.
 */
function coletarIds(dados: Record<string, unknown>, campo: string): number[] {
  const encontrados = new Set<number>();

  const direto = dados[campo];
  if (typeof direto === 'number') encontrados.add(direto);

  for (const valor of Object.values(dados)) {
    if (!Array.isArray(valor)) continue;
    for (const item of valor) {
      if (item && typeof item === 'object') {
        const v = (item as Record<string, unknown>)[campo];
        if (typeof v === 'number') encontrados.add(v);
      }
    }
  }

  return [...encontrados];
}

async function tenantPermitido(tenant: TenantAccess, id: number): Promise<boolean> {
  if (tenant.isMaster()) return true;
  return (await tenant.ids()).includes(id);
}

/**
 * Middleware de escopo.
 *
 * @param padrao    campos aplicados a todas as procedures do router
 * @param overrides por nome de procedure (ou caminho completo), quando o mesmo
 *                  campo (`id`, em geral) aponta para outra tabela
 */
export function escopoPorRegistro(padrao: MapaEscopo, overrides: Record<string, MapaEscopo> = {}) {
  return async function verificar(
    tenant: TenantAccess,
    caminho: string,
    input: unknown,
  ): Promise<void> {
    if (!input || typeof input !== 'object') return;
    if (tenant.isMaster()) return;

    // Aceita chave pelo caminho completo ("foto.delete") ou só pelo nome
    // ("delete"). O caminho completo desempata routers que compartilham nomes.
    const nome = caminho.split('.').pop() ?? caminho;
    const mapa = { ...padrao, ...(overrides[caminho] ?? overrides[nome] ?? {}) };
    const dados = input as Record<string, unknown>;

    for (const [campo, resolucao] of Object.entries(mapa)) {
      const ids = coletarIds(dados, campo);
      if (ids.length === 0) continue;

      const tenants = await tenantsDosRegistros(resolucao, ids);
      // null = banco fora -> segue o fluxo normal
      if (tenants === null) continue;

      for (const dono of tenants) {
        if (!(await tenantPermitido(tenant, dono))) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Registro não pertence a esta organização.',
          });
        }
      }
    }
  };
}

export type VerificadorEscopo = ReturnType<typeof escopoPorRegistro>;
