import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Enforcement de módulos com registry sintético.
 *
 * O cenário que importa: o cliente 8 tem uma linha `habilitada = true` para um
 * módulo restrito ao cliente 7 (por erro, migração antiga ou insert manual).
 * Mesmo assim ele não pode acessar.
 */

const registryFalso = {
  MODULOS: [
    { id: "manutencoes", nome: "Manutenções", categoria: "operacional", descricao: "", segmentos: ["generico", "condominio"] },
    { id: "votacoes", nome: "Votações", categoria: "interativo", descricao: "", segmentos: ["condominio"] },
    { id: "exclusivo-7", nome: "Exclusivo", categoria: "operacional", descricao: "", visibilidade: "restrito", tenants: [7] },
  ],
} as const;

vi.mock("../shared/modules/registry", () => {
  const MODULOS = registryFalso.MODULOS;
  const isModuloRestrito = (m: any) => m.visibilidade === "restrito";
  const tenantPodeVerModulo = (m: any, tenantId: number) =>
    !isModuloRestrito(m) || (m.tenants ?? []).includes(tenantId);

  return {
    MODULOS,
    isModuloRestrito,
    tenantPodeVerModulo,
    getModulo: (id: string) => MODULOS.find((m) => m.id === id),
    catalogoDoTenant: (tenantId: number) =>
      MODULOS.filter((m) => tenantPodeVerModulo(m, tenantId)),
    modulosPadraoDoSegmento: (segmento: string) =>
      MODULOS.filter(
        (m) => !isModuloRestrito(m) && ((m as any).segmentos ?? []).includes(segmento),
      ).map((m) => m.id),
    TODOS_MODULO_IDS: MODULOS.map((m) => m.id),
  };
});

// Linhas de condominio_funcoes por tenant
let linhasPorTenant: Record<number, { funcaoId: string; habilitada: boolean }[]> = {};
let segmentoPorTenant: Record<number, string | null> = {};
let bancoFora = false;

vi.mock("./db", () => {
  const resultado = (rows: unknown[]) => {
    const alvo: any = Promise.resolve(rows);
    alvo.limit = () => Promise.resolve(rows);
    return alvo;
  };

  const db = {
    select: (_cols?: unknown) => ({
      from: (tabela: any) => ({
        where: (_cond: unknown) => {
          const nome = tabela?.[Symbol.for("drizzle:Name")] ?? tabela?._?.name ?? "";
          if (String(nome).includes("condominio_funcoes")) {
            return resultado(linhasPorTenant[tenantConsultado] ?? []);
          }
          return resultado([{ segmento: segmentoPorTenant[tenantConsultado] ?? null }]);
        },
      }),
    }),
  };

  return {
    getDb: async () => (bancoFora ? null : db),
    requireDb: async () => db,
  };
});

// O fake de db não enxerga o parâmetro do `where`; o teste declara o tenant alvo.
let tenantConsultado = 0;

const { getModulosHabilitados, isModuloHabilitado, invalidarCacheModulos } = await import(
  "./_core/modules"
);

function cenario(tenantId: number, linhas: { funcaoId: string; habilitada: boolean }[], segmento?: string) {
  tenantConsultado = tenantId;
  linhasPorTenant = { [tenantId]: linhas };
  segmentoPorTenant = { [tenantId]: segmento ?? null };
  bancoFora = false;
  invalidarCacheModulos();
}

describe("Enforcement de módulos por tenant", () => {
  beforeEach(() => {
    bancoFora = false;
    invalidarCacheModulos();
  });

  it("devolve apenas os módulos com habilitada = true", async () => {
    cenario(1, [
      { funcaoId: "manutencoes", habilitada: true },
      { funcaoId: "votacoes", habilitada: false },
    ]);

    const habilitados = await getModulosHabilitados(1);
    expect(habilitados).toContain("manutencoes");
    expect(habilitados).not.toContain("votacoes");
  });

  it("módulo restrito a outro tenant fica bloqueado mesmo com linha habilitada", async () => {
    cenario(8, [
      { funcaoId: "manutencoes", habilitada: true },
      { funcaoId: "exclusivo-7", habilitada: true },
    ]);

    const habilitados = await getModulosHabilitados(8);
    expect(habilitados).toContain("manutencoes");
    expect(habilitados).not.toContain("exclusivo-7");
    expect(await isModuloHabilitado(8, "exclusivo-7")).toBe(false);
  });

  it("o tenant dono do módulo restrito consegue acessar", async () => {
    cenario(7, [{ funcaoId: "exclusivo-7", habilitada: true }]);

    expect(await isModuloHabilitado(7, "exclusivo-7")).toBe(true);
  });

  it("tenant sem configuração cai no pacote do segmento, não em tudo", async () => {
    cenario(3, [], "generico");

    const habilitados = await getModulosHabilitados(3);
    expect(habilitados).toContain("manutencoes");
    // 'votacoes' é só de condomínio — não pode vazar para um tenant genérico
    expect(habilitados).not.toContain("votacoes");
    expect(habilitados).not.toContain("exclusivo-7");
  });

  it("módulo desconhecido nunca é liberado", async () => {
    cenario(1, [{ funcaoId: "manutencoes", habilitada: true }]);

    expect(await isModuloHabilitado(1, "modulo-que-nao-existe")).toBe(false);
  });

  describe("banco indisponível", () => {
    it("não transforma falha de infra em 'módulo não disponível'", async () => {
      cenario(1, []);
      bancoFora = true;
      invalidarCacheModulos();

      // Deixa passar: o erro real aparece no handler, com mensagem correta.
      expect(await isModuloHabilitado(1, "manutencoes")).toBe(true);
    });

    it("continua bloqueando módulo restrito a outro cliente", async () => {
      cenario(8, []);
      bancoFora = true;
      invalidarCacheModulos();

      // Esta checagem é estática (registry), não depende do banco.
      expect(await isModuloHabilitado(8, "exclusivo-7")).toBe(false);
      expect(await isModuloHabilitado(7, "exclusivo-7")).toBe(true);
    });

    it("estado indeterminado não é cacheado", async () => {
      cenario(1, [{ funcaoId: "manutencoes", habilitada: true }]);
      bancoFora = true;
      invalidarCacheModulos();
      expect(await isModuloHabilitado(1, "votacoes")).toBe(true);

      // Banco volta: a resposta correta passa a valer sem esperar o TTL.
      bancoFora = false;
      expect(await isModuloHabilitado(1, "votacoes")).toBe(false);
    });
  });
});
