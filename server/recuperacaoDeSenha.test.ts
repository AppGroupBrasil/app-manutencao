import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Esqueci minha senha: o e-mail com o link tem de sair.
 *
 * O fluxo estava mudo — a tela dizia "solicitação enviada" e nada era enviado,
 * nem para o gestor (que a rota nem procurava) nem para o funcionário (cujo
 * link ia por notificação para o administrador repassar à mão). Os testes
 * cobrem quem recebe o link, o endereço que vai nele e o que acontece com um
 * e-mail que não existe — que não pode virar resposta diferente, sob pena de
 * entregar a lista de quem usa o sistema.
 */

const enviados: { destinatario: string; nome: string; linkRecuperacao: string }[] = [];

vi.mock("./_core/email", () => ({
  isEmailConfigured: () => true,
  sendEmail: async () => ({ success: true }),
  sendRecuperacaoSenhaEmail: async (params: {
    destinatario: string;
    nome: string;
    linkRecuperacao: string;
  }) => {
    enviados.push(params);
    return { success: true };
  },
}));

/** Conta de gestor e de funcionário que o teste controla. */
let gestor: Record<string, unknown> | null;
let funcionario: Record<string, unknown> | null;
/** Últimos valores gravados, por tabela. */
let gravados: { tabela: string; valores: Record<string, unknown> }[];

vi.mock("./_core/funcionarioCompat", () => ({
  findFuncionarioByLoginEmail: async (email: string) =>
    funcionario && funcionario.loginEmail === email ? funcionario : null,
  findFuncionarioByResetToken: async (token: string) =>
    funcionario && funcionario.resetToken === token ? funcionario : null,
}));

const { users, funcionarios } = await import("../drizzle/schema");

/**
 * Textos que a condição levou como parâmetro — o e-mail ou o token procurado.
 *
 * Sem olhar isto, o dublê devolveria o gestor para qualquer consulta, e os
 * testes passariam mesmo com a rota procurando pela conta errada.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function parametrosDe(condicao: any): string[] {
  const achados: string[] = [];
  const visitar = (no: any, profundidade = 0) => {
    if (no == null || profundidade > 6) return;
    if (typeof no === "string") return void achados.push(no);
    // O drizzle guarda o valor ora solto, ora dentro de `value`, ora embrulhado
    // num objeto String — daí a varredura em vez de um caminho fixo.
    if (no instanceof String) return void achados.push(String(no));
    if (Array.isArray(no)) return no.forEach((item) => visitar(item, profundidade + 1));
    if (typeof no !== "object") return;
    visitar(no.queryChunks, profundidade + 1);
    visitar(no.value, profundidade + 1);
  };
  visitar(condicao);
  return achados;
}

function fakeDb() {
  const encadeavel = (linhas: unknown[]) => {
    const p: any = Promise.resolve(linhas);
    p.limit = () => Promise.resolve(linhas);
    return p;
  };

  const ehOGestor = (procurados: string[]) =>
    !!gestor &&
    procurados.some(
      (v) => v === String(gestor!.email).toLowerCase() || (!!gestor!.resetToken && v === gestor!.resetToken),
    );

  return {
    select: () => ({
      from: (tabela: unknown) => ({
        where: (condicao: unknown) =>
          encadeavel(tabela === users && ehOGestor(parametrosDe(condicao)) ? [gestor] : []),
      }),
    }),
    update: (tabela: unknown) => ({
      set: (valores: Record<string, unknown>) => ({
        where: async () => {
          gravados.push({ tabela: tabela === users ? "users" : "funcionarios", valores });
          // O registro em memória acompanha a gravação: o teste seguinte lê o
          // token recém-criado, como a rota de redefinir faria.
          const alvo = tabela === users ? gestor : funcionario;
          if (alvo) Object.assign(alvo, valores);
        },
      }),
    }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { authRouter } = await import("./modules/auth/router");
const { createCallerFactory } = await import("./_core/trpc");

/** Cada teste com um IP próprio: são 3 pedidos por hora e por endereço. */
let contadorIp = 0;
function chamador() {
  contadorIp += 1;
  return createCallerFactory(authRouter)({
    req: { headers: { "x-forwarded-for": `10.0.0.${contadorIp}` } },
    res: { cookie: () => undefined },
    user: null,
    funcionario: null,
  } as never);
}

