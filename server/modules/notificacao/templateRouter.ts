import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { templatesNotificacao } from "../../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const templatesNotificacaoRouter = router({
  // Listar templates do condomÃ­nio
  list: protectedProcedure
    .input(z.object({ 
      condominioId: z.number(),
      categoria: z.enum(['assembleia', 'manutencao', 'vencimento', 'aviso', 'evento', 'custom']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let query = db.select().from(templatesNotificacao)
        .where(eq(templatesNotificacao.condominioId, input.condominioId));
      
      if (input.categoria) {
        query = db.select().from(templatesNotificacao)
          .where(and(
            eq(templatesNotificacao.condominioId, input.condominioId),
            eq(templatesNotificacao.categoria, input.categoria)
          ));
      }
      
      return query.orderBy(desc(templatesNotificacao.usageCount));
    }),
  
  // Obter template por ID
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const result = await db.select().from(templatesNotificacao)
        .where(eq(templatesNotificacao.id, input.id))
        .limit(1);
      
      return result[0] || null;
    }),
  
  // Criar template
  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1, "Nome Ã© obrigatÃ³rio"),
      titulo: z.string().min(1, "TÃ­tulo Ã© obrigatÃ³rio"),
      mensagem: z.string().min(1, "Mensagem Ã© obrigatÃ³ria"),
      categoria: z.enum(['assembleia', 'manutencao', 'vencimento', 'aviso', 'evento', 'custom']).optional(),
      icone: z.string().optional(),
      cor: z.string().optional(),
      urlDestino: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [result] = await db.insert(templatesNotificacao).values({
        condominioId: input.condominioId,
        nome: input.nome,
        titulo: input.titulo,
        mensagem: input.mensagem,
        categoria: input.categoria || 'custom',
        icone: input.icone || null,
        cor: input.cor || null,
        urlDestino: input.urlDestino || null,
      }).returning();
      
      return { success: true, id: Number(result.id) };
    }),
  
  // Atualizar template
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      titulo: z.string().optional(),
      mensagem: z.string().optional(),
      categoria: z.enum(['assembleia', 'manutencao', 'vencimento', 'aviso', 'evento', 'custom']).optional(),
      icone: z.string().optional(),
      cor: z.string().optional(),
      urlDestino: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      await db.update(templatesNotificacao)
        .set(updateData)
        .where(eq(templatesNotificacao.id, id));
      
      return { success: true };
    }),
  
  // Excluir template
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(templatesNotificacao)
        .where(eq(templatesNotificacao.id, input.id));
      
      return { success: true };
    }),
  
  // Incrementar contador de uso
  incrementUsage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(templatesNotificacao)
        .set({ usageCount: sql`${templatesNotificacao.usageCount} + 1` })
        .where(eq(templatesNotificacao.id, input.id));
      
      return { success: true };
    }),
  
  // Criar templates padrÃ£o para um condomÃ­nio
  createDefaults: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const defaultTemplates = [
        {
          nome: "ConvocaÃ§Ã£o de Assembleia",
          titulo: "ðŸ“… Assembleia Geral",
          mensagem: "Prezado morador, vocÃª estÃ¡ convocado para a Assembleia Geral que serÃ¡ realizada em breve. Sua presenÃ§a Ã© fundamental!",
          categoria: 'assembleia' as const,
          icone: "Calendar",
          cor: "#3B82F6",
          urlDestino: "/dashboard/assembleias",
        },
        {
          nome: "Aviso de ManutenÃ§Ã£o",
          titulo: "ðŸ› ï¸ ManutenÃ§Ã£o Programada",
          mensagem: "Informamos que haverÃ¡ manutenÃ§Ã£o nas Ã¡reas comuns. Pedimos desculpas por eventuais transtornos.",
          categoria: 'manutencao' as const,
          icone: "Wrench",
          cor: "#F59E0B",
          urlDestino: "/dashboard/manutencoes",
        },
        {
          nome: "Lembrete de Vencimento",
          titulo: "ðŸ’° Taxa Condominial",
          mensagem: "Lembrete: A taxa condominial vence em breve. Evite multas e juros realizando o pagamento atÃ© a data de vencimento.",
          categoria: 'vencimento' as const,
          icone: "DollarSign",
          cor: "#10B981",
          urlDestino: "/dashboard/financeiro",
        },
        {
          nome: "Aviso Geral",
          titulo: "ðŸ“¢ Aviso Importante",
          mensagem: "AtenÃ§Ã£o moradores! Temos um comunicado importante para vocÃª. Confira os detalhes no app.",
          categoria: 'aviso' as const,
          icone: "Bell",
          cor: "#8B5CF6",
          urlDestino: "/dashboard/avisos",
        },
        {
          nome: "Evento no CondomÃ­nio",
          titulo: "ðŸŽ‰ Evento Especial",
          mensagem: "VocÃª estÃ¡ convidado para um evento especial no condomÃ­nio! NÃ£o perca!",
          categoria: 'evento' as const,
          icone: "PartyPopper",
          cor: "#EC4899",
          urlDestino: "/dashboard/eventos",
        },
      ];
      
      for (const template of defaultTemplates) {
        await db.insert(templatesNotificacao).values({
          condominioId: input.condominioId,
          ...template,
        });
      }
      
      return { success: true, count: defaultTemplates.length };
    }),
});

