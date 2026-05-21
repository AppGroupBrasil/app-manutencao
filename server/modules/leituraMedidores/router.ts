import { z } from "zod";
import { eq, desc, and, like } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  leituraMedidores, 
  leituraMedidorImagens,
  condominios 
} from "../../../drizzle/schema";

export const leituraMedidoresRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(leituraMedidores)
        .where(eq(leituraMedidores.condominioId, input.condominioId))
        .orderBy(desc(leituraMedidores.createdAt));
    }),

  listWithDetails: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db.select().from(leituraMedidores)
        .where(eq(leituraMedidores.condominioId, input.condominioId))
        .orderBy(desc(leituraMedidores.createdAt));
      
      const result = await Promise.all(items.map(async (item) => {
        const imagens = await db.select().from(leituraMedidorImagens)
          .where(eq(leituraMedidorImagens.leituraMedidorId, item.id))
          .orderBy(leituraMedidorImagens.ordem);
        return { ...item, imagens };
      }));
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [result] = await db.select().from(leituraMedidores).where(eq(leituraMedidores.id, input.id));
      if (!result) return null;
      const imagens = await db.select().from(leituraMedidorImagens)
        .where(eq(leituraMedidorImagens.leituraMedidorId, result.id))
        .orderBy(leituraMedidorImagens.ordem);
      return { ...result, imagens };
    }),

  searchByProtocolo: protectedProcedure
    .input(z.object({ protocolo: z.string(), condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(leituraMedidores)
        .where(and(
          eq(leituraMedidores.condominioId, input.condominioId),
          like(leituraMedidores.protocolo, `%${input.protocolo}%`)
        ))
        .orderBy(desc(leituraMedidores.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string(),
      descricao: z.string().optional(),
      tipoMedidor: z.enum(["agua", "gas", "energia", "outro"]).optional(),
      identificacaoMedidor: z.string().optional(),
      leituraAtual: z.string().optional(),
      leituraAnterior: z.string().optional(),
      unidadeMedida: z.string().optional(),
      localizacao: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      enderecoGeo: z.string().optional(),
      dataLeitura: z.string().optional(),
      proximaLeitura: z.string().optional(),
      responsavelNome: z.string().optional(),
      observacoes: z.string().optional(),
      status: z.enum(["pendente", "realizada", "conferida", "finalizada"]).optional(),
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
          const candidate = `LM${String(Math.floor(100000 + Math.random() * 900000))}`;
          const existing = await db.select({ id: leituraMedidores.id }).from(leituraMedidores)
            .where(and(eq(leituraMedidores.condominioId, input.condominioId), eq(leituraMedidores.protocolo, candidate))).limit(1);
          if (existing.length === 0) return candidate;
        }
        return `LM${Date.now()}`;
      })();
      
      // Calcular consumo se ambas as leituras estiverem presentes
      let consumo = null;
      if (input.leituraAtual && input.leituraAnterior) {
        const atual = parseFloat(input.leituraAtual);
        const anterior = parseFloat(input.leituraAnterior);
        if (!isNaN(atual) && !isNaN(anterior)) {
          consumo = String(atual - anterior);
        }
      }
      
      const [result] = await db.insert(leituraMedidores).values({
        condominioId: input.condominioId,
        protocolo,
        titulo: input.titulo,
        descricao: input.descricao || null,
        tipoMedidor: input.tipoMedidor || "energia",
        identificacaoMedidor: input.identificacaoMedidor || null,
        leituraAtual: input.leituraAtual || null,
        leituraAnterior: input.leituraAnterior || null,
        consumo,
        unidadeMedida: input.unidadeMedida || "kWh",
        localizacao: input.localizacao || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        enderecoGeo: input.enderecoGeo || null,
        dataLeitura: input.dataLeitura ? new Date(input.dataLeitura) : null,
        proximaLeitura: input.proximaLeitura ? new Date(input.proximaLeitura) : null,
        responsavelNome: input.responsavelNome || null,
        observacoes: input.observacoes || null,
        status: input.status || "pendente",
      }).returning();

      // Adicionar imagens se houver
      if (input.imagens && input.imagens.length > 0) {
        for (let i = 0; i < input.imagens.length; i++) {
          await db.insert(leituraMedidorImagens).values({
            leituraMedidorId: result.id,
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
      tipoMedidor: z.enum(["agua", "gas", "energia", "outro"]).optional(),
      identificacaoMedidor: z.string().optional(),
      leituraAtual: z.string().optional(),
      leituraAnterior: z.string().optional(),
      unidadeMedida: z.string().optional(),
      localizacao: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      enderecoGeo: z.string().optional(),
      dataLeitura: z.string().optional(),
      proximaLeitura: z.string().optional(),
      responsavelNome: z.string().optional(),
      observacoes: z.string().optional(),
      status: z.enum(["pendente", "realizada", "conferida", "finalizada"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      
      // Calcular consumo se ambas as leituras estiverem presentes
      let consumo = undefined;
      if (data.leituraAtual !== undefined && data.leituraAnterior !== undefined) {
        const atual = parseFloat(data.leituraAtual || "0");
        const anterior = parseFloat(data.leituraAnterior || "0");
        if (!isNaN(atual) && !isNaN(anterior)) {
          consumo = String(atual - anterior);
        }
      }
      
      await db.update(leituraMedidores)
        .set({
          ...data,
          ...(consumo !== undefined ? { consumo } : {}),
          dataLeitura: data.dataLeitura ? new Date(data.dataLeitura) : undefined,
          proximaLeitura: data.proximaLeitura ? new Date(data.proximaLeitura) : undefined,
        })
        .where(eq(leituraMedidores.id, id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Deletar imagens primeiro
      await db.delete(leituraMedidorImagens).where(eq(leituraMedidorImagens.leituraMedidorId, input.id));
      // Deletar o registro
      await db.delete(leituraMedidores).where(eq(leituraMedidores.id, input.id));
      
      return { success: true };
    }),

  // Gerenciamento de imagens
  addImagem: protectedProcedure
    .input(z.object({
      leituraMedidorId: z.number(),
      url: z.string(),
      legenda: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existingImages = await db.select().from(leituraMedidorImagens)
        .where(eq(leituraMedidorImagens.leituraMedidorId, input.leituraMedidorId));
      
      const [result] = await db.insert(leituraMedidorImagens).values({
        leituraMedidorId: input.leituraMedidorId,
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
      await db.delete(leituraMedidorImagens).where(eq(leituraMedidorImagens.id, input.id));
      return { success: true };
    }),
});
