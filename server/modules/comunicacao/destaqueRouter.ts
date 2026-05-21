
import { z } from "zod";
import { getDb } from "../../db";
import { 
  destaques, 
  imagensDestaques, 
  paginasCustom 
} from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { nanoid } from "nanoid";

export const destaqueRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const destaquesData = await db.select().from(destaques)
        .where(eq(destaques.condominioId, input.condominioId))
        .orderBy(destaques.ordem);
      
      // Buscar imagens para cada destaque
      const destaquesComImagens = await Promise.all(
        destaquesData.map(async (destaque) => {
          const imagens = await db.select().from(imagensDestaques)
            .where(eq(imagensDestaques.destaqueId, destaque.id))
            .orderBy(imagensDestaques.ordem);
          return { ...destaque, imagens };
        })
      );
      
      return destaquesComImagens;
    }),

  listAtivos: publicProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const destaquesData = await db.select().from(destaques)
        .where(and(
          eq(destaques.condominioId, input.condominioId),
          eq(destaques.ativo, true)
        ))
        .orderBy(destaques.ordem);
      
      // Buscar imagens para cada destaque
      const destaquesComImagens = await Promise.all(
        destaquesData.map(async (destaque) => {
          const imagens = await db.select().from(imagensDestaques)
            .where(eq(imagensDestaques.destaqueId, destaque.id))
            .orderBy(imagensDestaques.ordem);
          return { ...destaque, imagens };
        })
      );
      
      return destaquesComImagens;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const result = await db.select().from(destaques)
        .where(eq(destaques.id, input.id))
        .limit(1);
      
      if (!result[0]) return null;
      
      const imagens = await db.select().from(imagensDestaques)
        .where(eq(imagensDestaques.destaqueId, input.id))
        .orderBy(imagensDestaques.ordem);
      
      return { ...result[0], imagens };
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string().min(1),
      subtitulo: z.string().optional(),
      descricao: z.string().optional(),
      link: z.string().optional(),
      arquivoUrl: z.string().optional(),
      arquivoNome: z.string().optional(),
      videoUrl: z.string().optional(),
      ordem: z.number().optional(),
      ativo: z.boolean().optional(),
      imagens: z.array(z.object({
        url: z.string(),
        legenda: z.string().optional(),
        ordem: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { imagens, ...destaqueData } = input;
      
      const [result] = await db.insert(destaques).values({
        condominioId: destaqueData.condominioId,
        titulo: destaqueData.titulo,
        subtitulo: destaqueData.subtitulo || null,
        descricao: destaqueData.descricao || null,
        link: destaqueData.link || null,
        arquivoUrl: destaqueData.arquivoUrl || null,
        arquivoNome: destaqueData.arquivoNome || null,
        videoUrl: destaqueData.videoUrl || null,
        ordem: destaqueData.ordem || 0,
        ativo: destaqueData.ativo !== undefined ? destaqueData.ativo : true,
      }).returning();
      
      const destaqueId = Number(result.id);
      
      // Inserir imagens se houver
      if (imagens && imagens.length > 0) {
        await db.insert(imagensDestaques).values(
          imagens.map((img, index) => ({
            destaqueId,
            url: img.url,
            legenda: img.legenda || null,
            ordem: img.ordem !== undefined ? img.ordem : index,
          }))
        ).returning();
      }
      
      return { id: destaqueId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).optional(),
      subtitulo: z.string().optional(),
      descricao: z.string().optional(),
      link: z.string().optional(),
      arquivoUrl: z.string().optional(),
      arquivoNome: z.string().optional(),
      videoUrl: z.string().optional(),
      ordem: z.number().optional(),
      ativo: z.boolean().optional(),
      imagens: z.array(z.object({
        url: z.string(),
        legenda: z.string().optional(),
        ordem: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, imagens, ...updateData } = input;
      
      // Atualizar destaque
      const fieldsToUpdate: Record<string, unknown> = {};
      if (updateData.titulo !== undefined) fieldsToUpdate.titulo = updateData.titulo;
      if (updateData.subtitulo !== undefined) fieldsToUpdate.subtitulo = updateData.subtitulo || null;
      if (updateData.descricao !== undefined) fieldsToUpdate.descricao = updateData.descricao || null;
      if (updateData.link !== undefined) fieldsToUpdate.link = updateData.link || null;
      if (updateData.arquivoUrl !== undefined) fieldsToUpdate.arquivoUrl = updateData.arquivoUrl || null;
      if (updateData.arquivoNome !== undefined) fieldsToUpdate.arquivoNome = updateData.arquivoNome || null;
      if (updateData.videoUrl !== undefined) fieldsToUpdate.videoUrl = updateData.videoUrl || null;
      if (updateData.ordem !== undefined) fieldsToUpdate.ordem = updateData.ordem;
      if (updateData.ativo !== undefined) fieldsToUpdate.ativo = updateData.ativo;
      
      if (Object.keys(fieldsToUpdate).length > 0) {
        await db.update(destaques).set(fieldsToUpdate).where(eq(destaques.id, id));
      }
      
      // Atualizar imagens se fornecidas
      if (imagens !== undefined) {
        // Remover imagens antigas
        await db.delete(imagensDestaques).where(eq(imagensDestaques.destaqueId, id));
        
        // Inserir novas imagens
        if (imagens.length > 0) {
          await db.insert(imagensDestaques).values(
            imagens.map((img, index) => ({
              destaqueId: id,
              url: img.url,
              legenda: img.legenda || null,
              ordem: img.ordem !== undefined ? img.ordem : index,
            }))
          ).returning();
        }
      }
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Remover imagens primeiro
      await db.delete(imagensDestaques).where(eq(imagensDestaques.destaqueId, input.id));
      
      // Remover destaque
      await db.delete(destaques).where(eq(destaques.id, input.id));
      
      return { success: true };
    }),

  // Reordenar destaques
  reorder: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.number(),
        ordem: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      for (const item of input.items) {
        await db.update(destaques).set({ ordem: item.ordem }).where(eq(destaques.id, item.id));
      }
      
      return { success: true };
    }),

  // Toggle ativo
  toggleAtivo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const current = await db.select().from(destaques).where(eq(destaques.id, input.id)).limit(1);
      if (!current[0]) throw new Error("Destaque nÃ£o encontrado");
      
      await db.update(destaques).set({ ativo: !current[0].ativo }).where(eq(destaques.id, input.id));
      
      return { success: true, ativo: !current[0].ativo };
    }),
});

