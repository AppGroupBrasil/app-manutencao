import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Caixa de avisos do portal do funcionário.
 *
 * A tabela é a mesma do sino do gestor, e o que separa um do outro é o filtro
 * de cada rota. Um filtro esquecido aqui não daria erro em tela nenhuma: o
 * funcionário simplesmente leria — e apagaria — o aviso do colega. Por isso o
 * teste olha a condição que chega ao banco, e não só o retorno.
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

/** Ids que apareceram na condição da última consulta ou gravação. */
let filtros: number[];
let atualizou: boolean;
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

  return {
    select: () => ({
      from: () => ({
        where: (condicao: unknown) => {
          filtros = parametrosDe(condicao);
          return encadeavel([{ id: 1, titulo: "O.S. designada", lida: false }]);
        },
      }),
    }),
    update: () => ({
      set: () => ({
        where: async (condicao: unknown) => {
          filtros = parametrosDe(condicao);
          atualizou = true;
        },
      }),
    }),
    delete: () => ({
      where: async (condicao: unknown) => {
        filtros = parametrosDe(condicao);
        apagou = true;
      },
    }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { notificacaoFuncionarioRouter } = await import("./modules/notificacao/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

/** Portal aberto pelo funcionário 7. */
function comoFuncionario() {
  const funcionario = { id: 7, condominioId: 1, nome: "Ana" } as never;
  return createCallerFactory(notificacaoFuncionarioRouter)({
    req: { headers: {} },
    res: {},
    user: null,
    funcionario,
    tenant: createTenantAccess(null, funcionario, {}),
  } as never);
}

/** Gestor: tem conta de usuário, não sessão de funcionário. */
function comoGestor() {
  const user = { id: 1, hierarquia: "gestor", role: "sindico", name: "Gerente" } as never;
  return createCallerFactory(notificacaoFuncionarioRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1] }),
  } as never);
}

beforeEach(() => {
  filtros = [];
  atualizou = false;
  apagou = false;
});

describe("avisos do funcionário", () => {
  it("lista só os avisos de quem está com a sessão aberta", async () => {
    const avisos = await comoFuncionario().list({ limit: 20 });

    expect(avisos).toHaveLength(1);
    expect(filtros).toContain(7);
  });

  it("marcar como lido exige que o aviso seja dele", async () => {
    await comoFuncionario().markAsRead({ id: 55 });

    expect(atualizou).toBe(true);
    // O id do aviso e o do funcionário, os dois na mesma condição.
    expect(filtros).toEqual(expect.arrayContaining([55, 7]));
  });

  it("excluir exige que o aviso seja dele", async () => {
    await comoFuncionario().delete({ id: 55 });

    expect(apagou).toBe(true);
    expect(filtros).toEqual(expect.arrayContaining([55, 7]));
  });

  it("marcar todos não vaza para fora da sessão", async () => {
    await comoFuncionario().markAllAsRead();

    expect(filtros).toEqual([7]);
  });

  it("gestor não entra por esta porta", async () => {
    // A caixa dele é a `notificacao.*`, filtrada por conta de usuário.
    await expect(comoGestor().list({ limit: 20 })).rejects.toThrow();
  });
});
