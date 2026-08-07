import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  MODULOS,
  catalogoDoTenant,
  getModulo,
  isModuloRestrito,
  modulosPadraoDoSegmento,
  tenantPodeVerModulo,
  type ModuloManifest,
} from "../shared/modules/registry";
import { createTenantAccess } from "./_core/tenant";
import type { Funcionario, User } from "../drizzle/schema";

const funcionarioDoTenant = (condominioId: number) =>
  ({ id: 1, condominioId, hierarquia: "funcionario" }) as unknown as Funcionario;

describe("Registry de módulos", () => {
  it("não tem IDs duplicados", () => {
    const ids = MODULOS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo módulo restrito declara os tenants autorizados", () => {
    for (const m of MODULOS.filter(isModuloRestrito)) {
      expect(m.tenants, `módulo "${m.id}" é restrito sem lista de tenants`).toBeDefined();
      expect(m.tenants!.length).toBeGreaterThan(0);
    }
  });

  it("módulo público é visível para qualquer tenant", () => {
    const publico: ModuloManifest = {
      id: "x",
      nome: "X",
      categoria: "operacional",
      descricao: "",
    };
    expect(tenantPodeVerModulo(publico, 1)).toBe(true);
    expect(tenantPodeVerModulo(publico, 999)).toBe(true);
  });

  it("módulo restrito é invisível para tenants fora da lista", () => {
    const restrito: ModuloManifest = {
      id: "checagem-canva",
      nome: "Checagem Detalhada",
      categoria: "operacional",
      descricao: "",
      visibilidade: "restrito",
      tenants: [7],
    };
    expect(tenantPodeVerModulo(restrito, 7)).toBe(true);
    expect(tenantPodeVerModulo(restrito, 8)).toBe(false);
  });

  it("catálogo do tenant só devolve o que ele pode ver", () => {
    const catalogo = catalogoDoTenant(1);
    for (const m of catalogo) {
      expect(tenantPodeVerModulo(m, 1)).toBe(true);
    }
  });

  it("pacote de segmento nunca inclui módulo restrito", () => {
    for (const segmento of ["generico", "condominio", "metalurgia", "oficina"] as const) {
      for (const id of modulosPadraoDoSegmento(segmento)) {
        expect(isModuloRestrito(getModulo(id)!)).toBe(false);
      }
    }
  });

  it("segmentos diferentes recebem pacotes diferentes", () => {
    const condominio = modulosPadraoDoSegmento("condominio");
    const metalurgia = modulosPadraoDoSegmento("metalurgia");

    // O núcleo operacional é comum
    expect(condominio).toContain("manutencoes");
    expect(metalurgia).toContain("manutencoes");

    // O que é específico de condomínio não vai para a metalúrgica
    expect(condominio).toContain("votacoes");
    expect(metalurgia).not.toContain("votacoes");
    expect(metalurgia).not.toContain("moradores");
  });
});

describe("Acesso a tenant", () => {
  it("funcionário só enxerga o próprio tenant", async () => {
    const acesso = createTenantAccess(null, funcionarioDoTenant(5));
    expect(await acesso.ids()).toEqual([5]);
  });

  it("funcionário não acessa dados de outro tenant", async () => {
    const acesso = createTenantAccess(null, funcionarioDoTenant(5));
    await expect(acesso.assert(9)).rejects.toBeInstanceOf(TRPCError);
    await expect(acesso.require(9)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("require sem input devolve o único tenant do funcionário", async () => {
    const acesso = createTenantAccess(null, funcionarioDoTenant(5));
    expect(await acesso.require()).toBe(5);
    expect(await acesso.require(5)).toBe(5);
  });

  it("identidade sem tenant é rejeitada", async () => {
    const acesso = createTenantAccess(null, null);
    expect(await acesso.ids()).toEqual([]);
    await expect(acesso.require()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("usuário comum não é tratado como master", () => {
    const user = { id: 1, hierarquia: "admin", role: "sindico" } as unknown as User;
    expect(createTenantAccess(user, null).isMaster()).toBe(false);
  });

  it("admin_master é reconhecido como master", () => {
    const user = { id: 1, hierarquia: "admin_master", role: "master" } as unknown as User;
    expect(createTenantAccess(user, null).isMaster()).toBe(true);
  });
});
