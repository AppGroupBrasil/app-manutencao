import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ciclo de vida da O.S. depois que o fluxo de baixa e confirmação saiu.
 *
 * Substitui o que os testes do fluxo protegiam e continua valendo: a ordem não
 * nasce sem data máxima (é ela que coloca o serviço no calendário), não fecha
 * sem ter começado, e reabrir desfaz o encerramento de verdade — trocar o
 * status na mão deixava data de fim e tempo total preenchidos.
 */

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async () => true,
  getModulosHabilitados: async () => ["ordens-servico"],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async () => 0,
  setModuloHabilitado: async () => undefined,
  setModulosHabilitados: async () => 0,
  getSegmentoDoTenant: async () => "generico",
}));

vi.mock("./_core/permissaoFuncionario", () => ({
  assegurarPermissaoFuncionario: async () => undefined,
  assegurarExclusaoFuncionario: async () => undefined,
}));

vi.mock("./_core/protocolo", () => ({
  proximoProtocolo: async () => "OS-000001",
  proximoProtocoloComData: async () => "OS-260813-0001",
}));

vi.mock("./storage", () => ({ storagePut: async () => ({ url: "" }) }));
vi.mock("./_core/email", () => ({
  isEmailConfigured: () => false,
  sendEmail: async () => undefined,
}));

const { ordensServico, osResponsaveis, condominios, osTimeline, osStatus, funcionarios } =
  await import("../drizzle/schema");

let osAtual: Record<string, unknown>;
let gravado: Record<string, unknown> | null;
let timeline: string[];
let statusDaUnidade: Record<string, unknown>[];

function fakeDb() {
  const porTabela = new Map<unknown, unknown[]>([
    [ordensServico, [osAtual]],
    [osResponsaveis, []],
    [condominios, [{ id: 1, nome: "Unidade 1", autoNotificar: false }]],
    [osStatus, statusDaUnidade],
    [funcionarios, []],
  ]);

  const encadeavel = (dados: unknown[]) => {
    const p: any = Promise.resolve(dados);
    p.limit = () => Promise.resolve(dados);
    p.orderBy = () => {
      const q: any = Promise.resolve(dados);
      q.limit = () => Promise.resolve(dados);
      return q;
    };
    return p;
  };

  return {
    select: () => ({
      from: (tabela: unknown) => ({
        where: () => encadeavel(porTabela.get(tabela) ?? []),
        limit: () => encadeavel(porTabela.get(tabela) ?? []),
        innerJoin: () => ({ where: () => encadeavel([]) }),
      }),
    }),
    insert: (tabela: unknown) => ({
      values: (valores: Record<string, unknown> | Record<string, unknown>[]) => {
        const linhas = Array.isArray(valores) ? valores : [valores];
        if (tabela === osTimeline) {
          for (const l of linhas) timeline.push(String(l.descricao ?? ""));
        }
        if (tabela === ordensServico) gravado = { ...linhas[0] };
        const p: any = Promise.resolve([{ id: 50 }]);
        p.returning = () => Promise.resolve([{ id: 50, ...linhas[0] }]);
        return p;
      },
    }),
    update: () => ({
      set: (valores: Record<string, unknown>) => ({
        where: async () => {
          gravado = { ...(gravado ?? {}), ...valores };
        },
      }),
    }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { osRouter } = await import("./modules/os/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

function comoGestor() {
  const user = { id: 1, hierarquia: "gestor", role: "sindico", name: "Gestor" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1] }),
  } as never);
}

beforeEach(() => {
  gravado = null;
  timeline = [];
  statusDaUnidade = [
    { id: 10, nome: "Aguardando início", isFinal: false, ordem: 1, ativo: true },
  ];
  osAtual = {
    id: 50,
    condominioId: 1,
    protocolo: "OS-260813-0001",
    titulo: "Trocar lâmpadas do pátio",
    prazoLimite: "2026-08-20",
    dataProgramada: null,
    dataInicio: null,
    dataFim: null,
    statusId: 10,
    equipeId: null,
  };
});

describe("abertura", () => {
  it("recusa O.S. sem data máxima", async () => {
    await expect(
      // @ts-expect-error o campo é obrigatório; o teste garante a recusa em runtime
      comoGestor().create({ condominioId: 1, titulo: "Sem prazo" }),
    ).rejects.toThrow();
  });

  it("grava o prazo e nasce no primeiro status da unidade", async () => {
    await comoGestor().create({
      condominioId: 1,
      titulo: "Trocar lâmpadas",
      prazoLimite: "2026-08-20",
    });

    expect(gravado).toMatchObject({ prazoLimite: "2026-08-20", statusId: 10 });
    expect(timeline).toContain("Ordem de serviço criada");
  });
});

describe("programação", () => {
  it("marca o dia e registra quem mexeu", async () => {
    await comoGestor().programar({ id: 50, dataProgramada: "2026-08-18" });

    expect(gravado).toMatchObject({ dataProgramada: "2026-08-18" });
    expect(timeline.some((t) => t.includes("Serviço programado para 18/08/2026"))).toBe(true);
  });

  it("reprogramar diz que é reprogramação", async () => {
    osAtual.dataProgramada = "2026-08-18";

    await comoGestor().programar({ id: 50, dataProgramada: "2026-08-19" });

    expect(timeline.some((t) => t.includes("Serviço reprogramado"))).toBe(true);
  });
});

describe("encerramento", () => {
  it("não finaliza serviço que nunca começou", async () => {
    await expect(comoGestor().finalizarServico({ id: 50 })).rejects.toThrow(/não foi iniciada/i);
  });

  it("finaliza calculando o tempo decorrido", async () => {
    osAtual.dataInicio = new Date(Date.now() - 60 * 60 * 1000);

    const res = await comoGestor().finalizarServico({ id: 50 });

    expect(res.tempoDecorridoMinutos).toBeGreaterThanOrEqual(59);
    expect(gravado).toMatchObject({ tempoDecorridoMinutos: res.tempoDecorridoMinutos });
    expect(timeline.some((t) => t.startsWith("Serviço finalizado"))).toBe(true);
  });

  it("reabrir desfaz o fechamento e exige motivo no histórico", async () => {
    osAtual.dataFim = new Date();
    osAtual.tempoDecorridoMinutos = 120;

    await comoGestor().reabrir({ id: 50, motivo: "Vazamento voltou" });

    expect(gravado).toMatchObject({
      dataFim: null,
      tempoDecorridoMinutos: null,
      statusId: 10,
    });
    expect(timeline.some((t) => t.includes("Vazamento voltou"))).toBe(true);
  });
});
