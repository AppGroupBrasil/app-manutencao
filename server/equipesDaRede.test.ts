import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A equipe cadastrada em outra unidade continua visível na tela de equipes.
 *
 * O cliente cadastrou vários times e via só um: a lista sai de
 * `equipe_unidades` cruzada com a unidade aberta, e a única que aparecia em
 * todas era a de rede — as demais atendem só a unidade em que nasceram, e
 * quem procurava por elas achava que o cadastro tinha se perdido.
 *
 * A tela de gerenciar equipes pede a rede inteira (`todasUnidades`); o campo
 * "Equipe designada" da O.S. continua pedindo só a unidade da ordem, que é o
 * que a designação aceita.
 */

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async () => true,
  getModulosHabilitados: async () => ["equipes"],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async () => 0,
  setModuloHabilitado: async () => undefined,
  getSegmentoDoTenant: async () => "generico",
}));

vi.mock("./_core/gestorMaster", () => ({ ehGestorMaster: async () => true }));
vi.mock("./_core/teste", () => ({ testeVencido: async () => false }));

const { equipes, equipeUnidades, condominios } = await import("../drizzle/schema");

/** Unidades que cada consulta pediu, na ordem. */
let filtros: { tabela: unknown; ids: number[] }[];
/** O que a gravação de unidades acrescentou e tirou. */
let gravados: { entrar: number[]; sair: number[] };

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

/** "Elétrica" nasceu na unidade 2; "Facilities" atende as três. */
const equipesNoBanco = [
  { id: 1, condominioId: 1, nome: "Facilities", descricao: null, cor: "#111", externa: false, email: null, whatsapp: null, createdAt: new Date(), totalMembros: 3, totalUnidades: 3 },
  { id: 2, condominioId: 2, nome: "Elétrica", descricao: null, cor: "#222", externa: false, email: null, whatsapp: null, createdAt: new Date(), totalMembros: 2, totalUnidades: 1 },
];

const vinculos = [
  { equipeId: 1, condominioId: 1 },
  { equipeId: 1, condominioId: 2 },
  { equipeId: 1, condominioId: 3 },
  { equipeId: 2, condominioId: 2 },
];

const unidadesNoBanco = [
  { id: 1, nome: "Torre A" },
  { id: 2, nome: "Torre B" },
  { id: 3, nome: "Torre C" },
];

function fakeDb() {
  /**
   * A lista de equipes sai filtrada aqui, e não no drizzle: é o `where` que o
   * teste inspeciona, e devolver tudo esconderia o recorte por unidade.
   */
  const equipesPedidas = (ids: number[]) =>
    equipesNoBanco.filter((e) =>
      vinculos.some((v) => v.equipeId === e.id && ids.includes(v.condominioId)),
    );

  const encadeavel = (linhas: unknown[]) => {
    const p: any = Promise.resolve(linhas);
    p.orderBy = () => encadeavel(linhas);
    p.limit = () => encadeavel(linhas);
    return p;
  };

  const consulta = (tabela: unknown) => ({
    innerJoin: () => ({
      where: (condicao: unknown) => {
        const ids = parametrosDe(condicao);
        filtros.push({ tabela, ids });
        return encadeavel(equipesPedidas(ids));
      },
    }),
    where: (condicao: unknown) => {
      const ids = parametrosDe(condicao);
      filtros.push({ tabela, ids });
      if (tabela === equipeUnidades) {
        return encadeavel(vinculos.filter((v) => ids.includes(v.equipeId)));
      }
      if (tabela === equipes) {
        return encadeavel(equipesNoBanco.filter((e) => ids.includes(e.id)));
      }
      if (tabela === condominios) {
        return encadeavel(unidadesNoBanco.filter((u) => ids.includes(u.id)));
      }
      return encadeavel([]);
    },
  });

  return {
    select: () => ({ from: consulta }),
    selectDistinct: () => ({ from: consulta }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
    insert: () => ({
      values: async (linhas: { condominioId: number }[]) => {
        gravados.entrar.push(...linhas.map((l) => l.condominioId));
      },
    }),
    delete: () => ({
      // O primeiro parâmetro é o id da equipe; os demais, as unidades que saem.
      where: async (condicao: unknown) => {
        gravados.sair.push(...parametrosDe(condicao).slice(1));
      },
    }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { equipesRouter } = await import("./modules/equipes/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");
const { invalidarCacheBloqueio } = await import("./_core/bloqueio");

/** Gestora da rede, com a Torre A aberta na tela. */
function comoGestoraDaRede() {
  const user = { id: 1, hierarquia: "responsavel", role: "sindico", name: "Gestora" } as never;
  return createCallerFactory(equipesRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1, 2, 3] }),
  } as never);
}

