import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O que uma unidade recebe ao nascer.
 *
 * O risco aqui é silencioso: unidade criada sem status fica com a O.S. sem
 * andamento, e duas unidades do mesmo cliente acabam diferentes conforme a
 * ordem em que alguém abriu cada tela. O preparo é uma chamada só, na criação,
 * e precisa ser idempotente para consertar unidade antiga sem duplicar nada.
 */

vi.mock("./_core/modules", () => ({
  seedModulosDoTenant: async () => 0,
  isModuloHabilitado: async () => true,
  getModulosHabilitados: async () => [],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  setModuloHabilitado: async () => undefined,
  setModulosHabilitados: async () => 0,
  getSegmentoDoTenant: async () => "generico",
}));

const { osStatus, osCategorias, osPrioridades } = await import("../drizzle/schema");

/** Linhas já existentes por tabela; cada teste ajusta antes de rodar. */
let existentes: Map<unknown, unknown[]>;
/** O que o preparo tentou inserir. */
let inseridos: { tabela: unknown; linhas: Record<string, unknown>[] }[];

vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: (tabela: unknown) => ({
        where: async () => existentes.get(tabela) ?? [],
      }),
    }),
    insert: (tabela: unknown) => ({
      values: async (linhas: Record<string, unknown>[]) => {
        inseridos.push({ tabela, linhas });
      },
    }),
  }),
}));

const { prepararUnidade, seedStatusOs, STATUS_OS_PADRAO } = await import("./_core/seedUnidade");

const nomes = (tabela: unknown) =>
  inseridos
    .filter((i) => i.tabela === tabela)
    .flatMap((i) => i.linhas.map((l) => String(l.nome)));

beforeEach(() => {
  existentes = new Map();
  inseridos = [];
});

describe("preparo da unidade nova", () => {
  it("cria status, categorias e prioridades de uma vez", async () => {
    await prepararUnidade(10);

    expect(nomes(osStatus)).toEqual([
      "Aguardando início",
      "Em execução",
      "Finalizada parcialmente",
      "Finalizada totalmente",
      "Cancelada",
    ]);
    expect(nomes(osCategorias)).toContain("Elétrica");
    expect(nomes(osPrioridades)).toContain("Urgente");
  });

  it("só o último status encerra a ordem", async () => {
    // "Finalizada parcialmente" não pode contar como fechada: é serviço que
    // continua, e a lista de pendências deixaria de cobrar.
    const finais = STATUS_OS_PADRAO.filter((s) => s.isFinal).map((s) => s.nome);
    expect(finais).toEqual(["Finalizada totalmente", "Cancelada"]);
  });

  it("rodar de novo não duplica o que já existe", async () => {
    existentes.set(osStatus, [{ nome: "Em execução" }, { nome: "Cancelada" }]);

    await seedStatusOs(10);

    expect(nomes(osStatus)).toEqual([
      "Aguardando início",
      "Finalizada parcialmente",
      "Finalizada totalmente",
    ]);
  });

  it("nome gravado com outra caixa conta como existente", async () => {
    existentes.set(osStatus, STATUS_OS_PADRAO.map((s) => ({ nome: s.nome.toUpperCase() })));

    await seedStatusOs(10);

    expect(inseridos).toEqual([]);
  });
});
