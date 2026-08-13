import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ações da plataforma sobre um cliente.
 *
 * O risco que estes testes cobrem é o de errar o alvo: as rotas recebem um id
 * de usuário, e um id trocado bloquearia ou apagaria a conta da própria
 * plataforma — com o caminho de volta só pelo banco. Cliente é quem é dono de
 * organização; o resto é recusado antes de gravar.
 */

vi.mock("./_core/teste", () => ({
  invalidarCacheTeste: () => undefined,
  testeVencido: async () => false,
}));

/** Conta consultada por `exigirCliente`, ajustada por teste. */
let conta: { hierarquia: string } | undefined;
let organizacao: { id: number } | undefined;
/** Gravações por tabela: bloquear mexe no dono e nas unidades dele. */
let gravacoes: { tabela: string; valores: Record<string, unknown> }[];

vi.mock("./db", () => {
  const encadeavel = (dados: unknown[]) => {
    const p: any = Promise.resolve(dados);
    p.limit = () => Promise.resolve(dados);
    return p;
  };

  return {
    getDb: async () => ({
      select: (campos: Record<string, unknown>) => ({
        from: () => ({
          where: () =>
            encadeavel(
              "hierarquia" in campos
                ? conta
                  ? [conta]
                  : []
                : organizacao
                  ? [organizacao]
                  : [],
            ),
        }),
      }),
      update: (tabela: { _: { name?: string } } & Record<string, unknown>) => ({
        set: (valores: Record<string, unknown>) => ({
          where: async () => {
            const nome = "sindicoId" in tabela ? "condominios" : "users";
            gravacoes.push({ tabela: nome, valores });
          },
        }),
      }),
    }),
  };
});

const { plataformaRouter } = await import("./modules/plataforma/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

function comoPlataforma() {
  const user = { id: 1, hierarquia: "admin_master", role: "master" } as never;
  return createCallerFactory(plataformaRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [1] }),
  } as never);
}

function comoCliente() {
  const user = { id: 9, hierarquia: "funcionario", role: "sindico" } as never;
  return createCallerFactory(plataformaRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: [2] }),
  } as never);
}

beforeEach(() => {
  conta = { hierarquia: "funcionario" };
  organizacao = { id: 5 };
  gravacoes = [];
});

/** Última gravação feita naquela tabela. */
const gravadoEm = (tabela: string) =>
  [...gravacoes].reverse().find((g) => g.tabela === tabela)?.valores ?? null;

describe("ações da plataforma sobre clientes", () => {
  it("bloqueia o cliente com motivo padrão", async () => {
    await comoPlataforma().bloquearCliente({ gestorId: 9, bloqueado: true });

    const conta = gravadoEm("users")!;
    expect(conta).toMatchObject({ bloqueado: true });
    expect(String(conta.motivoBloqueio)).toContain("suporte");

    // O que fecha a porta da equipe: as unidades vão junto.
    const unidades = gravadoEm("condominios")!;
    expect(unidades.bloqueadaEm).toBeInstanceOf(Date);
  });

  it("recusa agir sobre uma conta da própria plataforma", async () => {
    conta = { hierarquia: "admin_master" };

    await expect(
      comoPlataforma().bloquearCliente({ gestorId: 1, bloqueado: true }),
    ).rejects.toThrow(/plataforma/i);
    expect(gravacoes).toEqual([]);
  });

  it("recusa agir sobre conta que não é dona de organização", async () => {
    organizacao = undefined;

    await expect(
      comoPlataforma().excluirCliente({ gestorId: 9 }),
    ).rejects.toThrow(/organização/i);
    expect(gravacoes).toEqual([]);
  });

  it("excluir marca a data, bloqueia e fecha as unidades", async () => {
    await comoPlataforma().excluirCliente({ gestorId: 9 });

    const conta = gravadoEm("users")!;
    expect(conta).toMatchObject({ bloqueado: true });
    expect(conta.excluidoEm).toBeInstanceOf(Date);
    expect(gravadoEm("condominios")!.bloqueadaEm).toBeInstanceOf(Date);
  });

  it("restaurar desfaz a exclusão, o bloqueio e reabre as unidades", async () => {
    await comoPlataforma().excluirCliente({ gestorId: 9, restaurar: true });

    expect(gravadoEm("users")).toMatchObject({
      excluidoEm: null,
      bloqueado: false,
      motivoBloqueio: null,
    });
    expect(gravadoEm("condominios")).toMatchObject({ bloqueadaEm: null });
  });

  it("liberar sem prazo tira o teste", async () => {
    await comoPlataforma().definirTeste({ gestorId: 9, dias: null });

    expect(gravadoEm("users")).toMatchObject({ trialAte: null });
  });

  it("cliente não alcança as ações da plataforma", async () => {
    await expect(
      comoCliente().bloquearCliente({ gestorId: 9, bloqueado: true }),
    ).rejects.toThrow(/plataforma/i);
    expect(gravacoes).toEqual([]);
  });
});
