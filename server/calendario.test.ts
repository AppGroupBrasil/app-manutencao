import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O Calendário só lê o que as outras funções já gravaram, e é aí que estão os
 * riscos: mostrar item de módulo desligado, errar o dia de uma tarefa
 * recorrente ou perder o atalho que leva de volta à função.
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

/** Linhas devolvidas por tabela; o fake olha qual tabela foi consultada. */
const linhas = new Map<unknown, unknown[]>();

vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: (tabela: unknown) => ({
        where: async () => linhas.get(tabela) ?? [],
      }),
    }),
  }),
}));

const { calendarioRouter } = await import("./modules/calendario/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");
const {
  checklists,
  ordensServico,
  quadroAtividades,
  tarefasAgendadas,
  tarefasExecucoes,
  vencimentos,
  vistorias,
} = await import("../drizzle/schema");

function chamador(organizacoes = [1]) {
  const user = { id: 1, hierarquia: "gestor", role: "sindico", name: "Gestor" } as never;
  return createCallerFactory(calendarioRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: organizacoes }),
  } as never);
}

/** Agosto de 2026 inteiro: 1º é sábado, então as segundas são 3, 10, 17, 24 e 31. */
const JANELA = { de: "2026-08-01", ate: "2026-08-31" };

beforeEach(() => {
  modulosLigados.clear();
  linhas.clear();
});

