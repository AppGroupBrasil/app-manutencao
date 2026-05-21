import { protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { publicidades, realizacoes, melhorias, aquisicoes, antesDepois, imagensRealizacoes, imagensMelhorias, imagensAquisicoes } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const publicidadeRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(publicidades)
        .where(eq(publicidades.condominioId, input.condominioId));
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      anunciante: z.string().min(1),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      imagemUrl: z.string().optional(),
      linkUrl: z.string().optional(),
      telefone: z.string().optional(),
      tipo: z.enum(["banner", "destaque", "lateral"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(publicidades).values(input).returning();
      return { id: Number(result.id) };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(publicidades).where(eq(publicidades.id, input.id));
      return { success: true };
    }),
});

export const realizacaoRouter = router({
  list: protectedProcedure
    .input(z.object({ revistaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(realizacoes)
        .where(eq(realizacoes.revistaId, input.revistaId))
        .orderBy(desc(realizacoes.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      revistaId: z.number(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      imagemUrl: z.string().optional(),
      dataRealizacao: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(realizacoes).values(input).returning();
      return { id: Number(result.id) };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(realizacoes).where(eq(realizacoes.id, input.id));
      return { success: true };
    }),
});

export const melhoriaRouter = router({
  list: protectedProcedure
    .input(z.object({ revistaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(melhorias)
        .where(eq(melhorias.revistaId, input.revistaId))
        .orderBy(desc(melhorias.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      revistaId: z.number(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      imagemUrl: z.string().optional(),
      custo: z.string().optional(),
      dataImplementacao: z.date().optional(),
      status: z.enum(["planejada", "em_andamento", "concluida"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(melhorias).values(input).returning();
      return { id: Number(result.id) };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(melhorias).where(eq(melhorias.id, input.id));
      return { success: true };
    }),
});

export const aquisicaoRouter = router({
  list: protectedProcedure
    .input(z.object({ revistaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(aquisicoes)
        .where(eq(aquisicoes.revistaId, input.revistaId))
        .orderBy(desc(aquisicoes.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      revistaId: z.number(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      imagemUrl: z.string().optional(),
      valor: z.string().optional(),
      fornecedor: z.string().optional(),
      dataAquisicao: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(aquisicoes).values(input).returning();
      return { id: Number(result.id) };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(aquisicoes).where(eq(aquisicoes.id, input.id));
      return { success: true };
    }),
});

export const antesDepoisRouter = router({
  list: protectedProcedure
    .input(z.object({ revistaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(antesDepois)
        .where(eq(antesDepois.revistaId, input.revistaId))
        .orderBy(desc(antesDepois.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      revistaId: z.number(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      fotoAntesUrl: z.string().optional(),
      fotoDepoisUrl: z.string().optional(),
      dataRealizacao: z.date().optional(),
      responsavel: z.string().optional(),
      status: z.enum(["pendente", "em_andamento", "concluido"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(antesDepois).values(input).returning();
      return { id: Number(result.id) };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(antesDepois).where(eq(antesDepois.id, input.id));
      return { success: true };
    }),
});

export const imagemRealizacaoRouter = router({
  list: protectedProcedure
    .input(z.object({ realizacaoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(imagensRealizacoes)
        .where(eq(imagensRealizacoes.realizacaoId, input.realizacaoId))
        .orderBy(imagensRealizacoes.ordem);
    }),

  create: protectedProcedure
    .input(z.object({
      realizacaoId: z.number(),
      imagemUrl: z.string().min(1),
      legenda: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(imagensRealizacoes).values(input).returning();
      return { id: Number(result.id) };
    }),

  createMultiple: protectedProcedure
    .input(z.object({
      realizacaoId: z.number(),
      imagens: z.array(z.object({
        imagemUrl: z.string().min(1),
        legenda: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const imagensToInsert = input.imagens.map((img, index) => ({
        realizacaoId: input.realizacaoId,
        imagemUrl: img.imagemUrl,
        legenda: img.legenda,
        ordem: index,
      }));
      await db.insert(imagensRealizacoes).values(imagensToInsert).returning();
      return { success: true, count: imagensToInsert.length };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensRealizacoes).where(eq(imagensRealizacoes.id, input.id));
      return { success: true };
    }),

  deleteAll: protectedProcedure
    .input(z.object({ realizacaoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensRealizacoes).where(eq(imagensRealizacoes.realizacaoId, input.realizacaoId));
      return { success: true };
    }),
});

export const imagemMelhoriaRouter = router({
  list: protectedProcedure
    .input(z.object({ melhoriaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(imagensMelhorias)
        .where(eq(imagensMelhorias.melhoriaId, input.melhoriaId))
        .orderBy(imagensMelhorias.ordem);
    }),

  create: protectedProcedure
    .input(z.object({
      melhoriaId: z.number(),
      imagemUrl: z.string().min(1),
      legenda: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(imagensMelhorias).values(input).returning();
      return { id: Number(result.id) };
    }),

  createMultiple: protectedProcedure
    .input(z.object({
      melhoriaId: z.number(),
      imagens: z.array(z.object({
        imagemUrl: z.string().min(1),
        legenda: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const imagensToInsert = input.imagens.map((img, index) => ({
        melhoriaId: input.melhoriaId,
        imagemUrl: img.imagemUrl,
        legenda: img.legenda,
        ordem: index,
      }));
      await db.insert(imagensMelhorias).values(imagensToInsert).returning();
      return { success: true, count: imagensToInsert.length };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensMelhorias).where(eq(imagensMelhorias.id, input.id));
      return { success: true };
    }),

  deleteAll: protectedProcedure
    .input(z.object({ melhoriaId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensMelhorias).where(eq(imagensMelhorias.melhoriaId, input.melhoriaId));
      return { success: true };
    }),
});

export const imagemAquisicaoRouter = router({
  list: protectedProcedure
    .input(z.object({ aquisicaoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(imagensAquisicoes)
        .where(eq(imagensAquisicoes.aquisicaoId, input.aquisicaoId))
        .orderBy(imagensAquisicoes.ordem);
    }),

  create: protectedProcedure
    .input(z.object({
      aquisicaoId: z.number(),
      imagemUrl: z.string().min(1),
      legenda: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(imagensAquisicoes).values(input).returning();
      return { id: Number(result.id) };
    }),

  createMultiple: protectedProcedure
    .input(z.object({
      aquisicaoId: z.number(),
      imagens: z.array(z.object({
        imagemUrl: z.string().min(1),
        legenda: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const imagensToInsert = input.imagens.map((img, index) => ({
        aquisicaoId: input.aquisicaoId,
        imagemUrl: img.imagemUrl,
        legenda: img.legenda,
        ordem: index,
      }));
      await db.insert(imagensAquisicoes).values(imagensToInsert).returning();
      return { success: true, count: imagensToInsert.length };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensAquisicoes).where(eq(imagensAquisicoes.id, input.id));
      return { success: true };
    }),

  deleteAll: protectedProcedure
    .input(z.object({ aquisicaoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensAquisicoes).where(eq(imagensAquisicoes.aquisicaoId, input.aquisicaoId));
      return { success: true };
    }),
});
