
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb } from "../../db";
import { dicasSeguranca } from "../../../drizzle/schema";
import { router, protectedProcedure } from "../../_core/trpc";

export const dicasSegurancaRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(dicasSeguranca)
        .where(and(
          eq(dicasSeguranca.condominioId, input.condominioId),
          eq(dicasSeguranca.ativo, true)
        ))
        .orderBy(dicasSeguranca.ordem);
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string().min(1),
      descricao: z.string().min(1),
      categoria: z.enum(["geral", "incendio", "roubo", "criancas", "idosos", "digital", "veiculos"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(dicasSeguranca).values({
        condominioId: input.condominioId,
        titulo: input.titulo,
        conteudo: input.descricao,
        categoria: input.categoria || "geral",
      }).returning();
      return { id: Number(result.id) };
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

