import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Quem programa a execução da O.S.
 *
 * O cliente pediu que designar equipe e marcar o dia do serviço ficassem com
 * uma pessoa só — o gerente que responde pela rede. A armadilha é que ele e os
 * gestores de unidade têm a mesma hierarquia (`admin`): separar por nível
 * liberaria todo mundo ou travaria o próprio gerente. Por isso o teste fixa o
 * critério em ser dono/chefe da organização, com escape por e-mail.
 */

const estado = vi.hoisted(() => ({ master: false }));

vi.mock("./_core/gestorMaster", () => ({
  ehGestorMaster: async () => estado.master,
}));

const { ehProgramadorOs, exigirProgramadorOs } = await import("./_core/programadorOs");

const gerente = { id: 1, email: "gerente@cliente.com", role: "sindico", hierarquia: "admin" };
const gestorDeUnidade = { id: 2, email: "unidade@cliente.com", role: "sindico", hierarquia: "admin" };

afterEach(() => {
  estado.master = false;
  delete process.env.OS_PROGRAMADORES;
});

describe("ehProgramadorOs", () => {
  it("libera o dono ou chefe da organização", async () => {
    estado.master = true;
    expect(await ehProgramadorOs({ user: gerente })).toBe(true);
  });

  it("recusa gestor de unidade, mesmo com a mesma hierarquia do gerente", async () => {
    expect(await ehProgramadorOs({ user: gestorDeUnidade })).toBe(false);
  });

  it("recusa o portal do funcionário, que não tem conta de usuário", async () => {
    expect(await ehProgramadorOs({ user: null })).toBe(false);
  });

  it("libera a plataforma, que dá suporte a todos os clientes", async () => {
    expect(await ehProgramadorOs({ user: { id: 3, hierarquia: "admin_master" } })).toBe(true);
  });

  it("libera pelo e-mail configurado, para o gerente cadastrado como gestor comum", async () => {
    process.env.OS_PROGRAMADORES = " Outro@cliente.com , GERENTE@cliente.com ";
    expect(await ehProgramadorOs({ user: gerente })).toBe(true);
    expect(await ehProgramadorOs({ user: gestorDeUnidade })).toBe(false);
  });

  it("explica o bloqueio em vez de falhar calado", async () => {
    await expect(exigirProgramadorOs({ user: gestorDeUnidade }, "Só o gerente.")).rejects.toThrow(
      "Só o gerente.",
    );
  });
});
