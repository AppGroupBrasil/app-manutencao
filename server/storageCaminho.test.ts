import { describe, it, expect } from "vitest";
import { normalizeKey } from "./storage";

/**
 * A chave do arquivo é montada com a pasta que o client escolhe. Se `..`
 * sobreviver, o `path.join` do armazenamento local grava fora de `uploads/` —
 * em cima do próprio código da aplicação, no container.
 */
describe("Chave de arquivo do armazenamento", () => {
  it("tira a barra inicial", () => {
    expect(normalizeKey("/uploads/1/a.jpg")).toBe("uploads/1/a.jpg");
  });

  it("descarta segmentos de subida", () => {
    expect(normalizeKey("../../dist/index.js")).toBe("dist/index.js");
    expect(normalizeKey("uploads/../../etc/passwd")).toBe("uploads/etc/passwd");
  });

  it("normaliza barra invertida e barras repetidas", () => {
    expect(normalizeKey("uploads\\\\1//a.jpg")).toBe("uploads/1/a.jpg");
  });

  it("recusa caminho que sobra vazio", () => {
    expect(() => normalizeKey("../..")).toThrow();
    expect(() => normalizeKey("/")).toThrow();
  });
});
