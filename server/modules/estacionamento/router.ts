
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { vagasEstacionamento, imagensVagas } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const vagaEstacionamentoRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(vagasEstacionamento)
        .where(eq(vagasEstacionamento.condominioId, input.condominioId))
        .orderBy(vagasEstacionamento.numero);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(vagasEstacionamento)
        .where(eq(vagasEstacionamento.id, input.id))
        .limit(1);
      return result[0] || null;
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      numero: z.string().min(1),
      bloco: z.string().optional(),
      apartamento: z.string().optional(),
      tipo: z.enum(["coberta", "descoberta", "moto"]).optional(), 
      localizacao: z.string().optional(),
      observacoes: z.string().optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Remove localizacao e mapeia observacao para observacoes
        const { localizacao, observacao, observacoes, ...rest } = input;
        
        await db.insert(vagasEstacionamento).values({
          ...rest,
          observacoes: observacoes || observacao
        }).returning();
        
        return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      numero: z.string().optional(),
      bloco: z.string().optional(),
      apartamento: z.string().optional(),
      tipo: z.enum(["coberta", "descoberta", "moto"]).optional(),
      localizacao: z.string().optional(),
      observacoes: z.string().optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, localizacao, observacao, observacoes, ...data } = input;
      
      const updateData: any = { ...data };
      if (observacoes !== undefined) updateData.observacoes = observacoes;
      else if (observacao !== undefined) updateData.observacoes = observacao;
      
      await db.update(vagasEstacionamento).set(updateData).where(eq(vagasEstacionamento.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(vagasEstacionamento).where(eq(vagasEstacionamento.id, input.id));
      return { success: true };
    }),
});

export const imagemVagaRouter = router({
  list: protectedProcedure
    .input(z.object({ vagaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(imagensVagas)
        .where(eq(imagensVagas.vagaId, input.vagaId))
        .orderBy(imagensVagas.ordem);
    }),

  create: protectedProcedure
    .input(z.object({
      vagaId: z.number(),
      tipo: z.enum(["imagem", "anexo"]).optional(),
      url: z.string().min(1),
      nome: z.string().optional(),
      mimeType: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(imagensVagas).values(input).returning();
      return { id: Number(result.id) };
    }),

  createMultiple: protectedProcedure
    .input(z.object({
      vagaId: z.number(),
      arquivos: z.array(z.object({
        tipo: z.enum(["imagem", "anexo"]).optional(),
        url: z.string().min(1),
        nome: z.string().optional(),
        mimeType: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const arquivosToInsert = input.arquivos.map((arq, index) => ({
        vagaId: input.vagaId,
        tipo: arq.tipo || "imagem",
        url: arq.url,
        nome: arq.nome,
        mimeType: arq.mimeType,
        ordem: index,
      }));
      await db.insert(imagensVagas).values(arquivosToInsert).returning();
      return { success: true, count: arquivosToInsert.length };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensVagas).where(eq(imagensVagas.id, input.id));
      return { success: true };
    }),

  deleteAll: protectedProcedure
    .input(z.object({ vagaId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensVagas).where(eq(imagensVagas.vagaId, input.vagaId));
      return { success: true };
    }),
});

