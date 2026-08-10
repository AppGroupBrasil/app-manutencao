import { z } from "zod";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { moduloProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { autorDaRequisicao } from "../../_core/autor";
import { getDb } from "../../db";
import { proximoProtocolo } from "../../_core/protocolo";
import { generateFuncaoRapidaPDF } from "../../pdfFuncoesRapidas";
import {
  manutencoes,
  manutencaoTimeline,
  manutencaoImagens,
  manutencaoAnexos,
  condominios
} from "../../../drizzle/schema";

// Exige o modulo "manutencoes" habilitado e valida que cada id recebido
// pertence a organizacao da requisicao.
const manutencaoProcedure = moduloProcedure(
  "manutencoes",
  escopoPorRegistro(
    {
      id: direto(manutencoes),
      manutencaoId: direto(manutencoes),
    },
    {
      removeImagem: { id: via(manutencaoImagens, "manutencaoId", manutencoes) },
      removeAnexo: { id: via(manutencaoAnexos, "manutencaoId", manutencoes) },
    },
  ),
  // Permissao individual do funcionario vale aqui, nao so na tela.
  "manutencoes",
);

export const manutencaoRouter = router({
  list: manutencaoProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(manutencoes)
        .where(eq(manutencoes.condominioId, input.condominioId))
        .orderBy(desc(manutencoes.createdAt));
    }),

  // Endpoint para relatÃ³rios - retorna dados completos com imagens e timeline
  listWithDetails: manutencaoProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db.select().from(manutencoes)
        .where(eq(manutencoes.condominioId, input.condominioId))
        .orderBy(desc(manutencoes.createdAt));
      
      // Buscar imagens e timeline para cada manutenÃ§Ã£o
      const result = await Promise.all(items.map(async (item) => {
        const imagens = await db.select().from(manutencaoImagens)
          .where(eq(manutencaoImagens.manutencaoId, item.id))
          .orderBy(manutencaoImagens.ordem);
        const timeline = await db.select().from(manutencaoTimeline)
          .where(eq(manutencaoTimeline.manutencaoId, item.id))
          .orderBy(desc(manutencaoTimeline.createdAt));
        return { ...item, imagens, timeline };
      }));
      return result;
    }),

  getById: manutencaoProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [result] = await db.select().from(manutencoes).where(eq(manutencoes.id, input.id));
      return result || null;
    }),

  searchByProtocolo: manutencaoProcedure
    .input(z.object({ protocolo: z.string(), condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(manutencoes)
        .where(and(
          eq(manutencoes.condominioId, input.condominioId),
          like(manutencoes.protocolo, `%${input.protocolo}%`)
        ))
        .orderBy(desc(manutencoes.createdAt));
    }),

  create: manutencaoProcedure
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
      tipo: z.enum(["preventiva", "corretiva", "emergencial", "programada"]).optional(),
      tempoEstimadoDias: z.number().optional(),
      tempoEstimadoHoras: z.number().optional(),
      tempoEstimadoMinutos: z.number().optional(),
      fornecedor: z.string().optional(),
      assinaturaTecnico: z.string().optional(),
      assinaturaSolicitante: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // O banco emite o protocolo: sem sorteio, sem retry, sem colisão.
      const protocolo = await proximoProtocolo(db, "manutencao");
      
      const [result] = await db.insert(manutencoes).values({
        condominioId: input.condominioId,
        protocolo,
        titulo: input.titulo,
        subtitulo: input.subtitulo || null,
        descricao: input.descricao || null,
        observacoes: input.observacoes || null,
        responsavelId: ctx.user?.id,
        status: input.status || "pendente",
        responsavelNome: input.responsavelNome || null,
        localizacao: input.localizacao || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        enderecoGeo: input.enderecoGeo || null,
        dataAgendada: input.dataAgendada ? new Date(input.dataAgendada) : null,
        prioridade: input.prioridade || "media",
        tipo: input.tipo || "corretiva",
        tempoEstimadoDias: input.tempoEstimadoDias || 0,
        tempoEstimadoHoras: input.tempoEstimadoHoras || 0,
        tempoEstimadoMinutos: input.tempoEstimadoMinutos || 0,
        fornecedor: input.fornecedor || null,
        assinaturaTecnico: input.assinaturaTecnico || null,
        assinaturaSolicitante: input.assinaturaSolicitante || null,
      }).returning();
      await db.insert(manutencaoTimeline).values({
        manutencaoId: result.id,
        tipo: "abertura",
        descricao: `Manutenção criada: ${input.titulo}`,
        statusNovo: "pendente",
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      });
      return { id: result.id, protocolo };
    }),

  update: manutencaoProcedure
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
      tipo: z.enum(["preventiva", "corretiva", "emergencial", "programada"]).optional(),
      tempoEstimadoDias: z.number().optional(),
      tempoEstimadoHoras: z.number().optional(),
      tempoEstimadoMinutos: z.number().optional(),
      fornecedor: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      const [manutencaoAtual] = await db.select().from(manutencoes).where(eq(manutencoes.id, id));
      const statusAnterior = manutencaoAtual?.status;
      
      await db.update(manutencoes)
        .set({
          ...data,
          dataAgendada: data.dataAgendada === undefined ? undefined : (data.dataAgendada ? new Date(data.dataAgendada) : null),
          dataRealizada: data.dataRealizada === undefined ? undefined : (data.dataRealizada ? new Date(data.dataRealizada) : null),
        })
        .where(eq(manutencoes.id, id));
      
      if (data.status && data.status !== statusAnterior) {
        let tipoEvento: "status_alterado" | "fechamento" | "reabertura" = "status_alterado";
        if (data.status === "finalizada") tipoEvento = "fechamento";
        if (data.status === "reaberta") tipoEvento = "reabertura";
        
        await db.insert(manutencaoTimeline).values({
          manutencaoId: id,
          tipo: tipoEvento,
          descricao: `Status alterado de ${statusAnterior} para ${data.status}`,
          statusAnterior,
          statusNovo: data.status,
          userId: autorDaRequisicao(ctx).userId,
          userNome: autorDaRequisicao(ctx).nome,
        }).returning();
      } else if (Object.keys(data).length > 0) {
        await db.insert(manutencaoTimeline).values({
          manutencaoId: id,
          tipo: "atualizacao",
          descricao: "Manutenção atualizada",
          userId: autorDaRequisicao(ctx).userId,
          userNome: autorDaRequisicao(ctx).nome,
        });
      }
      
      return { success: true };
    }),

  delete: manutencaoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(manutencaoTimeline).where(eq(manutencaoTimeline.manutencaoId, input.id));
      await db.delete(manutencaoImagens).where(eq(manutencaoImagens.manutencaoId, input.id));
      await db.delete(manutencaoAnexos).where(eq(manutencaoAnexos.manutencaoId, input.id));
      await db.delete(manutencoes).where(eq(manutencoes.id, input.id));
      return { success: true };
    }),

  getTimeline: manutencaoProcedure
    .input(z.object({ manutencaoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(manutencaoTimeline)
        .where(eq(manutencaoTimeline.manutencaoId, input.manutencaoId))
        .orderBy(desc(manutencaoTimeline.createdAt));
    }),

  addTimelineEvent: manutencaoProcedure
    .input(z.object({
      manutencaoId: z.number(),
      tipo: z.enum(["abertura", "atualizacao", "status_alterado", "comentario", "imagem_adicionada", "responsavel_alterado", "fechamento", "reabertura"]),
      descricao: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(manutencaoTimeline).values({
        ...input,
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      }).returning();
      return { id: result.id };
    }),

  getImagens: manutencaoProcedure
    .input(z.object({ manutencaoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(manutencaoImagens)
        .where(eq(manutencaoImagens.manutencaoId, input.manutencaoId))
        .orderBy(manutencaoImagens.ordem);
    }),

  addImagem: manutencaoProcedure
    .input(z.object({
      manutencaoId: z.number(),
      url: z.string(),
      legenda: z.string().optional(),
      fase: z.enum(["antes", "depois"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(manutencaoImagens).values(input).returning();
      await db.insert(manutencaoTimeline).values({
        manutencaoId: input.manutencaoId,
        tipo: "imagem_adicionada",
        descricao: "Nova imagem adicionada",
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      }).returning();
      return { id: result.id };
    }),

  removeImagem: manutencaoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(manutencaoImagens).where(eq(manutencaoImagens.id, input.id));
      return { success: true };
    }),

  // ========== ANEXOS (PDF/Documentos) ==========
  getAnexos: manutencaoProcedure
    .input(z.object({ manutencaoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(manutencaoAnexos)
        .where(eq(manutencaoAnexos.manutencaoId, input.manutencaoId))
        .orderBy(desc(manutencaoAnexos.createdAt));
    }),

  addAnexo: manutencaoProcedure
    .input(z.object({
      manutencaoId: z.number(),
      nome: z.string(),
      url: z.string(),
      tipo: z.string(),
      tamanho: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(manutencaoAnexos).values({
        manutencaoId: input.manutencaoId,
        nome: input.nome,
        url: input.url,
        tipo: input.tipo,
        tamanho: input.tamanho || 0,
      }).returning();
      return { id: result.id };
    }),

  removeAnexo: manutencaoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(manutencaoAnexos).where(eq(manutencaoAnexos.id, input.id));
      return { success: true };
    }),

  getStats: manutencaoProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0, pendentes: 0, realizadas: 0, finalizadas: 0, requerAcao: 0, reabertas: 0 };
      const stats = await db.select({
        status: manutencoes.status,
        count: sql<number>`count(*)`,
      }).from(manutencoes)
        .where(eq(manutencoes.condominioId, input.condominioId))
        .groupBy(manutencoes.status);
      
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
  generatePdf: manutencaoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [manutencao] = await db.select().from(manutencoes).where(eq(manutencoes.id, input.id));
      if (!manutencao) throw new Error("Manutenção não encontrada");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, manutencao.condominioId));
      const imagens = await db.select().from(manutencaoImagens).where(eq(manutencaoImagens.manutencaoId, input.id));
      
      const pdfBuffer = await generateFuncaoRapidaPDF({
        tipo: "manutencao",
        protocolo: manutencao.protocolo,
        titulo: manutencao.titulo,
        subtitulo: manutencao.subtitulo,
        descricao: manutencao.descricao,
        observacoes: manutencao.observacoes,
        status: manutencao.status,
        prioridade: manutencao.prioridade,
        responsavelNome: manutencao.responsavelNome,
        localizacao: manutencao.localizacao,
        latitude: manutencao.latitude,
        longitude: manutencao.longitude,
        enderecoGeo: manutencao.enderecoGeo,
        createdAt: manutencao.createdAt,
        dataAgendada: manutencao.dataAgendada,
        dataRealizada: manutencao.dataRealizada,
        tipo_manutencao: manutencao.tipo,
        tempoEstimadoDias: manutencao.tempoEstimadoDias,
        tempoEstimadoHoras: manutencao.tempoEstimadoHoras,
        tempoEstimadoMinutos: manutencao.tempoEstimadoMinutos,
        fornecedor: manutencao.fornecedor,
        imagens: imagens.map(img => ({ url: img.url, legenda: img.legenda })),
        condominioNome: condominio?.nome || "Organização",
        condominioLogo: condominio?.logoUrl,
        // CabeÃ§alho e RodapÃ© personalizados
        cabecalhoLogoUrl: condominio?.cabecalhoLogoUrl,
        cabecalhoNomeCondominio: condominio?.cabecalhoNomeCondominio,
        cabecalhoNomeSindico: condominio?.cabecalhoNomeSindico,
        rodapeTexto: condominio?.rodapeTexto,
        rodapeContato: condominio?.rodapeContato,
        assinaturaTecnico: manutencao.assinaturaTecnico,
        assinaturaSolicitante: manutencao.assinaturaSolicitante,
      });
      
      return { pdf: pdfBuffer.toString("base64") };
    }),

  // Exportar manutenÃ§Ã£o em JSON para nuvem
  exportJson: manutencaoProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [manutencao] = await db.select().from(manutencoes).where(eq(manutencoes.id, input.id));
      if (!manutencao) throw new Error("Manutenção não encontrada");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, manutencao.condominioId));
      const imagens = await db.select().from(manutencaoImagens).where(eq(manutencaoImagens.manutencaoId, input.id));
      const timeline = await db.select().from(manutencaoTimeline).where(eq(manutencaoTimeline.manutencaoId, input.id)).orderBy(desc(manutencaoTimeline.createdAt));
      
      return {
        exportDate: new Date().toISOString(),
        tipo: "manutencao",
        manutencao: {
          ...manutencao,
          organizacao: condominio?.nome || "Organização",
        },
        imagens,
        timeline,
      };
    }),

  // Exportar todas as manutenÃ§Ãµes em JSON
  exportAllJson: manutencaoProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, input.condominioId));
      const manutencoesList = await db.select().from(manutencoes).where(eq(manutencoes.condominioId, input.condominioId)).orderBy(desc(manutencoes.createdAt));
      
      const manutencoesComDetalhes = await Promise.all(manutencoesList.map(async (m) => {
        const imagens = await db.select().from(manutencaoImagens).where(eq(manutencaoImagens.manutencaoId, m.id));
        const timeline = await db.select().from(manutencaoTimeline).where(eq(manutencaoTimeline.manutencaoId, m.id)).orderBy(desc(manutencaoTimeline.createdAt));
        return { ...m, imagens, timeline };
      }));
      
      return {
        exportDate: new Date().toISOString(),
        tipo: "manutencoes",
        organizacao: condominio?.nome || "Organização",
        total: manutencoesComDetalhes.length,
        manutencoes: manutencoesComDetalhes,
      };
    }),
});
