import { z } from "zod";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { moduloProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { autorDaRequisicao } from "../../_core/autor";
import { getDb } from "../../db";
import { nanoid } from "nanoid";
import { proximoProtocolo } from "../../_core/protocolo";

import { generateFuncaoRapidaPDF } from "../../pdfFuncoesRapidas";
import { 
  ocorrencias, 
  ocorrenciaTimeline, 
  ocorrenciaImagens, 
  ocorrenciaAnexos,
  condominios 
} from "../../../drizzle/schema";

// Exige o modulo "ocorrencias" habilitado e valida que cada id recebido
// pertence a organizacao da requisicao.
const ocorrenciaProcedure = moduloProcedure(
  "ocorrencias",
  escopoPorRegistro(
    {
      id: direto(ocorrencias),
      ocorrenciaId: direto(ocorrencias),
    },
    {
      removeImagem: { id: via(ocorrenciaImagens, "ocorrenciaId", ocorrencias) },
      removeAnexo: { id: via(ocorrenciaAnexos, "ocorrenciaId", ocorrencias) },
    },
  ),
  // Permissao individual do funcionario vale aqui, nao so na tela.
  "ocorrencias",
);

export const ocorrenciaRouter = router({
  list: ocorrenciaProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(ocorrencias)
        .where(eq(ocorrencias.condominioId, input.condominioId))
        .orderBy(desc(ocorrencias.createdAt));
    }),

  listWithDetails: ocorrenciaProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db.select().from(ocorrencias)
        .where(eq(ocorrencias.condominioId, input.condominioId))
        .orderBy(desc(ocorrencias.createdAt));
      const result = await Promise.all(items.map(async (item) => {
        const imagens = await db.select().from(ocorrenciaImagens)
          .where(eq(ocorrenciaImagens.ocorrenciaId, item.id));
        const timeline = await db.select().from(ocorrenciaTimeline)
          .where(eq(ocorrenciaTimeline.ocorrenciaId, item.id))
          .orderBy(desc(ocorrenciaTimeline.createdAt));
        return { ...item, imagens, timeline };
      }));
      return result;
    }),

  getById: ocorrenciaProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [result] = await db.select().from(ocorrencias).where(eq(ocorrencias.id, input.id));
      return result || null;
    }),

  searchByProtocolo: ocorrenciaProcedure
    .input(z.object({ protocolo: z.string(), condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(ocorrencias)
        .where(and(
          eq(ocorrencias.condominioId, input.condominioId),
          like(ocorrencias.protocolo, `%${input.protocolo}%`)
        ))
        .orderBy(desc(ocorrencias.createdAt));
    }),

  create: ocorrenciaProcedure
    .input(z.object({
      condominioId: z.number(),
      titulo: z.string(),
      subtitulo: z.string().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
      reportadoPorNome: z.string().optional(),
      responsavelNome: z.string().optional(),
      localizacao: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      enderecoGeo: z.string().optional(),
      dataOcorrencia: z.string().optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      categoria: z.enum(["seguranca", "barulho", "manutencao", "convivencia", "animais", "estacionamento", "limpeza", "outros"]).optional(),
      assinaturaTecnico: z.string().optional(),
      assinaturaSolicitante: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // O banco emite o protocolo: sem sorteio, sem retry, sem colisão.
      const protocolo = await proximoProtocolo(db, "ocorrencia");
      
      const [result] = await db.insert(ocorrencias).values({
        condominioId: input.condominioId,
        protocolo,
        // Link público de leitura, usado pelo QR do cartão e da folha.
        shareToken: nanoid(32),
        titulo: input.titulo,
        subtitulo: input.subtitulo || null,
        descricao: input.descricao || null,
        observacoes: input.observacoes || null,
        reportadoPorId: ctx.user?.id,
        reportadoPorNome: input.reportadoPorNome || null,
        responsavelNome: input.responsavelNome || null,
        localizacao: input.localizacao || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        enderecoGeo: input.enderecoGeo || null,
        dataOcorrencia: input.dataOcorrencia ? new Date(input.dataOcorrencia) : new Date(),
        status: "pendente",
        prioridade: input.prioridade || "media",
        categoria: input.categoria || "outros",
        assinaturaTecnico: input.assinaturaTecnico || null,
        assinaturaSolicitante: input.assinaturaSolicitante || null,
      }).returning();
      await db.insert(ocorrenciaTimeline).values({
        ocorrenciaId: result.id,
        tipo: "abertura",
        descricao: `OcorrÃªncia registrada: ${input.titulo}`,
        statusNovo: "pendente",
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      });
      return { id: result.id, protocolo };
    }),

  update: ocorrenciaProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      subtitulo: z.string().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
      responsavelNome: z.string().optional(),
      localizacao: z.string().optional(),
      dataOcorrencia: z.string().optional(),
      status: z.enum(["pendente", "realizada", "acao_necessaria", "finalizada", "reaberta"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      categoria: z.enum(["seguranca", "barulho", "manutencao", "convivencia", "animais", "estacionamento", "limpeza", "outros"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      const [ocorrenciaAtual] = await db.select().from(ocorrencias).where(eq(ocorrencias.id, id));
      const statusAnterior = ocorrenciaAtual?.status;
      
      await db.update(ocorrencias).set({
        ...data,
        dataOcorrencia: data.dataOcorrencia === undefined ? undefined : (data.dataOcorrencia ? new Date(data.dataOcorrencia) : null),
      }).where(eq(ocorrencias.id, id));
      
      if (data.status && data.status !== statusAnterior) {
        let tipoEvento: "status_alterado" | "fechamento" | "reabertura" = "status_alterado";
        if (data.status === "finalizada") tipoEvento = "fechamento";
        if (data.status === "reaberta") tipoEvento = "reabertura";
        
        await db.insert(ocorrenciaTimeline).values({
          ocorrenciaId: id,
          tipo: tipoEvento,
          descricao: `Status alterado de ${statusAnterior} para ${data.status}`,
          statusAnterior,
          statusNovo: data.status,
          userId: autorDaRequisicao(ctx).userId,
          userNome: autorDaRequisicao(ctx).nome,
        }).returning();
      } else if (Object.keys(data).length > 0) {
        await db.insert(ocorrenciaTimeline).values({
          ocorrenciaId: id,
          tipo: "atualizacao",
          descricao: "Ocorrência atualizada",
          userId: autorDaRequisicao(ctx).userId,
          userNome: autorDaRequisicao(ctx).nome,
        });
      }
      
      return { success: true };
    }),

  delete: ocorrenciaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(ocorrenciaTimeline).where(eq(ocorrenciaTimeline.ocorrenciaId, input.id));
      await db.delete(ocorrenciaImagens).where(eq(ocorrenciaImagens.ocorrenciaId, input.id));
      await db.delete(ocorrenciaAnexos).where(eq(ocorrenciaAnexos.ocorrenciaId, input.id));
      await db.delete(ocorrencias).where(eq(ocorrencias.id, input.id));
      return { success: true };
    }),

  getTimeline: ocorrenciaProcedure
    .input(z.object({ ocorrenciaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(ocorrenciaTimeline)
        .where(eq(ocorrenciaTimeline.ocorrenciaId, input.ocorrenciaId))
        .orderBy(desc(ocorrenciaTimeline.createdAt));
    }),

  addTimelineEvent: ocorrenciaProcedure
    .input(z.object({
      ocorrenciaId: z.number(),
      tipo: z.enum(["abertura", "atualizacao", "status_alterado", "comentario", "imagem_adicionada", "responsavel_alterado", "fechamento", "reabertura"]),
      descricao: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(ocorrenciaTimeline).values({
        ...input,
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      }).returning();
      return { id: result.id };
    }),

  getImagens: ocorrenciaProcedure
    .input(z.object({ ocorrenciaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(ocorrenciaImagens)
        .where(eq(ocorrenciaImagens.ocorrenciaId, input.ocorrenciaId))
        .orderBy(ocorrenciaImagens.ordem);
    }),

  addImagem: ocorrenciaProcedure
    .input(z.object({
      ocorrenciaId: z.number(),
      url: z.string(),
      legenda: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(ocorrenciaImagens).values(input).returning();
      await db.insert(ocorrenciaTimeline).values({
        ocorrenciaId: input.ocorrenciaId,
        tipo: "imagem_adicionada",
        descricao: "Nova imagem adicionada",
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      }).returning();
      return { id: result.id };
    }),

  removeImagem: ocorrenciaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(ocorrenciaImagens).where(eq(ocorrenciaImagens.id, input.id));
      return { success: true };
    }),

  // ========== ANEXOS (PDF/Documentos) ==========
  getAnexos: ocorrenciaProcedure
    .input(z.object({ ocorrenciaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(ocorrenciaAnexos)
        .where(eq(ocorrenciaAnexos.ocorrenciaId, input.ocorrenciaId))
        .orderBy(desc(ocorrenciaAnexos.createdAt));
    }),

  addAnexo: ocorrenciaProcedure
    .input(z.object({
      ocorrenciaId: z.number(),
      nome: z.string(),
      url: z.string(),
      tipo: z.string(),
      tamanho: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(ocorrenciaAnexos).values({
        ocorrenciaId: input.ocorrenciaId,
        nome: input.nome,
        url: input.url,
        tipo: input.tipo,
        tamanho: input.tamanho || 0,
      }).returning();
      return { id: result.id };
    }),

  removeAnexo: ocorrenciaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(ocorrenciaAnexos).where(eq(ocorrenciaAnexos.id, input.id));
      return { success: true };
    }),

  getStats: ocorrenciaProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0, pendentes: 0, realizadas: 0, finalizadas: 0, requerAcao: 0, reabertas: 0 };
      const stats = await db.select({
        status: ocorrencias.status,
        count: sql<number>`count(*)`,
      }).from(ocorrencias)
        .where(eq(ocorrencias.condominioId, input.condominioId))
        .groupBy(ocorrencias.status);
      
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
  generatePdf: ocorrenciaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [ocorrencia] = await db.select().from(ocorrencias).where(eq(ocorrencias.id, input.id));
      if (!ocorrencia) throw new Error("OcorrÃªncia nÃ£o encontrada");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, ocorrencia.condominioId));
      const imagens = await db.select().from(ocorrenciaImagens).where(eq(ocorrenciaImagens.ocorrenciaId, input.id));
      
      const pdfBuffer = await generateFuncaoRapidaPDF({
        tipo: "ocorrencia",
        protocolo: ocorrencia.protocolo,
        titulo: ocorrencia.titulo,
        subtitulo: ocorrencia.subtitulo,
        descricao: ocorrencia.descricao,
        observacoes: ocorrencia.observacoes,
        status: ocorrencia.status,
        prioridade: ocorrencia.prioridade,
        responsavelNome: ocorrencia.responsavelNome,
        localizacao: ocorrencia.localizacao,
        latitude: ocorrencia.latitude,
        longitude: ocorrencia.longitude,
        enderecoGeo: ocorrencia.enderecoGeo,
        createdAt: ocorrencia.createdAt,
        dataOcorrencia: ocorrencia.dataOcorrencia,
        categoria: ocorrencia.categoria,
        imagens: imagens.map(img => ({ url: img.url, legenda: img.legenda })),
        condominioNome: condominio?.nome || "CondomÃ­nio",
        condominioLogo: condominio?.logoUrl,
        // CabeÃ§alho e RodapÃ© personalizados
        cabecalhoLogoUrl: condominio?.cabecalhoLogoUrl,
        cabecalhoNomeCondominio: condominio?.cabecalhoNomeCondominio,
        cabecalhoNomeSindico: condominio?.cabecalhoNomeSindico,
        rodapeTexto: condominio?.rodapeTexto,
        rodapeContato: condominio?.rodapeContato,
        assinaturaTecnico: ocorrencia.assinaturaTecnico,
        assinaturaSolicitante: ocorrencia.assinaturaSolicitante,
      });
      
      return { pdf: pdfBuffer.toString("base64") };
    }),

  // Exportar ocorrÃªncia em JSON para nuvem
  exportJson: ocorrenciaProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [ocorrencia] = await db.select().from(ocorrencias).where(eq(ocorrencias.id, input.id));
      if (!ocorrencia) throw new Error("OcorrÃªncia nÃ£o encontrada");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, ocorrencia.condominioId));
      const imagens = await db.select().from(ocorrenciaImagens).where(eq(ocorrenciaImagens.ocorrenciaId, input.id));
      const timeline = await db.select().from(ocorrenciaTimeline).where(eq(ocorrenciaTimeline.ocorrenciaId, input.id)).orderBy(desc(ocorrenciaTimeline.createdAt));
      
      return {
        exportDate: new Date().toISOString(),
        tipo: "ocorrencia",
        ocorrencia: {
          ...ocorrencia,
          organizacao: condominio?.nome || "OrganizaÃ§Ã£o",
        },
        imagens,
        timeline,
      };
    }),

  // Exportar todas as ocorrÃªncias em JSON
  exportAllJson: ocorrenciaProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, input.condominioId));
      const ocorrenciasList = await db.select().from(ocorrencias).where(eq(ocorrencias.condominioId, input.condominioId)).orderBy(desc(ocorrencias.createdAt));
      
      const ocorrenciasComDetalhes = await Promise.all(ocorrenciasList.map(async (o) => {
        const imagens = await db.select().from(ocorrenciaImagens).where(eq(ocorrenciaImagens.ocorrenciaId, o.id));
        const timeline = await db.select().from(ocorrenciaTimeline).where(eq(ocorrenciaTimeline.ocorrenciaId, o.id)).orderBy(desc(ocorrenciaTimeline.createdAt));
        return { ...o, imagens, timeline };
      }));
      
      return {
        exportDate: new Date().toISOString(),
        tipo: "ocorrencias",
        organizacao: condominio?.nome || "OrganizaÃ§Ã£o",
        total: ocorrenciasComDetalhes.length,
        ocorrencias: ocorrenciasComDetalhes,
      };
    }),
});
