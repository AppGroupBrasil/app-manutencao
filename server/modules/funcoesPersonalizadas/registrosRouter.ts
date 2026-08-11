import { z } from "zod";
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { getDb } from "../../db";
import { registrosPersonalizados, funcoesPersonalizadas } from "../../../drizzle/schema";
import { router, protectedProcedure, publicProcedure, escopoProcedure } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";

/** Rotas por `id`: o registro precisa ser de uma organização do solicitante. */
const registroProcedure = escopoProcedure(
  escopoPorRegistro({ id: direto(registrosPersonalizados), funcaoId: direto(funcoesPersonalizadas) }),
);

export const registrosPersonalizadosRouter = router({
  // Criar registro
  criar: registroProcedure
    .input(z.object({
      funcaoId: z.number(),
      condominioId: z.number(),
      protocolo: z.string().optional(),
      dados: z.record(z.any()),
      imagens: z.array(z.object({ url: z.string(), legenda: z.string() })).optional(),
      checklistItems: z.array(z.object({ texto: z.string(), checked: z.boolean() })).optional(),
      assinaturas: z.record(z.string()).optional(),
      status: z.string().optional().default("aberto"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(registrosPersonalizados).values({
        funcaoId: input.funcaoId,
        condominioId: input.condominioId,
        userId: ctx.user?.id,
        protocolo: input.protocolo || null,
        dados: input.dados,
        imagens: input.imagens || null,
        checklistItems: input.checklistItems || null,
        assinaturas: input.assinaturas || null,
        status: input.status,
      }).returning();

      return { id: Number(result.id) };
    }),

  // Listar registros de uma função (colunas leves para evitar sort memory overflow)
  listar: registroProcedure
    .input(z.object({
      funcaoId: z.number(),
      busca: z.string().optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(registrosPersonalizados.funcaoId, input.funcaoId),
      ];

      if (input.busca && input.busca.trim()) {
        const termo = `%${input.busca.trim()}%`;
        conditions.push(
          or(
            like(registrosPersonalizados.protocolo, termo),
            sql`JSON_EXTRACT(${registrosPersonalizados.dados}, '$.titulo') LIKE ${termo}`,
            sql`JSON_EXTRACT(${registrosPersonalizados.dados}, '$.local') LIKE ${termo}`,
          )!
        );
      }

      // Selecionar apenas colunas necessárias para listagem (excluir imagens/assinaturas pesadas)
      const registros = await db.select({
        id: registrosPersonalizados.id,
        funcaoId: registrosPersonalizados.funcaoId,
        condominioId: registrosPersonalizados.condominioId,
        userId: registrosPersonalizados.userId,
        protocolo: registrosPersonalizados.protocolo,
        dados: registrosPersonalizados.dados,
        checklistItems: registrosPersonalizados.checklistItems,
        status: registrosPersonalizados.status,
        createdAt: registrosPersonalizados.createdAt,
        updatedAt: registrosPersonalizados.updatedAt,
      })
        .from(registrosPersonalizados)
        .where(and(...conditions))
        .orderBy(desc(registrosPersonalizados.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return registros;
    }),

  // Contar registros
  contar: registroProcedure
    .input(z.object({
      funcaoId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(registrosPersonalizados)
        .where(
          eq(registrosPersonalizados.funcaoId, input.funcaoId),
        );

      return result?.count || 0;
    }),

  // Obter registro específico
  obter: registroProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [registro] = await db.select()
        .from(registrosPersonalizados)
        .where(eq(registrosPersonalizados.id, input.id));

      return registro || null;
    }),

  // Atualizar status
  atualizarStatus: registroProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(registrosPersonalizados)
        .set({ status: input.status })
        .where(eq(registrosPersonalizados.id, input.id));

      return { success: true };
    }),

  // Deletar registro
  deletar: registroProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(registrosPersonalizados)
        .where(eq(registrosPersonalizados.id, input.id));

      return { success: true };
    }),

  // Obter registro publicamente (sem autenticação) - usado pelo QR Code
  obterPublico: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [registro] = await db.select()
        .from(registrosPersonalizados)
        .where(eq(registrosPersonalizados.id, input.id));

      if (!registro) return null;

      // Buscar nome da função associada
      const [funcao] = await db.select({
        id: funcoesPersonalizadas.id,
        nome: funcoesPersonalizadas.nome,
        icone: funcoesPersonalizadas.icone,
        cor: funcoesPersonalizadas.cor,
      })
        .from(funcoesPersonalizadas)
        .where(eq(funcoesPersonalizadas.id, registro.funcaoId));

      return { ...registro, funcao: funcao || null };
    }),
});
