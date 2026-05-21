import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { checklistModelos } from "../../../drizzle/schema";
import { router, protectedProcedure } from "../../_core/trpc";

// Auto-criar tabela se não existir
async function ensureTable() {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS checklist_modelos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        condominioId INT NOT NULL,
        userId INT,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        itens JSON NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (condominioId) REFERENCES condominios(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  } catch (e) {
    // Table may already exist - ignore
  }
}

// Run on import
ensureTable();

export const checklistModelosRouter = router({
  // Listar modelos de checklist de um condomínio
  listar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return db.select()
        .from(checklistModelos)
        .where(eq(checklistModelos.condominioId, input.condominioId))
        .orderBy(desc(checklistModelos.updatedAt));
    }),

  // Criar novo modelo de checklist
  criar: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1, "Nome é obrigatório"),
      descricao: z.string().optional(),
      itens: z.array(z.object({
        id: z.string(),
        titulo: z.string(),
      })).min(1, "Adicione pelo menos um item ao modelo"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [result] = await db.insert(checklistModelos).values({
        condominioId: input.condominioId,
        userId: ctx.user?.id,
        nome: input.nome,
        descricao: input.descricao || null,
        itens: input.itens,
      }).returning();
      
      return { id: Number(result.id), nome: input.nome };
    }),

  // Atualizar modelo existente
  atualizar: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      descricao: z.string().optional(),
      itens: z.array(z.object({
        id: z.string(),
        titulo: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      const updateData: any = {};
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.itens !== undefined) updateData.itens = data.itens;
      
      await db.update(checklistModelos)
        .set(updateData)
        .where(eq(checklistModelos.id, id));
      
      return { success: true };
    }),

  // Deletar modelo
  deletar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(checklistModelos)
        .where(eq(checklistModelos.id, input.id));
      
      return { success: true };
    }),

  // Obter modelo específico
  obter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [modelo] = await db.select()
        .from(checklistModelos)
        .where(eq(checklistModelos.id, input.id));
      
      return modelo || null;
    }),
});
