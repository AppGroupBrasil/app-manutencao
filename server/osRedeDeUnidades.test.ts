import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O.S. de todas as unidades para quem responde pela rede.
 *
 * O gerente geral abria a tela e via só a unidade ativa: a ordem aberta pelo
 * gestor de outra unidade simplesmente não existia para ele, e ninguém
 * descobre isso olhando a tela — parece que a O.S. não foi criada. Os testes
 * cobrem quais unidades entram na consulta (que saem da identidade, nunca do
 * input) e a trava que impede misturar cadastros de unidades diferentes.
 */

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async () => true,
  getModulosHabilitados: async () => ["ordens-servico"],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async () => 0,
  setModuloHabilitado: async () => undefined,
  getSegmentoDoTenant: async () => "generico",
}));

vi.mock("./_core/gestorMaster", () => ({ ehGestorMaster: async () => true }));

vi.mock("./_core/permissaoFuncionario", () => ({
  assegurarPermissaoFuncionario: async () => undefined,
  assegurarExclusaoFuncionario: async () => undefined,
}));

// `_core/bloqueio` roda de verdade: é ele que tira a unidade suspensa da rede,
// e trocá-lo por um dublê esconderia justamente o que estes testes cobrem.
vi.mock("./_core/teste", () => ({ testeVencido: async () => false }));

const {
  ordensServico,
  osCategorias,
  osPrioridades,
  osStatus,
  osSetores,
  equipes,
  condominios,
} = await import("../drizzle/schema");

/** Filtros recebidos pelo banco, na ordem: é neles que o alcance aparece. */
let filtros: { tabela: unknown; ids: number[]; texto: string }[];
/** Unidade dona do status 20; muda para simular status de outra unidade. */
let unidadeDoStatus: number;
/** Unidades que a consulta de unidades liberadas devolve (suspensa fica fora). */
let unidadesNoBanco: { id: number; nome: string }[];

/**
 * Números que o drizzle colocou como parâmetro da condição.
 *
 * É o que responde "a consulta pediu quais unidades?" — comparar o SQL como
 * texto não mostra os valores, que viajam como parâmetro.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function parametrosDe(condicao: any): number[] {
  const achados: number[] = [];
  const visitar = (no: any) => {
    if (!no || typeof no !== "object") return;
    if (Array.isArray(no)) return no.forEach(visitar);
    if (typeof no.value === "number") achados.push(no.value);
    if (no.queryChunks) visitar(no.queryChunks);
  };
  visitar(condicao);
  return achados;
}

/** Pedaços fixos do SQL da condição — é onde aparece o "is null" do bloqueio. */
function textoDe(condicao: any): string {
  let texto = "";
  const visitar = (no: any) => {
    if (typeof no === "string") return void (texto += no);
    if (Array.isArray(no)) return no.forEach(visitar);
    if (!no || typeof no !== "object") return;
    if (no.queryChunks) visitar(no.queryChunks);
    if (no.value) visitar(no.value);
  };
  visitar(condicao);
  return texto;
}

function fakeDb() {
  const porTabela = new Map<unknown, unknown[]>([
    [
      ordensServico,
      [
        { id: 50, condominioId: 1, protocolo: "OS-1", titulo: "Portão", statusId: 10, categoriaId: null, prioridadeId: null, equipeId: null },
        { id: 51, condominioId: 2, protocolo: "OS-2", titulo: "Telhado", statusId: 11, categoriaId: null, prioridadeId: null, equipeId: null },
      ],
    ],
    [osCategorias, []],
    [osPrioridades, []],
    [
      osStatus,
      [
        { id: 10, nome: "Aberta", cor: "#111", condominioId: 1, isFinal: false },
        { id: 11, nome: "Aberta", cor: "#111", condominioId: 2, isFinal: false },
        { id: 20, nome: "Concluída", cor: "#222", condominioId: unidadeDoStatus, isFinal: true },
      ],
    ],
    [osSetores, []],
    [equipes, []],
    [condominios, unidadesNoBanco],
  ]);

  const encadeavel = (linhas: unknown[]) => {
    const p: any = Promise.resolve(linhas);
    p.orderBy = () => encadeavel(linhas);
    p.limit = () => encadeavel(linhas);
    p.offset = () => encadeavel(linhas);
    return p;
  };

  const linhasDe = (tabela: unknown, campos: any) =>
    campos && "count" in campos ? [{ count: 2 }] : (porTabela.get(tabela) ?? []);

  /**
   * Busca por `id` devolve aquela linha; o resto devolve a tabela inteira.
   *
   * É o mínimo para o teste distinguir "trouxe o registro pedido" de "trouxe o
   * primeiro que apareceu" — sem isto, a conferência de unidade do status
   * passaria olhando o status errado.
   */
  const filtrar = (linhas: unknown[], ids: number[]) => {
    const porId = linhas.filter((l) => ids.includes((l as { id?: number }).id ?? -1));
    return porId.length > 0 ? porId : linhas;
  };

  return {
    select: (campos?: any) => ({
      from: (tabela: unknown) => ({
        where: (condicao: unknown) => {
          const ids = parametrosDe(condicao);
          filtros.push({ tabela, ids, texto: textoDe(condicao) });
          return encadeavel(filtrar(linhasDe(tabela, campos), ids));
        },
        limit: () => encadeavel(linhasDe(tabela, campos)),
      }),
    }),
    insert: () => ({
      values: () => {
        const p: any = Promise.resolve([{ id: 1 }]);
        p.returning = () => Promise.resolve([{ id: 1 }]);
        return p;
      },
    }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { osRouter } = await import("./modules/os/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

/** Gerente geral: responde pelas três unidades. */
function comoGerenteGeral() {
  const user = { id: 1, hierarquia: "responsavel", role: "sindico", name: "Francisco" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1, 2, 3] }),
  } as never);
}

