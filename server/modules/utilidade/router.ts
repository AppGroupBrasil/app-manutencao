import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { telefonesUteis, linksUteis } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

export const telefoneRouter = router({
  list: publicProcedure
    .input(z.object({ revistaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(telefonesUteis)
        .where(eq(telefonesUteis.revistaId, input.revistaId))
        .orderBy(telefonesUteis.ordem);
    }),

  create: protectedProcedure
    .input(z.object({
      revistaId: z.number(),
      nome: z.string().min(1),
      telefone: z.string().min(1),
      descricao: z.string().optional(),
      categoria: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(telefonesUteis).values(input).returning();
      return { id: Number(result.id) };
    }),
});

export const linkRouter = router({
  list: publicProcedure
    .input(z.object({ revistaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(linksUteis)
        .where(eq(linksUteis.revistaId, input.revistaId))
        .orderBy(linksUteis.ordem);
    }),

  create: protectedProcedure
    .input(z.object({
      revistaId: z.number(),
      titulo: z.string().min(1),
      url: z.string().min(1),
      descricao: z.string().optional(),
      icone: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(linksUteis).values(input).returning();
      return { id: Number(result.id) };
    }),
});
