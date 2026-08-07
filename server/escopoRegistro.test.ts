import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TenantAccess } from "./_core/tenant";

/**
 * Escopo por registro: o id recebido tem de pertencer a uma organização do
 * usuário. É o que impede ler a vistoria de outro cliente adivinhando o número
 * em `getById({ id })`.
 */

// tenant de cada linha, por tabela: { tabela: { id: condominioId } }
let linhas: Record<string, Record<number, number>> = {};
// filhos: { tabela: { id: idDoPai } }
let filhos: Record<string, Record<number, number>> = {};
let bancoFora = false;
// ids pedidos no último where (o fake não interpreta a condição)
let idsConsultados: number[] = [];

const nomeDaTabela = (t: any) => t?.__nome ?? "";

vi.mock("./db", () => {
  const db = {
    select: (_cols?: unknown) => {
      let tabela = "";
      let paiDe: string | null = null;

      const builder: any = {
        from(t: any) {
          tabela = nomeDaTabela(t);
          return builder;
        },
        innerJoin(pai: any, _cond: unknown) {
          paiDe = nomeDaTabela(pai);
          return builder;
        },
        where(_cond: unknown) {
          const linhasEncontradas = idsConsultados
            .map((id) => {
              if (paiDe) {
                const idPai = filhos[tabela]?.[id];
                return idPai === undefined ? undefined : linhas[paiDe]?.[idPai];
              }
              return linhas[tabela]?.[id];
            })
            .filter((t) => t !== undefined)
            .map((tenant) => ({ tenant }));
          return Promise.resolve(linhasEncontradas);
        },
      };
      return builder;
    },
  };

  return {
    getDb: async () => (bancoFora ? null : db),
    requireDb: async () => db,
  };
});

const { direto, escopoPorRegistro, via } = await import("./_core/escopoRegistro");

const vistorias = { __nome: "vistorias", id: {}, condominioId: {} } as any;
const vistoriaImagens = { __nome: "vistoriaImagens", id: {}, vistoriaId: {} } as any;
const fotos = { __nome: "fotos", id: {}, albumId: {} } as any;

/** Usuário com as organizações informadas. */
function tenantCom(ids: number[], master = false): TenantAccess {
  return {
    ids: async () => ids,
    require: async () => ids[0],
    assert: async () => undefined,
    isMaster: () => master,
  };
}

describe("Escopo por registro", () => {
  beforeEach(() => {
    bancoFora = false;
    linhas = { vistorias: { 10: 1, 20: 2, 30: 9 } };
    filhos = { vistoriaImagens: { 500: 10, 600: 20 }, fotos: { 700: 10 } };
    idsConsultados = [];
  });

  const verificar = escopoPorRegistro(
    { id: direto(vistorias), vistoriaId: direto(vistorias) },
    { removeImagem: { id: via(vistoriaImagens, "vistoriaId", vistorias) } },
  );

  const chamar = (tenant: TenantAccess, caminho: string, input: Record<string, unknown>) => {
    // O fake não lê a condição SQL; declaramos os ids que o middleware vai pedir.
    const coletados = new Set<number>();
    for (const v of Object.values(input)) {
      if (typeof v === "number") coletados.add(v);
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === "object") {
            for (const iv of Object.values(item)) {
              if (typeof iv === "number") coletados.add(iv);
            }
          }
        }
      }
    }
    idsConsultados = [...coletados];
    return verificar(tenant, caminho, input);
  };

  it("aceita registro da própria organização", async () => {
    await expect(chamar(tenantCom([1]), "vistoria.getById", { id: 10 })).resolves.toBeUndefined();
  });

  it("recusa registro de organização de outro cliente", async () => {
    await expect(chamar(tenantCom([1]), "vistoria.getById", { id: 20 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("síndico com várias organizações acessa registros de todas elas", async () => {
    // Organização ativa é a 1, mas o registro 30 é da organização 9 — também dele.
    await expect(
      chamar(tenantCom([1, 9]), "vistoria.getById", { id: 30 }),
    ).resolves.toBeUndefined();
  });

  it("aplica o mesmo escopo a campos de parentesco", async () => {
    await expect(
      chamar(tenantCom([1]), "vistoria.getImagens", { vistoriaId: 20 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("resolve registro filho pelo pai", async () => {
    await expect(
      chamar(tenantCom([1]), "vistoria.removeImagem", { id: 500 }),
    ).resolves.toBeUndefined();

    await expect(
      chamar(tenantCom([1]), "vistoria.removeImagem", { id: 600 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("verifica ids dentro de arrays (reorder e afins)", async () => {
    const porArray = escopoPorRegistro({ id: via(fotos, "albumId", vistorias) });

    idsConsultados = [700];
    await expect(
      porArray(tenantCom([1]), "foto.reorder", { fotos: [{ id: 700, ordem: 1 }] }),
    ).resolves.toBeUndefined();

    idsConsultados = [700];
    await expect(
      porArray(tenantCom([2]), "foto.reorder", { fotos: [{ id: 700, ordem: 1 }] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("registro inexistente segue para o handler em vez de virar FORBIDDEN", async () => {
    await expect(chamar(tenantCom([1]), "vistoria.getById", { id: 999 })).resolves.toBeUndefined();
  });

  it("campo ausente ou não numérico é ignorado", async () => {
    await expect(
      chamar(tenantCom([1]), "vistoria.list", { condominioId: 1 }),
    ).resolves.toBeUndefined();
    await expect(
      chamar(tenantCom([1]), "vistoria.getById", { id: "10" }),
    ).resolves.toBeUndefined();
  });

  it("banco fora não vira erro de permissão", async () => {
    bancoFora = true;
    await expect(chamar(tenantCom([1]), "vistoria.getById", { id: 20 })).resolves.toBeUndefined();
  });

  it("admin_master não é barrado", async () => {
    await expect(
      chamar(tenantCom([1], true), "vistoria.getById", { id: 20 }),
    ).resolves.toBeUndefined();
  });

  it("override por caminho completo tem prioridade sobre o nome", async () => {
    const porCaminho = escopoPorRegistro(
      { id: direto(vistorias) },
      { "foto.delete": { id: via(vistoriaImagens, "vistoriaId", vistorias) } },
    );

    // Em "foto.delete", 600 é a imagem cujo pai (20) é de outro cliente
    idsConsultados = [600];
    await expect(porCaminho(tenantCom([1]), "foto.delete", { id: 600 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    // Em "album.delete", 600 é lido como id da tabela principal (não existe)
    idsConsultados = [600];
    await expect(
      porCaminho(tenantCom([1]), "album.delete", { id: 600 }),
    ).resolves.toBeUndefined();
  });
});

describe("Validação de configuração no carregamento", () => {
  it("recusa direto() em tabela sem condominioId", () => {
    const semTenant = { __nome: "votacoes", id: {} } as any;
    expect(() => direto(semTenant)).toThrow(/condominioId/);
  });

  it("recusa via() com pai sem condominioId", () => {
    const filho = { __nome: "opcoesVotacao", id: {}, votacaoId: {} } as any;
    const paiSemTenant = { __nome: "votacoes", id: {} } as any;
    expect(() => via(filho, "votacaoId", paiSemTenant)).toThrow(/condominioId/);
  });

  it("recusa via() com coluna de ligação inexistente", () => {
    const filho = { __nome: "fotos", id: {}, albumId: {} } as any;
    const pai = { __nome: "albuns", id: {}, condominioId: {} } as any;
    expect(() => via(filho, "colunaQueNaoExiste", pai)).toThrow(/coluna/);
  });
});
