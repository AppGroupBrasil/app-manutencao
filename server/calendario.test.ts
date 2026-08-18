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
/** Tabelas consultadas e os números que a condição levou (os ids de unidade). */
let consultas: { tabela: unknown; ids: number[] }[];

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

vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: (tabela: unknown) => ({
        where: (condicao: unknown) => {
          consultas.push({ tabela, ids: parametrosDe(condicao) });
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
  checklists,
  condominios,
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
  // As unidades liberadas ficam em cache por processo: sem limpar, o teste
  // seguinte herdaria a resposta do anterior sobre quem está suspensa.
  invalidarCacheBloqueio();
  modulosLigados.clear();
  // O próprio calendário é módulo: sem ele a rota nem responde. Cada teste
  // liga só as fontes que quer ver.
  modulosLigados.add("calendario");
  linhas.clear();
  consultas = [];
});

/** Unidades pedidas na consulta de uma fonte. */
const unidadesConsultadas = (tabela: unknown) =>
  consultas.find((c) => c.tabela === tabela)?.ids ?? [];

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

  it("recusa a chamada quando o próprio calendário está desligado", async () => {
    // Cliente que só quer O.S. na tela: o cartão some no client e a rota
    // fecha aqui — esconder no menu não impede ninguém de chamar direto.
    modulosLigados.delete("calendario");
    modulosLigados.add("agenda-vencimentos");

    await expect(
      chamador().listar({ condominioId: 1, ...JANELA }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
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
        dataFim: null,
        responsavel: null,
        endereco: null,
      },
    ]);

    const [item] = await chamador().listar({ condominioId: 1, ...JANELA });

    expect(item).toMatchObject({ data: "2026-08-25", programada: false });
  });

  it("soma as O.S. de todas as unidades do gerente e diz de qual é cada uma", async () => {
    // A agenda dele é a da rede: ordem aberta pelo gestor de outra unidade tem
    // de cair no calendário sem ele trocar a unidade da tela.
    modulosLigados.add("ordens-servico");
    linhas.set(condominios, [
      { id: 1, nome: "São José" },
      { id: 2, nome: "Centro" },
    ]);
    linhas.set(ordensServico, [
      {
        id: 60,
        condominioId: 2,
        protocolo: "OS-260812-0003",
        titulo: "Trocar fechadura",
        programada: "2026-08-12",
        prazo: "2026-08-15",
        dataFim: null,
        responsavel: null,
        endereco: null,
      },
    ]);

    const [item] = await chamador([1, 2]).listar({
      condominioId: 1,
      ...JANELA,
      todasUnidades: true,
    });

    expect(unidadesConsultadas(ordensServico)).toEqual([1, 2]);
    expect(item).toMatchObject({ unidadeId: 2, unidade: "Centro" });
  });

  it("gestor de uma unidade só vê a dela, mesmo pedindo a rede", async () => {
    // O alcance sai da identidade autenticada; o input só diz "quero a rede".
    modulosLigados.add("ordens-servico");
    linhas.set(condominios, [{ id: 1, nome: "São José" }]);
    linhas.set(ordensServico, []);

    await chamador([1]).listar({ condominioId: 1, ...JANELA, todasUnidades: true });

    expect(unidadesConsultadas(ordensServico)).toEqual([1]);
  });

  it("unidade suspensa fica de fora da agenda da rede", async () => {
    // A unidade 2 não volta da consulta de unidades liberadas: está bloqueada.
    modulosLigados.add("ordens-servico");
    linhas.set(condominios, [{ id: 1, nome: "São José" }]);
    linhas.set(ordensServico, []);

    await chamador([1, 2]).listar({ condominioId: 1, ...JANELA, todasUnidades: true });

    expect(unidadesConsultadas(ordensServico)).toEqual([1]);
  });

  it("com a rede pedida, as outras funções também somam as unidades", async () => {
    // O seletor marca unidades, não funções: quem pediu três unidades espera
    // ver o vencimento das três, não só a O.S.
    modulosLigados.add("ordens-servico");
    modulosLigados.add("agenda-vencimentos");
    linhas.set(condominios, [
      { id: 1, nome: "São José" },
      { id: 2, nome: "Centro" },
    ]);
    linhas.set(ordensServico, []);
    linhas.set(vencimentos, []);

    await chamador([1, 2]).listar({ condominioId: 1, ...JANELA, todasUnidades: true });

    expect(unidadesConsultadas(ordensServico)).toEqual([1, 2]);
    expect(unidadesConsultadas(vencimentos)).toEqual([1, 2]);
  });

  it("a agenda soma só as unidades marcadas", async () => {
    modulosLigados.add("ordens-servico");
    modulosLigados.add("agenda-vencimentos");
    // O banco devolve a 2 como liberada: é a única marcada.
    linhas.set(condominios, [{ id: 2, nome: "Centro" }]);
    linhas.set(ordensServico, []);
    linhas.set(vencimentos, []);

    await chamador([1, 2]).listar({ condominioId: 1, ...JANELA, unidades: [2] });

    expect(unidadesConsultadas(ordensServico)).toEqual([2]);
    expect(unidadesConsultadas(vencimentos)).toEqual([2]);
  });

  it("unidade marcada fora do alcance não entra", async () => {
    // A marcação vem do navegador: um id trocado ali não pode virar leitura da
    // unidade de outro cliente. Sobra a unidade da tela.
    modulosLigados.add("agenda-vencimentos");
    linhas.set(condominios, [{ id: 1, nome: "São José" }]);
    linhas.set(vencimentos, []);

    await chamador([1]).listar({ condominioId: 1, ...JANELA, unidades: [99] });

    expect(unidadesConsultadas(vencimentos)).toEqual([1]);
  });

  it("sem todasUnidades, a O.S. fica na unidade da tela", async () => {
    modulosLigados.add("ordens-servico");
    linhas.set(condominios, [
      { id: 1, nome: "São José" },
      { id: 2, nome: "Centro" },
    ]);
    linhas.set(ordensServico, []);

    await chamador([1, 2]).listar({ condominioId: 1, ...JANELA });

    expect(unidadesConsultadas(ordensServico)).toEqual([1]);
  });

  it("recusa a organização que não é do solicitante", async () => {
    modulosLigados.add("agenda-vencimentos");

    await expect(
      chamador([1]).listar({ condominioId: 2, ...JANELA }),
    ).rejects.toThrow(/FORBIDDEN|não|organização/i);
  });
});
