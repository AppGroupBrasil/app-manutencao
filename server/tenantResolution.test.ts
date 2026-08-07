import { describe, it, expect } from "vitest";
import { createTenantAccess } from "./_core/tenant";
import type { Funcionario, User } from "../drizzle/schema";

/**
 * Cenários de resolução de tenant que aparecem em produção:
 * síndico com mais de uma organização, admin_master (enxerga tudo) e conta
 * recém-criada ainda sem organização.
 */

const funcionarioDoTenant = (condominioId: number) =>
  ({ id: 1, condominioId, hierarquia: "funcionario" }) as unknown as Funcionario;

const usuario = (hierarquia: string) =>
  ({ id: 1, hierarquia, role: "sindico" }) as unknown as User;

describe("Resolução de tenant sem condominioId no input", () => {
  it("funcionário resolve para o próprio tenant", async () => {
    const acesso = createTenantAccess(null, funcionarioDoTenant(5));
    expect(await acesso.require()).toBe(5);
  });

  it("síndico com várias organizações resolve para a organização ativa", async () => {
    const acesso = createTenantAccess(usuario("admin"), null, {
      idsFornecidos: [4, 9, 12],
    });
    // Não pode explodir: há rotas legítimas sem condominioId no input.
    await expect(acesso.require()).resolves.toBe(4);
  });

  it("seleção explícita via cabeçalho é respeitada quando permitida", async () => {
    const acesso = createTenantAccess(usuario("admin"), null, {
      idsFornecidos: [4, 9, 12],
      selecionado: 9,
    });
    expect(await acesso.require()).toBe(9);
  });

  it("seleção via cabeçalho fora do conjunto permitido é ignorada", async () => {
    const acesso = createTenantAccess(usuario("admin"), null, {
      idsFornecidos: [4, 9],
      selecionado: 77,
    });
    expect(await acesso.require()).toBe(4);
  });

  it("condominioId explícito e inválido continua sendo recusado", async () => {
    const acesso = createTenantAccess(usuario("admin"), null, {
      idsFornecidos: [4, 9],
    });
    await expect(acesso.require(77)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("conta sem organização é recusada", async () => {
    const acesso = createTenantAccess(usuario("admin"), null, { idsFornecidos: [] });
    await expect(acesso.require()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("admin_master não faz varredura de tenants para validar acesso", async () => {
    let consultou = false;
    const acesso = createTenantAccess(usuario("admin_master"), null, {
      idsFornecidos: () => {
        consultou = true;
        return [1, 2, 3];
      },
    });

    await expect(acesso.assert(999)).resolves.toBeUndefined();
    expect(consultou).toBe(false);
  });
});
