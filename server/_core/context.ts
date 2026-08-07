import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, Funcionario } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { getDb } from "../db";
import { findFuncionarioById } from "./funcionarioCompat";
import { createTenantAccess, lerTenantSelecionado, type TenantAccess } from "./tenant";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  funcionario: Funcionario | null;
  /**
   * Tenants acessíveis pela identidade autenticada.
   * Resolvido sob demanda e memoizado por requisição.
   */
  tenant: TenantAccess;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let funcionario: Funcionario | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Try funcionario token if no user found
  if (!user) {
    try {
      const funcToken = opts.req.cookies?.funcionario_token;
      if (funcToken) {
        const jwtModule = await import("jsonwebtoken");
        const jwt = jwtModule.default || jwtModule;
        const decoded = jwt.verify(funcToken, ENV.cookieSecret) as {
          funcionarioId: number;
          tipo: string;
        };
        if (decoded.tipo === "funcionario") {
          const db = await getDb();
          if (db) {
            const func = await findFuncionarioById(decoded.funcionarioId);
            if (func && func.loginAtivo) {
              funcionario = func;
            }
          }
        }
      }
    } catch {
      funcionario = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    funcionario,
    tenant: createTenantAccess(user, funcionario, {
      selecionado: lerTenantSelecionado(opts.req),
    }),
  };
}
