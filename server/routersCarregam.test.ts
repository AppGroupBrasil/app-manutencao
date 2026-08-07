import { describe, it, expect } from "vitest";

/**
 * Carrega o router raiz de verdade.
 *
 * `direto()` e `via()` validam a configuração no carregamento do módulo, então
 * este teste transforma um erro de mapeamento de escopo (tabela sem
 * `condominioId`, coluna de ligação inexistente) em falha de CI, em vez de um
 * 500 na primeira chamada em produção.
 */
describe("Carregamento dos routers", () => {
  it("monta o appRouter sem erro de configuração de escopo", async () => {
    const mod = await import("./routers");
    expect(mod.appRouter).toBeDefined();
  });

  it("expõe as rotas dos módulos convertidos", async () => {
    const { appRouter } = await import("./routers");
    const rotas = Object.keys(appRouter._def.procedures ?? {});

    for (const esperada of [
      "vistoria.getById",
      "manutencao.getById",
      "ocorrencia.getById",
      "checklist.getById",
      "ordensServico.getById",
      "timeline.obter",
      "system.bootstrap",
      "funcoesCondominio.listar",
    ]) {
      expect(rotas, `rota ausente: ${esperada}`).toContain(esperada);
    }
  });
});
