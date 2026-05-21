import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and, asc, sql } from "drizzle-orm";
import { funcoesRapidas } from "../../../drizzle/schema";

export const funcoesRapidasRouter = router({
    // Listar funÃ§Ãµes rÃ¡pidas do condomÃ­nio
    listar: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const funcoes = await db.select()
          .from(funcoesRapidas)
          .where(eq(funcoesRapidas.condominioId, input.condominioId))
          .orderBy(asc(funcoesRapidas.ordem));
        
        return funcoes;
      }),
    
    // Adicionar funÃ§Ã£o rÃ¡pida
    adicionar: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        funcaoId: z.string(),
        nome: z.string(),
        path: z.string(),
        icone: z.string(),
        cor: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verificar se jÃ¡ existe
        const existente = await db.select()
          .from(funcoesRapidas)
          .where(and(
            eq(funcoesRapidas.condominioId, input.condominioId),
            eq(funcoesRapidas.funcaoId, input.funcaoId)
          ))
          .limit(1);
        
        if (existente.length > 0) {
          throw new Error("Esta funÃ§Ã£o jÃ¡ estÃ¡ nas funÃ§Ãµes rÃ¡pidas");
        }
        
        // Verificar limite de 12
        const total = await db.select({ count: sql<number>`count(*)` })
          .from(funcoesRapidas)
          .where(eq(funcoesRapidas.condominioId, input.condominioId));
        
        if (total[0].count >= 12) {
          throw new Error("Limite de 12 funÃ§Ãµes rÃ¡pidas atingido. Remova uma para adicionar outra.");
        }
        
        // Adicionar com a prÃ³xima ordem disponÃ­vel
        const [result] = await db.insert(funcoesRapidas).values({
          condominioId: input.condominioId,
          funcaoId: input.funcaoId,
          nome: input.nome,
          path: input.path,
          icone: input.icone,
          cor: input.cor,
          ordem: total[0].count,
        }).returning();
        
        return { success: true, id: result.id };
      }),
    
    // Remover funÃ§Ã£o rÃ¡pida
    remover: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        funcaoId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(funcoesRapidas)
          .where(and(
            eq(funcoesRapidas.condominioId, input.condominioId),
            eq(funcoesRapidas.funcaoId, input.funcaoId)
          ));
        
        return { success: true };
      }),
    
    // Verificar se funÃ§Ã£o estÃ¡ nas rÃ¡pidas
    verificar: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        funcaoId: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const existente = await db.select()
          .from(funcoesRapidas)
          .where(and(
            eq(funcoesRapidas.condominioId, input.condominioId),
            eq(funcoesRapidas.funcaoId, input.funcaoId)
          ))
          .limit(1);
        
        return { existe: existente.length > 0 };
      }),
    
    // Reordenar funÃ§Ãµes rÃ¡pidas
    reordenar: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        ordens: z.array(z.object({
          funcaoId: z.string(),
          ordem: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Executar todas as atualizações em transação para consistência
        await db.transaction(async (tx) => {
          for (const item of input.ordens) {
            await tx.update(funcoesRapidas)
              .set({ ordem: item.ordem })
              .where(and(
                eq(funcoesRapidas.condominioId, input.condominioId),
                eq(funcoesRapidas.funcaoId, item.funcaoId)
              ));
          }
        });
        
        return { success: true };
      }),
  });

