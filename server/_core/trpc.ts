import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// Hierarquia numérica: admin_master(4) > admin(3) > responsavel(2) > funcionario(1)
const HIERARQUIA_NIVEL: Record<string, number> = {
  admin_master: 4,
  admin: 3,
  responsavel: 2,
  funcionario: 1,
};

/** Retorna o nível hierárquico do usuário (usa campo hierarquia, com fallback para role) */
function getUserHierarquiaNivel(user: { hierarquia?: string | null; role?: string | null }): number {
  if (user.hierarquia && HIERARQUIA_NIVEL[user.hierarquia]) {
    return HIERARQUIA_NIVEL[user.hierarquia];
  }
  // Fallback: mapear role legado
  const roleMap: Record<string, string> = { master: 'admin_master', admin: 'admin', sindico: 'admin', user: 'funcionario', morador: 'funcionario' };
  const mapped = roleMap[user.role || ''] || 'funcionario';
  return HIERARQUIA_NIVEL[mapped] || 1;
}

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
