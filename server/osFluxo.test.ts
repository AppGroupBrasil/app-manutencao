import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Fluxo da O.S. com prazo, programação e baixa confirmada.
 *
 * O que estes testes protegem é a ordem e o "quem pode": o gestor abre com
 * prazo, só o gerente programa e finaliza, só quem foi designado dá baixa, e
 * finalizar sem a conferência do gestor não passa. Errar aqui não é tela feia —
 * é ordem fechada sem ninguém ter conferido o serviço.
 *
 * A unidade sem o fluxo ligado também é testada: ela precisa continuar
 * funcionando como antes, porque é o caso de todos os outros clientes.
 */

let ehMaster = false;
let fluxoLigadoNaUnidade = true;

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async () => true,
  getModulosHabilitados: async () => ["ordens-servico"],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async () => 0,
  setModuloHabilitado: async () => undefined,
  getSegmentoDoTenant: async () => "generico",
}));

vi.mock("./_core/gestorMaster", () => ({
  ehGestorMaster: async () => ehMaster,
}));

vi.mock("./_core/permissaoFuncionario", () => ({
  assegurarPermissaoFuncionario: async () => undefined,
  assegurarExclusaoFuncionario: async () => undefined,
}));

vi.mock("./_core/protocolo", () => ({
  proximoProtocolo: async () => "OS-000001",
  proximoProtocoloComData: async () => "OS-260812-0001",
}));

vi.mock("./storage", () => ({ storagePut: async () => ({ url: "" }) }));

/** Estado da O.S. no "banco"; cada teste ajusta o que precisa. */
let osAtual: Record<string, unknown>;
/** Funcionários designados nesta O.S. */
let responsaveis: { id: number; funcionarioId: number | null }[];
/** Última gravação feita por `update`, que é o que os testes conferem. */
let gravado: Record<string, unknown> | null;
let timeline: string[];

const { ordensServico, osResponsaveis, condominios, osTimeline, osStatus, funcionarios } =
  await import("../drizzle/schema");

/**
 * Fake mínimo do drizzle: o suficiente para as rotas do fluxo.
 *
 * Devolve por tabela e registra o que foi gravado. Não tenta imitar SQL — o que
 * importa aqui é a decisão do router, não a consulta.
 */
function fakeDb() {
  const linhas = new Map<unknown, unknown[]>([
    [ordensServico, [osAtual]],
    [osResponsaveis, responsaveis],
    [condominios, [{ nome: "Unidade 1", autoNotificar: false, ligado: fluxoLigadoNaUnidade }]],
    [osStatus, [{ id: 10, nome: "Aberta", isFinal: false, ordem: 1 }]],
    [funcionarios, [{ id: 7, nome: "Ana", cargo: "Zeladoria", email: null, telefone: null, condominioId: 1 }]],
  ]);

  const resultado = (tabela: unknown) => {
    const dados = linhas.get(tabela) ?? [];
    const encadeavel: any = Promise.resolve(dados);
    encadeavel.limit = () => Promise.resolve(dados);
    encadeavel.orderBy = () => {
      const p: any = Promise.resolve(dados);
      p.limit = () => Promise.resolve(dados);
      return p;
    };
    return encadeavel;
  };

  return {
    select: () => ({
      from: (tabela: unknown) => ({
        where: () => resultado(tabela),
        // `notificarAberturaDeOS` consulta sem where em alguns pontos.
        limit: () => resultado(tabela),
      }),
    }),
    insert: (tabela: unknown) => ({
      values: (valores: Record<string, unknown> | Record<string, unknown>[]) => {
        if (tabela === osTimeline) {
          const linha = Array.isArray(valores) ? valores[0] : valores;
          timeline.push(String(linha.descricao ?? ""));
        }
        if (tabela === ordensServico) {
          const linha = Array.isArray(valores) ? valores[0] : valores;
          gravado = { ...linha };
        }
        const p: any = Promise.resolve([{ id: 99 }]);
        p.returning = () => Promise.resolve([{ id: 99 }]);
        return p;
      },
    }),
    update: () => ({
      set: (valores: Record<string, unknown>) => ({
        where: async () => {
          gravado = { ...(gravado ?? {}), ...valores };
          return undefined;
        },
      }),
    }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { osRouter } = await import("./modules/os/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

/** Chamador como gestor/gerente (conta de `users`). */
function comoUsuario() {
  const user = { id: 1, hierarquia: "gestor", role: "sindico", name: "Gestor" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1] }),
  } as never);
}

