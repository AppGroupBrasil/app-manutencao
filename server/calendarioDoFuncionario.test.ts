import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A agenda do portal é a de quem executa, e o risco dela é o oposto do da
 * agenda do gestor: mostrar demais. Aqui se garante que o funcionário só vê as
 * ordens que o procuram, que elas somam as unidades dele, que o atalho abre a
 * aba do portal — e que a agenda administrativa do cliente (vencimento,
 * checklist, vistoria, tarefa) não atravessa para o portal.
 */

const modulosLigados = new Set<string>();

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async (_tenant: number, id: string) => modulosLigados.has(id),
  getModulosHabilitados: async () => [...modulosLigados],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async () => 0,
  setModuloHabilitado: async () => undefined,
  getSegmentoDoTenant: async () => "generico",
}));

/** Linhas por tabela; o fake olha qual tabela foi consultada. */
const linhas = new Map<unknown, unknown[]>();
/** Tabelas consultadas, com a condição que cada consulta levou. */
let consultas: { tabela: unknown; condicao: unknown }[];

/* eslint-disable @typescript-eslint/no-explicit-any */
function numerosDe(condicao: any): number[] {
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

/** `sql`false`` no meio da condição: é assim que "nada é meu" vira consulta. */
function recusaTudo(condicao: any): boolean {
  let achou = false;
  const visitar = (no: any) => {
    if (achou || !no || typeof no !== "object") return;
    if (Array.isArray(no)) return no.forEach(visitar);
    if (Array.isArray(no.value) && no.value.includes("false")) achou = true;
    if (no.queryChunks) visitar(no.queryChunks);
  };
  visitar(condicao);
  return achou;
}

vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: (tabela: unknown) => ({
        where: (condicao: unknown) => {
          consultas.push({ tabela, condicao });
          const dados = linhas.get(tabela) ?? [];
          const p: any = Promise.resolve(dados);
          p.orderBy = () => Promise.resolve(dados);
          // `limit` é do caminho do bloqueio da unidade, que roda antes da rota.
          p.limit = () => Promise.resolve(dados);
          return p;
        },
      }),
    }),
  }),
}));

const { calendarioRouter } = await import("./modules/calendario/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");
const { invalidarCacheBloqueio } = await import("./_core/bloqueio");
const {
  condominios,
  equipeFuncionarios,
  funcionarioFuncoes,
  ordensServico,
  osResponsaveis,
  vencimentos,
} = await import("../drizzle/schema");

const JANELA = { de: "2026-08-01", ate: "2026-08-31" };

/** Portal: quem chama é o funcionário, e o alcance dele são as unidades dele. */
function portalDe(funcionarioId: number, unidades = [1]) {
  const funcionario = { id: funcionarioId, condominioId: unidades[0] } as never;
  return createCallerFactory(calendarioRouter)({
    req: { headers: {} },
    res: {},
    user: null,
    funcionario,
    tenant: createTenantAccess(null, funcionario, { idsFornecidos: unidades }),
  } as never);
}

beforeEach(() => {
  invalidarCacheBloqueio();
  modulosLigados.clear();
  modulosLigados.add("calendario");
  modulosLigados.add("ordens-servico");
  linhas.clear();
  consultas = [];
});

/** Condição da consulta feita a uma tabela. */
const condicaoDe = (tabela: unknown) => consultas.find((c) => c.tabela === tabela)?.condicao;

