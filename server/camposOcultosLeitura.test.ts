import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A leitura dos blocos escondidos, que três lugares usam.
 *
 * O `bootstrap` é a primeira chamada da aplicação — sem ele não há menu, rota
 * nem tela. Uma consulta quebrada aqui deixaria o sistema inteiro inacessível
 * por causa de um campo de formulário, então o que este teste protege acima de
 * tudo é a queda silenciosa: falhou, devolve vazio e a ordem aparece completa,
 * como era antes desta função existir.
 */

/** Liga o modo "o banco está quebrado" para o caso da coluna que não existe. */
let bancoQuebrado = false;
/** Nulo simula a linha de configuração que nunca foi criada. */
let campos: string[] | null;
/** Falso simula banco indisponível. */
let temBanco = true;

vi.mock("./db", () => ({
  getDb: async () =>
    temBanco
      ? {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: async () => {
                  if (bancoQuebrado) {
                    throw new Error('column "camposOcultos" does not exist');
                  }
                  return campos === null ? [] : [{ campos }];
                },
              }),
            }),
          }),
        }
      : null,
}));

const { camposOcultosDaUnidade } = await import("./_core/camposOcultosOs");

beforeEach(() => {
  bancoQuebrado = false;
  campos = null;
  temBanco = true;
  // O erro é registrado de propósito; sem isto ele suja a saída do teste.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("leitura dos campos ocultos", () => {
  it("devolve o que está gravado", async () => {
    campos = ["fotos", "local"];

    expect(await camposOcultosDaUnidade(1)).toEqual(["fotos", "local"]);
  });

  it("descarta id que saiu do catálogo", async () => {
    // Bloco removido do produto continua gravado nas contas antigas.
    campos = ["fotos", "bloco-aposentado"];

    expect(await camposOcultosDaUnidade(1)).toEqual(["fotos"]);
  });

  it("unidade sem configuração não esconde nada", async () => {
    campos = null;

    expect(await camposOcultosDaUnidade(1)).toEqual([]);
  });

  it("coluna faltando não derruba quem chamou", async () => {
    // O cenário real: banco que ficou para trás da migração, ou restauração de
    // um backup anterior a ela. Sem o `catch`, o bootstrap inteiro falharia e
    // ninguém entraria no sistema.
    bancoQuebrado = true;

    await expect(camposOcultosDaUnidade(1)).resolves.toEqual([]);
  });

  it("sem banco, devolve vazio em vez de explodir", async () => {
    temBanco = false;

    expect(await camposOcultosDaUnidade(1)).toEqual([]);
  });

  it("unidade zero nem consulta", async () => {
    // Tela ainda carregando passa 0; consultar seria buscar configuração de
    // uma unidade que não existe.
    bancoQuebrado = true;

    expect(await camposOcultosDaUnidade(0)).toEqual([]);
  });
});
