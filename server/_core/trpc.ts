import { NOT_ADMIN_ERR_MSG, SENHA_PROVISORIA_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

import { getUserHierarquiaNivel, HIERARQUIA_NIVEL } from './trpc.types';
import { isModuloHabilitado } from './modules';
import { testeVencido } from './teste';
import { assegurarPermissaoFuncionario } from './permissaoFuncionario';
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

/**
 * Rota pública que grava (comentário em item compartilhado, evento de timeline).
 *
 * Quem escreve por ali não tem conta, então não há nada a bloquear além do
 * endereço de origem: sem teto, um script enche a caixa de entrada do cliente
 * com o link que ele mesmo divulgou. Leitura segue livre.
 */
export const publicWriteProcedure = t.procedure.use(async ({ ctx, next, path, type }) => {
  if (type === "mutation") {
    const { getClientIp, rateLimiter } = await import("./rateLimit");
    rateLimiter.check(`publico:${path}:${getClientIp(ctx.req)}`, {
      maxAttempts: 20,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
    });
  }
  return next();
});
/** Chamadas server-side e testes de composição de middleware. */
export const createCallerFactory = t.createCallerFactory;

/**
 * Rotas liberadas enquanto a conta ainda está com a senha padrão.
 * O suficiente para o client se montar, trocar a senha e sair — nada além.
 */
const ROTAS_SEM_SENHA_DEFINIDA = new Set([
  'auth.me',
  'auth.logout',
  'auth.getPerfil',
  'auth.alterarSenha',
  'auth.definirSenhaProvisoria',
  'system.bootstrap',
]);

/**
 * Contas criadas em lote nascem com senha padrão. Barrar no middleware, e não
 * só na tela, é o que impede seguir usando o sistema com a senha de implantação.
 */
function assegurarSenhaDefinida(user: TrpcContext['user'], path: string): void {
  if (user?.senhaProvisoria && !ROTAS_SEM_SENHA_DEFINIDA.has(path)) {
    throw new TRPCError({ code: "FORBIDDEN", message: SENHA_PROVISORIA_ERR_MSG });
  }
}

const requireUser = t.middleware(async opts => {
  const { ctx, next, path } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  assegurarSenhaDefinida(ctx.user, path);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Confere qualquer `condominioId` que chegue pelo input.
 *
 * A maior parte das rotas ainda recebe o tenant por input e confia nele. Com
 * mais de um cliente na mesma base, trocar o número na chamada bastava para ler
 * a organização do vizinho. Aqui a conferência passa a valer para toda rota
 * autenticada, sem depender de cada router lembrar de chamar `tenant.assert`.
 */
const assegurarTenantDoInput = t.middleware(async ({ ctx, next, getRawInput }) => {
  const solicitado = lerCondominioIdDoInput(await getRawInput());
  if (solicitado != null) await ctx.tenant.assert(solicitado);
  return next();
});

export const protectedProcedure = t.procedure.use(requireUser).use(assegurarTenantDoInput);

// Middleware que aceita user OU funcionário autenticado
const requireUserOrFuncionario = t.middleware(async opts => {
  const { ctx, next, path } = opts;

  if (!ctx.user && !ctx.funcionario) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  assegurarSenhaDefinida(ctx.user, path);

  return next({ ctx });
});

export const protectedOrFuncionarioProcedure = t.procedure
  .use(requireUserOrFuncionario)
  .use(assegurarTenantDoInput);

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
    const { ctx, next, path } = opts;

    if (!ctx.user || getUserHierarquiaNivel(ctx.user) < HIERARQUIA_NIVEL.admin) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    // Não deriva de `requireUser`: sem isto, conta admin criada em lote
    // escaparia do bloqueio de senha provisória.
    assegurarSenhaDefinida(ctx.user, path);

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
    const { ctx, next, path } = opts;

    if (!ctx.user || getUserHierarquiaNivel(ctx.user) < HIERARQUIA_NIVEL.admin_master) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo para Admin Master." });
    }

    assegurarSenhaDefinida(ctx.user, path);

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
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  // Alguns routers declaram o campo com `z.coerce.number()`: o valor chega
  // como texto e passaria sem conferência se olhássemos só o tipo `number`.
  if (typeof valor === 'string' && /^\d+$/.test(valor)) return Number.parseInt(valor, 10);
  return null;
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

/**
 * Teste vencido: o sistema fica somente leitura.
 *
 * Recusa só gravação. Consultar continua liberado porque a pessoa precisa
 * enxergar o que cadastrou para decidir se contrata — e porque tirar a tela do
 * ar transformaria fim de teste em perda de dado aos olhos dela.
 */
async function assegurarTesteVigente(
  ctx: TrpcContext,
  condominioId: number,
  tipo: string,
) {
  if (tipo !== "mutation") return;
  // A conta da plataforma nunca é barrada: é ela que abre, conserta e libera
  // cliente. Bloquear o suporte junto com o cliente vencido deixaria o único
  // caminho de solução fechado.
  if (ctx.tenant.isMaster()) return;
  if (!(await testeVencido(condominioId))) return;

  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "Seu teste de 7 dias terminou. Fale com a gente para continuar usando — seus dados estão guardados.",
  });
}

/** Usuário OU funcionário autenticado + tenant resolvido. */
export const tenantProcedure = protectedOrFuncionarioProcedure.use(
  async ({ ctx, next, getRawInput, type }) => {
    const condominioId = await resolverTenant(ctx, getRawInput);
    await assegurarTesteVigente(ctx, condominioId, type);
    return next({ ctx: { ...ctx, condominioId } });
  },
);

/**
 * Usuário autenticado (não funcionário) + tenant resolvido.
 * Substituto direto de `protectedProcedure` — preserva a mesma exigência de
 * autenticação, apenas acrescenta a validação de tenant.
 */
export const tenantUserProcedure = protectedProcedure.use(
  async ({ ctx, next, getRawInput, type }) => {
    const condominioId = await resolverTenant(ctx, getRawInput);
    await assegurarTesteVigente(ctx, condominioId, type);
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
export function moduloProcedure(
  moduloId: string,
  escopo?: VerificadorEscopo,
  /**
   * Chave em `funcionario_funcoes`. Informada, a permissão individual do
   * funcionário passa a valer no servidor, e não só na tela — sem isso, uma
   * função desligada continua acessível chamando a rota direto.
   */
  chaveFuncao?: string,
) {
  return tenantProcedure.use(async ({ ctx, next, path, type, getRawInput }) => {
    await assegurarModulo(ctx, moduloId);
    await assegurarEscopo(ctx, escopo, path, getRawInput);
    if (chaveFuncao) {
      await assegurarPermissaoFuncionario(ctx, chaveFuncao, type === "mutation");
    }
    return next({ ctx });
  });
}

/**
 * Usuário autenticado + escopo por registro, sem portão de módulo.
 *
 * Para rotas que operam por `id` e não pertencem a um módulo ligável — modelos,
 * status, links de compartilhamento e afins. Sem isto, o `id` é um número
 * adivinhável que atravessa a fronteira entre clientes.
 */
export function escopoProcedure(escopo: VerificadorEscopo) {
  return protectedProcedure.use(async ({ ctx, next, path, getRawInput }) => {
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