/** Gestor de uma unidade só. */
function comoGestorDeUnidade() {
  const user = { id: 2, hierarquia: "responsavel", role: "sindico", name: "Gestora" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1] }),
  } as never);
}

/** Conta da plataforma: alcança a base inteira. */
function comoPlataforma() {
  const user = { id: 3, hierarquia: "admin_master", role: "master", name: "Suporte" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1, 2, 3] }),
  } as never);
}

/** Unidades pedidas na consulta das ordens. */
const unidadesConsultadas = () =>
  filtros.find((f) => f.tabela === ordensServico)?.ids ?? [];

beforeEach(() => {
  filtros = [];
  unidadeDoStatus = 1;
  unidadesNoBanco = [
    { id: 1, nome: "São José" },
    { id: 2, nome: "Centro" },
    { id: 3, nome: "Vila Nova" },
  ];
});

describe("lista da rede", () => {
  it("com todasUnidades, consulta todas as unidades do alcance", async () => {
    await comoGerenteGeral().list({ condominioId: 1, todasUnidades: true });

    expect(unidadesConsultadas()).toEqual([1, 2, 3]);
  });

  it("sem todasUnidades, fica na unidade da tela", async () => {
    await comoGerenteGeral().list({ condominioId: 1 });

    expect(unidadesConsultadas()).toEqual([1]);
  });

  it("gestor de uma unidade não alcança as outras nem pedindo a rede", async () => {
    // O alcance sai da identidade autenticada: o input só diz "quero a rede".
    await comoGestorDeUnidade().list({ condominioId: 1, todasUnidades: true });

    expect(unidadesConsultadas()).toEqual([1]);
  });

  it("plataforma continua por organização", async () => {
    // O alcance dela é a base inteira: abrir a rede aqui listaria a O.S. de
    // todos os clientes dentro da tela de um só.
    await comoPlataforma().list({ condominioId: 1, todasUnidades: true });

    expect(unidadesConsultadas()).toEqual([1]);
  });

  it("unidade suspensa fica de fora da rede", async () => {
    // O bloqueio corta a unidade inteira; a checagem da requisição olha só a
    // unidade ativa da tela, então a exclusão tem de estar na consulta.
    unidadesNoBanco = unidadesNoBanco.filter((u) => u.id !== 3);

    await comoGerenteGeral().list({ condominioId: 1, todasUnidades: true });

    const filtroDeUnidades = filtros.find((f) => f.tabela === condominios);
    expect(filtroDeUnidades?.texto).toMatch(/is null/i);
    expect(unidadesConsultadas()).toEqual([1, 2]);
  });

  it("cada ordem diz em qual unidade foi aberta", async () => {
    const lista = await comoGerenteGeral().list({ condominioId: 1, todasUnidades: true });

    expect(lista.items.map((os) => os.unidade?.nome)).toEqual(["São José", "Centro"]);
    // Status de cada unidade: a tela troca o andamento direto na lista e
    // precisa oferecer o cadastro da unidade da ordem, não o da tela.
    expect(lista.statusPorUnidade.some((s) => s.condominioId === 2)).toBe(true);
  });
});

describe("cadastro de outra unidade", () => {
  it("recusa status que não é da unidade da ordem", async () => {
    unidadeDoStatus = 2;

    await expect(
      comoGerenteGeral().update({ id: 50, statusId: 20 }),
    ).rejects.toThrow(/não é da unidade/i);
  });

  it("aceita status da própria unidade", async () => {
    await expect(
      comoGerenteGeral().update({ id: 50, statusId: 20 }),
    ).resolves.toEqual({ success: true });
  });
});
