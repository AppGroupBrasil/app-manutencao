import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Equipes gravadas pela ficha do funcionário.
 *
 * A ficha manda o conjunto inteiro ("é destas equipes"), então a rota decide
 * sozinha quem entra e quem sai — e é aí que mora o risco: uma lista incompleta
 * apaga vínculo que ninguém pediu para tirar, e um id de outra unidade
 * penduraria a pessoa no time do cliente vizinho.
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

vi.mock("./_core/teste", () => ({ testeVencido: async () => false }));

const { equipes, equipeFuncionarios, funcionarios } = await import("../drizzle/schema");

/**
 * Unidades que cada equipe do banco falso atende.
 *
 * Lista, e não número: desde que a equipe pode ser de rede, a pergunta deixou
 * de ser "de que unidade ela é" e passou a ser "quais ela atende".
 */
let unidadesDaEquipe: Record<number, number[]>;
/** Vínculos existentes (equipeId) do funcionário 7. */
let vinculos: number[];
/** O que a rota gravou e apagou, para o teste conferir. */
let inseridos: { equipeId: number; funcionarioId: number }[];
let apagou: boolean;

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

function fakeDb() {
  const encadeavel = (linhas: unknown[]) => {
    const p: any = Promise.resolve(linhas);
    p.limit = () => encadeavel(linhas);
    p.orderBy = () => encadeavel(linhas);
    return p;
  };

  // A rota encadeia dois `innerJoin` (equipes × equipe_unidades) antes do
  // `where`: o construtor devolve a si mesmo para o encadeamento não importar.
  const construtor = (tabela: unknown) => {
    const alvo: any = {
      innerJoin: () => alvo,
      limit: () => alvo,
      where: (condicao: unknown) => {
        const ids = parametrosDe(condicao);

        if (tabela === funcionarios) {
          // A ficha 7 é da unidade 1.
          return encadeavel([{ id: 7, condominioId: 1 }]);
        }
        if (tabela === equipes) {
          // Só as equipes pedidas que atendem mesmo a unidade 1.
          return encadeavel(
            ids.filter((id) => unidadesDaEquipe[id]?.includes(1)).map((id) => ({ id })),
          );
        }
        // Vínculos atuais do funcionário (join com equipes).
        return encadeavel(vinculos.map((equipeId) => ({ equipeId })));
      },
    };
    return alvo;
  };

  return {
    select: () => ({ from: construtor }),
    selectDistinct: () => ({ from: construtor }),
    insert: () => ({
      values: async (linhas: { equipeId: number; funcionarioId: number }[]) => {
        inseridos.push(...linhas);
      },
    }),
    delete: () => ({
      where: async () => {
        apagou = true;
      },
    }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { equipesRouter } = await import("./modules/equipes/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

/** Gerente com alcance nas unidades 1 e 2. */
function chamador() {
  const user = { id: 1, hierarquia: "responsavel", role: "sindico", name: "Gerente" } as never;
  return createCallerFactory(equipesRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1, 2] }),
  } as never);
}

beforeEach(() => {
  // 10 e 11 atendem a unidade 1; a 20 só a unidade 2; a 30 é de rede.
  unidadesDaEquipe = { 10: [1], 11: [1], 20: [2], 30: [1, 2] };
  vinculos = [];
  inseridos = [];
  apagou = false;
});

describe("equipes.definirDoFuncionario", () => {
  it("grava as equipes marcadas na ficha", async () => {
    const r = await chamador().definirDoFuncionario({
      condominioId: 1,
      funcionarioId: 7,
      equipeIds: [10, 11],
    });

    expect(inseridos).toEqual([
      { equipeId: 10, funcionarioId: 7 },
      { equipeId: 11, funcionarioId: 7 },
    ]);
    expect(r.entrou).toBe(2);
  });

  it("tira quem foi desmarcado e mantém quem continua", async () => {
    vinculos = [10, 11];

    const r = await chamador().definirDoFuncionario({
      condominioId: 1,
      funcionarioId: 7,
      equipeIds: [10],
    });

    // A 10 já estava: não é inserida de novo, e só a 11 sai.
    expect(inseridos).toEqual([]);
    expect(apagou).toBe(true);
    expect(r).toEqual({ entrou: 0, saiu: 1 });
  });

  it("recusa equipe que não atende a unidade da pessoa", async () => {
    await expect(
      chamador().definirDoFuncionario({ condominioId: 1, funcionarioId: 7, equipeIds: [20] }),
    ).rejects.toThrow(/atendem a unidade/i);

    expect(inseridos).toEqual([]);
    expect(apagou).toBe(false);
  });

  it("aceita equipe de rede, que atende a unidade da pessoa sem ser dela", async () => {
    // É o caso da "Facilities": dona de uma unidade, atendendo as quinze.
    const r = await chamador().definirDoFuncionario({
      condominioId: 1,
      funcionarioId: 7,
      equipeIds: [30],
    });

    expect(inseridos).toEqual([{ equipeId: 30, funcionarioId: 7 }]);
    expect(r.entrou).toBe(1);
  });

  it("lista vazia tira a pessoa de todas as equipes", async () => {
    vinculos = [10];

    const r = await chamador().definirDoFuncionario({
      condominioId: 1,
      funcionarioId: 7,
      equipeIds: [],
    });

    expect(apagou).toBe(true);
    expect(r).toEqual({ entrou: 0, saiu: 1 });
  });
});
