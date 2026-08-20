import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Aviso da equipe designada na O.S.
 *
 * O pedido do cliente é curto e a consequência não é: designar a equipe tem de
 * avisar o supervisor dela. Se o aviso não sair, a ordem fica parada esperando
 * alguém que não sabe que ela existe — por isso o teste cobre quem recebe
 * (supervisor, e o time inteiro quando não há supervisor) e quando NÃO recebe
 * (salvar a O.S. de novo com a mesma equipe).
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

vi.mock("./_core/protocolo", () => ({
  proximoProtocolo: async () => "OS-000001",
  proximoProtocoloComData: async () => "OS-260813-0001",
}));

vi.mock("./storage", () => ({ storagePut: async () => ({ url: "" }) }));

/** E-mail desligado: o teste olha o aviso dentro do sistema. */
vi.mock("./_core/email", () => ({
  isEmailConfigured: () => false,
  sendEmail: async () => undefined,
}));

const {
  ordensServico,
  osResponsaveis,
  condominios,
  osTimeline,
  osStatus,
  notificacoes,
  equipes,
  equipeFuncionarios,
  equipeUnidades,
  funcionarios,
  users,
} = await import("../drizzle/schema");

/** Membros da equipe 3, com o tipo que decide quem é avisado. */
let membros: {
  id: number;
  nome: string;
  email: string | null;
  loginEmail: string | null;
  tipo: string;
}[];
/** Unidades que a equipe 3 atende; muda para simular equipe de outra unidade. */
let unidadesDaEquipe: number[];
let osAtual: Record<string, unknown>;
let avisos: { titulo: string; userId: unknown; funcionarioId: unknown }[];
let timeline: string[];
/** Quem a rota gravou como responsável pela O.S. */
let responsaveis: { funcionarioId: unknown; nome: unknown }[];

function fakeDb() {
  const porTabela = new Map<unknown, unknown[]>([
    [ordensServico, [osAtual]],
    [osResponsaveis, []],
    [condominios, [{ id: 1, nome: "Creche Central", autoNotificar: false, ligado: false }]],
    [osStatus, [{ id: 10, nome: "Aguardando início", isFinal: false, ordem: 1 }]],
    [equipes, [{ id: 3, nome: "Elétrica", cor: "#000", ativo: true }]],
    // A O.S. do teste é da unidade 1: a equipe só pode ser designada se esta
    // unidade estiver entre as que ela atende.
    [
      equipeUnidades,
      unidadesDaEquipe.includes(1) ? [{ id: 1, equipeId: 3, condominioId: 1 }] : [],
    ],
    [funcionarios, []],
    [users, [{ id: 90 }]],
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
        // A consulta dos membros é um join: equipe_funcionarios × funcionarios.
        innerJoin: () => ({
          where: () =>
            encadeavel(tabela === equipeFuncionarios ? membros : (porTabela.get(tabela) ?? [])),
        }),
      }),
    }),
    insert: (tabela: unknown) => ({
      values: (valores: Record<string, unknown> | Record<string, unknown>[]) => {
        const linhas = Array.isArray(valores) ? valores : [valores];
        if (tabela === notificacoes) {
          for (const l of linhas) {
            avisos.push({
              titulo: String(l.titulo ?? ""),
              userId: l.userId,
              funcionarioId: l.funcionarioId,
            });
          }
        }
        if (tabela === osResponsaveis) {
          for (const l of linhas) {
            responsaveis.push({ funcionarioId: l.funcionarioId, nome: l.nome });
          }
        }
        if (tabela === osTimeline) {
          for (const l of linhas) timeline.push(String(l.descricao ?? ""));
        }
        const p: any = Promise.resolve([{ id: 50 }]);
        p.returning = () => Promise.resolve([{ id: 50, ...linhas[0] }]);
        return p;
      },
    }),
    update: () => ({
      set: () => ({ where: async () => undefined }),
    }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { osRouter } = await import("./modules/os/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

function comoFuncionario() {
  const funcionario = { id: 7, condominioId: 1, nome: "Ana" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user: null,
    funcionario,
    tenant: createTenantAccess(null, funcionario, {}),
  } as never);
}

function comoGerente() {
  const user = { id: 1, hierarquia: "gestor", role: "sindico", name: "Gerente" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1] }),
  } as never);
}

