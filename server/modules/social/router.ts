import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { caronas, moradores } from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const caronaRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(caronas)
        .where(eq(caronas.condominioId, input.condominioId))
        .orderBy(desc(caronas.dataCarona));
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["oferece", "procura"]),
      origem: z.string().min(1),
      destino: z.string().min(1),
      dataCarona: z.date().optional(),
      horario: z.string().optional(),
      vagasDisponiveis: z.number().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(caronas).values({
        ...input,
        usuarioId: ctx.user.id,
      }).returning();
      return { id: Number(result.id) };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["ativa", "concluida", "cancelada"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(caronas)
        .set({ status: input.status })
        .where(eq(caronas.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(caronas).where(eq(caronas.id, input.id));
      return { success: true };
    }),

  // ==================== PORTAL DO MORADOR ====================
  
  // Listar caronas do morador
  listByMorador: publicProcedure
    .input(z.object({ moradorId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(caronas)
        .where(eq(caronas.moradorId, input.moradorId))
        .orderBy(desc(caronas.createdAt));
    }),

  // Criar carona pelo morador
  createByMorador: publicProcedure
    .input(z.object({
      token: z.string(),
      origem: z.string().min(1),
      destino: z.string().min(1),
      data: z.date().optional(),
      horario: z.string().optional(),
      vagas: z.number().optional(),
      tipo: z.enum(["ofereco", "procuro"]),
      observacoes: z.string().optional(),
      contato: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Verificar token do morador
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.loginToken, input.token),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      if (!morador) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }
      
      const { token, data, vagas, tipo, ...rest } = input;
      const [result] = await db.insert(caronas).values({
        ...rest,
        tipo: tipo === "ofereco" ? "oferece" : "procura",
        dataCarona: data,
        vagasDisponiveis: vagas,
        condominioId: morador.condominioId,
        moradorId: morador.id,
        status: "ativa",
      }).returning();
      return { id: Number(result.id) };
    }),

  // Excluir carona pelo morador
  deleteByMorador: publicProcedure
    .input(z.object({
      token: z.string(),
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Verificar token do morador
      const [morador] = await db.select().from(moradores)
        .where(and(
          eq(moradores.loginToken, input.token),
          eq(moradores.ativo, true)
        ))
        .limit(1);
      
      if (!morador) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }
      
      // Verificar se a carona pertence ao morador
      const [carona] = await db.select().from(caronas)
        .where(and(
          eq(caronas.id, input.id),
          eq(caronas.moradorId, morador.id)
        ))
        .limit(1);
      
      if (!carona) {
        throw new Error("Carona não encontrada ou não pertence a você.");
      }
      
      await db.delete(caronas).where(eq(caronas.id, input.id));
      return { success: true };
    }),
});
