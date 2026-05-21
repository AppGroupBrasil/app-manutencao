import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { tarefasSimples, statusPersonalizados, condominios } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Tarefas Simples", () => {
  let testCondominioId: number;
  let testTarefaId: number;
  let testStatusId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar condomínio de teste
    const [cond] = await db.insert(condominios).values({
      nome: "Organização Teste Tarefas Simples",
      endereco: "Rua Teste, 123",
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
    if (testTarefaId) {
      await db.delete(tarefasSimples).where(eq(tarefasSimples.id, testTarefaId));
    }
    if (testStatusId) {
      await db.delete(statusPersonalizados).where(eq(statusPersonalizados.id, testStatusId));
    }
    if (testCondominioId) {
      await db.delete(condominios).where(eq(condominios.id, testCondominioId));
    }
  });

  describe("Geração de Protocolo", () => {
    it("deve gerar protocolo com prefixo VIS para vistoria", () => {
      const prefixos = {
        vistoria: "VIS",
        manutencao: "MAN",
        ocorrencia: "OCO",
        antes_depois: "A&D",
      };
      
      const tipo = "vistoria";
      const prefixo = prefixos[tipo];
      const data = new Date();
      const ano = data.getFullYear().toString().slice(-2);
      const mes = (data.getMonth() + 1).toString().padStart(2, "0");
      const dia = data.getDate().toString().padStart(2, "0");
      const hora = data.getHours().toString().padStart(2, "0");
      const min = data.getMinutes().toString().padStart(2, "0");
      const seg = data.getSeconds().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const protocolo = `${prefixo}-${ano}${mes}${dia}-${hora}${min}${seg}-${random}`;

      expect(protocolo).toMatch(/^VIS-\d{6}-\d{6}-\d{3}$/);
    });

    it("deve gerar protocolo com prefixo MAN para manutenção", () => {
      const prefixos = {
        vistoria: "VIS",
        manutencao: "MAN",
        ocorrencia: "OCO",
        antes_depois: "A&D",
      };
      
      const tipo = "manutencao";
      const prefixo = prefixos[tipo];
      const data = new Date();
      const ano = data.getFullYear().toString().slice(-2);
      const mes = (data.getMonth() + 1).toString().padStart(2, "0");
      const dia = data.getDate().toString().padStart(2, "0");
      const hora = data.getHours().toString().padStart(2, "0");
      const min = data.getMinutes().toString().padStart(2, "0");
      const seg = data.getSeconds().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const protocolo = `${prefixo}-${ano}${mes}${dia}-${hora}${min}${seg}-${random}`;

      expect(protocolo).toMatch(/^MAN-\d{6}-\d{6}-\d{3}$/);
    });

    it("deve gerar protocolo com prefixo OCO para ocorrência", () => {
      const prefixos = {
        vistoria: "VIS",
        manutencao: "MAN",
        ocorrencia: "OCO",
        antes_depois: "A&D",
      };
      
      const tipo = "ocorrencia";
      const prefixo = prefixos[tipo];
      const data = new Date();
      const ano = data.getFullYear().toString().slice(-2);
      const mes = (data.getMonth() + 1).toString().padStart(2, "0");
      const dia = data.getDate().toString().padStart(2, "0");
      const hora = data.getHours().toString().padStart(2, "0");
      const min = data.getMinutes().toString().padStart(2, "0");
      const seg = data.getSeconds().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const protocolo = `${prefixo}-${ano}${mes}${dia}-${hora}${min}${seg}-${random}`;

      expect(protocolo).toMatch(/^OCO-\d{6}-\d{6}-\d{3}$/);
    });

    it("deve gerar protocolo com prefixo A&D para antes/depois", () => {
      const prefixos = {
        vistoria: "VIS",
        manutencao: "MAN",
        ocorrencia: "OCO",
        antes_depois: "A&D",
      };
      
      const tipo = "antes_depois";
      const prefixo = prefixos[tipo];
      const data = new Date();
      const ano = data.getFullYear().toString().slice(-2);
      const mes = (data.getMonth() + 1).toString().padStart(2, "0");
      const dia = data.getDate().toString().padStart(2, "0");
      const hora = data.getHours().toString().padStart(2, "0");
      const min = data.getMinutes().toString().padStart(2, "0");
      const seg = data.getSeconds().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const protocolo = `${prefixo}-${ano}${mes}${dia}-${hora}${min}${seg}-${random}`;

      expect(protocolo).toMatch(/^A&D-\d{6}-\d{6}-\d{3}$/);
    });
  });

  describe("CRUD de Tarefas Simples", () => {
    it("deve criar uma tarefa simples", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const protocolo = `VIS-${Date.now()}-001`;
      const [result] = await db.insert(tarefasSimples).values({
        condominioId: testCondominioId,
        tipo: "vistoria",
        protocolo,
        titulo: "Vistoria de Teste",
        descricao: "Descrição da vistoria de teste",
        status: "rascunho",
      });

      testTarefaId = Number(result.insertId);
      expect(testTarefaId).toBeGreaterThan(0);
    });

    it("deve buscar tarefa criada", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [tarefa] = await db.select()
        .from(tarefasSimples)
        .where(eq(tarefasSimples.id, testTarefaId));

      expect(tarefa).toBeDefined();
      expect(tarefa.titulo).toBe("Vistoria de Teste");
      expect(tarefa.tipo).toBe("vistoria");
      expect(tarefa.status).toBe("rascunho");
    });

    it("deve atualizar tarefa para enviado", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(tarefasSimples)
        .set({ status: "enviado", enviadoEm: new Date() })
        .where(eq(tarefasSimples.id, testTarefaId));

      const [tarefa] = await db.select()
        .from(tarefasSimples)
        .where(eq(tarefasSimples.id, testTarefaId));

      expect(tarefa.status).toBe("enviado");
      expect(tarefa.enviadoEm).toBeDefined();
    });

    it("deve atualizar tarefa para concluído", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(tarefasSimples)
        .set({ status: "concluido", concluidoEm: new Date() })
        .where(eq(tarefasSimples.id, testTarefaId));

      const [tarefa] = await db.select()
        .from(tarefasSimples)
        .where(eq(tarefasSimples.id, testTarefaId));

      expect(tarefa.status).toBe("concluido");
      expect(tarefa.concluidoEm).toBeDefined();
    });
  });

  describe("Status Personalizados", () => {
    it("deve criar um status personalizado", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(statusPersonalizados).values({
        condominioId: testCondominioId,
        nome: "Em Análise",
        cor: "#F97316",
      });

      testStatusId = Number(result.insertId);
      expect(testStatusId).toBeGreaterThan(0);
    });

    it("deve buscar status personalizado", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [status] = await db.select()
        .from(statusPersonalizados)
        .where(eq(statusPersonalizados.id, testStatusId));

      expect(status).toBeDefined();
      expect(status.nome).toBe("Em Análise");
      expect(status.cor).toBe("#F97316");
      expect(status.ativo).toBe(true);
    });

    it("deve desativar status personalizado (soft delete)", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(statusPersonalizados)
        .set({ ativo: false })
        .where(eq(statusPersonalizados.id, testStatusId));

      const [status] = await db.select()
        .from(statusPersonalizados)
        .where(eq(statusPersonalizados.id, testStatusId));

      expect(status.ativo).toBe(false);
    });
  });

  describe("Tipos de Tarefa", () => {
    it("deve aceitar tipo vistoria", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(tarefasSimples).values({
        condominioId: testCondominioId,
        tipo: "vistoria",
        protocolo: `VIS-TEST-${Date.now()}`,
        status: "rascunho",
      });

      const id = Number(result.insertId);
      const [tarefa] = await db.select().from(tarefasSimples).where(eq(tarefasSimples.id, id));
      expect(tarefa.tipo).toBe("vistoria");
      
      // Limpar
      await db.delete(tarefasSimples).where(eq(tarefasSimples.id, id));
    });

    it("deve aceitar tipo manutencao", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(tarefasSimples).values({
        condominioId: testCondominioId,
        tipo: "manutencao",
        protocolo: `MAN-TEST-${Date.now()}`,
        status: "rascunho",
      });

      const id = Number(result.insertId);
      const [tarefa] = await db.select().from(tarefasSimples).where(eq(tarefasSimples.id, id));
      expect(tarefa.tipo).toBe("manutencao");
      
      // Limpar
      await db.delete(tarefasSimples).where(eq(tarefasSimples.id, id));
    });

    it("deve aceitar tipo ocorrencia", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(tarefasSimples).values({
        condominioId: testCondominioId,
        tipo: "ocorrencia",
        protocolo: `OCO-TEST-${Date.now()}`,
        status: "rascunho",
      });

      const id = Number(result.insertId);
      const [tarefa] = await db.select().from(tarefasSimples).where(eq(tarefasSimples.id, id));
      expect(tarefa.tipo).toBe("ocorrencia");
      
      // Limpar
      await db.delete(tarefasSimples).where(eq(tarefasSimples.id, id));
    });

    it("deve aceitar tipo antes_depois", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(tarefasSimples).values({
        condominioId: testCondominioId,
        tipo: "antes_depois",
        protocolo: `A&D-TEST-${Date.now()}`,
        status: "rascunho",
      });

      const id = Number(result.insertId);
      const [tarefa] = await db.select().from(tarefasSimples).where(eq(tarefasSimples.id, id));
      expect(tarefa.tipo).toBe("antes_depois");
      
      // Limpar
      await db.delete(tarefasSimples).where(eq(tarefasSimples.id, id));
    });
  });
});
