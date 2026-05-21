import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and } from "drizzle-orm";
import { regrasNormas } from "../../../drizzle/schema";

export const regrasRouter = router({
    list: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(regrasNormas)
          .where(and(
            eq(regrasNormas.condominioId, input.condominioId),
            eq(regrasNormas.ativo, true)
          ))
          .orderBy(regrasNormas.ordem);
      }),

    create: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        titulo: z.string().min(1),
        descricao: z.string().min(1),
        categoria: z.enum(["geral", "convivencia", "areas_comuns", "estacionamento", "animais", "mudancas", "obras"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(regrasNormas).values({
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
        await db.delete(regrasNormas).where(eq(regrasNormas.id, input.id));
        return { success: true };
      }),
  });

