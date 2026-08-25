import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ocultar blocos da O.S. por cliente.
 *
 * A escolha do gestor vale para todas as unidades dele — é o que evita repetir
 * o ajuste quinze vezes na rede da ASA. O risco mora exatamente aí: o alcance
 * do `admin_master` é a base inteira, e gravar sem recorte esconderia o campo
 * para todos os clientes da plataforma de uma vez, sem ninguém pedir.
 *
 * Por isso o teste cobre as duas metades da regra: replica nas unidades do
 * mesmo dono, e não encosta nas de outro.
 */

vi.mock("./_core/modules", () => ({
  isModuloHabilitado: async () => true,
  getModulosHabilitados: async () => ["ordens-servico"],
  getCatalogoVisivel: () => [],
  invalidarCacheModulos: () => undefined,
  seedModulosDoTenant: async () => 0,
  setModuloHabilitado: async () => undefined,
  getSegmentoDoTenant: async () => "generico",
}));

vi.mock("./_core/gestorMaster", () => ({ ehGestorMaster: async () => true }));

vi.mock("./_core/permissaoFuncionario", () => ({
  assegurarPermissaoFuncionario: async () => undefined,
  assegurarExclusaoFuncionario: async () => undefined,
}));

const { osConfiguracoes, condominios, ordensServico, osImagens } = await import(
  "../drizzle/schema"
);

/**
 * As unidades do cliente do teste: a 1 (onde a O.S. é aberta) e a 2.
 *
 * A unidade 9 existe na base e é de outro dono — nunca aparece nesta lista,
 * que é o resultado do recorte por `sindicoId` que a rota faz.
 */
const IRMAS = [{ id: 1 }, { id: 2 }];

/**
 * A ordem que a página pública devolve pelo QR.
 *
 * Tem preenchido tudo o que pode ser escondido: é assim que o teste percebe se
 * algum campo escapou para dentro da resposta.
 */
const ORDEM_PUBLICA = {
  id: 50,
  condominioId: 1,
  protocolo: "OS-260825-0001",
  titulo: "Trocar lâmpadas do pátio",
  descricao: "Três lâmpadas queimadas.",
  endereco: "Bloco A, pátio coberto",
  solicitanteNome: "Coordenadora Marta",
  dataAbertura: "2026-08-20",
  shareToken: "tok-123",
  chatToken: "segredo-do-chat",
  categoriaId: 1,
  prioridadeId: 1,
  statusId: 1,
};

/** O que a rota gravou, por unidade — é o que o teste inspeciona. */
let gravados: { condominioId: number; campos: unknown }[];
/** Quantas linhas de `os_configuracoes` já existem antes da chamada. */
let configuracaoJaExiste: boolean;
/** A lista que a leitura encontra gravada. */
let listaGravada: string[] | null;

