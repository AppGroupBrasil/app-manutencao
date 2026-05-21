import { z } from "zod";
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { getDb } from "../../db";
import { registrosPersonalizados, funcoesPersonalizadas } from "../../../drizzle/schema";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";

// Auto-criar tabela se não existir
async function ensureTable() {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS registros_personalizados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        funcaoId INT NOT NULL,
        condominioId INT NOT NULL,
        userId INT,
        protocolo VARCHAR(50),
        dados JSON NOT NULL,
        imagens JSON,
        checklistItems JSON,
        assinaturas JSON,
        status VARCHAR(50) DEFAULT 'aberto',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (funcaoId) REFERENCES funcoes_personalizadas(id) ON DELETE CASCADE,
        FOREIGN KEY (condominioId) REFERENCES condominios(id),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_funcao (funcaoId),
        INDEX idx_protocolo (protocolo),
        INDEX idx_condominio (condominioId)
      )
    `);
  } catch (e) {
    // Table may already exist
  }
}

ensureTable();

export const registrosPersonalizadosRouter = router({
  // Criar registro
  criar: protectedProcedure
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
  listar: protectedProcedure
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
  contar: protectedProcedure
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
  obter: protectedProcedure
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
  atualizarStatus: protectedProcedure
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
  deletar: protectedProcedure
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
