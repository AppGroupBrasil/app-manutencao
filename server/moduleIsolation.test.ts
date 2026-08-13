import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  MODULOS,
  catalogoDoTenant,
  getModulo,
  isModuloRestrito,
  modulosPadrao,
  tenantPodeVerModulo,
  type ModuloManifest,
} from "../shared/modules/registry";
import { FUNCOES_FUNCIONARIO } from "../shared/funcoesFuncionario";
import { labelsDoSegmento } from "../shared/vocabulario";
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

  it("pacote padrão nunca inclui módulo restrito ou legado", () => {
    for (const id of modulosPadrao()) {
      const modulo = getModulo(id)!;
      expect(isModuloRestrito(modulo), id).toBe(false);
      expect(modulo.legado, id).toBeFalsy();
    }
  });

  it("toda função do portal do funcionário aponta para um módulo existente", () => {
    // A chave da permissão não é o id do módulo ("ordens" x "ordens-servico").
    // Confundir os dois já escondeu função liberada do funcionário; o mapa em
    // `FUNCOES_FUNCIONARIO.modulo` é a amarração, e ele precisa fechar com o
    // registry.
    for (const funcao of FUNCOES_FUNCIONARIO) {
      expect(getModulo(funcao.modulo), `função "${funcao.chave}"`).toBeDefined();
    }
  });

  it("o pacote padrão é o sistema de manutenção inteiro", () => {
    const pacote = modulosPadrao();

    // O que todo cliente novo encontra ligado ao entrar pela primeira vez.
    for (const id of [
      "ordens-servico",
      "calendario",
      "painel-pendencias",
      "agenda-vencimentos",
      "manutencoes",
      "vistorias",
      "checklists",
      "tarefas-agendadas",
      "quadro-atividades",
      "qrcode",
      "ocorrencias",
      "funcionarios",
      "equipes",
    ]) {
      expect(pacote, id).toContain(id);
    }

    // Especialidade existe no catálogo, mas não vem ligada.
    expect(pacote).not.toContain("leitura-medidores");
    expect(pacote).not.toContain("jardinagem");
  });

  it("o legado de condomínio não entra em pacote nem em catálogo", () => {
    // São funções de portaria e convivência do sistema de onde este código
    // veio. Voltar para a tela de um cliente de manutenção é ruído.
    const pacote = modulosPadrao();
    const catalogo = catalogoDoTenant(1).map((m) => m.id);

    for (const id of ["votacoes", "classificados", "moradores", "revistas", "caronas"]) {
      expect(pacote, id).not.toContain(id);
      expect(catalogo, id).not.toContain(id);
    }
  });

  it("o que muda por segmento é a palavra, não o pacote", () => {
    // A diferença entre segmentos passou a ser vocabulário: o sistema é o
    // mesmo, e cada unidade desliga o que não usa.
    expect(labelsDoSegmento("condominio")["vocab.gestor"]).toBe("Síndico");
    expect(labelsDoSegmento("metalurgia")["vocab.unidade"]).toBe("Planta");
    expect(labelsDoSegmento("educacional")["vocab.gestor"]).toBeUndefined();
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

  it("funcionário de várias unidades trabalha na que selecionou", async () => {
    // Supervisor de rota: o portal dele mostra o seletor de unidade, então a
    // unidade escolhida tem de valer também nas rotas que não recebem o id.
    const acesso = createTenantAccess(null, funcionarioDoTenant(5), {
      idsFornecidos: [5, 8],
      selecionado: 8,
    });

    expect(await acesso.require()).toBe(8);
    expect(await acesso.require(8)).toBe(8);
    await expect(acesso.require(9)).rejects.toMatchObject({ code: "FORBIDDEN" });
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
