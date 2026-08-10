import { describe, it, expect } from "vitest";
import { normalizarWhatsapp, formatarWhatsapp, linkWhatsapp } from "@shared/whatsapp";

/**
 * O `wa.me` só abre com o número em dígitos e com código do país. Qualquer
 * parêntese ou traço que escape faz o link abrir em branco — e quem digita o
 * número na ficha do funcionário digita como fala.
 */
describe("Link do WhatsApp", () => {
  it("aceita o número como a pessoa digita", () => {
    for (const entrada of ["(11) 99961-8516", "11999618516", "+55 11 99961-8516", "5511999618516"]) {
      expect(normalizarWhatsapp(entrada)).toBe("5511999618516");
    }
  });

  it("recusa o que não é telefone", () => {
    expect(normalizarWhatsapp("9999")).toBeNull();
    expect(normalizarWhatsapp("")).toBeNull();
    expect(normalizarWhatsapp(null)).toBeNull();
  });

  it("mostra formatado para quem lê", () => {
    expect(formatarWhatsapp("11999618516")).toBe("(11) 99961-8516");
    expect(formatarWhatsapp(null)).toBe("");
  });

  it("sem número, abre o WhatsApp para escolher o contato", () => {
    expect(linkWhatsapp("oi")).toBe("https://wa.me/?text=oi");
    expect(linkWhatsapp("oi", "(11) 99961-8516")).toBe("https://wa.me/5511999618516?text=oi");
  });
});
