import { moduloUserProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { z } from "zod";
import { getDb } from "../../db";
import { avisos, revistas } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Exige o modulo "avisos" habilitado. Estas entidades pendem da revista,
// entao o tenant e resolvido pela revista dona do registro.
const avisoProcedure = moduloUserProcedure(
  "avisos",
  escopoPorRegistro(
    {
      revistaId: direto(revistas),
      id: via(avisos, "revistaId", revistas),
    },
    {},
  ),
);

export const avisoRouter = router({
    list: avisoProcedure
      .input(z.object({ revistaId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(avisos)
          .where(eq(avisos.revistaId, input.revistaId))
          .orderBy(desc(avisos.createdAt));
      }),

    create: avisoProcedure
      .input(z.object({
        revistaId: z.number(),
        titulo: z.string().min(1),
        conteudo: z.string().optional(),
        tipo: z.enum(["urgente", "importante", "informativo"]).optional(),
        imagemUrl: z.string().optional(),
        destaque: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [result] = await db.insert(avisos).values(input).returning();
        return { id: Number(result.id) };
      }),

    update: avisoProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        conteudo: z.string().optional(),
        tipo: z.enum(["urgente", "importante", "informativo"]).optional(),
        imagemUrl: z.string().optional(),
        destaque: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(avisos).set(data).where(eq(avisos.id, id));
        return { success: true };
      }),

    delete: avisoProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(avisos).where(eq(avisos.id, input.id));
        return { success: true };
      }),
});
