import { describe, it, expect } from "vitest";
import { resolverVocabulario, VOCABULARIO_PADRAO } from "@shared/vocabulario";

/**
 * O vocabulário é o que permite o mesmo sistema atender uma rede de creches e
 * uma metalúrgica sem tela duplicada. Se a resolução quebrar, todo cliente
 * volta a ver o vocabulário da ASA.
 */
describe("Vocabulário por cliente", () => {
  it("sem sobrescrita, devolve o padrão", () => {
    expect(resolverVocabulario(null)).toEqual(VOCABULARIO_PADRAO);
    expect(resolverVocabulario({})).toEqual(VOCABULARIO_PADRAO);
  });

  it("sobrescreve só o termo informado", () => {
    const v = resolverVocabulario({ "vocab.unidade": "Planta", "vocab.setor": "Célula" });
    expect(v.unidade).toBe("Planta");
    expect(v.setor).toBe("Célula");
    expect(v.ocorrencia).toBe(VOCABULARIO_PADRAO.ocorrencia);
  });

  it("ignora chave fora do vocabulário e valor vazio", () => {
    const v = resolverVocabulario({
      "menu.inspections": "Inspeções",
      "vocab.inexistente": "Nada",
      "vocab.unidade": "   ",
    });
    expect(v).toEqual(VOCABULARIO_PADRAO);
  });
});
