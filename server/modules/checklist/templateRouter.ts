import { z } from "zod";
import { eq, desc, and, or, asc } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  checklistTemplates, 
  checklistTemplateItens 
} from "../../../drizzle/schema";

export const checklistTemplateRouter = router({
    list: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        
        const templates = await db.select().from(checklistTemplates)
          .where(and(
            or(
              eq(checklistTemplates.condominioId, input.condominioId),
              eq(checklistTemplates.isPadrao, true)
            ),
            eq(checklistTemplates.ativo, true)
          ))
          .orderBy(desc(checklistTemplates.createdAt));
        
        // Buscar itens de cada template
        const templatesComItens = await Promise.all(
          templates.map(async (template) => {
            const itens = await db.select().from(checklistTemplateItens)
              .where(eq(checklistTemplateItens.templateId, template.id))
              .orderBy(asc(checklistTemplateItens.ordem));
            return { ...template, itens };
          })
        );
        
        return templatesComItens;
      }),

    create: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
        categoria: z.string().optional(),
        cor: z.string().optional(),
        itens: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(checklistTemplates).values({
          condominioId: input.condominioId,
          nome: input.nome,
          descricao: input.descricao,
          categoria: input.categoria,
          cor: input.cor || "#f97316",
          isPadrao: false,
          ativo: true,
        }).returning();
        
        const templateId = result.id;
        
        // Adicionar itens
        if (input.itens && input.itens.length > 0) {
          for (let i = 0; i < input.itens.length; i++) {
            await db.insert(checklistTemplateItens).values({
              templateId,
              descricao: input.itens[i],
              ordem: i,
            }).returning();
          }
        }
        
        return { success: true, id: templateId };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(checklistTemplates)
          .set({ ativo: false })
          .where(eq(checklistTemplates.id, input.id));
        
        return { success: true };
      }),

    duplicate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar template original
        const [original] = await db.select().from(checklistTemplates)
          .where(eq(checklistTemplates.id, input.id));
        
        if (!original) throw new Error("Template não encontrado");
        
        // Criar cópia
        const [result] = await db.insert(checklistTemplates).values({
          condominioId: original.condominioId,
          nome: `${original.nome} (Cópia)`,
          descricao: original.descricao,
          categoria: original.categoria,
          cor: original.cor,
          isPadrao: false,
          ativo: true,
        }).returning();
        
        const newTemplateId = result.id;
        
        // Copiar itens
        const itens = await db.select().from(checklistTemplateItens)
          .where(eq(checklistTemplateItens.templateId, input.id));
        
        for (const item of itens) {
          await db.insert(checklistTemplateItens).values({
            templateId: newTemplateId,
            descricao: item.descricao,
            ordem: item.ordem,
          }).returning();
        }
        
        return { success: true, id: newTemplateId };
      }),
  });