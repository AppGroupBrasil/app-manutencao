import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and } from "drizzle-orm";
import { valoresSalvos } from "../../../drizzle/schema";

export const valoresSalvosRouter = router({
    list: protectedProcedure
      .input(z.object({ 
        condominioId: z.number(),
        tipo: z.enum([
          "responsavel",
          "categoria_vistoria",
          "categoria_manutencao",
          "categoria_checklist",
          "categoria_ocorrencia",
          "tipo_vistoria",
          "tipo_manutencao",
          "tipo_checklist",
          "tipo_ocorrencia",
          "fornecedor",
          "localizacao",
          "titulo_vistoria",
          "subtitulo_vistoria",
          "descricao_vistoria",
          "observacoes_vistoria",
          "titulo_manutencao",
          "subtitulo_manutencao",
          "descricao_manutencao",
          "observacoes_manutencao",
          "titulo_ocorrencia",
          "subtitulo_ocorrencia",
          "descricao_ocorrencia",
          "observacoes_ocorrencia",
          "titulo_antesdepois",
          "descricao_antesdepois"
        ])
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(valoresSalvos)
          .where(and(
            eq(valoresSalvos.condominioId, input.condominioId),
            eq(valoresSalvos.tipo, input.tipo),
            eq(valoresSalvos.ativo, true)
          ))
          .orderBy(valoresSalvos.valor);
      }),

    create: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        tipo: z.enum([
          "responsavel",
          "categoria_vistoria",
          "categoria_manutencao",
          "categoria_checklist",
          "categoria_ocorrencia",
          "tipo_vistoria",
          "tipo_manutencao",
          "tipo_checklist",
          "tipo_ocorrencia",
          "fornecedor",
          "localizacao",
          "titulo_vistoria",
          "subtitulo_vistoria",
          "descricao_vistoria",
          "observacoes_vistoria",
          "titulo_manutencao",
          "subtitulo_manutencao",
          "descricao_manutencao",
          "observacoes_manutencao",
          "titulo_ocorrencia",
          "subtitulo_ocorrencia",
          "descricao_ocorrencia",
          "observacoes_ocorrencia",
          "titulo_antesdepois",
          "descricao_antesdepois"
        ]),
        valor: z.string().min(1)
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verificar se jÃ¡ existe
        const existing = await db.select().from(valoresSalvos)
          .where(and(
            eq(valoresSalvos.condominioId, input.condominioId),
            eq(valoresSalvos.tipo, input.tipo),
            eq(valoresSalvos.valor, input.valor)
          ));
        
        if (existing.length > 0) {
          // Se existe mas estÃ¡ inativo, reativar
          if (!existing[0].ativo) {
            await db.update(valoresSalvos)
              .set({ ativo: true })
              .where(eq(valoresSalvos.id, existing[0].id));
          }
          return { id: existing[0].id, isNew: false };
        }
        
        const [result] = await db.insert(valoresSalvos).values(input).returning();
        return { id: result.id, isNew: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(valoresSalvos)
          .set({ ativo: false })
          .where(eq(valoresSalvos.id, input.id));
        return { success: true };
      }),
  });