beforeEach(() => {
  avisos = [];
  timeline = [];
  responsaveis = [];
  unidadesDaEquipe = [1];
  membros = [
    { id: 71, nome: "Ana", email: "ana@ex.com", loginEmail: null, tipo: "supervisor" },
    { id: 72, nome: "Bruno", email: "bruno@ex.com", loginEmail: null, tipo: "auxiliar" },
  ];
  osAtual = {
    id: 50,
    condominioId: 1,
    protocolo: "OS-260813-0001",
    titulo: "Trocar lâmpadas do pátio",
    etapa: null,
    equipeId: null,
    prazoLimite: "2026-08-20",
    statusId: 10,
  };
});

describe("equipe designada na abertura", () => {
  it("avisa e registra na linha do tempo quem ficou com o serviço", async () => {
    await comoGerente().create({
      condominioId: 1,
      titulo: "Trocar lâmpadas do pátio",
      prazoLimite: "2026-08-20",
      equipeId: 3,
      observacoes: "Portão dos fundos",
    });

    expect(avisos.some((a) => a.titulo.includes("Elétrica"))).toBe(true);
    expect(timeline.some((t) => t.includes("Equipe designada: Elétrica"))).toBe(true);
    // Só o supervisor é avisado quando existe um.
    expect(timeline.some((t) => t.includes("Ana"))).toBe(true);
    expect(timeline.some((t) => t.includes("Bruno"))).toBe(false);
  });

  it("sem supervisor na equipe, avisa o time inteiro", async () => {
    membros = membros.map((m) => ({ ...m, tipo: "auxiliar" }));

    await comoGerente().create({
      condominioId: 1,
      titulo: "Serviço",
      prazoLimite: "2026-08-20",
      equipeId: 3,
    });

    const registro = timeline.find((t) => t.startsWith("Equipe designada")) ?? "";
    expect(registro).toContain("Ana");
    expect(registro).toContain("Bruno");
  });

  it("recusa equipe que não atende a unidade da ordem", async () => {
    // Quem cuida de 15 unidades passa no escopo com a equipe de qualquer uma
    // delas: sem esta trava, o aviso sairia para o time errado.
    unidadesDaEquipe = [2];

    await expect(
      comoGerente().create({
        condominioId: 1,
        titulo: "Serviço",
        prazoLimite: "2026-08-20",
        equipeId: 3,
      }),
    ).rejects.toThrow(/não atende a unidade/i);

    expect(avisos).toEqual([]);
  });

  it("equipe de rede é aceita na unidade que ela atende", async () => {
    // A "Facilities" do cliente: uma equipe, quinze unidades.
    unidadesDaEquipe = [1, 2, 3];

    await comoGerente().create({
      condominioId: 1,
      titulo: "Serviço",
      prazoLimite: "2026-08-20",
      equipeId: 3,
    });

    expect(timeline.some((t) => t.startsWith("Equipe designada"))).toBe(true);
  });

  it("o aviso chega ao funcionário, e não só a conta de gestor", async () => {
    await comoGerente().create({
      condominioId: 1,
      titulo: "Serviço",
      prazoLimite: "2026-08-20",
      equipeId: 3,
    });

    // Ana é supervisora: é ela quem recebe, endereçada pelo id de funcionário.
    expect(avisos.some((a) => a.funcionarioId === 71)).toBe(true);
  });

  it("o time inteiro entra como responsável pela O.S.", async () => {
    await comoGerente().create({
      condominioId: 1,
      titulo: "Serviço",
      prazoLimite: "2026-08-20",
      equipeId: 3,
    });

    expect(responsaveis.map((r) => r.funcionarioId).sort()).toEqual([71, 72]);
  });

  it("O.S. sem equipe não gera aviso de designação", async () => {
    await comoGerente().create({
      condominioId: 1,
      titulo: "Serviço",
      prazoLimite: "2026-08-20",
    });

    expect(timeline.some((t) => t.startsWith("Equipe designada"))).toBe(false);
  });
});

describe("quem pode designar", () => {
  it("funcionário não designa equipe pela O.S.", async () => {
    // A tela dele mostra a equipe, sem editar; a rota é a mesma, então a
    // recusa tem de estar aqui — esconder o campo não tranca nada.
    await expect(
      comoFuncionario().update({ id: 50, equipeId: 3 }),
    ).rejects.toThrow(/responde pela unidade/i);

    expect(avisos).toEqual([]);
  });
});

describe("equipe designada depois da abertura", () => {
  it("avisa quando a equipe muda", async () => {
    await comoGerente().update({ id: 50, equipeId: 3 });

    expect(avisos.some((a) => a.titulo.includes("Elétrica"))).toBe(true);
  });

  it("não reavisa quando a equipe já era essa", async () => {
    osAtual.equipeId = 3;

    await comoGerente().update({ id: 50, equipeId: 3, observacoes: "só mudou a observação" });

    expect(avisos).toEqual([]);
  });
});
