
import { z } from "zod";
import { moduloUserProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { getDb } from "../../db";
import { achadosPerdidos, imagensAchadosPerdidos } from "../../../drizzle/schema";
import { eq, desc, asc } from "drizzle-orm";

// Exige o modulo "achados-perdidos" habilitado e valida o dono do registro.
const achadoProcedure = moduloUserProcedure(
  "achados-perdidos",
  escopoPorRegistro({
    id: direto(achadosPerdidos),
    achadoPerdidoId: direto(achadosPerdidos),
  }),
);

const imagemAchadoProcedure = moduloUserProcedure(
  "achados-perdidos",
  escopoPorRegistro({
    id: via(imagensAchadosPerdidos, "achadoPerdidoId", achadosPerdidos),
    achadoPerdidoId: direto(achadosPerdidos),
  }),
);

export const achadoPerdidoRouter = router({
  list: achadoProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(achadosPerdidos)
        .where(eq(achadosPerdidos.condominioId, input.condominioId))
        .orderBy(desc(achadosPerdidos.createdAt));
    }),

  create: achadoProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["achado", "perdido"]),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      fotoUrl: z.string().optional(),
      localEncontrado: z.string().optional(),
      dataOcorrencia: z.date().optional(),
      contato: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(achadosPerdidos).values({
        ...input,
        usuarioId: ctx.user.id,
      }).returning();
      return { id: Number(result.id) };
    }),

  resolver: achadoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(achadosPerdidos)
        .set({ status: "resolvido" })
        .where(eq(achadosPerdidos.id, input.id));
      return { success: true };
    }),

  delete: achadoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(achadosPerdidos).where(eq(achadosPerdidos.id, input.id));
      return { success: true };
    }),

  addImagem: achadoProcedure
    .input(z.object({
      achadoPerdidoId: z.number(),
      imagemUrl: z.string(),
      legenda: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(imagensAchadosPerdidos).values(input).returning();
      return { id: Number(result.id) };
    }),

  listImagens: achadoProcedure
    .input(z.object({ achadoPerdidoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(imagensAchadosPerdidos)
        .where(eq(imagensAchadosPerdidos.achadoPerdidoId, input.achadoPerdidoId))
        .orderBy(asc(imagensAchadosPerdidos.ordem));
    }),
});

export const imagemAchadoPerdidoRouter = router({
  list: imagemAchadoProcedure
    .input(z.object({ achadoPerdidoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(imagensAchadosPerdidos)
        .where(eq(imagensAchadosPerdidos.achadoPerdidoId, input.achadoPerdidoId))
        .orderBy(imagensAchadosPerdidos.ordem);
    }),

  create: imagemAchadoProcedure
    .input(z.object({
      achadoPerdidoId: z.number(),
      imagemUrl: z.string().min(1),
      legenda: z.string().optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(imagensAchadosPerdidos).values(input).returning();
      return { id: Number(result.id) };
    }),

  createMultiple: imagemAchadoProcedure
    .input(z.object({
      achadoPerdidoId: z.number(),
      imagens: z.array(z.object({
        imagemUrl: z.string().min(1),
        legenda: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const imagensToInsert = input.imagens.map((img, index) => ({
        achadoPerdidoId: input.achadoPerdidoId,
        imagemUrl: img.imagemUrl,
        legenda: img.legenda,
        ordem: index,
      }));
      await db.insert(imagensAchadosPerdidos).values(imagensToInsert).returning();
      return { success: true, count: imagensToInsert.length };
    }),

  delete: imagemAchadoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensAchadosPerdidos).where(eq(imagensAchadosPerdidos.id, input.id));
      return { success: true };
    }),

  deleteAll: imagemAchadoProcedure
    .input(z.object({ achadoPerdidoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(imagensAchadosPerdidos).where(eq(imagensAchadosPerdidos.achadoPerdidoId, input.achadoPerdidoId));
      return { success: true };
    }),
});

