import { z } from "zod";
import { eq, desc, and, like } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  jardinagem, 
  jardinagemImagens,
  condominios 
} from "../../../drizzle/schema";

export const jardinagemRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(jardinagem)
        .where(eq(jardinagem.condominioId, input.condominioId))
        .orderBy(desc(jardinagem.createdAt));
    }),

  listWithDetails: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db.select().from(jardinagem)
        .where(eq(jardinagem.condominioId, input.condominioId))
        .orderBy(desc(jardinagem.createdAt));
      
      const result = await Promise.all(items.map(async (item) => {
        const imagens = await db.select().from(jardinagemImagens)
          .where(eq(jardinagemImagens.jardinagemId, item.id))
          .orderBy(jardinagemImagens.ordem);
        return { ...item, imagens };
      }));
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [result] = await db.select().from(jardinagem).where(eq(jardinagem.id, input.id));
      if (!result) return null;
      const imagens = await db.select().from(jardinagemImagens)
        .where(eq(jardinagemImagens.jardinagemId, result.id))
        .orderBy(jardinagemImagens.ordem);
      return { ...result, imagens };
    }),

  searchByProtocolo: protectedProcedure
    .input(z.object({ protocolo: z.string(), condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(jardinagem)
        .where(and(
          eq(jardinagem.condominioId, input.condominioId),
          like(jardinagem.protocolo, `%${input.protocolo}%`)
        ))
        .orderBy(desc(jardinagem.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string(),
      descricao: z.string().optional(),
      tipoServico: z.enum(["poda", "plantio", "adubacao", "irrigacao", "limpeza", "paisagismo", "outro"]).optional(),
      plantasEspecies: z.string().optional(),
      produtosUtilizados: z.string().optional(),
      areaMetrosQuadrados: z.string().optional(),
      localizacao: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      enderecoGeo: z.string().optional(),
      dataRealizacao: z.string().optional(),
      proximaRealizacao: z.string().optional(),
      recorrencia: z.enum(["unica", "semanal", "quinzenal", "mensal", "bimestral", "trimestral"]).optional(),
      custo: z.string().optional(),
      responsavelNome: z.string().optional(),
      observacoes: z.string().optional(),
      status: z.enum(["agendada", "em_andamento", "realizada", "finalizada", "cancelada"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      imagens: z.array(z.object({
        url: z.string(),
        legenda: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const protocolo = await (async () => {
        for (let i = 0; i < 5; i++) {
          const candidate = `JD${String(Math.floor(100000 + Math.random() * 900000))}`;
          const existing = await db.select({ id: jardinagem.id }).from(jardinagem)
            .where(and(eq(jardinagem.condominioId, input.condominioId), eq(jardinagem.protocolo, candidate))).limit(1);
          if (existing.length === 0) return candidate;
        }
        return `JD${Date.now()}`;
      })();
      
      const [result] = await db.insert(jardinagem).values({
        condominioId: input.condominioId,
        protocolo,
        titulo: input.titulo,
        descricao: input.descricao || null,
        tipoServico: input.tipoServico || "poda",
        plantasEspecies: input.plantasEspecies || null,
        produtosUtilizados: input.produtosUtilizados || null,
        areaMetrosQuadrados: input.areaMetrosQuadrados || null,
        localizacao: input.localizacao || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        enderecoGeo: input.enderecoGeo || null,
        dataRealizacao: input.dataRealizacao ? new Date(input.dataRealizacao) : null,
        proximaRealizacao: input.proximaRealizacao ? new Date(input.proximaRealizacao) : null,
        recorrencia: input.recorrencia || "unica",
        custo: input.custo || null,
        responsavelNome: input.responsavelNome || null,
        observacoes: input.observacoes || null,
        status: input.status || "agendada",
        prioridade: input.prioridade || "media",
      }).returning();

      // Adicionar imagens se houver
      if (input.imagens && input.imagens.length > 0) {
        for (let i = 0; i < input.imagens.length; i++) {
          await db.insert(jardinagemImagens).values({
            jardinagemId: result.id,
            url: input.imagens[i].url,
            legenda: input.imagens[i].legenda || null,
            ordem: i,
          }).returning();
        }
      }

      return { id: result.id, protocolo };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      tipoServico: z.enum(["poda", "plantio", "adubacao", "irrigacao", "limpeza", "paisagismo", "outro"]).optional(),
      plantasEspecies: z.string().optional(),
      produtosUtilizados: z.string().optional(),
      areaMetrosQuadrados: z.string().optional(),
      localizacao: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      enderecoGeo: z.string().optional(),
      dataRealizacao: z.string().optional(),
      proximaRealizacao: z.string().optional(),
      recorrencia: z.enum(["unica", "semanal", "quinzenal", "mensal", "bimestral", "trimestral"]).optional(),
      custo: z.string().optional(),
      responsavelNome: z.string().optional(),
      observacoes: z.string().optional(),
      status: z.enum(["agendada", "em_andamento", "realizada", "finalizada", "cancelada"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      
      await db.update(jardinagem)
        .set({
          ...data,
          dataRealizacao: data.dataRealizacao ? new Date(data.dataRealizacao) : undefined,
          proximaRealizacao: data.proximaRealizacao ? new Date(data.proximaRealizacao) : undefined,
        })
        .where(eq(jardinagem.id, id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Deletar imagens primeiro
      await db.delete(jardinagemImagens).where(eq(jardinagemImagens.jardinagemId, input.id));
      // Deletar o registro
      await db.delete(jardinagem).where(eq(jardinagem.id, input.id));
      
      return { success: true };
    }),

  // Gerenciamento de imagens
  addImagem: protectedProcedure
    .input(z.object({
      jardinagemId: z.number(),
      url: z.string(),
      legenda: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existingImages = await db.select().from(jardinagemImagens)
        .where(eq(jardinagemImagens.jardinagemId, input.jardinagemId));
      
      const [result] = await db.insert(jardinagemImagens).values({
        jardinagemId: input.jardinagemId,
        url: input.url,
        legenda: input.legenda || null,
        ordem: existingImages.length,
      }).returning();

      return { id: result.id };
    }),

  removeImagem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(jardinagemImagens).where(eq(jardinagemImagens.id, input.id));
      return { success: true };
    }),
});
