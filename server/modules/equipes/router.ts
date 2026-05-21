import { z } from "zod";
import { getDb } from "../../db";
import { equipes, equipeFuncionarios, funcionarios } from "../../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";

export const equipesRouter = router({
  /** Lista equipes ativas do condominioId com contagem de membros */
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: equipes.id,
          nome: equipes.nome,
          descricao: equipes.descricao,
          cor: equipes.cor,
          createdAt: equipes.createdAt,
          totalMembros: sql<number>`(SELECT COUNT(*) FROM equipe_funcionarios WHERE equipeId = ${equipes.id})`,
        })
        .from(equipes)
        .where(and(eq(equipes.condominioId, input.condominioId), eq(equipes.ativo, true)))
        .orderBy(equipes.nome);
      return rows;
    }),

  /** Cria nova equipe */
  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1).max(255),
      descricao: z.string().optional(),
      cor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const [result] = await db.insert(equipes).values({
        condominioId: input.condominioId,
        nome: input.nome,
        descricao: input.descricao || null,
        cor: input.cor || "#3b82f6",
      }).returning();
      return { id: result.id };
    }),

  /** Atualiza nome/descrição/cor de uma equipe */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).max(255).optional(),
      descricao: z.string().optional(),
      cor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const { id, ...data } = input;
      await db.update(equipes).set(data).where(eq(equipes.id, id));
      return { ok: true };
    }),

  /** Soft-delete de equipe */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.update(equipes).set({ ativo: false }).where(eq(equipes.id, input.id));
      return { ok: true };
    }),

  /** Lista funcionários de uma equipe (com dados do funcionário) */
  membros: protectedProcedure
    .input(z.object({ equipeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: equipeFuncionarios.id,
          funcionarioId: funcionarios.id,
          nome: funcionarios.nome,
          cargo: funcionarios.cargo,
          telefone: funcionarios.telefone,
          fotoUrl: funcionarios.fotoUrl,
          tipoFuncionario: funcionarios.tipoFuncionario,
        })
        .from(equipeFuncionarios)
        .innerJoin(funcionarios, eq(equipeFuncionarios.funcionarioId, funcionarios.id))
        .where(eq(equipeFuncionarios.equipeId, input.equipeId))
        .orderBy(funcionarios.nome);
    }),

  /** Adiciona funcionários a uma equipe (ignora duplicados) */
  addMembros: protectedProcedure
    .input(z.object({
      equipeId: z.number(),
      funcionarioIds: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      // Busca os que já existem para evitar duplicados
      const existing = await db
        .select({ funcionarioId: equipeFuncionarios.funcionarioId })
        .from(equipeFuncionarios)
        .where(eq(equipeFuncionarios.equipeId, input.equipeId));
      const existingSet = new Set(existing.map(e => e.funcionarioId));
      const toInsert = input.funcionarioIds.filter(id => !existingSet.has(id));
      if (toInsert.length > 0) {
        await db.insert(equipeFuncionarios).values(
          toInsert.map(fId => ({ equipeId: input.equipeId, funcionarioId: fId }))
        ).returning();
      }
      return { added: toInsert.length };
    }),

  /** Remove funcionário de uma equipe */
  removeMembro: protectedProcedure
    .input(z.object({
      equipeId: z.number(),
      funcionarioId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.delete(equipeFuncionarios).where(
        and(
          eq(equipeFuncionarios.equipeId, input.equipeId),
          eq(equipeFuncionarios.funcionarioId, input.funcionarioId),
        )
      );
      return { ok: true };
    }),
});
