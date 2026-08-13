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
let gravado: Record<string, unknown> | null;

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
      update: () => ({
        set: (valores: Record<string, unknown>) => ({
          where: async () => {
            gravado = valores;
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
  gravado = null;
});

describe("ações da plataforma sobre clientes", () => {
  it("bloqueia o cliente com motivo padrão", async () => {
    await comoPlataforma().bloquearCliente({ gestorId: 9, bloqueado: true });

    expect(gravado).toMatchObject({ bloqueado: true });
    expect(String((gravado as { motivoBloqueio: string }).motivoBloqueio)).toContain("suporte");
  });

  it("recusa agir sobre uma conta da própria plataforma", async () => {
    conta = { hierarquia: "admin_master" };

    await expect(
      comoPlataforma().bloquearCliente({ gestorId: 1, bloqueado: true }),
    ).rejects.toThrow(/plataforma/i);
    expect(gravado).toBeNull();
  });

  it("recusa agir sobre conta que não é dona de organização", async () => {
    organizacao = undefined;

    await expect(
      comoPlataforma().excluirCliente({ gestorId: 9 }),
    ).rejects.toThrow(/organização/i);
    expect(gravado).toBeNull();
  });

  it("excluir marca a data e bloqueia, sem apagar", async () => {
    await comoPlataforma().excluirCliente({ gestorId: 9 });

    expect(gravado).toMatchObject({ bloqueado: true });
    expect((gravado as { excluidoEm: Date }).excluidoEm).toBeInstanceOf(Date);
  });

  it("restaurar desfaz a exclusão e o bloqueio", async () => {
    await comoPlataforma().excluirCliente({ gestorId: 9, restaurar: true });

    expect(gravado).toMatchObject({ excluidoEm: null, bloqueado: false, motivoBloqueio: null });
  });

  it("liberar sem prazo tira o teste", async () => {
    await comoPlataforma().definirTeste({ gestorId: 9, dias: null });

    expect(gravado).toMatchObject({ trialAte: null });
  });

  it("cliente não alcança as ações da plataforma", async () => {
    await expect(
      comoCliente().bloquearCliente({ gestorId: 9, bloqueado: true }),
    ).rejects.toThrow(/plataforma/i);
    expect(gravado).toBeNull();
  });
});
