/**
 * Rotas tRPC para Funções Simples
 * 
 * Adicione este código ao seu arquivo server/routers.ts
 * Certifique-se de importar as tabelas do schema:
 * import { tarefasSimples, statusPersonalizados } from "../drizzle/schema";
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc"; // Ajuste o caminho conforme seu projeto
import { getDb } from "./db"; // Ajuste o caminho conforme seu projeto
import { tarefasSimples, statusPersonalizados } from "../drizzle/schema";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";

// ==================== TAREFAS SIMPLES ====================
export const tarefasSimplesRouter = router({
  // Gerar protocolo único
  gerarProtocolo: protectedProcedure
    .input(z.object({
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois"]),
    }))
    .mutation(async ({ input }) => {
      const prefixos = {
        vistoria: "VIS",
        manutencao: "MAN",
        ocorrencia: "OCO",
        antes_depois: "A&D",
      };
      const prefixo = prefixos[input.tipo];
      const data = new Date();
      const ano = data.getFullYear().toString().slice(-2);
      const mes = (data.getMonth() + 1).toString().padStart(2, "0");
      const dia = data.getDate().toString().padStart(2, "0");
      const hora = data.getHours().toString().padStart(2, "0");
      const min = data.getMinutes().toString().padStart(2, "0");
      const seg = data.getSeconds().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      return { protocolo: `${prefixo}-${ano}${mes}${dia}-${hora}${min}${seg}-${random}` };
    }),

  // Criar nova tarefa simples (rascunho)
  criar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois"]),
      protocolo: z.string(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      imagens: z.array(z.string()).optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      endereco: z.string().optional(),
      statusPersonalizado: z.string().optional(),
      funcionarioId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(tarefasSimples).values({
        condominioId: input.condominioId,
        userId: ctx.user?.id,
        funcionarioId: input.funcionarioId,
        tipo: input.tipo,
        protocolo: input.protocolo,
        titulo: input.titulo || null,
        descricao: input.descricao || null,
        imagens: input.imagens || [],
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        endereco: input.endereco || null,
        statusPersonalizado: input.statusPersonalizado || null,
        status: "rascunho",
      });
      return { id: Number(result.insertId), protocolo: input.protocolo };
    }),

  // Atualizar tarefa simples
  atualizar: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      imagens: z.array(z.string()).optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      endereco: z.string().optional(),
      statusPersonalizado: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(tarefasSimples)
        .set(data)
        .where(eq(tarefasSimples.id, id));
      return { success: true };
    }),

  // Enviar todas as tarefas rascunho de um tipo
  enviarTodas: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois"]).optional(),
      ids: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [
        eq(tarefasSimples.condominioId, input.condominioId),
        eq(tarefasSimples.status, "rascunho"),
      ];
      
      if (input.tipo) {
        conditions.push(eq(tarefasSimples.tipo, input.tipo));
      }
      
      if (input.ids && input.ids.length > 0) {
        conditions.push(inArray(tarefasSimples.id, input.ids));
      }
      
      await db.update(tarefasSimples)
        .set({ status: "enviado", enviadoEm: new Date() })
        .where(and(...conditions));
      
      return { success: true };
    }),

  // Enviar uma tarefa específica
  enviar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(tarefasSimples)
        .set({ status: "enviado", enviadoEm: new Date() })
        .where(eq(tarefasSimples.id, input.id));
      return { success: true };
    }),

  // Concluir tarefa
  concluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(tarefasSimples)
        .set({ status: "concluido", concluidoEm: new Date() })
        .where(eq(tarefasSimples.id, input.id));
      return { success: true };
    }),

  // Listar tarefas simples
  listar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois"]).optional(),
      status: z.enum(["rascunho", "enviado", "concluido"]).optional(),
      limite: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [eq(tarefasSimples.condominioId, input.condominioId)];
      
      if (input.tipo) {
        conditions.push(eq(tarefasSimples.tipo, input.tipo));
      }
      if (input.status) {
        conditions.push(eq(tarefasSimples.status, input.status));
      }
      
      return db.select()
        .from(tarefasSimples)
        .where(and(...conditions))
        .orderBy(desc(tarefasSimples.createdAt))
        .limit(input.limite);
    }),

  // Contar rascunhos pendentes
  contarRascunhos: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [
        eq(tarefasSimples.condominioId, input.condominioId),
        eq(tarefasSimples.status, "rascunho"),
      ];
      
      if (input.tipo) {
        conditions.push(eq(tarefasSimples.tipo, input.tipo));
      }
      
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(tarefasSimples)
        .where(and(...conditions));
      
      return { count: Number(result[0]?.count || 0) };
    }),

  // Obter uma tarefa específica
  obter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [tarefa] = await db.select()
        .from(tarefasSimples)
        .where(eq(tarefasSimples.id, input.id));
      return tarefa || null;
    }),

  // Deletar tarefa
  deletar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(tarefasSimples).where(eq(tarefasSimples.id, input.id));
      return { success: true };
    }),
});

// ==================== STATUS PERSONALIZADOS ====================
export const statusPersonalizadosRouter = router({
  // Listar status personalizados
  listar: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select()
        .from(statusPersonalizados)
        .where(and(
          eq(statusPersonalizados.condominioId, input.condominioId),
          eq(statusPersonalizados.ativo, true)
        ))
        .orderBy(asc(statusPersonalizados.ordem));
    }),

  // Criar status personalizado
  criar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1),
      cor: z.string().optional().default("#F97316"),
      icone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(statusPersonalizados).values({
        condominioId: input.condominioId,
        userId: ctx.user?.id,
        nome: input.nome,
        cor: input.cor,
        icone: input.icone,
      });
      return { id: Number(result.insertId) };
    }),

  // Atualizar status
  atualizar: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cor: z.string().optional(),
      icone: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(statusPersonalizados)
        .set(data)
        .where(eq(statusPersonalizados.id, id));
      return { success: true };
    }),

  // Deletar status (soft delete)
  deletar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(statusPersonalizados)
        .set({ ativo: false })
        .where(eq(statusPersonalizados.id, input.id));
      return { success: true };
    }),
});

/**
 * Para usar no seu appRouter, adicione:
 * 
 * export const appRouter = router({
 *   // ... suas outras rotas
 *   tarefasSimples: tarefasSimplesRouter,
 *   statusPersonalizados: statusPersonalizadosRouter,
 * });
 */
