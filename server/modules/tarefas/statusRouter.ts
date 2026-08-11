
import { z } from "zod";
import { eq, asc, and, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { statusPersonalizados } from "../../../drizzle/schema";
import { router, protectedProcedure, escopoProcedure } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";

/** Rotas por `id`: o registro precisa ser de uma organização do solicitante. */
const statusProcedure = escopoProcedure(escopoPorRegistro({ id: direto(statusPersonalizados) }));

export const statusPersonalizadosRouter = router({
  // Listar status personalizados
  listar: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let lista = await db.select()
        .from(statusPersonalizados)
        .where(and(
          eq(statusPersonalizados.condominioId, input.condominioId),
          eq(statusPersonalizados.ativo, true)
        ))
        .orderBy(asc(statusPersonalizados.ordem));
      
      // Auto-seed: se não há status, criar os padrões
      if (lista.length === 0) {
        const statusPadrao = [
          { nome: "Pendente", cor: "#F59E0B", ordem: 1 },
          { nome: "Realizada", cor: "#10B981", ordem: 2 },
          { nome: "Ação Necessária", cor: "#EF4444", ordem: 3 },
          { nome: "Finalizada", cor: "#3B82F6", ordem: 4 },
          { nome: "Reaberta", cor: "#8B5CF6", ordem: 5 },
          { nome: "Rascunho", cor: "#6B7280", ordem: 6 },
        ];
        
        // Usar try/catch individual para evitar race condition (INSERT duplicado)
        for (const s of statusPadrao) {
          try {
            await db.insert(statusPersonalizados).values({
              condominioId: input.condominioId,
              userId: ctx.user?.id,
              nome: s.nome,
              cor: s.cor,
              ordem: s.ordem,
            });
          } catch {
            // Ignorar se já inserido por request concorrente
          }
        }
        
        lista = await db.select()
          .from(statusPersonalizados)
          .where(and(
            eq(statusPersonalizados.condominioId, input.condominioId),
            eq(statusPersonalizados.ativo, true)
          ))
          .orderBy(asc(statusPersonalizados.ordem));
      }
      
      return lista;
    }),

  // Criar status personalizado
  criar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1),
      cor: z.string().optional().default("#F97316"),
      icone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Calcular próxima ordem disponível
      const [maxOrdem] = await db.select({ max: sql<number>`COALESCE(MAX(${statusPersonalizados.ordem}), 0)` })
        .from(statusPersonalizados)
        .where(and(
          eq(statusPersonalizados.condominioId, input.condominioId),
          eq(statusPersonalizados.ativo, true)
        ));
      const nextOrdem = (maxOrdem?.max ?? 0) + 1;

      const [result] = await db.insert(statusPersonalizados).values({
        condominioId: input.condominioId,
        userId: ctx.user?.id,
        nome: input.nome,
        cor: input.cor,
        icone: input.icone,
        ordem: nextOrdem,
      }).returning();
      return { id: Number(result.id) };
    }),

  // Atualizar status
  atualizar: statusProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      cor: z.string().optional(),
      icone: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(statusPersonalizados)
        .set(data)
        .where(eq(statusPersonalizados.id, id));
      return { success: true };
    }),

  // Deletar status (soft delete)
  deletar: statusProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(statusPersonalizados)
        .set({ ativo: false })
        .where(eq(statusPersonalizados.id, input.id));
      return { success: true };
    }),
});