describe("calendario.listar", () => {
  it("traz o vencimento com o atalho que filtra a função pelo protocolo", async () => {
    modulosLigados.add("agenda-vencimentos");
    linhas.set(vencimentos, [
      {
        id: 12,
        protocolo: "VNC-000012",
        titulo: "Contrato de dedetização",
        data: new Date("2026-08-14T00:00:00"),
        tipo: "contrato",
        fornecedor: "Dedetizadora XY",
        status: "ativo",
        registroStatus: null,
      },
    ]);

    const itens = await chamador().listar({ condominioId: 1, ...JANELA });

    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({
      fonte: "vencimento",
      data: "2026-08-14",
      concluido: false,
      detalhe: "Dedetizadora XY",
      rota: "/manutencoes/vencimentos?busca=VNC-000012",
    });
  });

  it("não mostra função de módulo desligado", async () => {
    // Só vencimentos ligado; o checklist existe no banco e não pode aparecer.
    modulosLigados.add("agenda-vencimentos");
    linhas.set(checklists, [
      {
        id: 3,
        protocolo: "CHK-000003",
        titulo: "Limpeza da cozinha",
        data: new Date("2026-08-10T00:00:00"),
        realizada: null,
        status: "pendente",
        localizacao: "cozinha",
        responsavel: null,
      },
    ]);

    const itens = await chamador().listar({ condominioId: 1, ...JANELA });

    expect(itens).toEqual([]);
  });

  it("marca como concluído o que já foi realizado", async () => {
    modulosLigados.add("vistorias");
    linhas.set(vistorias, [
      {
        id: 8,
        protocolo: "VST-000008",
        titulo: "Vistoria mensal",
        data: new Date("2026-08-05T00:00:00"),
        realizada: new Date("2026-08-05T15:00:00"),
        status: "finalizada",
        localizacao: "bloco A",
        responsavel: "Carlos",
      },
    ]);

    const [item] = await chamador().listar({ condominioId: 1, ...JANELA });

    expect(item.concluido).toBe(true);
    expect(item.rota).toBe("/manutencoes/vistorias?busca=VST-000008");
  });

  it("repete a tarefa semanal em cada dia da semana escolhido", async () => {
    modulosLigados.add("tarefas-agendadas");
    linhas.set(tarefasAgendadas, [
      {
        id: 5,
        protocolo: "TRF-000005",
        titulo: "Limpeza do hall",
        recorrencia: "semanal",
        diasSemana: [1],
        dataEspecifica: null,
        diaMes: null,
        funcionario: "Ana",
        local: "hall",
      },
    ]);
    // A execução do dia 10 tem de derrubar só aquele dia.
    linhas.set(tarefasExecucoes, [{ tarefaId: 5, dia: "2026-08-10" }]);

    const itens = await chamador().listar({ condominioId: 1, ...JANELA });

    expect(itens.map((i) => i.data)).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
    expect(itens.filter((i) => i.concluido).map((i) => i.data)).toEqual(["2026-08-10"]);
    // Chave por dia: sem isso o React repetiria a mesma linha cinco vezes.
    expect(new Set(itens.map((i) => i.chave)).size).toBe(5);
  });

  it("usa o dia do mês na tarefa mensal e ignora quem não tem dia", async () => {
    modulosLigados.add("tarefas-agendadas");
    linhas.set(tarefasAgendadas, [
      {
        id: 6,
        protocolo: "TRF-000006",
        titulo: "Leitura do hidrômetro",
        recorrencia: "mensal",
        diasSemana: [],
        dataEspecifica: null,
        diaMes: 20,
        funcionario: null,
        local: null,
      },
      {
        id: 7,
        protocolo: "TRF-000007",
        titulo: "Tarefa mensal sem dia",
        recorrencia: "mensal",
        diasSemana: [],
        dataEspecifica: null,
        diaMes: null,
        funcionario: null,
        local: null,
      },
    ]);

    const itens = await chamador().listar({ condominioId: 1, ...JANELA });

    expect(itens.map((i) => `${i.id}:${i.data}`)).toEqual(["6:2026-08-20"]);
  });

  it("ordena por dia e coloca o que está em aberto antes do resolvido", async () => {
    modulosLigados.add("quadro-atividades");
    linhas.set(quadroAtividades, [
      {
        id: 2,
        protocolo: "ATV-000002",
        titulo: "B — resolvida",
        data: "2026-08-09",
        status: "concluido",
        responsavel: null,
      },
      {
        id: 1,
        protocolo: "ATV-000001",
        titulo: "A — em aberto",
        data: "2026-08-09",
        status: "a_fazer",
        responsavel: null,
      },
      {
        id: 3,
        protocolo: "ATV-000003",
        titulo: "C — dia anterior",
        data: "2026-08-02",
        status: "a_fazer",
        responsavel: null,
      },
    ]);

    const itens = await chamador().listar({ condominioId: 1, ...JANELA });

    expect(itens.map((i) => i.id)).toEqual([3, 1, 2]);
  });

  it("mostra a O.S. no dia programado e abre a ordem pelo id", async () => {
    modulosLigados.add("ordens-servico");
    linhas.set(ordensServico, [
      {
        id: 50,
        protocolo: "OS-260812-0001",
        titulo: "Trocar lâmpadas do pátio",
        programada: "2026-08-18",
        prazo: "2026-08-20",
        etapa: "programada",
        dataFim: null,
        responsavel: "Ana",
        endereco: "pátio",
      },
    ]);

    const [item] = await chamador().listar({ condominioId: 1, ...JANELA });

    expect(item).toMatchObject({
      fonte: "os",
      data: "2026-08-18",
      programada: true,
      prazoLimite: "2026-08-20",
      etapa: "programada",
      // Rota por id: o atalho abre a ordem, não uma lista filtrada.
      rota: "/manutencoes/ordens-servico/50",
    });
  });

  it("sem programação, cai no dia do prazo e avisa que não está programada", async () => {
    modulosLigados.add("ordens-servico");
    linhas.set(ordensServico, [
      {
        id: 51,
        protocolo: "OS-260812-0002",
        titulo: "Consertar portão",
        programada: null,
        prazo: "2026-08-25",
        etapa: "solicitada",
        dataFim: null,
        responsavel: null,
        endereco: null,
      },
    ]);

    const [item] = await chamador().listar({ condominioId: 1, ...JANELA });

    expect(item).toMatchObject({ data: "2026-08-25", programada: false, etapa: "solicitada" });
  });

  it("recusa a organização que não é do solicitante", async () => {
    modulosLigados.add("agenda-vencimentos");

    await expect(
      chamador([1]).listar({ condominioId: 2, ...JANELA }),
    ).rejects.toThrow(/FORBIDDEN|não|organização/i);
  });
});