function fakeDb() {
  /**
   * Uma promessa encadeável.
   *
   * `semLimite` é o que a consulta sem `.limit()` recebe; `comLimite`, a que
   * termina em `.limit(1)`. É por aí que o fake separa as duas consultas a
   * `condominios` — a dona da unidade aberta e as irmãs dela — sem precisar
   * ler a condição, que é um objeto circular do Drizzle.
   */
  const encadeavel = (semLimite: unknown[], comLimite = semLimite) => {
    const p: any = Promise.resolve(semLimite);
    p.limit = () => Promise.resolve(comLimite);
    // A rota pública ordena imagens e linha do tempo antes de responder.
    p.orderBy = () => encadeavel(semLimite, comLimite);
    return p;
  };

  return {
    select: () => ({
      from: (tabela: unknown) => ({
        where: () => {
          if (tabela === condominios) {
            // Sem `.limit`: as irmãs. Com `.limit(1)`: a dona da unidade.
            return encadeavel(IRMAS, [{ sindicoId: 1 }]);
          }
          if (tabela === osConfiguracoes) {
            const linha = { id: 5, campos: listaGravada };
            return encadeavel(configuracaoJaExiste ? [linha] : [], configuracaoJaExiste ? [linha] : []);
          }
          if (tabela === ordensServico) {
            return encadeavel([ORDEM_PUBLICA], [ORDEM_PUBLICA]);
          }
          if (tabela === osImagens) {
            return encadeavel([{ id: 1, url: "foto.jpg", tipo: "antes" }]);
          }
          return encadeavel([]);
        },
        limit: () => encadeavel([]),
        // O middleware que confere o prazo do cliente faz um join antes de
        // qualquer rota. Sem isto ele falha e enche a saída do teste de erro —
        // um ruído que esconderia a falha de verdade no dia em que houvesse
        // uma.
        innerJoin: () => ({ where: () => encadeavel([]) }),
      }),
    }),
    insert: (tabela: unknown) => ({
      values: (valores: Record<string, unknown>) => {
        if (tabela === osConfiguracoes) {
          gravados.push({
            condominioId: Number(valores.condominioId),
            campos: valores.camposOcultos,
          });
        }
        const p: any = Promise.resolve([{ id: 1 }]);
        p.returning = () => Promise.resolve([{ id: 1, ...valores }]);
        return p;
      },
    }),
    update: (tabela: unknown) => ({
      set: (valores: Record<string, unknown>) => ({
        where: async () => {
          // O id da unidade não sai da condição sem ler objeto circular; o que
          // importa aqui é quantas gravações houve e com que lista.
          if (tabela === osConfiguracoes) {
            gravados.push({ condominioId: -1, campos: valores.camposOcultos });
          }
        },
      }),
    }),
  };
}

vi.mock("./db", () => ({ getDb: async () => fakeDb() }));

const { osRouter } = await import("./modules/os/router");
const { createCallerFactory } = await import("./_core/trpc");
const { createTenantAccess } = await import("./_core/tenant");

/** Gestor com alcance sobre as unidades que receber. */
function comoGerente(alcance: number[] = [1, 2]) {
  const user = { id: 1, hierarquia: "gestor", role: "sindico", name: "Gerente" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user,
    funcionario: null,
    tenant: createTenantAccess(user, null, { idsFornecidos: alcance }),
  } as never);
}

/** Funcionário: vê a lista, mas não escolhe. */
function comoFuncionario() {
  const funcionario = { id: 7, condominioId: 1, nome: "Ana" } as never;
  return createCallerFactory(osRouter)({
    req: { headers: {} },
    res: {},
    user: null,
    funcionario,
    tenant: createTenantAccess(null, funcionario, { idsFornecidos: [1] }),
  } as never);
}

beforeEach(() => {
  gravados = [];
  configuracaoJaExiste = false;
  listaGravada = null;
});

