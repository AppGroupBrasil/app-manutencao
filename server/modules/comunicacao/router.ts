
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { comunicados } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { storagePut } from "../../storage";

export const comunicadoRouter = router({
  list: protectedProcedure
    .input(z.object({ revistaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(comunicados)
        .where(eq(comunicados.revistaId, input.revistaId))
        .orderBy(desc(comunicados.createdAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(comunicados)
        .where(eq(comunicados.id, input.id))
        .limit(1);
      return result[0] || null;
    }),

  create: protectedProcedure
    .input(z.object({
      revistaId: z.number(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      anexoUrl: z.string().optional(),
      anexoNome: z.string().optional(),
      anexoTipo: z.string().optional(),
      anexoTamanho: z.number().optional(),
      destaque: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(comunicados).values(input).returning();
      return { id: Number(result.id) };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).optional(),
      descricao: z.string().optional(),
      anexoUrl: z.string().optional(),
      anexoNome: z.string().optional(),
      anexoTipo: z.string().optional(),
      anexoTamanho: z.number().optional(),
      destaque: z.boolean().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(comunicados).set(data).where(eq(comunicados.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(comunicados).where(eq(comunicados.id, input.id));
      return { success: true };
    }),

  // Upload de anexo
  uploadAnexo: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileData: z.string(), // Base64
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileData, 'base64');
      const fileKey = `comunicados/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, "image/jpeg");
      return { url, fileName: input.fileName, fileType: input.fileType, fileSize: buffer.length };
    }),
});

