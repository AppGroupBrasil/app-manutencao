
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { dicasSeguranca, regrasNormas } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

export const segurancaRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(dicasSeguranca)
      .where(eq(dicasSeguranca.ativo, true))
      .orderBy(dicasSeguranca.ordem);
  }),

  create: protectedProcedure
    .input(z.object({
      titulo: z.string().min(1),
      conteudo: z.string().min(1),
      categoria: z.string().optional(),
      icone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(dicasSeguranca).values({
        titulo: input.titulo,
        conteudo: input.conteudo,
        categoria: (input.categoria as any) || "geral",
        icone: input.icone || "shield",
      }).returning();
      return { id: result.id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1),
      conteudo: z.string().min(1),
      categoria: z.string().optional(),
      icone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(dicasSeguranca)
        .set({
          titulo: input.titulo,
          conteudo: input.conteudo,
          categoria: (input.categoria as any) || "geral",
          icone: input.icone,
        })
        .where(eq(dicasSeguranca.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(dicasSeguranca).where(eq(dicasSeguranca.id, input.id));
      return { success: true };
    }),
});

export const regrasRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(regrasNormas)
      .where(eq(regrasNormas.ativo, true))
      .orderBy(regrasNormas.ordem);
  }),

  create: protectedProcedure
    .input(z.object({
      titulo: z.string().min(1),
      conteudo: z.string().min(1),
      categoria: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(regrasNormas).values({
        titulo: input.titulo,
        conteudo: input.conteudo,
        categoria: (input.categoria as any) || "geral",
        ordem: input.ordem || 0,
      }).returning();
      return { id: result.id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1),
      conteudo: z.string().min(1),
      categoria: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(regrasNormas)
        .set({
          titulo: input.titulo,
          conteudo: input.conteudo,
          categoria: (input.categoria as any) || "geral",
          ordem: input.ordem,
        })
        .where(eq(regrasNormas.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(regrasNormas).where(eq(regrasNormas.id, input.id));
      return { success: true };
    }),
});