/** Unidades que a consulta das equipes varreu. */
const unidadesConsultadas = () => filtros.find((f) => f.tabela === equipes)?.ids ?? [];

/** Cuida das Torres A e B; a C não é dela. */
function comoGestoraDeParte() {
  const user = { id: 2, hierarquia: "responsavel", role: "sindico", name: "Parcial" } as never;
  return createCallerFactory(equipesRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1, 2] }),
  } as never);
}

beforeEach(() => {
  invalidarCacheBloqueio();
  filtros = [];
  gravados = { entrar: [], sair: [] };
});

describe("equipes.list", () => {
  it("sem pedir a rede, mostra só as equipes da unidade aberta", async () => {
    const lista = await comoGestoraDaRede().list({ condominioId: 1 });

    expect(unidadesConsultadas()).toEqual([1]);
    expect(lista.map((e) => e.nome)).toEqual(["Facilities"]);
  });

  it("com todasUnidades, a equipe da outra unidade aparece", async () => {
    const lista = await comoGestoraDaRede().list({ condominioId: 1, todasUnidades: true });

    expect(unidadesConsultadas()).toEqual([1, 2, 3]);
    expect(lista.map((e) => e.nome).sort()).toEqual(["Elétrica", "Facilities"]);
  });

  it("diz em quais unidades cada equipe atende, para a tela separar as duas listas", async () => {
    const lista = await comoGestoraDaRede().list({ condominioId: 1, todasUnidades: true });

    const eletrica = lista.find((e) => e.nome === "Elétrica")!;
    const facilities = lista.find((e) => e.nome === "Facilities")!;

    expect(eletrica.unidades).toEqual([2]);
    expect(facilities.unidades.includes(1)).toBe(true);
  });

  it("nomeia a unidade da equipe que atende uma só, para não confundir homônimas", async () => {
    const lista = await comoGestoraDaRede().list({ condominioId: 1, todasUnidades: true });

    expect(lista.find((e) => e.nome === "Elétrica")?.unidadeNome).toBe("Torre B");
    // A de rede fica sem nome de unidade: um só mentiria sobre as outras duas.
    expect(lista.find((e) => e.nome === "Facilities")?.unidadeNome).toBeNull();
  });
});

/**
 * A lista de unidades substitui a anterior inteira, e quem edita costuma
 * alcançar só parte da rede: sem cuidado, o clique em "Atender aqui" pediria
 * permissão sobre uma unidade que a pessoa não enxerga — ou apagaria o vínculo
 * com ela sem ninguém pedir.
 */
describe("equipes.update, unidades fora do alcance de quem edita", () => {
  it("reenviar a lista com a unidade que ela não alcança não é recusado", async () => {
    // É o que a tela manda ao clicar "Atender aqui": tudo o que a equipe já
    // atendia, mais a unidade aberta.
    await expect(comoGestoraDeParte().update({ id: 1, unidades: [1, 2, 3] })).resolves.toEqual({
      ok: true,
    });

    expect(gravados.sair).toEqual([]);
  });

  it("tirar uma unidade não leva junto a que ela não enxerga", async () => {
    await comoGestoraDeParte().update({ id: 1, unidades: [1] });

    // Sai a Torre B, que é dela; a Torre C continua com a equipe.
    expect(gravados.sair).toEqual([2]);
  });
});