describe("calendário do portal do funcionário", () => {
  it("traz a ordem da equipe dele com o atalho da aba do portal", async () => {
    linhas.set(equipeFuncionarios, [{ id: 7 }]);
    linhas.set(ordensServico, [
      {
        id: 50,
        condominioId: 1,
        protocolo: "OS-260812-0001",
        titulo: "Trocar lâmpadas do pátio",
        programada: "2026-08-18",
        prazo: "2026-08-20",
        dataFim: null,
        responsavel: "Ana",
        endereco: "pátio",
      },
    ]);

    const [item] = await portalDe(3).listar({ condominioId: 1, ...JANELA });

    expect(item).toMatchObject({ fonte: "os", data: "2026-08-18" });
    // `/manutencoes/...` é tela de gestor: pelo portal devolveria sessão expirada.
    expect(item.rota).toBe("/dashboard/ordens?os=50");
    // A equipe dele entrou no recorte da consulta.
    expect(numerosDe(condicaoDe(ordensServico))).toContain(7);
  });

  it("entra também a ordem em que ele é responsável, sem equipe nenhuma", async () => {
    linhas.set(equipeFuncionarios, []);
    linhas.set(osResponsaveis, [{ id: 99 }]);
    linhas.set(ordensServico, [
      {
        id: 99,
        condominioId: 1,
        protocolo: "OS-260812-0009",
        titulo: "Consertar portão",
        programada: null,
        prazo: "2026-08-25",
        dataFim: null,
        responsavel: null,
        endereco: null,
      },
    ]);

    const [item] = await portalDe(3).listar({ condominioId: 1, ...JANELA });

    expect(item).toMatchObject({ id: 99, data: "2026-08-25", programada: false });
    expect(numerosDe(condicaoDe(ordensServico))).toContain(99);
  });

  it("sem equipe e sem responsabilidade, a agenda não traz a unidade inteira", async () => {
    linhas.set(equipeFuncionarios, []);
    linhas.set(osResponsaveis, []);

    await portalDe(3).listar({ condominioId: 1, ...JANELA });

    // A promessa do portal é "as suas ordens": nada seu é lista vazia, nunca a
    // unidade inteira.
    expect(recusaTudo(condicaoDe(ordensServico))).toBe(true);
  });

  it("soma as unidades em que ele trabalha e diz de qual é cada ordem", async () => {
    linhas.set(equipeFuncionarios, [{ id: 7 }]);
    linhas.set(condominios, [
      { id: 1, nome: "Unidade Centro" },
      { id: 2, nome: "Unidade Sul" },
    ]);
    linhas.set(ordensServico, [
      {
        id: 60,
        condominioId: 2,
        protocolo: "OS-260812-0060",
        titulo: "Vazamento na caixa d'água",
        programada: "2026-08-12",
        prazo: null,
        dataFim: null,
        responsavel: null,
        endereco: null,
      },
    ]);

    const [item] = await portalDe(3, [1, 2]).listar({
      condominioId: 1,
      ...JANELA,
      todasUnidades: true,
    });

    expect(item.unidade).toBe("Unidade Sul");
    expect(numerosDe(condicaoDe(ordensServico))).toEqual(expect.arrayContaining([1, 2]));
  });

  it("não abre a agenda administrativa do cliente no portal", async () => {
    // Vencimento de contrato é assunto de quem administra a unidade; o portal
    // mostra serviço, e o módulo ligado não pode mudar isso.
    modulosLigados.add("agenda-vencimentos");
    linhas.set(equipeFuncionarios, [{ id: 7 }]);
    linhas.set(vencimentos, [
      {
        id: 12,
        condominioId: 1,
        protocolo: "VNC-000012",
        titulo: "Contrato de dedetização",
        data: new Date("2026-08-14T00:00:00"),
        tipo: "contrato",
        fornecedor: "Dedetizadora XY",
        status: "ativo",
        registroStatus: null,
      },
    ]);

    const itens = await portalDe(3).listar({ condominioId: 1, ...JANELA });

    expect(itens.map((i) => i.fonte)).not.toContain("vencimento");
    // Nem consultada: a tabela do administrativo não é lida pelo portal.
    expect(condicaoDe(vencimentos)).toBeUndefined();
  });

  it("recusa quem teve Ordens de Serviço desligada pelo gestor", async () => {
    // Esconder o cartão no portal não impede chamar a rota direto.
    linhas.set(funcionarioFuncoes, [{ habilitada: false, podeCriar: false }]);

    await expect(
      portalDe(3).listar({ condominioId: 1, ...JANELA }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
