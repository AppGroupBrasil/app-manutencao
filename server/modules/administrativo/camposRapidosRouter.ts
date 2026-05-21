
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { camposRapidosTemplates } from "../../../drizzle/schema";
import { router, protectedProcedure } from "../../_core/trpc";

export const camposRapidosTemplatesRouter = router({
  // Listar templates por tipo de campo
  listar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipoCampo: z.enum(["titulo", "descricao", "local", "observacao", "responsavel_os", "titulo_os"]).optional(),
      tipoTarefa: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois", "checklist"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(camposRapidosTemplates.condominioId, input.condominioId),
        eq(camposRapidosTemplates.ativo, true)
      ];
      
      if (input.tipoCampo) {
        conditions.push(eq(camposRapidosTemplates.tipoCampo, input.tipoCampo));
      }
      if (input.tipoTarefa) {
        conditions.push(eq(camposRapidosTemplates.tipoTarefa, input.tipoTarefa));
      }
      
      return db.select()
        .from(camposRapidosTemplates)
        .where(and(...conditions))
        .orderBy(desc(camposRapidosTemplates.vezesUsado), desc(camposRapidosTemplates.favorito));
    }),

  // Criar novo template
  criar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipoCampo: z.enum(["titulo", "descricao", "local", "observacao", "responsavel_os", "titulo_os"]),
      tipoTarefa: z.enum(["vistoria", "manutencao", "ocorrencia", "antes_depois", "checklist"]).optional(),
      valor: z.string().min(1),
      nome: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Verificar se já existe um template com o mesmo valor e tipo de tarefa
      const dupConditions = [
        eq(camposRapidosTemplates.condominioId, input.condominioId),
        eq(camposRapidosTemplates.tipoCampo, input.tipoCampo),
        eq(camposRapidosTemplates.valor, input.valor),
        eq(camposRapidosTemplates.ativo, true),
      ];
      // Incluir tipoTarefa na verificação de duplicata
      if (input.tipoTarefa) {
        dupConditions.push(eq(camposRapidosTemplates.tipoTarefa, input.tipoTarefa));
      }
      const existente = await db.select()
        .from(camposRapidosTemplates)
        .where(and(...dupConditions))
        .limit(1);
      
      if (existente.length > 0) {
        // Incrementar uso se já existe
        await db.update(camposRapidosTemplates)
          .set({ 
            vezesUsado: sql`${camposRapidosTemplates.vezesUsado} + 1`,
            ultimoUso: new Date()
          })
          .where(eq(camposRapidosTemplates.id, existente[0].id));
        return { ...existente[0], jaExistia: true };
      }
      
      const [result] = await db.insert(camposRapidosTemplates).values({
        condominioId: input.condominioId,
        userId: ctx.user?.id,
        tipoCampo: input.tipoCampo,
        tipoTarefa: input.tipoTarefa,
        valor: input.valor,
        nome: input.nome || input.valor.substring(0, 50),
        vezesUsado: 1,
        ultimoUso: new Date(),
      }).returning();
      
      return { id: result.id, ...input, jaExistia: false };
    }),

  // Usar template (incrementar contador)
  usar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(camposRapidosTemplates)
        .set({ 
          vezesUsado: sql`${camposRapidosTemplates.vezesUsado} + 1`,
          ultimoUso: new Date()
        })
        .where(eq(camposRapidosTemplates.id, input.id));
      
      return { success: true };
    }),

  // Marcar como favorito
  toggleFavorito: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [template] = await db.select()
        .from(camposRapidosTemplates)
        .where(eq(camposRapidosTemplates.id, input.id))
        .limit(1);
      
      if (!template) throw new Error("Template não encontrado");
      
      await db.update(camposRapidosTemplates)
        .set({ favorito: !template.favorito })
        .where(eq(camposRapidosTemplates.id, input.id));
      
      return { success: true, favorito: !template.favorito };
    }),

  // Deletar template (soft delete)
  deletar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(camposRapidosTemplates)
        .set({ ativo: false })
        .where(eq(camposRapidosTemplates.id, input.id));
      
      return { success: true };
    }),
});
