/**
 * Resolução e validação de tenant (organização/condomínio).
 *
 * Antes desta camada, os routers recebiam `condominioId` como input e confiavam
 * nele — qualquer cliente autenticado podia ler dados de outro cliente trocando
 * o número. Aqui o conjunto de tenants acessíveis é derivado da identidade
 * autenticada e o input passa a ser apenas uma *seleção* dentro desse conjunto.
 */
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import type { Funcionario, User } from '../../drizzle/schema';
import { condominios, usuarioCondominios } from '../../drizzle/schema';
import { getDb } from '../db';
import { getUserHierarquiaNivel, HIERARQUIA_NIVEL } from './trpc.types';

/** Cabeçalho usado pelo client para escolher a organização ativa. */
export const HEADER_TENANT = 'x-condominio-id';

export interface TenantAccess {
  /** IDs de tenants que a identidade autenticada pode acessar. */
  ids(): Promise<number[]>;
  /**
   * Resolve o tenant da requisição.
   * Com `requested`, valida que pertence ao conjunto permitido.
   * Sem `requested`, usa a organização ativa (seleção explícita ou a primeira).
   */
  require(requested?: number | null): Promise<number>;
  /** Lança FORBIDDEN se o tenant não pertencer à identidade autenticada. */
  assert(tenantId: number): Promise<void>;
  /** true para admin_master — enxerga todos os tenants. */
  isMaster(): boolean;
}

export interface TenantAccessOptions {
  /** Organização ativa escolhida pelo client (cabeçalho `x-condominio-id`). */
  selecionado?: number | null;
  /** Injeção usada em teste, no lugar da consulta ao banco. */
  idsFornecidos?: number[] | (() => number[]);
}

function semTenant(): TRPCError {
  return new TRPCError({
    code: 'FORBIDDEN',
    message: 'Nenhuma organização associada a este acesso.',
  });
}

export function createTenantAccess(
  user: User | null,
  funcionario: Funcionario | null,
  options: TenantAccessOptions = {},
): TenantAccess {
  let cache: number[] | null = null;

  const isMaster = () =>
    !!user && getUserHierarquiaNivel(user) >= HIERARQUIA_NIVEL.admin_master;

  async function ids(): Promise<number[]> {
    if (cache) return cache;

    if (options.idsFornecidos) {
      cache =
        typeof options.idsFornecidos === 'function'
          ? options.idsFornecidos()
          : options.idsFornecidos;
      return cache;
    }

    // Funcionário pertence a exatamente um tenant — não precisa consultar.
    if (funcionario) {
      cache = [funcionario.condominioId];
      return cache;
    }

    if (!user) {
      cache = [];
      return cache;
    }

    const db = await getDb();
    if (!db) {
      cache = [];
      return cache;
    }

    // admin_master opera sobre toda a base (suporte/manutenção da plataforma).
    if (isMaster()) {
      const todos = await db.select({ id: condominios.id }).from(condominios);
      cache = todos.map((c) => c.id);
      return cache;
    }

    const proprios = await db
      .select({ id: condominios.id })
      .from(condominios)
      .where(eq(condominios.sindicoId, user.id));

    // Vínculos explícitos (`usuario_condominios`): é o que permite gestor-chefe
    // e gestor de unidade coexistirem, já que `sindicoId` comporta um só dono.
    const vinculados = await db
      .select({ id: usuarioCondominios.condominioId })
      .from(usuarioCondominios)
      .where(
        and(
          eq(usuarioCondominios.userId, user.id),
          eq(usuarioCondominios.ativo, true),
        ),
      );

    cache = [...new Set([...proprios, ...vinculados].map((c) => c.id))];
    return cache;
  }

  async function assert(tenantId: number): Promise<void> {
    // Master não precisa da lista completa — evita varrer `condominios` a cada
    // requisição só para concluir que ele pode tudo.
    if (isMaster()) return;

    const permitidos = await ids();
    if (!permitidos.includes(tenantId)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Sem permissão para acessar dados desta organização.',
      });
    }
  }

  /**
   * Organização ativa quando a rota não informa `condominioId`.
   *
   * Não pode lançar por ambiguidade: existem muitas rotas legítimas que operam
   * por `id` do registro e nunca receberam o tenant. Ordem: funcionário sempre
   * usa o próprio; depois a seleção explícita do client; senão a primeira.
   */
  async function ativo(): Promise<number> {
    if (funcionario) return funcionario.condominioId;

    const permitidos = await ids();

    const selecionado = options.selecionado;
    if (selecionado != null && (isMaster() || permitidos.includes(selecionado))) {
      return selecionado;
    }

    if (permitidos.length === 0) throw semTenant();
    return permitidos[0];
  }

  async function require(requested?: number | null): Promise<number> {
    if (requested != null) {
      await assert(requested);
      return requested;
    }
    return ativo();
  }

  return { ids, require, assert, isMaster };
}

/** Lê a organização ativa do cabeçalho enviado pelo client. */
export function lerTenantSelecionado(req: {
  headers?: Record<string, unknown>;
}): number | null {
  const bruto = req.headers?.[HEADER_TENANT];
  const valor = Array.isArray(bruto) ? bruto[0] : bruto;
  if (typeof valor !== 'string') return null;
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
