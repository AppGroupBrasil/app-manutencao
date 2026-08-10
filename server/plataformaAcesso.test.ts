import { describe, it, expect } from "vitest";
import { createTenantAccess } from "./_core/tenant";
import type { User } from "../drizzle/schema";

function conta(hierarquia: string): User {
  return { id: 1, hierarquia, role: "sindico" } as unknown as User;
}

/**
 * A abertura de cliente é exclusiva da conta da plataforma. O que separa um
 * cliente do outro é o conjunto de tenants da identidade — nenhum gestor de
 * cliente pode ser `admin_master`, que enxerga a base inteira.
 */
describe("Conta da plataforma", () => {
  it("admin_master é a única reconhecida como plataforma", () => {
    expect(createTenantAccess(conta("admin_master"), null).isMaster()).toBe(true);
    for (const nivel of ["admin", "responsavel", "funcionario"]) {
      expect(createTenantAccess(conta(nivel), null).isMaster()).toBe(false);
    }
  });

  it("gestor de cliente só alcança as unidades dele", async () => {
    const acesso = createTenantAccess(conta("funcionario"), null, {
      idsFornecidos: [17, 18],
    });

    expect(await acesso.ids()).toEqual([17, 18]);
    expect(await acesso.require(17)).toBe(17);
    // Unidade de outro cliente, ainda que exista na mesma base.
    await expect(acesso.require(1)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