const linkDoUltimoEmail = () => enviados[enviados.length - 1]?.linkRecuperacao ?? "";

beforeEach(() => {
  enviados.length = 0;
  gravados = [];
  gestor = {
    id: 1,
    openId: "local_abc",
    name: "Francisco Lima",
    email: "francisco@asatransforma.org.br",
    resetToken: null,
    resetTokenExpira: null,
  };
  funcionario = {
    id: 7,
    nome: "Ana",
    email: "ana@ex.com",
    loginEmail: "ana@ex.com",
    resetToken: null,
    resetTokenExpira: null,
  };
});

describe("solicitar recuperação", () => {
  it("envia o link para o gestor, com o token que ficou gravado", async () => {
    await chamador().solicitarRecuperacao({ email: "francisco@asatransforma.org.br" });

    expect(enviados).toHaveLength(1);
    expect(enviados[0].destinatario).toBe("francisco@asatransforma.org.br");
    // O link tem de abrir a tela de cadastrar a senha, com o token no caminho.
    expect(linkDoUltimoEmail()).toContain("/redefinir-senha/");
    expect(linkDoUltimoEmail()).toContain(String(gestor!.resetToken));
    expect(gravados[0].tabela).toBe("users");
    expect(gravados[0].valores.resetTokenExpira).toBeInstanceOf(Date);
  });

  it("aceita o e-mail digitado com maiúsculas", async () => {
    // No celular a primeira letra sobe sozinha; recusar por isso seria dizer
    // "este e-mail não existe" para quem está com o e-mail certo.
    await chamador().solicitarRecuperacao({ email: "Francisco@asatransforma.org.br" });

    expect(enviados).toHaveLength(1);
  });

  it("envia também para o funcionário, que fica em outra tabela", async () => {
    await chamador().solicitarRecuperacao({ email: "ana@ex.com" });

    expect(enviados[0].destinatario).toBe("ana@ex.com");
    expect(gravados[0].tabela).toBe("funcionarios");
  });

  it("e-mail que não existe não envia nada e responde igual", async () => {
    const resposta = await chamador().solicitarRecuperacao({ email: "ninguem@ex.com" });

    expect(enviados).toHaveLength(0);
    expect(resposta.message).toMatch(/se o e-mail estiver cadastrado/i);
  });
});

describe("cadastrar a nova senha", () => {
  it("troca a senha do funcionário pelo token do e-mail dele", async () => {
    await chamador().solicitarRecuperacao({ email: "ana@ex.com" });
    const token = String(funcionario!.resetToken);

    const resultado = await chamador().redefinirSenha({ token, novaSenha: "123456" });

    expect(resultado.success).toBe(true);
    const gravacao = gravados[gravados.length - 1];
    expect(gravacao.tabela).toBe("funcionarios");
    // Token queimado: o link do e-mail não serve duas vezes.
    expect(gravacao.valores.resetToken).toBeNull();
    expect(gravacao.valores.senha).not.toBe("123456");
  });

  it("recusa token vencido", async () => {
    funcionario!.resetToken = "token-velho";
    funcionario!.resetTokenExpira = new Date(Date.now() - 60_000);

    await expect(
      chamador().redefinirSenha({ token: "token-velho", novaSenha: "123456" }),
    ).rejects.toThrow(/expirado/i);
  });

  it("recusa senha fora da regra do sistema", async () => {
    funcionario!.resetToken = "token-bom";
    funcionario!.resetTokenExpira = new Date(Date.now() + 60_000);

    await expect(
      chamador().redefinirSenha({ token: "token-bom", novaSenha: "abcdef" }),
    ).rejects.toThrow();
  });
});
