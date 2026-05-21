
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { anunciantes, anuncios } from "../../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const anuncianteRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(anunciantes)
        .where(eq(anunciantes.condominioId, input.condominioId))
        .orderBy(desc(anunciantes.createdAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(anunciantes)
        .where(eq(anunciantes.id, input.id))
        .limit(1);
      return result[0] || null;
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1),
      descricao: z.string().optional(),
      categoria: z.enum(["comercio", "servicos", "profissionais", "alimentacao", "saude", "educacao", "outros"]),
      logoUrl: z.string().optional(),
      telefone: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      endereco: z.string().optional(),
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      horarioFuncionamento: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(anunciantes).values(input).returning();
      return { id: Number(result.id) };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      descricao: z.string().optional(),
      categoria: z.enum(["comercio", "servicos", "profissionais", "alimentacao", "saude", "educacao", "outros"]).optional(),
      logoUrl: z.string().optional(),
      telefone: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      endereco: z.string().optional(),
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      horarioFuncionamento: z.string().optional(),
      status: z.enum(["ativo", "inativo"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(anunciantes).set(data).where(eq(anunciantes.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(anunciantes).where(eq(anunciantes.id, input.id));
      return { success: true };
    }),
});

export const anuncioRouter = router({
  list: protectedProcedure
    .input(z.object({ anuncianteId: z.number().optional(), revistaId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.anuncianteId) {
        return db.select().from(anuncios)
          .where(eq(anuncios.anuncianteId, input.anuncianteId))
          .orderBy(desc(anuncios.createdAt));
      }
      if (input.revistaId) {
        return db.select().from(anuncios)
          .where(eq(anuncios.revistaId, input.revistaId))
          .orderBy(desc(anuncios.createdAt));
      }
      return db.select().from(anuncios).orderBy(desc(anuncios.createdAt));
    }),

  listByCondominioAtivos: publicProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const result = await db.select({
        anuncio: anuncios,
        anunciante: anunciantes,
      })
        .from(anuncios)
        .innerJoin(anunciantes, eq(anuncios.anuncianteId, anunciantes.id))
        .where(and(
          eq(anunciantes.condominioId, input.condominioId),
          eq(anuncios.status, "ativo")
        ))
        .orderBy(desc(anuncios.createdAt));
      return result;
    }),

  create: protectedProcedure
    .input(z.object({
      anuncianteId: z.number(),
      revistaId: z.number().optional(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      bannerUrl: z.string().optional(),
      linkDestino: z.string().optional(),
      posicao: z.enum(["capa", "contracapa", "pagina_interna", "rodape", "lateral"]),
      tamanho: z.enum(["pequeno", "medio", "grande", "pagina_inteira"]),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(anuncios).values({
        ...input,
        status: "ativo",
      }).returning();
      return { id: Number(result.id) };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).optional(),
      descricao: z.string().optional(),
      bannerUrl: z.string().optional(),
      linkDestino: z.string().optional(),
      posicao: z.enum(["capa", "contracapa", "pagina_interna", "rodape", "lateral"]).optional(),
      tamanho: z.enum(["pequeno", "medio", "grande", "pagina_inteira"]).optional(),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
      status: z.enum(["ativo", "pausado", "expirado", "pendente"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(anuncios).set(data).where(eq(anuncios.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(anuncios).where(eq(anuncios.id, input.id));
      return { success: true };
    }),

  registrarVisualizacao: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const anuncio = await db.select().from(anuncios).where(eq(anuncios.id, input.id)).limit(1);
      if (anuncio[0]) {
        await db.update(anuncios)
          .set({ visualizacoes: (anuncio[0].visualizacoes || 0) + 1 })
          .where(eq(anuncios.id, input.id));
      }
      return { success: true };
    }),

  registrarClique: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const anuncio = await db.select().from(anuncios).where(eq(anuncios.id, input.id)).limit(1);
      if (anuncio[0]) {
        await db.update(anuncios)
          .set({ cliques: (anuncio[0].cliques || 0) + 1 })
          .where(eq(anuncios.id, input.id));
      }
      return { success: true };
    }),
});

