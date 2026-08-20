import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unidades em que o funcionário trabalha.
 *
 * A rota recebe o id da ficha cru, do jeito que a tela mandar. Sem a conferência
 * de tenant, trocar o número na chamada leria a lotação de um funcionário de
 * outro cliente — e o teste existe para essa conferência não sumir num refactor.
 */

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async () => true,
  getModulosHabilitados: async () => ["funcionarios"],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async () => 0,
  setModuloHabilitado: async () => undefined,
  getSegmentoDoTenant: async () => "generico",
}));

vi.mock("./_core/gestorMaster", () => ({ ehGestorMaster: async () => true }));

const { funcionarioCondominios, funcionarios } = await import("../drizzle/schema");

/** Unidade da ficha consultada. */
let unidadeDaFicha: number;
/** Vínculos gravados dessa ficha. */
let vinculos: number[];

function fakeDb() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const encadeavel = (linhas: unknown[]) => {
    const p: any = Promise.resolve(linhas);
    p.limit = () => encadeavel(linhas);
    return p;
  };

  return {
    select: () => ({
      from: (tabela: unknown) => ({
        where: () =>
          encadeavel(
            tabela === funcionarios
              ? [{ condominioId: unidadeDaFicha }]
              : tabela === funcionarioCondominios
                ? vinculos.map((condominioId) => ({ condominioId }))
                : [],
          ),
      }),
    }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { funcionarioRouter } = await import("./modules/funcionario/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

/** Gestor com alcance nas unidades 1 e 2. */
function chamador() {
  const user = { id: 1, hierarquia: "responsavel", role: "sindico", name: "Gerente" } as never;
  return createCallerFactory(funcionarioRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1, 2] }),
  } as never);
}

beforeEach(() => {
  unidadeDaFicha = 1;
  vinculos = [];
});

describe("funcionario.unidades", () => {
  it("devolve a unidade da ficha mesmo sem vínculo nenhum", async () => {
    expect(await chamador().unidades({ id: 7 })).toEqual([1]);
  });

  it("soma os vínculos, sem repetir a unidade da ficha", async () => {
    // É o caso do André: cadastrado numa unidade, trabalhando em duas.
    vinculos = [1, 2];

    expect(await chamador().unidades({ id: 7 })).toEqual([1, 2]);
  });

  it("recusa ficha de fora do alcance de quem consulta", async () => {
    // Ficha de outro cliente: o id cru não pode virar uma leitura válida.
    unidadeDaFicha = 99;

    await expect(chamador().unidades({ id: 7 })).rejects.toThrow();
  });
});