describe("campos ocultos da O.S.", () => {
  it("repete a escolha em todas as unidades do mesmo cliente", async () => {
    const res = await comoGerente().setCamposOcultos({
      condominioId: 1,
      campos: ["responsaveis"],
    });

    expect(res.unidades).toBe(2);
    expect(gravados.map((g) => g.condominioId).sort()).toEqual([1, 2]);
    for (const linha of gravados) {
      expect(linha.campos).toEqual(["responsaveis"]);
    }
  });

  it("não encosta na unidade de outro cliente, nem com alcance de master", async () => {
    // O `admin_master` enxerga a base inteira: sem o recorte por dono, a
    // unidade 9 entraria junto e o campo sumiria para um cliente que não
    // pediu nada. Ela não está entre as irmãs, então não pode ser gravada.
    const res = await comoGerente([1, 2, 9]).setCamposOcultos({
      condominioId: 1,
      campos: ["fotos"],
    });

    expect(res.unidades).toBe(2);
    expect(gravados.map((g) => g.condominioId)).not.toContain(9);
  });

  it("grava só onde o gestor alcança", async () => {
    // Alcance de uma unidade só: a irmã existe, mas não é dele.
    const res = await comoGerente([1]).setCamposOcultos({
      condominioId: 1,
      campos: ["local"],
    });

    expect(res.unidades).toBe(1);
    expect(gravados.map((g) => g.condominioId)).toEqual([1]);
  });

  it("atualiza a linha que já existe em vez de criar outra", async () => {
    configuracaoJaExiste = true;

    await comoGerente([1]).setCamposOcultos({ condominioId: 1, campos: ["local"] });

    expect(gravados).toHaveLength(1);
    expect(gravados[0].campos).toEqual(["local"]);
  });

  it("guarda uma vez só quando o mesmo bloco vem repetido", async () => {
    await comoGerente([1]).setCamposOcultos({
      condominioId: 1,
      campos: ["fotos", "fotos", "local"],
    });

    expect(gravados[0].campos).toEqual(["fotos", "local"]);
  });

  it("recusa bloco que não existe no catálogo", async () => {
    await expect(
      comoGerente().setCamposOcultos({
        condominioId: 1,
        // Título não é ocultável de propósito: sem ele o servidor recusa a
        // ordem, e escondê-lo seria oferecer um jeito de travar a tela.
        campos: ["titulo"],
      }),
    ).rejects.toThrow();
  });

  it("funcionário não escolhe o que o cliente vê", async () => {
    await expect(
      comoFuncionario().setCamposOcultos({ condominioId: 1, campos: ["fotos"] }),
    ).rejects.toThrow();

    expect(gravados).toHaveLength(0);
  });

  it("a leitura ignora id que saiu do produto", async () => {
    configuracaoJaExiste = true;
    listaGravada = ["fotos", "bloco-que-nao-existe-mais"];

    const lista = await comoGerente([1]).camposOcultos({ condominioId: 1 });

    expect(lista).toEqual(["fotos"]);
  });

  it("unidade sem configuração devolve lista vazia, e não erro", async () => {
    const lista = await comoGerente([1]).camposOcultos({ condominioId: 1 });

    expect(lista).toEqual([]);
  });
});

describe("página pública da O.S. pelo QR", () => {
  /** A página abre sem login: a chamada é feita sem usuário e sem funcionário. */
  const semLogin = () =>
    createCallerFactory(osRouter)({
      req: { headers: {} },
      res: {},
      user: null,
      funcionario: null,
      tenant: createTenantAccess(null, null, { idsFornecidos: [] }),
    } as never);

  it("devolve a ordem inteira quando nada está escondido", async () => {
    const os = await semLogin().getByShareToken({ token: "tok-123" });

    expect(os.descricao).toBe("Três lâmpadas queimadas.");
    expect(os.endereco).toBe("Bloco A, pátio coberto");
    expect(os.imagens).toHaveLength(1);
  });

  it("não manda para o navegador o que o cliente escondeu", async () => {
    configuracaoJaExiste = true;
    listaGravada = ["descricao", "local", "solicitante", "dataAbertura", "classificacao", "fotos"];

    const os = await semLogin().getByShareToken({ token: "tok-123" });

    // O corpo da resposta, e não só a tela: esta página é aberta por quem o
    // cliente quiser, e mandar o dado contando que o navegador não o desenhe
    // deixaria o campo a um "ver código-fonte" de distância.
    expect(os.descricao).toBeNull();
    expect(os.endereco).toBeNull();
    expect(os.solicitanteNome).toBeNull();
    expect(os.dataAbertura).toBeNull();
    expect(os.categoria).toBeNull();
    expect(os.prioridade).toBeNull();
    expect(os.imagens).toEqual([]);

    // A lista acompanha, para a tela não desenhar linha vazia no lugar.
    expect(os.camposOcultos).toContain("local");
  });

  it("o token do chat continua fora da resposta pública", async () => {
    configuracaoJaExiste = true;
    listaGravada = ["descricao"];

    const os = await semLogin().getByShareToken({ token: "tok-123" });

    // Já era assim antes desta função existir; o teste fica de guarda para o
    // dia em que alguém reescrever o `return` desta rota.
    expect(os).not.toHaveProperty("chatToken");
  });
});
