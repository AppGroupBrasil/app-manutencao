
import { z } from "zod";
import { publicProcedure, moduloUserProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { getDb } from "../../db";
import { albuns, fotos } from "../../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

// Exige o modulo "galeria" habilitado e valida o dono do registro.
// Album tem condominioId; foto herda do album.
const galeriaProcedure = moduloUserProcedure(
  "galeria",
  escopoPorRegistro({
    id: direto(albuns),
    albumId: direto(albuns),
  }),
);

const fotoProcedure = moduloUserProcedure(
  "galeria",
  escopoPorRegistro({
    id: via(fotos, "albumId", albuns),
    albumId: direto(albuns),
  }),
);

export const albumRouter = router({
  list: galeriaProcedure
    .input(z.object({ condominioId: z.number(), categoria: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.categoria) {
        return db.select().from(albuns)
          .where(and(
            eq(albuns.condominioId, input.condominioId),
            eq(albuns.categoria, input.categoria as any),
            eq(albuns.ativo, true)
          ))
          .orderBy(desc(albuns.createdAt));
      }
      return db.select().from(albuns)
        .where(and(
          eq(albuns.condominioId, input.condominioId),
          eq(albuns.ativo, true)
        ))
        .orderBy(desc(albuns.createdAt));
    }),

  listPublic: publicProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(albuns)
        .where(and(
          eq(albuns.condominioId, input.condominioId),
          eq(albuns.ativo, true)
        ))
        .orderBy(desc(albuns.createdAt));
    }),

  getById: galeriaProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(albuns)
        .where(eq(albuns.id, input.id))
        .limit(1);
      return result[0] || null;
    }),

  getByIdWithFotos: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const albumResult = await db.select().from(albuns)
        .where(eq(albuns.id, input.id))
        .limit(1);
      if (!albumResult[0]) return null;
      
      const fotosResult = await db.select().from(fotos)
        .where(eq(fotos.albumId, input.id))
        .orderBy(fotos.ordem);
      
      return {
        ...albumResult[0],
        fotos: fotosResult
      };
    }),

  create: galeriaProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      categoria: z.enum(["eventos", "obras", "areas_comuns", "melhorias", "outros"]),
      capaUrl: z.string().optional(),
      dataEvento: z.date().optional(),
      destaque: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(albuns).values(input).returning();
      return { id: Number(result.id) };
    }),

  update: galeriaProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).optional(),
      descricao: z.string().optional(),
      categoria: z.enum(["eventos", "obras", "areas_comuns", "melhorias", "outros"]).optional(),
      capaUrl: z.string().optional(),
      dataEvento: z.date().optional(),
      destaque: z.boolean().optional(),
      ativo: z.boolean().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(albuns).set(data).where(eq(albuns.id, id));
      return { success: true };
    }),

  delete: galeriaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Primeiro deletar todas as fotos do Ã¡lbum
      await db.delete(fotos).where(eq(fotos.albumId, input.id));
      // Depois deletar o Ã¡lbum
      await db.delete(albuns).where(eq(albuns.id, input.id));
      return { success: true };
    }),

  stats: galeriaProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0, porCategoria: {} };
      
      const albunsResult = await db.select().from(albuns)
        .where(and(
          eq(albuns.condominioId, input.condominioId),
          eq(albuns.ativo, true)
        ));
      
      const porCategoria: Record<string, number> = {};
      albunsResult.forEach(album => {
        porCategoria[album.categoria] = (porCategoria[album.categoria] || 0) + 1;
      });
      
      return {
        total: albunsResult.length,
        porCategoria
      };
    }),
});

export const fotoRouter = router({
  list: fotoProcedure
    .input(z.object({ albumId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(fotos)
        .where(eq(fotos.albumId, input.albumId))
        .orderBy(fotos.ordem);
    }),

  create: fotoProcedure
    .input(z.object({
      albumId: z.number(),
      url: z.string().min(1),
      legenda: z.string().optional(),
      ordem: z.number().optional(),
      largura: z.number().optional(),
      altura: z.number().optional(),
      tamanho: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(fotos).values(input).returning();
      return { id: Number(result.id) };
    }),

  createMultiple: fotoProcedure
    .input(z.object({
      albumId: z.number(),
      fotos: z.array(z.object({
        url: z.string().min(1),
        legenda: z.string().optional(),
        ordem: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const fotosToInsert = input.fotos.map((foto, index) => ({
        albumId: input.albumId,
        url: foto.url,
        legenda: foto.legenda,
        ordem: foto.ordem ?? index,
      }));
      
      await db.insert(fotos).values(fotosToInsert).returning();
      return { success: true, count: fotosToInsert.length };
    }),

  update: fotoProcedure
    .input(z.object({
      id: z.number(),
      legenda: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(fotos).set(data).where(eq(fotos.id, id));
      return { success: true };
    }),

  delete: fotoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(fotos).where(eq(fotos.id, input.id));
      return { success: true };
    }),

  reorder: fotoProcedure
    .input(z.object({
      fotos: z.array(z.object({
        id: z.number(),
        ordem: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      for (const foto of input.fotos) {
        await db.update(fotos)
          .set({ ordem: foto.ordem })
          .where(eq(fotos.id, foto.id));
      }
      return { success: true };
    }),
});

