import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { templatesCategorias } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

export const templatesCategoriasRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        segmento: z.string().optional(),
        tipo: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      let query = db.select().from(templatesCategorias);
      if (input?.segmento) {
        query = query.where(eq(templatesCategorias.segmento, input.segmento)) as any;
      }
      return query;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(templatesCategorias)
        .where(eq(templatesCategorias.id, input.id));
      return rows[0] || null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        segmento: z.string().max(100),
        tipo: z.string().max(50),
        nome: z.string().max(255),
        campos: z.record(z.any()).optional(),
        ativo: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(templatesCategorias).values({
        segmento: input.segmento,
        tipo: input.tipo,
        nome: input.nome,
        campos: input.campos || {},
        ativo: input.ativo ?? false,
      }).returning();
      return { id: result.id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().max(255).optional(),
        campos: z.record(z.any()).optional(),
        ativo: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db
        .update(templatesCategorias)
        .set(data)
        .where(eq(templatesCategorias.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(templatesCategorias)
        .where(eq(templatesCategorias.id, input.id));
      return { success: true };
    }),
});
