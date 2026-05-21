import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { camposRapidosTemplates, condominios } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Campos Rápidos Templates", () => {
  let testCondominioId: number;
  let testTemplateIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) { console.warn('[skip] Database not available'); return; }

    // Criar condomínio de teste
    const [cond] = await db.insert(condominios).values({
      nome: "Organização Teste Templates",
      endereco: "Rua Teste, 456",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01234-567",
    });
    testCondominioId = Number(cond.insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Limpar dados de teste
    for (const id of testTemplateIds) {
      await db.delete(camposRapidosTemplates).where(eq(camposRapidosTemplates.id, id));
    }
    if (testCondominioId) {
      await db.delete(condominios).where(eq(condominios.id, testCondominioId));
    }
  });

  describe("CRUD de Templates", () => {
    it("deve criar um template de título", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const [result] = await db.insert(camposRapidosTemplates).values({
        condominioId: testCondominioId,
        tipoCampo: "titulo",
        tipoTarefa: "vistoria",
        valor: "Vistoria de Rotina",
        nome: "Vistoria de Rotina",
        vezesUsado: 1,
      });

      const id = Number(result.insertId);
      testTemplateIds.push(id);
      expect(id).toBeGreaterThan(0);
    });

    it("deve criar um template de descrição", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const [result] = await db.insert(camposRapidosTemplates).values({
        condominioId: testCondominioId,
        tipoCampo: "descricao",
        tipoTarefa: "manutencao",
        valor: "Manutenção preventiva realizada conforme cronograma.",
        nome: "Manutenção Preventiva",
        vezesUsado: 1,
      });

      const id = Number(result.insertId);
      testTemplateIds.push(id);
      expect(id).toBeGreaterThan(0);
    });

    it("deve buscar template criado", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const [template] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, testTemplateIds[0]));

      expect(template).toBeDefined();
      expect(template.valor).toBe("Vistoria de Rotina");
      expect(template.tipoCampo).toBe("titulo");
      expect(template.tipoTarefa).toBe("vistoria");
    });

    it("deve listar templates por tipo de campo", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const templates = await db.select()
        .from(camposRapidosTemplates)
        .where(and(
          eq(camposRapidosTemplates.condominioId, testCondominioId),
          eq(camposRapidosTemplates.tipoCampo, "titulo"),
          eq(camposRapidosTemplates.ativo, true)
        ));

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].tipoCampo).toBe("titulo");
    });

    it("deve listar templates por tipo de tarefa", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const templates = await db.select()
        .from(camposRapidosTemplates)
        .where(and(
          eq(camposRapidosTemplates.condominioId, testCondominioId),
          eq(camposRapidosTemplates.tipoTarefa, "vistoria"),
          eq(camposRapidosTemplates.ativo, true)
        ));

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].tipoTarefa).toBe("vistoria");
    });
  });

  describe("Contador de Uso", () => {
    it("deve incrementar contador de uso", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const templateId = testTemplateIds[0];
      
      // Buscar uso atual
      const [antes] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, templateId));

      const usoAntes = antes.vezesUsado || 0;

      // Incrementar uso
      await db.update(camposRapidosTemplates)
        .set({ 
          vezesUsado: usoAntes + 1,
          ultimoUso: new Date()
        })
        .where(eq(camposRapidosTemplates.id, templateId));

      // Verificar incremento
      const [depois] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, templateId));

      expect(depois.vezesUsado).toBe(usoAntes + 1);
      expect(depois.ultimoUso).toBeDefined();
    });
  });

  describe("Favoritos", () => {
    it("deve marcar template como favorito", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const templateId = testTemplateIds[0];

      await db.update(camposRapidosTemplates)
        .set({ favorito: true })
        .where(eq(camposRapidosTemplates.id, templateId));

      const [template] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, templateId));

      expect(template.favorito).toBe(true);
    });

    it("deve desmarcar template como favorito", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const templateId = testTemplateIds[0];

      await db.update(camposRapidosTemplates)
        .set({ favorito: false })
        .where(eq(camposRapidosTemplates.id, templateId));

      const [template] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, templateId));

      expect(template.favorito).toBe(false);
    });
  });

  describe("Soft Delete", () => {
    it("deve desativar template (soft delete)", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      // Criar template para deletar
      const [result] = await db.insert(camposRapidosTemplates).values({
        condominioId: testCondominioId,
        tipoCampo: "observacao",
        valor: "Template para deletar",
        vezesUsado: 0,
      });

      const id = Number(result.insertId);
      testTemplateIds.push(id);

      // Soft delete
      await db.update(camposRapidosTemplates)
        .set({ ativo: false })
        .where(eq(camposRapidosTemplates.id, id));

      const [template] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, id));

      expect(template.ativo).toBe(false);
    });

    it("não deve listar templates inativos", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const templates = await db.select()
        .from(camposRapidosTemplates)
        .where(and(
          eq(camposRapidosTemplates.condominioId, testCondominioId),
          eq(camposRapidosTemplates.ativo, true)
        ));

      // Verificar que nenhum template inativo está na lista
      const inativos = templates.filter(t => !t.ativo);
      expect(inativos.length).toBe(0);
    });
  });

  describe("Tipos de Campo", () => {
    it("deve aceitar tipo titulo", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const [result] = await db.insert(camposRapidosTemplates).values({
        condominioId: testCondominioId,
        tipoCampo: "titulo",
        valor: "Teste Título",
      });

      const id = Number(result.insertId);
      testTemplateIds.push(id);

      const [template] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, id));

      expect(template.tipoCampo).toBe("titulo");
    });

    it("deve aceitar tipo descricao", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const [result] = await db.insert(camposRapidosTemplates).values({
        condominioId: testCondominioId,
        tipoCampo: "descricao",
        valor: "Teste Descrição",
      });

      const id = Number(result.insertId);
      testTemplateIds.push(id);

      const [template] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, id));

      expect(template.tipoCampo).toBe("descricao");
    });

    it("deve aceitar tipo local", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const [result] = await db.insert(camposRapidosTemplates).values({
        condominioId: testCondominioId,
        tipoCampo: "local",
        valor: "Teste Local",
      });

      const id = Number(result.insertId);
      testTemplateIds.push(id);

      const [template] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, id));

      expect(template.tipoCampo).toBe("local");
    });

    it("deve aceitar tipo observacao", async () => {
      const db = await getDb();
      if (!db) { console.warn('[skip] Database not available'); return; }

      const [result] = await db.insert(camposRapidosTemplates).values({
        condominioId: testCondominioId,
        tipoCampo: "observacao",
        valor: "Teste Observação",
      });

      const id = Number(result.insertId);
      testTemplateIds.push(id);

      const [template] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, id));

      expect(template.tipoCampo).toBe("observacao");
    });
  });
});