/** Chamador como funcionário do portal. */
function comoFuncionario(id = 7) {
  const funcionario = { id, condominioId: 1, nome: "Ana" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user: null,
    funcionario,
    tenant: createTenantAccess(null, funcionario, {}),
  } as never);
}

beforeEach(() => {
  ehMaster = false;
  fluxoLigadoNaUnidade = true;
  gravado = null;
  timeline = [];
  responsaveis = [{ id: 1, funcionarioId: 7 }];
  osAtual = {
    id: 50,
    condominioId: 1,
    protocolo: "OS-260812-0001",
    titulo: "Trocar lâmpadas do pátio",
    etapa: "programada",
    prazoLimite: "2026-08-20",
    dataProgramada: "2026-08-15",
    dataInicio: new Date("2026-08-15T08:00:00"),
    dataFim: null,
    statusId: 10,
  };
});

describe("abertura com prazo", () => {
  it("recusa O.S. sem data máxima quando a unidade usa o fluxo", async () => {
    await expect(
      comoUsuario().create({ condominioId: 1, titulo: "Sem prazo" }),
    ).rejects.toThrow(/data máxima/i);
  });

  it("abre na etapa solicitada, com o prazo gravado", async () => {
    await comoUsuario().create({
      condominioId: 1,
      titulo: "Trocar lâmpadas",
      prazoLimite: "2026-08-20",
    });

    expect(gravado).toMatchObject({ etapa: "solicitada", prazoLimite: "2026-08-20" });
  });

  it("na unidade sem o fluxo, abre sem etapa e sem exigir prazo", async () => {
    fluxoLigadoNaUnidade = false;

    await comoUsuario().create({ condominioId: 1, titulo: "O.S. de sempre" });

    expect(gravado).toMatchObject({ etapa: null });
  });
});

describe("programar (passo do gerente)", () => {
  it("recusa o gestor de unidade", async () => {
    osAtual.etapa = "solicitada";

    await expect(
      comoUsuario().programar({ id: 50, dataProgramada: "2026-08-18" }),
    ).rejects.toThrow(/gerente/i);
  });

  it("aceita o gerente e passa a ordem para programada", async () => {
    ehMaster = true;
    osAtual.etapa = "solicitada";
    osAtual.dataProgramada = null;

    await comoUsuario().programar({ id: 50, dataProgramada: "2026-08-18" });

    expect(gravado).toMatchObject({ etapa: "programada", dataProgramada: "2026-08-18" });
    expect(timeline.join(" ")).toMatch(/programado para 18\/08\/2026/);
  });

  it("reprogramar não puxa de volta a ordem que já tem baixa", async () => {
    ehMaster = true;
    osAtual.etapa = "baixa_pedida";

    await comoUsuario().programar({ id: 50, dataProgramada: "2026-08-19" });

    expect(gravado).toMatchObject({ etapa: "baixa_pedida", dataProgramada: "2026-08-19" });
    expect(timeline.join(" ")).toMatch(/reprogramado/i);
  });
});

describe("baixa (passo da equipe)", () => {
  it("recusa funcionário que não foi designado", async () => {
    // O fake não filtra por SQL; lista vazia é o que a consulta devolveria para
    // quem não está entre os responsáveis desta O.S.
    responsaveis = [];

    await expect(comoFuncionario(7).darBaixa({ id: 50 })).rejects.toThrow(/designado/i);
  });

  it("aceita quem foi designado e manda para conferência", async () => {
    await comoFuncionario(7).darBaixa({ id: 50, observacao: "Trocadas 6 lâmpadas" });

    expect(gravado).toMatchObject({ etapa: "baixa_pedida", baixaObservacao: "Trocadas 6 lâmpadas" });
    expect(gravado?.baixaEm).toBeInstanceOf(Date);
    expect(timeline.join(" ")).toMatch(/Baixa dada pela equipe/);
  });

  it("não deixa dar baixa duas vezes", async () => {
    osAtual.etapa = "baixa_pedida";

    await expect(comoFuncionario(7).darBaixa({ id: 50 })).rejects.toThrow(/já foi dada/i);
  });

  it("não deixa dar baixa em serviço que o gerente não programou", async () => {
    osAtual.etapa = "solicitada";
    osAtual.dataProgramada = null;

    await expect(comoFuncionario(7).darBaixa({ id: 50 })).rejects.toThrow(/não programou/i);
  });

  it("não deixa a equipe desfazer uma baixa já confirmada pelo gestor", async () => {
    osAtual.etapa = "baixa_confirmada";

    await expect(comoFuncionario(7).darBaixa({ id: 50 })).rejects.toThrow(/já foi confirmada/i);
  });
});

