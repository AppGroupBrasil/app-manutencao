import { z } from "zod";
import { eq, desc, and, like } from "drizzle-orm";
import { moduloUserProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { getDb } from "../../db";
import { 
  controlePragas, 
  controlePragaImagens,
  condominios 
} from "../../../drizzle/schema";

// Exige o modulo "controle-pragas" habilitado e valida que cada id recebido pertence
// a organizacao da requisicao.
const pragasProcedure = moduloUserProcedure(
  "controle-pragas",
  escopoPorRegistro(
    {
      id: direto(controlePragas),
      controlePragaId: direto(controlePragas),
    },
    {
      removeImagem: { id: via(controlePragaImagens, "controlePragaId", controlePragas) },
    },
  ),
);

export const controlePragasRouter = router({
  list: pragasProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(controlePragas)
        .where(eq(controlePragas.condominioId, input.condominioId))
        .orderBy(desc(controlePragas.createdAt));
    }),

  listWithDetails: pragasProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db.select().from(controlePragas)
        .where(eq(controlePragas.condominioId, input.condominioId))
        .orderBy(desc(controlePragas.createdAt));
      
      const result = await Promise.all(items.map(async (item) => {
        const imagens = await db.select().from(controlePragaImagens)
          .where(eq(controlePragaImagens.controlePragaId, item.id))
          .orderBy(controlePragaImagens.ordem);
        return { ...item, imagens };
      }));
      return result;
    }),

  getById: pragasProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [result] = await db.select().from(controlePragas).where(eq(controlePragas.id, input.id));
      if (!result) return null;
      const imagens = await db.select().from(controlePragaImagens)
        .where(eq(controlePragaImagens.controlePragaId, result.id))
        .orderBy(controlePragaImagens.ordem);
      return { ...result, imagens };
    }),

  searchByProtocolo: pragasProcedure
    .input(z.object({ protocolo: z.string(), condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(controlePragas)
        .where(and(
          eq(controlePragas.condominioId, input.condominioId),
          like(controlePragas.protocolo, `%${input.protocolo}%`)
        ))
        .orderBy(desc(controlePragas.createdAt));
    }),

  create: pragasProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string(),
      descricao: z.string().optional(),
      tipoServico: z.enum(["dedetizacao", "desratizacao", "descupinizacao", "desinfeccao", "outro"]).optional(),
      tipoPraga: z.string().optional(),
      produtosUtilizados: z.string().optional(),
      empresaFornecedor: z.string().optional(),
      localizacao: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      enderecoGeo: z.string().optional(),
      dataAplicacao: z.string().optional(),
      proximaAplicacao: z.string().optional(),
      garantiaDias: z.number().optional(),
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
          const candidate = `CP${String(Math.floor(100000 + Math.random() * 900000))}`;
          const existing = await db.select({ id: controlePragas.id }).from(controlePragas)
            .where(and(eq(controlePragas.condominioId, input.condominioId), eq(controlePragas.protocolo, candidate))).limit(1);
          if (existing.length === 0) return candidate;
        }
        return `CP${Date.now()}`;
      })();
      
      const [result] = await db.insert(controlePragas).values({
        condominioId: input.condominioId,
        protocolo,
        titulo: input.titulo,
        descricao: input.descricao || null,
        tipoServico: input.tipoServico || "dedetizacao",
        tipoPraga: input.tipoPraga || null,
        produtosUtilizados: input.produtosUtilizados || null,
        empresaFornecedor: input.empresaFornecedor || null,
        localizacao: input.localizacao || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        enderecoGeo: input.enderecoGeo || null,
        dataAplicacao: input.dataAplicacao ? new Date(input.dataAplicacao) : null,
        proximaAplicacao: input.proximaAplicacao ? new Date(input.proximaAplicacao) : null,
        garantiaDias: input.garantiaDias || null,
        custo: input.custo || null,
        responsavelNome: input.responsavelNome || null,
        observacoes: input.observacoes || null,
        status: input.status || "agendada",
        prioridade: input.prioridade || "media",
      }).returning();

      // Adicionar imagens se houver
      if (input.imagens && input.imagens.length > 0) {
        for (let i = 0; i < input.imagens.length; i++) {
          await db.insert(controlePragaImagens).values({
            controlePragaId: result.id,
            url: input.imagens[i].url,
            legenda: input.imagens[i].legenda || null,
            ordem: i,
          }).returning();
        }
      }

      return { id: result.id, protocolo };
    }),

  update: pragasProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      tipoServico: z.enum(["dedetizacao", "desratizacao", "descupinizacao", "desinfeccao", "outro"]).optional(),
      tipoPraga: z.string().optional(),
      produtosUtilizados: z.string().optional(),
      empresaFornecedor: z.string().optional(),
      localizacao: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      enderecoGeo: z.string().optional(),
      dataAplicacao: z.string().optional(),
      proximaAplicacao: z.string().optional(),
      garantiaDias: z.number().optional(),
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
      
      await db.update(controlePragas)
        .set({
          ...data,
          dataAplicacao: data.dataAplicacao ? new Date(data.dataAplicacao) : undefined,
          proximaAplicacao: data.proximaAplicacao ? new Date(data.proximaAplicacao) : undefined,
        })
        .where(eq(controlePragas.id, id));

      return { success: true };
    }),

  delete: pragasProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Deletar imagens primeiro
      await db.delete(controlePragaImagens).where(eq(controlePragaImagens.controlePragaId, input.id));
      // Deletar o registro
      await db.delete(controlePragas).where(eq(controlePragas.id, input.id));
      
      return { success: true };
    }),

  // Gerenciamento de imagens
  addImagem: pragasProcedure
    .input(z.object({
      controlePragaId: z.number(),
      url: z.string(),
      legenda: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const existingImages = await db.select().from(controlePragaImagens)
        .where(eq(controlePragaImagens.controlePragaId, input.controlePragaId));
      
      const [result] = await db.insert(controlePragaImagens).values({
        controlePragaId: input.controlePragaId,
        url: input.url,
        legenda: input.legenda || null,
        ordem: existingImages.length,
      }).returning();

      return { id: result.id };
    }),

  removeImagem: pragasProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(controlePragaImagens).where(eq(controlePragaImagens.id, input.id));
      return { success: true };
    }),
});
