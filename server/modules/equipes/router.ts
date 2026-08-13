import { z } from "zod";
import { getDb } from "../../db";
import { equipes, equipeFuncionarios, funcionarios } from "../../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { moduloProcedure, moduloUserProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";

/**
 * Equipes de serviço: o time que recebe a O.S. designada.
 *
 * Diferente de "Equipe de Gestão" (síndico, conselho), que é o módulo `equipe`:
 * aqui são funcionários da unidade agrupados por frente de trabalho — elétrica,
 * hidráulica, jardinagem — e é o supervisor do grupo que recebe o aviso quando
 * a ordem é designada.
 *
 * O router é antigo e vinha sem escopo: qualquer autenticado listava e alterava
 * equipe de qualquer organização passando o id no input. Agora cada id é
 * validado contra as organizações da identidade autenticada.
 */
const escopoEquipes = escopoPorRegistro(
  {
    id: direto(equipes),
    equipeId: direto(equipes),
    funcionarioId: direto(funcionarios),
  },
  {
    // Aqui `funcionarioIds` é uma lista; o mapa por campo não a cobre, e a
    // checagem fica na própria rota.
    addMembros: { equipeId: direto(equipes) },
    removeMembro: { equipeId: direto(equipes), funcionarioId: direto(funcionarios) },
  },
);

/**
 * Consulta: o portal do funcionário também precisa, porque a tela da O.S. é a
 * mesma dos dois lados e mostra a equipe designada. Só usuário quebraria o
 * portal com UNAUTHORIZED.
 */
const equipeConsulta = moduloProcedure("equipes", escopoEquipes);

/** Montar e desfazer equipe é decisão de quem responde pela organização. */
const equipeProcedure = moduloUserProcedure("equipes", escopoEquipes);

export const equipesRouter = router({
  /** Equipes ativas da organização, com a contagem de membros. */
  list: equipeConsulta
    .input(z.object({ condominioId: z.number().optional() }).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: equipes.id,
          nome: equipes.nome,
          descricao: equipes.descricao,
          cor: equipes.cor,
          createdAt: equipes.createdAt,
          totalMembros: sql<number>`(
            SELECT COUNT(*) FROM "equipe_funcionarios" ef
            WHERE ef."equipeId" = ${equipes.id}
          )`,
        })
        .from(equipes)
        .where(and(eq(equipes.condominioId, ctx.condominioId), eq(equipes.ativo, true)))
        .orderBy(equipes.nome);
    }),

  create: equipeProcedure
    .input(
      z.object({
        condominioId: z.number().optional(),
        nome: z.string().min(1).max(255),
        descricao: z.string().optional(),
        cor: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const [result] = await db
        .insert(equipes)
        .values({
          condominioId: ctx.condominioId,
          nome: input.nome,
          descricao: input.descricao || null,
          cor: input.cor || "#3b82f6",
        })
        .returning();

      return { id: result.id };
    }),

  update: equipeProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(1).max(255).optional(),
        descricao: z.string().optional(),
        cor: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const { id, ...dados } = input;
      await db.update(equipes).set({ ...dados, updatedAt: new Date() }).where(eq(equipes.id, id));
      return { ok: true };
    }),

  /** Desativa a equipe. A O.S. já designada guarda o vínculo e o histórico. */
  delete: equipeProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      await db
        .update(equipes)
        .set({ ativo: false, updatedAt: new Date() })
        .where(eq(equipes.id, input.id));
      return { ok: true };
    }),

  membros: equipeConsulta
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

  addMembros: equipeProcedure
    .input(
      z.object({
        equipeId: z.number(),
        funcionarioIds: z.array(z.number()).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      // Lista de ids não passa pelo mapa de escopo: sem esta conferência daria
      // para pendurar funcionário de outra organização na equipe.
      const daOrganizacao = await db
        .select({ id: funcionarios.id })
        .from(funcionarios)
        .where(
          and(
            inArray(funcionarios.id, input.funcionarioIds),
            eq(funcionarios.condominioId, ctx.condominioId),
          ),
        );

      if (daOrganizacao.length !== input.funcionarioIds.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Só é possível montar a equipe com funcionários desta organização.",
        });
      }

      const existentes = await db
        .select({ funcionarioId: equipeFuncionarios.funcionarioId })
        .from(equipeFuncionarios)
        .where(eq(equipeFuncionarios.equipeId, input.equipeId));

      const jaEstao = new Set(existentes.map((e) => e.funcionarioId));
      const novos = input.funcionarioIds.filter((id) => !jaEstao.has(id));

      if (novos.length > 0) {
        await db
          .insert(equipeFuncionarios)
          .values(novos.map((funcionarioId) => ({ equipeId: input.equipeId, funcionarioId })));
      }

      return { added: novos.length };
    }),

  removeMembro: equipeProcedure
    .input(
      z.object({
        equipeId: z.number(),
        funcionarioId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      await db
        .delete(equipeFuncionarios)
        .where(
          and(
            eq(equipeFuncionarios.equipeId, input.equipeId),
            eq(equipeFuncionarios.funcionarioId, input.funcionarioId),
          ),
        );
      return { ok: true };
    }),
});
