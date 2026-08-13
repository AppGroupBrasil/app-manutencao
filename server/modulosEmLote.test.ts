import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Configuração de módulos aplicada a várias unidades de uma vez.
 *
 * O risco que este teste cobre: `organizacoesIds` vem do client, então é mais
 * um lugar por onde alguém poderia escrever na organização de outro cliente.
 * A regra é validar TODOS os alvos antes de gravar QUALQUER um — lote que
 * falha no meio deixaria a rede metade configurada.
 */

const gravacoes: { tenantId: number; moduloId: string; habilitada: boolean }[] = [];
/** Organizações que tiveram o pacote do segmento materializado antes da escrita. */
const materializadas: number[] = [];

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async () => true,
  getModulosHabilitados: async () => [],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async (tenantId: number) => {
    materializadas.push(tenantId);
    return 0;
  },
  getSegmentoDoTenant: async () => "generico",
  setModuloHabilitado: async (tenantId: number, moduloId: string, habilitada: boolean) => {
    gravacoes.push({ tenantId, moduloId, habilitada });
  },
  setModulosHabilitados: async (
    tenantId: number,
    itens: { funcaoId: string; habilitada: boolean }[],
  ) => {
    for (const item of itens) {
      gravacoes.push({ tenantId, moduloId: item.funcaoId, habilitada: item.habilitada });
    }
    return itens.length;
  },
}));

vi.mock("./_core/ownership", () => ({
  podeAdministrarOrganizacao: async () => true,
}));

vi.mock("./db", () => ({ getDb: async () => ({}) }));

const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");
const { funcoesCondominioRouter } = await import("./modules/administrativo/funcoesRouter");

/** Gestor-chefe de cliente: nível de hierarquia baixo, dono das unidades. */
function chamador(organizacoes: number[]) {
  const user = { id: 1, hierarquia: "funcionario", role: "sindico" } as never;
  return createCallerFactory(funcoesCondominioRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: organizacoes }),
  } as never);
}

const LIGAR_OS = [{ funcaoId: "ordens-servico", habilitada: true }];

describe("atualizarMultiplas em lote", () => {
  beforeEach(() => {
    gravacoes.length = 0;
    materializadas.length = 0;
  });

  it("materializa o pacote do segmento antes de gravar", async () => {
    // Organização que nunca foi configurada vive do pacote do segmento. A
    // primeira linha gravada encerra esse fallback: sem materializar antes,
    // gravar uma alteração desligaria em silêncio tudo o que não veio na lista.
    await chamador([1, 2]).atualizarMultiplas({
      organizacoesIds: [1, 2],
      funcoes: LIGAR_OS,
    });

    expect(materializadas).toEqual([1, 2]);
  });

  it("grava em todas as organizações informadas", async () => {
    const caller = chamador([1, 2, 3]);

    const res = await caller.atualizarMultiplas({
      organizacoesIds: [1, 2, 3],
      funcoes: LIGAR_OS,
    });

    expect(res.organizacoes).toBe(3);
    expect(gravacoes.map((g) => g.tenantId)).toEqual([1, 2, 3]);
  });

  it("sem lista, grava só na organização ativa", async () => {
    const caller = chamador([5, 6]);

    const res = await caller.atualizarMultiplas({ funcoes: LIGAR_OS });

    expect(res.organizacoes).toBe(1);
    expect(gravacoes).toEqual([
      { tenantId: 5, moduloId: "ordens-servico", habilitada: true },
    ]);
  });

  it("recusa o lote inteiro se uma organização não for do usuário", async () => {
    const caller = chamador([1, 2]);

    await expect(
      caller.atualizarMultiplas({ organizacoesIds: [1, 3], funcoes: LIGAR_OS }),
    ).rejects.toThrow(/permissão/i);

    // Nada gravado: nem a organização 1, que era legítima.
    expect(gravacoes).toEqual([]);
  });

  it("ignora a repetição da mesma organização", async () => {
    const caller = chamador([4]);

    const res = await caller.atualizarMultiplas({
      organizacoesIds: [4, 4, 4],
      funcoes: LIGAR_OS,
    });

    expect(res.organizacoes).toBe(1);
    expect(gravacoes).toHaveLength(1);
  });
});
