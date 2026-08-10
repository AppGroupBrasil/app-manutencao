import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { carregarImagemParaPdf, formatoDaImagem } from "./_core/imagemPdf";

/**
 * A O.S. com foto derrubava o PDF inteiro com "Invalid URL": a url gravada é um
 * caminho do disco, e o gerador pedia por HTTP. Nas outras funções o mesmo erro
 * era engolido e a foto virava "Imagem indisponível".
 */
describe("Imagem para PDF", () => {
  const arquivo = path.resolve(process.cwd(), "uploads", "teste-pdf.jpg");

  it("lê a foto guardada no disco do servidor", async () => {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, Buffer.from("conteudo-de-teste"));

    const buffer = await carregarImagemParaPdf("/uploads/teste-pdf.jpg");
    expect(buffer?.toString()).toBe("conteudo-de-teste");

    fs.unlinkSync(arquivo);
  });

  it("devolve nulo em vez de lançar quando a url não presta", async () => {
    expect(await carregarImagemParaPdf("/uploads/nao-existe.jpg")).toBeNull();
    expect(await carregarImagemParaPdf("caminho-solto.jpg")).toBeNull();
    expect(await carregarImagemParaPdf("")).toBeNull();
    expect(await carregarImagemParaPdf(null)).toBeNull();
  });

  it("recusa subir de pasta", async () => {
    expect(await carregarImagemParaPdf("/uploads/../../etc/passwd")).toBeNull();
  });

  it("reconhece o formato pela extensão", () => {
    expect(formatoDaImagem("/uploads/a/b.png")).toBe("PNG");
    expect(formatoDaImagem("/uploads/a/b.jpg")).toBe("JPEG");
  });
});
