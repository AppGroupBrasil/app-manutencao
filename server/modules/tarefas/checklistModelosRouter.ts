import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { checklistModelos } from "../../../drizzle/schema";
import { router, protectedProcedure, escopoProcedure } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";

/** Rotas por `id`: o registro precisa ser de uma organização do solicitante. */
const modeloProcedure = escopoProcedure(escopoPorRegistro({ id: direto(checklistModelos) }));

export const checklistModelosRouter = router({
  // Listar modelos de checklist de um condomínio
  listar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return db.select()
        .from(checklistModelos)
        .where(eq(checklistModelos.condominioId, input.condominioId))
        .orderBy(desc(checklistModelos.updatedAt));
    }),

  // Criar novo modelo de checklist
  criar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1, "Nome é obrigatório"),
      descricao: z.string().optional(),
      itens: z.array(z.object({
        id: z.string(),
        titulo: z.string(),
      })).min(1, "Adicione pelo menos um item ao modelo"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [result] = await db.insert(checklistModelos).values({
        condominioId: input.condominioId,
        userId: ctx.user?.id,
        nome: input.nome,
        descricao: input.descricao || null,
        itens: input.itens,
      }).returning();
      
      return { id: Number(result.id), nome: input.nome };
    }),

  // Atualizar modelo existente
  atualizar: modeloProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      descricao: z.string().optional(),
      itens: z.array(z.object({
        id: z.string(),
        titulo: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      const updateData: any = {};
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.itens !== undefined) updateData.itens = data.itens;
      
      await db.update(checklistModelos)
        .set(updateData)
        .where(eq(checklistModelos.id, id));
      
      return { success: true };
    }),

  // Deletar modelo
  deletar: modeloProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(checklistModelos)
        .where(eq(checklistModelos.id, input.id));
      
      return { success: true };
    }),

  // Obter modelo específico
  obter: modeloProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [modelo] = await db.select()
        .from(checklistModelos)
        .where(eq(checklistModelos.id, input.id));
      
      return modelo || null;
    }),
});
