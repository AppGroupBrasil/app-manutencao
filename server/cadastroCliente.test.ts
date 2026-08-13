import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cadastro de quem chega sozinho.
 *
 * O que este teste protege: a conta tem de nascer com organização e vínculo de
 * chefe. Antes desta versão a rota criava só o usuário — ele entrava, não era
 * dono de nada, e criar organização é ato de gestor-chefe: conta inútil, e a
 * pessoa desistindo na primeira tela.
 *
 * Também fixa o prazo do teste, que é o que separa quem paga de quem está
 * avaliando.
 */

const gravado: Record<string, unknown[]> = {};

vi.mock("./_core/seedUnidade", () => ({
  prepararUnidade: async () => undefined,
}));

vi.mock("./_core/email", () => ({
  isEmailConfigured: () => false,
  sendEmail: async () => undefined,
}));

vi.mock("./_core/sdk", () => ({
  sdk: { createSessionToken: async () => "token-de-sessao" },
}));

vi.mock("./_core/rateLimit", () => ({
  rateLimiter: { check: () => undefined },
  RATE_LIMIT_CONFIGS: { register: {}, login: {} },
  getClientIp: () => "127.0.0.1",
}));

const { users, condominios, usuarioCondominios } = await import("../drizzle/schema");

/** E-mails já existentes; o teste ajusta para simular conflito. */
let emailsExistentes: { id: number }[] = [];

function fakeDb() {
  const registrar = (tabela: unknown, valores: Record<string, unknown>) => {
    const nome =
      tabela === users ? "users" : tabela === condominios ? "condominios" : "vinculos";
    (gravado[nome] = gravado[nome] ?? []).push(valores);
  };

  const inserir = (tabela: unknown) => ({
    values: (valores: Record<string, unknown>) => {
      registrar(tabela, valores);
      const linha =
        tabela === users ? { id: 10, ...valores } : { id: 20, ...valores };
      const p: any = Promise.resolve([linha]);
      p.returning = () => Promise.resolve([linha]);
      return p;
    },
  });

  return {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => emailsExistentes }),
      }),
    }),
    insert: inserir,
    transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ insert: inserir }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { authRouter } = await import("./modules/auth/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");
const { DIAS_DE_TESTE } = await import("./_core/teste");

function visitante() {
  return createCallerFactory(authRouter)({
    req: { headers: {} },
    res: { cookie: () => undefined },
    user: null,
    funcionario: null,
    tenant: createTenantAccess(null, null, { idsFornecidos: [] }),
  } as never);
}

const DADOS = {
  nome: "Maria Souza",
  email: "maria@empresa.com.br",
  senha: "123456",
  organizacao: "Condomínio Vila Nova",
  segmento: "condominio" as const,
};

beforeEach(() => {
  for (const chave of Object.keys(gravado)) delete gravado[chave];
  emailsExistentes = [];
});

describe("cadastro com teste grátis", () => {
  it("cria conta, organização e vínculo de chefe", async () => {
    await visitante().registar(DADOS);

    const conta = gravado.users[0] as Record<string, unknown>;
    const org = gravado.condominios[0] as Record<string, unknown>;
    const vinculo = gravado.vinculos[0] as Record<string, unknown>;

    expect(conta.email).toBe(DADOS.email);
    expect(conta.role).toBe("sindico");
    // Nunca hierarquia de plataforma: ela enxergaria a base inteira.
    expect(conta.hierarquia).toBe("funcionario");
    expect(org.nome).toBe(DADOS.organizacao);
    expect(vinculo).toMatchObject({ papel: "chefe", ativo: true });
  });

  it("guarda a senha em hash, nunca em texto", async () => {
    await visitante().registar(DADOS);

    const conta = gravado.users[0] as Record<string, string>;
    expect(conta.senha).not.toBe(DADOS.senha);
    expect(conta.senha.startsWith("$2")).toBe(true);
  });

  it("marca o fim do teste em sete dias", async () => {
    const antes = Date.now();
    const res = await visitante().registar(DADOS);

    const conta = gravado.users[0] as { trialAte: Date };
    const dias = Math.round((conta.trialAte.getTime() - antes) / 86_400_000);
    expect(dias).toBe(DIAS_DE_TESTE);
    expect(res.trialAte).toEqual(conta.trialAte);
  });

  it("aplica o vocabulário do segmento escolhido", async () => {
    await visitante().registar(DADOS);

    const org = gravado.condominios[0] as { labels: Record<string, string> };
    expect(org.labels["vocab.gestor"]).toBe("Síndico");
  });

  it("recusa e-mail já cadastrado, sem criar organização", async () => {
    emailsExistentes = [{ id: 1 }];

    await expect(visitante().registar(DADOS)).rejects.toThrow(/já está cadastrado/i);
    expect(gravado.condominios).toBeUndefined();
  });
});
