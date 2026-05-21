
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../../db";
import { inscricoesRevista } from "../../../drizzle/schema";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";

export const inscricaoRevistaRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(inscricoesRevista)
        .where(eq(inscricoesRevista.condominioId, input.condominioId))
        .orderBy(desc(inscricoesRevista.createdAt));
    }),

  create: publicProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1),
      email: z.string().email(),
      unidade: z.string().optional(),
      whatsapp: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(inscricoesRevista).values({
        ...input,
        status: "pendente",
      }).returning();
      return { id: Number(result.id) };
    }),

  ativar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(inscricoesRevista)
        .set({ status: "ativo" })
        .where(eq(inscricoesRevista.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(inscricoesRevista).where(eq(inscricoesRevista.id, input.id));
      return { success: true };
    }),
});