describe("corrigir a data máxima", () => {
  it("grava a nova data e deixa a troca no histórico", async () => {
    await comoUsuario().definirPrazo({ id: 50, prazoLimite: "2026-08-28" });

    expect(gravado).toMatchObject({ prazoLimite: "2026-08-28" });
    expect(timeline.join(" ")).toMatch(/alterada de 20\/08\/2026 para 28\/08\/2026/);
  });

  it("não é passo da equipe", async () => {
    await expect(
      comoFuncionario(7).definirPrazo({ id: 50, prazoLimite: "2026-08-28" }),
    ).rejects.toThrow();
  });
});

describe("conferência (passo do gestor)", () => {
  it("confirma a baixa pedida", async () => {
    osAtual.etapa = "baixa_pedida";

    await comoUsuario().confirmarBaixa({ id: 50 });

    expect(gravado).toMatchObject({ etapa: "baixa_confirmada" });
    expect(gravado?.baixaConfirmadaEm).toBeInstanceOf(Date);
  });

  it("não confirma o que a equipe ainda não deu baixa", async () => {
    osAtual.etapa = "programada";

    await expect(comoUsuario().confirmarBaixa({ id: 50 })).rejects.toThrow(/depois de a equipe/i);
  });

  it("devolve a baixa com motivo e limpa os carimbos da equipe", async () => {
    osAtual.etapa = "baixa_pedida";

    await comoUsuario().devolverBaixa({ id: 50, motivo: "Faltou o corredor" });

    expect(gravado).toMatchObject({ etapa: "programada", baixaEm: null, baixaPorNome: null });
    expect(timeline.join(" ")).toMatch(/devolvida para a equipe: Faltou o corredor/);
  });
});

describe("finalizar (passo do gerente)", () => {
  it("recusa o gestor de unidade quando o fluxo está ligado", async () => {
    osAtual.etapa = "baixa_confirmada";

    await expect(comoUsuario().finalizarServico({ id: 50 })).rejects.toThrow(/gerente/i);
  });

  it("recusa o gerente antes da conferência do gestor", async () => {
    ehMaster = true;
    osAtual.etapa = "baixa_pedida";

    await expect(comoUsuario().finalizarServico({ id: 50 })).rejects.toThrow(/confirmada/i);
  });

  it("fecha a ordem depois da baixa confirmada", async () => {
    ehMaster = true;
    osAtual.etapa = "baixa_confirmada";

    await comoUsuario().finalizarServico({ id: 50 });

    expect(gravado).toMatchObject({ etapa: "finalizada" });
    expect(gravado?.dataFim).toBeInstanceOf(Date);
  });

  it("ordem aberta antes de a chave ser ligada continua fechando como antes", async () => {
    // Unidade no fluxo, mas esta ordem nasceu fora dele: `etapa` nula. Sem esta
    // ressalva, ligar a chave prendia toda O.S. em aberto — o gerente teria que
    // programar e pedir baixa de um serviço que já estava pronto.
    osAtual.etapa = null;

    await comoUsuario().finalizarServico({ id: 50 });

    expect(gravado?.dataFim).toBeInstanceOf(Date);
    expect(gravado?.etapa ?? null).toBeNull();
  });

  it("na unidade sem o fluxo, a equipe continua finalizando como antes", async () => {
    fluxoLigadoNaUnidade = false;
    osAtual.etapa = null;

    await comoFuncionario(7).finalizarServico({ id: 50 });

    expect(gravado?.dataFim).toBeInstanceOf(Date);
    expect(gravado?.etapa ?? null).toBeNull();
  });
});
