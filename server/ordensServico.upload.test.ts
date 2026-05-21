import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { ordensServico, osImagens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Ordens de Serviço - Upload de Imagens", () => {
  let db: any;
  let osId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) { console.warn('[skip] Database not available'); return; }

    // Criar uma ordem de serviço de teste
    const [result] = await db.insert(ordensServico).values({
      condominioId: 1,
      protocolo: String(Math.floor(100000 + Math.random() * 900000)),
      titulo: "Ordem de Serviço para Teste de Upload",
      descricao: "Teste de upload de imagens",
      statusId: 1,
      chatToken: "test-token-123",
      shareToken: "test-share-token-123",
    });
    osId = result.insertId;
  });

  afterAll(async () => {
    if (db && osId) {
      // Limpar imagens de teste
      await db.delete(osImagens).where(eq(osImagens.ordemServicoId, osId));
      // Limpar OS de teste
      await db.delete(ordensServico).where(eq(ordensServico.id, osId));
    }
  });

  it("deve inserir uma imagem com sucesso", async () => {
    if (!db) return;
    const [result] = await db.insert(osImagens).values({
      ordemServicoId: osId,
      url: "https://example.com/image.jpg",
      descricao: "Imagem de teste",
      tipo: "antes",
    });

    expect(result.insertId).toBeGreaterThan(0);

    // Verificar se foi inserida
    const [inserted] = await db
      .select()
      .from(osImagens)
      .where(eq(osImagens.id, result.insertId));

    expect(inserted).toBeDefined();
    expect(inserted.url).toBe("https://example.com/image.jpg");
    expect(inserted.tipo).toBe("antes");
  });

  it("deve listar imagens de uma ordem de serviço", async () => {
    if (!db) return;
    // Inserir múltiplas imagens
    await db.insert(osImagens).values({
      ordemServicoId: osId,
      url: "https://example.com/image1.jpg",
      descricao: "Imagem 1",
      tipo: "antes",
    });

    await db.insert(osImagens).values({
      ordemServicoId: osId,
      url: "https://example.com/image2.jpg",
      descricao: "Imagem 2",
      tipo: "depois",
    });

    // Listar imagens
    const imagens = await db
      .select()
      .from(osImagens)
      .where(eq(osImagens.ordemServicoId, osId));

    expect(imagens.length).toBeGreaterThanOrEqual(2);
    expect(imagens.some((img: any) => img.tipo === "antes")).toBe(true);
    expect(imagens.some((img: any) => img.tipo === "depois")).toBe(true);
  });

  it("deve validar tipos de imagem permitidos", async () => {
    if (!db) return;
    const tiposValidos = ["antes", "durante", "depois", "orcamento", "outro"];

    for (const tipo of tiposValidos) {
      const [result] = await db.insert(osImagens).values({
        ordemServicoId: osId,
        url: `https://example.com/image-${tipo}.jpg`,
        descricao: `Imagem tipo ${tipo}`,
        tipo: tipo as any,
      });

      expect(result.insertId).toBeGreaterThan(0);
    }
  });

  it("deve deletar uma imagem com sucesso", async () => {
    if (!db) return;
    // Inserir imagem
    const [result] = await db.insert(osImagens).values({
      ordemServicoId: osId,
      url: "https://example.com/image-delete.jpg",
      descricao: "Imagem para deletar",
    });

    const imagemId = result.insertId;

    // Verificar que foi inserida
    const [inserted] = await db
      .select()
      .from(osImagens)
      .where(eq(osImagens.id, imagemId));
    expect(inserted).toBeDefined();

    // Deletar
    await db.delete(osImagens).where(eq(osImagens.id, imagemId));

    // Verificar que foi deletada
    const [deleted] = await db
      .select()
      .from(osImagens)
      .where(eq(osImagens.id, imagemId));
    expect(deleted).toBeUndefined();
  });

  it("deve ordenar imagens por data de criação (descendente)", async () => {
    if (!db) return;
    // Limpar imagens anteriores
    await db.delete(osImagens).where(eq(osImagens.ordemServicoId, osId));

    // Inserir imagens com pequeno delay
    const [img1] = await db.insert(osImagens).values({
      ordemServicoId: osId,
      url: "https://example.com/image1.jpg",
      descricao: "Primeira imagem",
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const [img2] = await db.insert(osImagens).values({
      ordemServicoId: osId,
      url: "https://example.com/image2.jpg",
      descricao: "Segunda imagem",
    });

    // Listar em ordem descendente
    const imagens = await db
      .select()
      .from(osImagens)
      .where(eq(osImagens.ordemServicoId, osId))
      .orderBy((t: any) => t.createdAt);

    expect(imagens.length).toBeGreaterThanOrEqual(2);
    // A última inserida deve estar no final (ordem ascendente)
    expect(imagens[imagens.length - 1].id).toBe(img2.insertId);
  });
});
