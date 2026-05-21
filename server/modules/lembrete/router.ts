import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { lembretes } from "../../../drizzle/schema";
import { eq, and, desc, lte } from "drizzle-orm";

export const lembreteRouter = router({
  // Listar lembretes do condomÃ­nio
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      return db.select().from(lembretes)
        .where(eq(lembretes.condominioId, input.condominioId))
        .orderBy(desc(lembretes.dataAgendada));
    }),
  
  // Criar lembrete
  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(['assembleia', 'vencimento', 'evento', 'manutencao', 'custom']),
      titulo: z.string(),
      mensagem: z.string().optional(),
      dataAgendada: z.string(),
      antecedenciaHoras: z.number().optional(),
      referenciaId: z.number().optional(),
      referenciaTipo: z.string().optional(),
      canais: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [result] = await db.insert(lembretes).values({
        condominioId: input.condominioId,
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: input.mensagem || null,
        dataAgendada: new Date(input.dataAgendada),
        antecedenciaHoras: input.antecedenciaHoras || 24,
        referenciaId: input.referenciaId || null,
        referenciaTipo: input.referenciaTipo || null,
        canais: input.canais || ['push', 'email'],
      }).returning();
      
      return { success: true, id: Number(result.id) };
    }),
  
  // Excluir lembrete
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(lembretes).where(eq(lembretes.id, input.id));
      return { success: true };
    }),
  
  // Marcar lembrete como enviado
  markSent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(lembretes)
        .set({ enviado: true, enviadoEm: new Date() })
        .where(eq(lembretes.id, input.id));
      
      return { success: true };
    }),
  
  // Listar lembretes pendentes (para processamento)
  getPending: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const now = new Date();
      
      return db.select().from(lembretes)
        .where(and(
          eq(lembretes.condominioId, input.condominioId),
          eq(lembretes.enviado, false),
          lte(lembretes.dataAgendada, now)
        ));
    }),
});

