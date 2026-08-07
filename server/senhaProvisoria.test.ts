import { describe, expect, it, vi } from "vitest";
import { SENHA_PROVISORIA_ERR_MSG } from "@shared/const";

/**
 * Bloqueio das contas criadas em lote, que entram com a senha de implantação.
 *
 * O que este teste protege: a lista de rotas liberadas é casada com o *path* da
 * procedure. Errar um nome ali prende o usuário num beco — ele não conseguiria
 * nem trocar a senha para sair do bloqueio.
 */

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async () => true,
  getModulosHabilitados: async () => [],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async () => 0,
  setModuloHabilitado: async () => undefined,
  getSegmentoDoTenant: async () => "generico",
}));

const {
  router,
  protectedProcedure,
  protectedOrFuncionarioProcedure,
  adminProcedure,
  createCallerFactory,
} = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

function contexto(opcoes: { senhaProvisoria?: boolean; funcionario?: boolean } = {}) {
  const user = opcoes.funcionario
    ? null
    : ({
        id: 1,
        hierarquia: "admin",
        role: "sindico",
        name: "Gestor",
        senhaProvisoria: opcoes.senhaProvisoria ?? false,
      } as any);
  const funcionario = opcoes.funcionario
    ? ({ id: 7, condominioId: 1, nome: "Fulano" } as any)
    : null;

  return {
    req: { headers: {} } as any,
    res: {} as any,
    user,
    funcionario,
    tenant: createTenantAccess(user, funcionario, funcionario ? {} : { idsFornecidos: [1] }),
  };
}

// Reproduz os nomes reais: `auth.definirSenhaProvisoria` e `system.bootstrap`
// precisam bater com os paths montados em server/routers.ts.
const appRouter = router({
  vistoria: router({
    listar: protectedProcedure.query(() => "ok"),
  }),
  auth: router({
    definirSenhaProvisoria: protectedProcedure.mutation(() => "senha definida"),
    alterarSenha: protectedProcedure.mutation(() => "senha alterada"),
  }),
  system: router({
    bootstrap: protectedOrFuncionarioProcedure.query(() => "bootstrap"),
  }),
  admin: router({
    usuarios: adminProcedure.query(() => "usuarios"),
  }),
});

const chamar = (ctx: ReturnType<typeof contexto>) => createCallerFactory(appRouter)(ctx as any);

describe("Conta com senha provisória", () => {
  it("é recusada nas rotas comuns", async () => {
    const caller = chamar(contexto({ senhaProvisoria: true }));
    await expect(caller.vistoria.listar()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: SENHA_PROVISORIA_ERR_MSG,
    });
  });

  it("alcança a troca de senha — sem isso ficaria presa", async () => {
    const caller = chamar(contexto({ senhaProvisoria: true }));
    await expect(caller.auth.definirSenhaProvisoria()).resolves.toBe("senha definida");
    await expect(caller.auth.alterarSenha()).resolves.toBe("senha alterada");
  });

  it("alcança o bootstrap, senão o client não monta a tela de troca", async () => {
    const caller = chamar(contexto({ senhaProvisoria: true }));
    await expect(caller.system.bootstrap()).resolves.toBe("bootstrap");
  });

  it("é recusada também nas rotas de admin, que não passam por requireUser", async () => {
    const caller = chamar(contexto({ senhaProvisoria: true }));
    await expect(caller.admin.usuarios()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: SENHA_PROVISORIA_ERR_MSG,
    });
  });

  it("não afeta quem já definiu a senha", async () => {
    const caller = chamar(contexto({ senhaProvisoria: false }));
    await expect(caller.vistoria.listar()).resolves.toBe("ok");
    await expect(caller.admin.usuarios()).resolves.toBe("usuarios");
  });

  it("não afeta funcionário, que autentica por outra tabela", async () => {
    const caller = chamar(contexto({ funcionario: true }));
    await expect(caller.system.bootstrap()).resolves.toBe("bootstrap");
  });
});
