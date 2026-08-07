import { z } from "zod";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { moduloProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { autorDaRequisicao } from "../../_core/autor";
import { getDb } from "../../db";
import { generateFuncaoRapidaPDF } from "../../pdfFuncoesRapidas";
import {
  vistorias,
  vistoriaTimeline,
  vistoriaImagens,
  vistoriaAnexos,
  condominios
} from "../../../drizzle/schema";

// Exige o modulo "vistorias" habilitado e valida que cada id recebido pertence
// a organizacao da requisicao. `id` aponta para a vistoria, exceto nas rotas
// listadas em `overrides`, onde e o id de um registro filho.
const vistoriaProcedure = moduloProcedure(
  "vistorias",
  escopoPorRegistro(
    {
      id: direto(vistorias),
      vistoriaId: direto(vistorias),
    },
    {
      removeImagem: { id: via(vistoriaImagens, "vistoriaId", vistorias) },
      removeAnexo: { id: via(vistoriaAnexos, "vistoriaId", vistorias) },
    },
  ),
);

// Auto-criar colunas de assinatura se não existirem
async function ensureSignatureColumns() {
  const db = await getDb();
  if (!db) return;
  const cols = [
    "ALTER TABLE vistorias ADD COLUMN assinaturaTecnico TEXT NULL",
    "ALTER TABLE vistorias ADD COLUMN assinaturaSolicitante TEXT NULL",
  ];
  for (const ddl of cols) {
    try { await db.execute(sql.raw(ddl)); } catch { /* column may already exist */ }
  }
}
ensureSignatureColumns();

export const vistoriaRouter = router({
  list: vistoriaProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(vistorias)
        .where(eq(vistorias.condominioId, input.condominioId))
        .orderBy(desc(vistorias.createdAt));
    }),

  listWithDetails: vistoriaProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db.select().from(vistorias)
        .where(eq(vistorias.condominioId, input.condominioId))
        .orderBy(desc(vistorias.createdAt));
      const result = await Promise.all(items.map(async (item) => {
        const imagens = await db.select().from(vistoriaImagens)
          .where(eq(vistoriaImagens.vistoriaId, item.id));
        const timeline = await db.select().from(vistoriaTimeline)
          .where(eq(vistoriaTimeline.vistoriaId, item.id))
          .orderBy(desc(vistoriaTimeline.createdAt));
        return { ...item, imagens, timeline };
      }));
      return result;
    }),

  getById: vistoriaProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [result] = await db.select().from(vistorias).where(eq(vistorias.id, input.id));
      return result || null;
    }),

  searchByProtocolo: vistoriaProcedure
    .input(z.object({ protocolo: z.string(), condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(vistorias)
        .where(and(
          eq(vistorias.condominioId, input.condominioId),
          like(vistorias.protocolo, `%${input.protocolo}%`)
        ))
        .orderBy(desc(vistorias.createdAt));
    }),

  create: vistoriaProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string(),
      subtitulo: z.string().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
      responsavelNome: z.string().optional(),
      localizacao: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      enderecoGeo: z.string().optional(),
      dataAgendada: z.string().optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      status: z.enum(["pendente", "realizada", "acao_necessaria", "finalizada", "reaberta", "rascunho"]).optional(),
      tipo: z.string().optional(),
      assinaturaTecnico: z.string().optional(),
      assinaturaSolicitante: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Gerar protocolo único com retry para evitar colisão
      let protocolo: string;
      let tentativas = 0;
      do {
        protocolo = String(Math.floor(100000 + Math.random() * 900000));
        const [existing] = await db.select({ id: vistorias.id }).from(vistorias).where(eq(vistorias.protocolo, protocolo)).limit(1);
        if (!existing) break;
        tentativas++;
      } while (tentativas < 10);
      if (tentativas >= 10) throw new Error("Não foi possível gerar protocolo único");
      
      const [result] = await db.insert(vistorias).values({
        condominioId: input.condominioId,
        protocolo,
        titulo: input.titulo,
        subtitulo: input.subtitulo || null,
        descricao: input.descricao || null,
        observacoes: input.observacoes || null,
        responsavelId: ctx.user?.id,
        responsavelNome: input.responsavelNome || null,
        localizacao: input.localizacao || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        enderecoGeo: input.enderecoGeo || null,
        dataAgendada: input.dataAgendada ? new Date(input.dataAgendada) : null,
        prioridade: input.prioridade || "media",
        status: input.status || "pendente",
        tipo: input.tipo || null,
        assinaturaTecnico: input.assinaturaTecnico || null,
        assinaturaSolicitante: input.assinaturaSolicitante || null,
      }).returning();
      // Adicionar evento de abertura na timeline
      await db.insert(vistoriaTimeline).values({
        vistoriaId: result.id,
        tipo: "abertura",
        descricao: `Vistoria criada: ${input.titulo}`,
        statusNovo: "pendente",
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      });
      return { id: result.id, protocolo };
    }),

  update: vistoriaProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      subtitulo: z.string().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
      responsavelNome: z.string().optional(),
      localizacao: z.string().optional(),
      dataAgendada: z.string().optional(),
      dataRealizada: z.string().optional(),
      status: z.enum(["pendente", "realizada", "acao_necessaria", "finalizada", "reaberta", "rascunho"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      tipo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      
      // Buscar status anterior
      const [vistoriaAtual] = await db.select().from(vistorias).where(eq(vistorias.id, id));
      const statusAnterior = vistoriaAtual?.status;
      
      await db.update(vistorias)
        .set({
          ...data,
          dataAgendada: data.dataAgendada === undefined ? undefined : (data.dataAgendada ? new Date(data.dataAgendada) : null),
          dataRealizada: data.dataRealizada === undefined ? undefined : (data.dataRealizada ? new Date(data.dataRealizada) : null),
        })
        .where(eq(vistorias.id, id));
      
      // Adicionar evento na timeline se status mudou
      if (data.status && data.status !== statusAnterior) {
        let tipoEvento: "status_alterado" | "fechamento" | "reabertura" = "status_alterado";
        if (data.status === "finalizada") tipoEvento = "fechamento";
        if (data.status === "reaberta") tipoEvento = "reabertura";
        
        await db.insert(vistoriaTimeline).values({
          vistoriaId: id,
          tipo: tipoEvento,
          descricao: `Status alterado de ${statusAnterior} para ${data.status}`,
          statusAnterior,
          statusNovo: data.status,
          userId: autorDaRequisicao(ctx).userId,
          userNome: autorDaRequisicao(ctx).nome,
        }).returning();
      } else if (Object.keys(data).length > 0) {
        await db.insert(vistoriaTimeline).values({
          vistoriaId: id,
          tipo: "atualizacao",
          descricao: "Vistoria atualizada",
          userId: autorDaRequisicao(ctx).userId,
          userNome: autorDaRequisicao(ctx).nome,
        });
      }
      
      return { success: true };
    }),

  delete: vistoriaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(vistoriaTimeline).where(eq(vistoriaTimeline.vistoriaId, input.id));
      await db.delete(vistoriaImagens).where(eq(vistoriaImagens.vistoriaId, input.id));
      await db.delete(vistoriaAnexos).where(eq(vistoriaAnexos.vistoriaId, input.id));
      await db.delete(vistorias).where(eq(vistorias.id, input.id));
      return { success: true };
    }),

  // Timeline
  getTimeline: vistoriaProcedure
    .input(z.object({ vistoriaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(vistoriaTimeline)
        .where(eq(vistoriaTimeline.vistoriaId, input.vistoriaId))
        .orderBy(desc(vistoriaTimeline.createdAt));
    }),

  addTimelineEvent: vistoriaProcedure
    .input(z.object({
      vistoriaId: z.number(),
      tipo: z.enum(["abertura", "atualizacao", "status_alterado", "comentario", "imagem_adicionada", "responsavel_alterado", "fechamento", "reabertura"]),
      descricao: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(vistoriaTimeline).values({
        ...input,
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      }).returning();
      return { id: result.id };
    }),

  // Imagens
  getImagens: vistoriaProcedure
    .input(z.object({ vistoriaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(vistoriaImagens)
        .where(eq(vistoriaImagens.vistoriaId, input.vistoriaId))
        .orderBy(vistoriaImagens.ordem);
    }),

  addImagem: vistoriaProcedure
    .input(z.object({
      vistoriaId: z.number(),
      url: z.string(),
      legenda: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(vistoriaImagens).values(input).returning();
      // Adicionar evento na timeline
      await db.insert(vistoriaTimeline).values({
        vistoriaId: input.vistoriaId,
        tipo: "imagem_adicionada",
        descricao: "Nova imagem adicionada",
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      }).returning();
      return { id: result.id };
    }),

  removeImagem: vistoriaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(vistoriaImagens).where(eq(vistoriaImagens.id, input.id));
      return { success: true };
    }),
  // ========== ANEXOS (PDF/Documentos) ==========
  getAnexos: vistoriaProcedure
    .input(z.object({ vistoriaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(vistoriaAnexos)
        .where(eq(vistoriaAnexos.vistoriaId, input.vistoriaId))
        .orderBy(desc(vistoriaAnexos.createdAt));
    }),

  addAnexo: vistoriaProcedure
    .input(z.object({
      vistoriaId: z.number(),
      nome: z.string(),
      url: z.string(),
      tipo: z.string(),
      tamanho: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(vistoriaAnexos).values({
        vistoriaId: input.vistoriaId,
        nome: input.nome,
        url: input.url,
        tipo: input.tipo,
        tamanho: input.tamanho || 0,
      }).returning();
      return { id: result.id };
    }),

  removeAnexo: vistoriaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(vistoriaAnexos).where(eq(vistoriaAnexos.id, input.id));
      return { success: true };
    }),
  // EstatÃ­sticas
  getStats: vistoriaProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0, pendentes: 0, realizadas: 0, finalizadas: 0, requerAcao: 0, reabertas: 0 };
      const stats = await db.select({
        status: vistorias.status,
        count: sql<number>`count(*)`,
      }).from(vistorias)
        .where(eq(vistorias.condominioId, input.condominioId))
        .groupBy(vistorias.status);
      
      const result = { total: 0, pendentes: 0, realizadas: 0, finalizadas: 0, requerAcao: 0, reabertas: 0 };
      for (const s of stats) {
        const cnt = Number(s.count);
        result.total += cnt;
        if (s.status === "pendente") result.pendentes = cnt;
        else if (s.status === "realizada") result.realizadas = cnt;
        else if (s.status === "finalizada") result.finalizadas = cnt;
        else if (s.status === "acao_necessaria") result.requerAcao = cnt;
        else if (s.status === "reaberta") result.reabertas = cnt;
      }
      return result;
    }),

  // Gerar PDF
  generatePdf: vistoriaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [vistoria] = await db.select().from(vistorias).where(eq(vistorias.id, input.id));
      if (!vistoria) throw new Error("Vistoria nÃ£o encontrada");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, vistoria.condominioId));
      const imagens = await db.select().from(vistoriaImagens).where(eq(vistoriaImagens.vistoriaId, input.id));
      
      const pdfBuffer = await generateFuncaoRapidaPDF({
        tipo: "vistoria",
        protocolo: vistoria.protocolo,
        titulo: vistoria.titulo,
        subtitulo: vistoria.subtitulo,
        descricao: vistoria.descricao,
        observacoes: vistoria.observacoes,
        status: vistoria.status,
        prioridade: vistoria.prioridade,
        responsavelNome: vistoria.responsavelNome,
        localizacao: vistoria.localizacao,
        latitude: vistoria.latitude,
        longitude: vistoria.longitude,
        enderecoGeo: vistoria.enderecoGeo,
        createdAt: vistoria.createdAt,
        dataAgendada: vistoria.dataAgendada,
        dataRealizada: vistoria.dataRealizada,
        imagens: imagens.map(img => ({ url: img.url, legenda: img.legenda })),
        condominioNome: condominio?.nome || "CondomÃ­nio",
        condominioLogo: condominio?.logoUrl,
        // CabeÃ§alho e RodapÃ© personalizados
        cabecalhoLogoUrl: condominio?.cabecalhoLogoUrl,
        cabecalhoNomeCondominio: condominio?.cabecalhoNomeCondominio,
        cabecalhoNomeSindico: condominio?.cabecalhoNomeSindico,
        rodapeTexto: condominio?.rodapeTexto,
        rodapeContato: condominio?.rodapeContato,
        assinaturaTecnico: vistoria.assinaturaTecnico,
        assinaturaSolicitante: vistoria.assinaturaSolicitante,
      });
      
      return { pdf: pdfBuffer.toString("base64") };
    }),

  // Exportar vistoria em JSON para nuvem
  exportJson: vistoriaProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [vistoria] = await db.select().from(vistorias).where(eq(vistorias.id, input.id));
      if (!vistoria) throw new Error("Vistoria nÃ£o encontrada");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, vistoria.condominioId));
      const imagens = await db.select().from(vistoriaImagens).where(eq(vistoriaImagens.vistoriaId, input.id));
      const timeline = await db.select().from(vistoriaTimeline).where(eq(vistoriaTimeline.vistoriaId, input.id)).orderBy(desc(vistoriaTimeline.createdAt));
      
      return {
        exportDate: new Date().toISOString(),
        tipo: "vistoria",
        vistoria: {
          ...vistoria,
          organizacao: condominio?.nome || "OrganizaÃ§Ã£o",
        },
        imagens,
        timeline,
      };
    }),

  // Exportar todas as vistorias em JSON
  exportAllJson: vistoriaProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, input.condominioId));
      const vistoriasList = await db.select().from(vistorias).where(eq(vistorias.condominioId, input.condominioId)).orderBy(desc(vistorias.createdAt));
      
      const vistoriasComDetalhes = await Promise.all(vistoriasList.map(async (v) => {
        const imagens = await db.select().from(vistoriaImagens).where(eq(vistoriaImagens.vistoriaId, v.id));
        const timeline = await db.select().from(vistoriaTimeline).where(eq(vistoriaTimeline.vistoriaId, v.id)).orderBy(desc(vistoriaTimeline.createdAt));
        return { ...v, imagens, timeline };
      }));
      
      return {
        exportDate: new Date().toISOString(),
        tipo: "vistorias",
        organizacao: condominio?.nome || "OrganizaÃ§Ã£o",
        total: vistoriasComDetalhes.length,
        vistorias: vistoriasComDetalhes,
      };
    }),
});