export const paginaCustomRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(paginasCustom)
        .where(eq(paginasCustom.condominioId, input.condominioId))
        .orderBy(paginasCustom.ordem, desc(paginasCustom.createdAt));
    }),

  listAtivos: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(paginasCustom)
        .where(and(
          eq(paginasCustom.condominioId, input.condominioId),
          eq(paginasCustom.ativo, true)
        ))
        .orderBy(paginasCustom.ordem, desc(paginasCustom.createdAt));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(paginasCustom).where(eq(paginasCustom.id, input.id)).limit(1);
      return result[0] || null;
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string(),
      subtitulo: z.string().optional(),
      descricao: z.string().optional(),
      link: z.string().optional(),
      videoUrl: z.string().optional(),
      arquivoUrl: z.string().optional(),
      arquivoNome: z.string().optional(),
      imagens: z.array(z.object({ url: z.string(), legenda: z.string().optional() })).optional(),
      ativo: z.boolean().default(true),
      ordem: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const slug = `custom-${nanoid(8)}`;
      // @ts-ignore
      const [result] = await db.insert(paginasCustom).values({
        condominioId: input.condominioId,
        titulo: input.titulo,
        slug,
        // @ts-ignore
        conteudo: JSON.stringify({
          subtitulo: input.subtitulo,
          descricao: input.descricao,
          link: input.link,
          videoUrl: input.videoUrl,
          arquivoUrl: input.arquivoUrl,
          arquivoNome: input.arquivoNome,
          imagens: input.imagens || [],
        }),
        ativo: input.ativo,
        ordem: input.ordem,
        criadoPor: ctx.user.id,
      }).returning();
      
      return { id: result.id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      subtitulo: z.string().optional(),
      descricao: z.string().optional(),
      link: z.string().optional(),
      videoUrl: z.string().optional(),
      arquivoUrl: z.string().optional(),
      arquivoNome: z.string().optional(),
      imagens: z.array(z.object({ url: z.string(), legenda: z.string().optional() })).optional(),
      ativo: z.boolean().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const page = await db.select().from(paginasCustom).where(eq(paginasCustom.id, input.id)).limit(1);
      if (!page[0]) throw new Error("PÃ¡gina nÃ£o encontrada");
      
      // @ts-ignore
      const currentContent = JSON.parse(page[0].conteudo as string || '{}');
      
      const newContent = {
        ...currentContent,
        ...(input.subtitulo !== undefined && { subtitulo: input.subtitulo }),
        ...(input.descricao !== undefined && { descricao: input.descricao }),
        ...(input.link !== undefined && { link: input.link }),
        ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl }),
        ...(input.arquivoUrl !== undefined && { arquivoUrl: input.arquivoUrl }),
        ...(input.arquivoNome !== undefined && { arquivoNome: input.arquivoNome }),
        ...(input.imagens !== undefined && { imagens: input.imagens }),
      };

      const updateData: any = {};
      if (input.titulo) updateData.titulo = input.titulo;
      if (input.ativo !== undefined) updateData.ativo = input.ativo;
      if (input.ordem !== undefined) updateData.ordem = input.ordem;
      // @ts-ignore
      updateData.conteudo = JSON.stringify(newContent);
      
      await db.update(paginasCustom).set(updateData).where(eq(paginasCustom.id, input.id));
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(paginasCustom).where(eq(paginasCustom.id, input.id));
      return { success: true };
    }),

  toggleAtivo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [page] = await db.select().from(paginasCustom).where(eq(paginasCustom.id, input.id)).limit(1);
      if (!page) throw new Error("Página não encontrada");
      await db.update(paginasCustom).set({ ativo: !page.ativo }).where(eq(paginasCustom.id, input.id));
      return { success: true, ativo: !page.ativo };
    }),
});

