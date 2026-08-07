import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

/**
 * Composição real dos middlewares de módulo.
 *
 * O ponto crítico verificado aqui: `getRawInput()` é chamado duas vezes na
 * cadeia (uma para resolver o tenant, outra para o escopo por registro). Se a
 * segunda chamada devolvesse vazio, o escopo passaria a aceitar tudo em
 * silêncio — falha pior que um erro visível.
 */

let moduloLiberado = true;

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async () => moduloLiberado,
  getModulosHabilitados: async () => [],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async () => 0,
  setModuloHabilitado: async () => undefined,
  getSegmentoDoTenant: async () => "generico",
}));

const { router, moduloProcedure, moduloUserProcedure, createCallerFactory } = await import(
  "./_core/trpc"
);
const { createTenantAccess } = await import("./_core/tenant");

function contexto(opcoes: { funcionarioEm?: number; organizacoes?: number[] } = {}) {
  const user = opcoes.funcionarioEm
    ? null
    : ({ id: 1, hierarquia: "admin", role: "sindico", name: "Síndico" } as any);
  const funcionario = opcoes.funcionarioEm
    ? ({ id: 7, condominioId: opcoes.funcionarioEm, nome: "Fulano" } as any)
    : null;

  return {
    req: { headers: {} } as any,
    res: {} as any,
    user,
    funcionario,
    // Funcionário deriva o tenant da própria matrícula; só o usuário precisa da
    // lista injetada (em produção ela vem do banco).
    tenant: createTenantAccess(
      user,
      funcionario,
      funcionario ? {} : { idsFornecidos: opcoes.organizacoes ?? [1] },
    ),
  };
}

describe("moduloProcedure", () => {
  beforeEach(() => {
    moduloLiberado = true;
  });

  it("entrega o input íntegro ao escopo, mesmo depois de resolver o tenant", async () => {
    const recebidos: unknown[] = [];
    const escopoEspiao = async (_tenant: any, _caminho: string, input: unknown) => {
      recebidos.push(input);
    };

    const r = router({
      buscar: moduloUserProcedure("vistorias", escopoEspiao)
        .input(z.object({ id: z.number() }))
        .query(({ ctx }) => ({ condominioId: ctx.condominioId })),
    });

    const caller = createCallerFactory(r)(contexto() as any);
    const resultado = await caller.buscar({ id: 42 });

    expect(resultado.condominioId).toBe(1);
    // Se getRawInput() não sobrevivesse à segunda leitura, viria undefined aqui.
    expect(recebidos).toEqual([{ id: 42 }]);
  });

  it("recebe o caminho da procedure para resolver overrides", async () => {
    const caminhos: string[] = [];
    const escopoEspiao = async (_t: any, caminho: string) => {
      caminhos.push(caminho);
    };

    const r = router({
      removeImagem: moduloUserProcedure("vistorias", escopoEspiao)
        .input(z.object({ id: z.number() }))
        .mutation(() => ({ ok: true })),
    });

    await createCallerFactory(r)(contexto() as any).removeImagem({ id: 1 });
    expect(caminhos).toEqual(["removeImagem"]);
  });

  it("bloqueia quando o módulo está desligado", async () => {
    moduloLiberado = false;

    const r = router({
      listar: moduloUserProcedure("vistorias")
        .input(z.object({ condominioId: z.number() }))
        .query(() => []),
    });

    await expect(
      createCallerFactory(r)(contexto() as any).listar({ condominioId: 1 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("recusa condominioId de organização alheia", async () => {
    const r = router({
      listar: moduloUserProcedure("vistorias")
        .input(z.object({ condominioId: z.number() }))
        .query(() => []),
    });

    await expect(
      createCallerFactory(r)(contexto({ organizacoes: [1] }) as any).listar({ condominioId: 99 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("moduloUserProcedure recusa funcionário", async () => {
    const r = router({
      listar: moduloUserProcedure("ordens-servico")
        .input(z.object({ condominioId: z.number() }))
        .query(() => []),
    });

    await expect(
      createCallerFactory(r)(contexto({ funcionarioEm: 5 }) as any).listar({ condominioId: 5 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("moduloProcedure aceita funcionário na própria organização", async () => {
    const r = router({
      listar: moduloProcedure("vistorias")
        .input(z.object({ condominioId: z.number() }))
        .query(({ ctx }) => ({ condominioId: ctx.condominioId })),
    });

    const caller = createCallerFactory(r)(contexto({ funcionarioEm: 5 }) as any);
    await expect(caller.listar({ condominioId: 5 })).resolves.toEqual({ condominioId: 5 });
  });

  it("moduloProcedure recusa funcionário em organização alheia", async () => {
    const r = router({
      listar: moduloProcedure("vistorias")
        .input(z.object({ condominioId: z.number() }))
        .query(() => []),
    });

    await expect(
      createCallerFactory(r)(contexto({ funcionarioEm: 5 }) as any).listar({ condominioId: 6 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
