import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { classificados, moradores, users } from "../../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const classificadoRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = db.select().from(classificados)
        .where(eq(classificados.condominioId, input.condominioId));
      return query.orderBy(desc(classificados.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["produto", "servico"]),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      preco: z.string().optional(),
      fotoUrl: z.string().optional(),
      contato: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(classificados).values({
        ...input,
        usuarioId: ctx.user.id,
      }).returning();
      return { id: Number(result.id) };
    }),

  moderar: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["aprovado", "rejeitado"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(classificados)
        .set({ status: input.status })
        .where(eq(classificados.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(classificados).where(eq(classificados.id, input.id));
      return { success: true };
    }),

  // ==================== PORTAL DO MORADOR ====================
  
  // Listar classificados do morador
  listByMorador: publicProcedure
    .input(z.object({ moradorId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(classificados)
        .where(eq(classificados.moradorId, input.moradorId))
        .orderBy(desc(classificados.createdAt));
    }),

  // Criar classificado pelo morador
  createByMorador: publicProcedure
    .input(z.object({
      token: z.string(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      preco: z.number().optional(),
      categoria: z.string().optional(),
      contato: z.string().optional(),
      imagemUrl: z.string().optional(),
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
      
      const { token, preco, ...data } = input;
      const [result] = await db.insert(classificados).values({
        ...data,
        preco: preco ? String(preco) : undefined,
        tipo: "produto",
        condominioId: morador.condominioId,
        moradorId: morador.id,
        status: "pendente",
      }).returning();
      return { id: Number(result.id) };
    }),

  // Excluir classificado pelo morador
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
      
      // Verificar se o classificado pertence ao morador
      const [classificado] = await db.select().from(classificados)
        .where(and(
          eq(classificados.id, input.id),
          eq(classificados.moradorId, morador.id)
        ))
        .limit(1);
      
      if (!classificado) {
        throw new Error("Classificado não encontrado ou não pertence a você.");
      }
      
      await db.delete(classificados).where(eq(classificados.id, input.id));
      return { success: true };
    }),
});

export const classificadoCrudRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(classificados)
        .where(eq(classificados.condominioId, input.condominioId))
        .orderBy(desc(classificados.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["produto", "servico"]),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      preco: z.string().optional(),
      fotoUrl: z.string().optional(),
      contato: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(classificados).values({
        ...input,
        usuarioId: ctx.user.id,
      }).returning();
      return { id: Number(result.id) };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pendente", "aprovado", "rejeitado", "vendido"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(classificados)
        .set({ status: input.status })
        .where(eq(classificados.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(classificados).where(eq(classificados.id, input.id));
      return { success: true };
    }),
});

export const moderacaoRouter = router({
  // Listar classificados pendentes de aprovação
  listPendentes: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        classificado: classificados,
        usuario: {
          id: users.id,
          name: users.name,
          apartment: users.apartment,
        }
      })
        .from(classificados)
        .leftJoin(users, eq(classificados.usuarioId, users.id))
        .where(and(
          eq(classificados.condominioId, input.condominioId),
          eq(classificados.status, "pendente")
        ))
        .orderBy(desc(classificados.createdAt));
    }),

  // Aprovar classificado
  aprovar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(classificados)
        .set({ status: "aprovado" })
        .where(eq(classificados.id, input.id));
      return { success: true };
    }),

  // Rejeitar classificado
  rejeitar: protectedProcedure
    .input(z.object({ id: z.number(), motivo: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(classificados)
        .set({ status: "rejeitado" })
        .where(eq(classificados.id, input.id));
      return { success: true };
    }),

  // Estatísticas de moderação
  stats: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { pendentes: 0, aprovados: 0, rejeitados: 0 };
      
      const pendentes = await db.select({ count: sql<number>`count(*)` })
        .from(classificados)
        .where(and(
          eq(classificados.condominioId, input.condominioId),
          eq(classificados.status, "pendente")
        ));
      
      const aprovados = await db.select({ count: sql<number>`count(*)` })
        .from(classificados)
        .where(and(
          eq(classificados.condominioId, input.condominioId),
          eq(classificados.status, "aprovado")
        ));
      
      const rejeitados = await db.select({ count: sql<number>`count(*)` })
        .from(classificados)
        .where(and(
          eq(classificados.condominioId, input.condominioId),
          eq(classificados.status, "rejeitado")
        ));
      
      return {
        pendentes: Number(pendentes[0]?.count || 0),
        aprovados: Number(aprovados[0]?.count || 0),
        rejeitados: Number(rejeitados[0]?.count || 0),
      };
    }),
});
