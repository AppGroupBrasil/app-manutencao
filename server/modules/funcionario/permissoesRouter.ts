import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { funcionarioPermissoes } from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const permissoesRouter = router({
  // List permissions for a specific funcionario
  list: protectedProcedure
    .input(z.object({ funcionarioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db
        .select()
        .from(funcionarioPermissoes)
        .where(eq(funcionarioPermissoes.funcionarioId, input.funcionarioId));
    }),

  // Upsert permissions (toggle modules on/off)
  upsert: protectedProcedure
    .input(
      z.object({
        funcionarioId: z.number(),
        modulo: z.string().max(50),
        habilitado: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db
        .select()
        .from(funcionarioPermissoes)
        .where(
          and(
            eq(funcionarioPermissoes.funcionarioId, input.funcionarioId),
            eq(funcionarioPermissoes.modulo, input.modulo),
          ),
        );

      if (existing.length > 0) {
        await db
          .update(funcionarioPermissoes)
          .set({ habilitado: input.habilitado })
          .where(eq(funcionarioPermissoes.id, existing[0].id));
        return { ...existing[0], habilitado: input.habilitado };
      }

      const [inserted] = await db.insert(funcionarioPermissoes).values({
        funcionarioId: input.funcionarioId,
        modulo: input.modulo,
        habilitado: input.habilitado,
      }).returning();
      return { id: inserted.id, ...input };
    }),

  // Bulk set permissions for a funcionario
  bulkSet: protectedProcedure
    .input(
      z.object({
        funcionarioId: z.number(),
        permissoes: z.array(
          z.object({
            modulo: z.string().max(50),
            habilitado: z.boolean(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Delete existing and re-insert
      await db
        .delete(funcionarioPermissoes)
        .where(eq(funcionarioPermissoes.funcionarioId, input.funcionarioId));

      if (input.permissoes.length > 0) {
        await db.insert(funcionarioPermissoes).values(
          input.permissoes.map((p) => ({
            funcionarioId: input.funcionarioId,
            modulo: p.modulo,
            habilitado: p.habilitado,
          })),
        ).returning();
      }
      return { success: true };
    }),
});
