import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

import { getUserHierarquiaNivel, HIERARQUIA_NIVEL } from './trpc.types';
import { isModuloHabilitado } from './modules';
import type { VerificadorEscopo } from './escopoRegistro';

export { getUserHierarquiaNivel, HIERARQUIA_NIVEL };

const isProduction = process.env.NODE_ENV === 'production';

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: isProduction && error.code === 'INTERNAL_SERVER_ERROR'
        ? 'Erro interno do servidor'
        : shape.message,
      data: {
        ...shape.data,
        // Nunca enviar stack trace em produção
        stack: isProduction ? undefined : error.stack,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
/** Chamadas server-side e testes de composição de middleware. */
export const createCallerFactory = t.createCallerFactory;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Middleware que aceita user OU funcionário autenticado
const requireUserOrFuncionario = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user && !ctx.funcionario) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({ ctx });
});

export const protectedOrFuncionarioProcedure = t.procedure.use(requireUserOrFuncionario);

// Middleware que exige funcionário autenticado
const requireFuncionario = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.funcionario) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Acesso exclusivo para funcionários autenticados." });
  }

  return next({
    ctx: {
      ...ctx,
      funcionario: ctx.funcionario,
    },
  });
});

export const funcionarioProcedure = t.procedure.use(requireFuncionario);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || getUserHierarquiaNivel(ctx.user) < HIERARQUIA_NIVEL.admin) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Apenas admin_master pode acessar
export const adminMasterProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || getUserHierarquiaNivel(ctx.user) < HIERARQUIA_NIVEL.admin_master) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo para Admin Master." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Extrai `condominioId` do input bruto, quando presente.
 * Serve de ponte durante a migração: os routers ainda recebem o tenant por
 * input, mas ele passa a ser validado contra a identidade autenticada.
 */
function lerCondominioIdDoInput(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const valor = (raw as Record<string, unknown>).condominioId;
  return typeof valor === 'number' ? valor : null;
}

/**
 * Resolve o tenant da requisição validando qualquer `condominioId` vindo do
 * input contra os tenants permitidos para a identidade autenticada.
 */
async function resolverTenant(
  ctx: TrpcContext,
  getRawInput: () => Promise<unknown>,
): Promise<number> {
  const solicitado = lerCondominioIdDoInput(await getRawInput());
  return ctx.tenant.require(solicitado);
}

/** Usuário OU funcionário autenticado + tenant resolvido. */
export const tenantProcedure = protectedOrFuncionarioProcedure.use(
  async ({ ctx, next, getRawInput }) => {
    const condominioId = await resolverTenant(ctx, getRawInput);
    return next({ ctx: { ...ctx, condominioId } });
  },
);

/**
 * Usuário autenticado (não funcionário) + tenant resolvido.
 * Substituto direto de `protectedProcedure` — preserva a mesma exigência de
 * autenticação, apenas acrescenta a validação de tenant.
 */
export const tenantUserProcedure = protectedProcedure.use(
  async ({ ctx, next, getRawInput }) => {
    const condominioId = await resolverTenant(ctx, getRawInput);
    return next({ ctx: { ...ctx, condominioId } });
  },
);

/**
 * Exige que o módulo esteja disponível E habilitado para o tenant.
 * É esta checagem que torna o isolamento real: esconder o item de menu no
 * client não impede ninguém de chamar a rota diretamente.
 */
async function assegurarModulo(
  ctx: { condominioId: number; tenant: TrpcContext['tenant'] },
  moduloId: string,
): Promise<void> {
  // admin_master dá suporte a qualquer organização; a checagem de módulo seria
  // feita contra um tenant arbitrário e só atrapalharia.
  if (ctx.tenant.isMaster()) return;

  if (!(await isModuloHabilitado(ctx.condominioId, moduloId))) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Módulo não disponível para esta organização.',
    });
  }
}

/**
 * Confere que os ids recebidos pertencem à organização da requisição.
 * `admin_master` passa direto: `ctx.condominioId` dele é arbitrário e o escopo
 * por registro só atrapalharia o suporte.
 */
async function assegurarEscopo(
  ctx: { tenant: TrpcContext['tenant'] },
  escopo: VerificadorEscopo | undefined,
  caminho: string,
  getRawInput: () => Promise<unknown>,
): Promise<void> {
  if (!escopo || ctx.tenant.isMaster()) return;
  await escopo(ctx.tenant, caminho, await getRawInput());
}

/**
 * Módulo habilitado + usuário ou funcionário autenticado.
 *
 * Uso:  const p = moduloProcedure('vistorias', escopoPorRegistro({ id: direto(vistorias) }));
 *       p.input(...).query(...)
 */
export function moduloProcedure(moduloId: string, escopo?: VerificadorEscopo) {
  return tenantProcedure.use(async ({ ctx, next, path, getRawInput }) => {
    await assegurarModulo(ctx, moduloId);
    await assegurarEscopo(ctx, escopo, path, getRawInput);
    return next({ ctx });
  });
}

/** Módulo habilitado + usuário autenticado (drop-in de `protectedProcedure`). */
export function moduloUserProcedure(moduloId: string, escopo?: VerificadorEscopo) {
  return tenantUserProcedure.use(async ({ ctx, next, path, getRawInput }) => {
    await assegurarModulo(ctx, moduloId);
    await assegurarEscopo(ctx, escopo, path, getRawInput);
    return next({ ctx });
  });
}
