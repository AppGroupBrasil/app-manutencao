import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  createCallerFactory,
  protectedProcedure,
  protectedOrFuncionarioProcedure,
  router,
} from "./_core/trpc";
import { createTenantAccess } from "./_core/tenant";
import type { Funcionario, User } from "../drizzle/schema";

/**
 * A conferência do `condominioId` do input vive no `protectedProcedure`, e não
 * em cada router: são mais de trezentas rotas que recebem o tenant por input, e
 * bastava uma esquecer o `tenant.assert` para vazar a organização do vizinho.
 */

const usuario = (hierarquia = "admin") =>
  ({ id: 1, hierarquia, role: "sindico", senhaProvisoria: false }) as unknown as User;

const funcionario = (condominioId: number) =>
  ({ id: 1, condominioId, hierarquia: "funcionario" }) as unknown as Funcionario;

const appRouter = router({
  comTenant: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(({ input }) => input.condominioId),

  comTenantTexto: protectedProcedure
    .input(z.object({ condominioId: z.coerce.number() }))
    .query(({ input }) => input.condominioId),

  semTenant: protectedProcedure.query(() => "ok"),

  doFuncionario: protectedOrFuncionarioProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(({ input }) => input.condominioId),
});

function chamador(user: User | null, func: Funcionario | null, ids: number[]) {
  return createCallerFactory(appRouter)({
    user,
    funcionario: func,
    tenant: createTenantAccess(user, func, { idsFornecidos: ids }),
  } as never);
}

describe("Conferência do condominioId recebido por input", () => {
  it("aceita organização do próprio acesso", async () => {
    await expect(chamador(usuario(), null, [4, 9]).comTenant({ condominioId: 9 })).resolves.toBe(9);
  });

  it("recusa organização de outro cliente", async () => {
    await expect(
      chamador(usuario(), null, [4, 9]).comTenant({ condominioId: 77 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("recusa também quando o número chega como texto", async () => {
    await expect(
      chamador(usuario(), null, [4]).comTenantTexto({ condominioId: "77" } as never),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rota sem condominioId no input continua passando", async () => {
    await expect(chamador(usuario(), null, [4]).semTenant()).resolves.toBe("ok");
  });

  it("funcionário só alcança as unidades dele", async () => {
    const caller = chamador(null, funcionario(3), [3]);
    await expect(caller.doFuncionario({ condominioId: 3 })).resolves.toBe(3);
    await expect(caller.doFuncionario({ condominioId: 4 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("admin_master atravessa, é a conta de suporte da plataforma", async () => {
    await expect(
      chamador(usuario("admin_master"), null, [1]).comTenant({ condominioId: 999 }),
    ).resolves.toBe(999);
  });
});
