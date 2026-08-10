import { z } from "zod";
import { eq, desc, and, like, sql, isNotNull } from "drizzle-orm";
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
  vistoriaItens,
  vistoriaItemAnexos,
  reportes,
  condominios
} from "../../../drizzle/schema";

/** Situações do item de vistoria, definidas pelo cliente. */
const STATUS_ITEM_VISTORIA = [
  "pendente",
  "vamos_levando",
  "concluir_essa_semana",
  "proxima_vez",
  "atencao",
  "problema",
  "intervencao_imediata",
] as const;

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
      // Itens e seus registros: o item pende da vistoria; o anexo pende do item
      // e por isso a rota tambem exige o itemId, que e escopavel.
      atualizarItem: { itemId: via(vistoriaItens, "vistoriaId", vistorias) },
      removerItem: { itemId: via(vistoriaItens, "vistoriaId", vistorias) },
      salvarAntesDepois: { itemId: via(vistoriaItens, "vistoriaId", vistorias) },
      listarAnexosItem: { itemId: via(vistoriaItens, "vistoriaId", vistorias) },
      adicionarAnexoItem: { itemId: via(vistoriaItens, "vistoriaId", vistorias) },
      removerAnexoItem: { itemId: via(vistoriaItens, "vistoriaId", vistorias) },
      atualizarReporte: { id: direto(reportes) },
      removeAnexo: { id: via(vistoriaAnexos, "vistoriaId", vistorias) },
    },
  ),
  // Permissao individual do funcionario vale aqui, nao so na tela.
  "vistorias",
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

  // ========== ITENS DA VISTORIA ==========

  getItens: vistoriaProcedure
    .input(z.object({ vistoriaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(vistoriaItens)
        .where(eq(vistoriaItens.vistoriaId, input.vistoriaId))
        .orderBy(vistoriaItens.ordem);
    }),

  addItem: vistoriaProcedure
    .input(z.object({
      vistoriaId: z.number(),
      descricao: z.string().min(1).max(500),
      local: z.string().max(255).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [criado] = await db.insert(vistoriaItens).values(input).returning();
      return { id: criado.id };
    }),

  atualizarItem: vistoriaProcedure
    .input(z.object({
      itemId: z.number(),
      descricao: z.string().min(1).max(500).optional(),
      local: z.string().max(255).optional(),
      status: z.enum(STATUS_ITEM_VISTORIA).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { itemId, ...campos } = input;
      await db.update(vistoriaItens).set({ ...campos, updatedAt: new Date() })
        .where(eq(vistoriaItens.id, itemId));
      return { success: true };
    }),

  removerItem: vistoriaProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(vistoriaItens).where(eq(vistoriaItens.id, input.itemId));
      return { success: true };
    }),

  salvarAntesDepois: vistoriaProcedure
    .input(z.object({
      itemId: z.number(),
      fotoAntes: z.string().nullable().optional(),
      descAntes: z.string().max(2000).optional(),
      fotoDepois: z.string().nullable().optional(),
      descDepois: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { itemId, ...campos } = input;
      await db.update(vistoriaItens).set({ ...campos, updatedAt: new Date() })
        .where(eq(vistoriaItens.id, itemId));
      return { success: true };
    }),

  listarAnexosItem: vistoriaProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(vistoriaItemAnexos)
        .where(eq(vistoriaItemAnexos.itemId, input.itemId))
        .orderBy(vistoriaItemAnexos.createdAt);
    }),

  adicionarAnexoItem: vistoriaProcedure
    .input(z.object({
      itemId: z.number(),
      url: z.string(),
      nome: z.string().max(255).optional(),
      tipo: z.enum(["imagem", "arquivo"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const autor = autorDaRequisicao(ctx);
      const [criado] = await db.insert(vistoriaItemAnexos).values({
        itemId: input.itemId,
        url: input.url,
        nome: input.nome ?? null,
        tipo: input.tipo ?? (/.pdf$/i.test(input.url) ? "arquivo" : "imagem"),
        autorId: autor.userId,
        autorNome: autor.nome,
      }).returning();
      return { id: criado.id };
    }),

  removerAnexoItem: vistoriaProcedure
    .input(z.object({ itemId: z.number(), anexoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(vistoriaItemAnexos).where(and(
        eq(vistoriaItemAnexos.id, input.anexoId),
        eq(vistoriaItemAnexos.itemId, input.itemId),
      ));
      return { success: true };
    }),

  // ========== REPORTE DE PROBLEMA ==========

  reportarProblema: vistoriaProcedure
    .input(z.object({
      condominioId: z.number(),
      vistoriaId: z.number(),
      vistoriaItemId: z.number().optional(),
      itemDesc: z.string().max(500).optional(),
      descricao: z.string().min(3).max(2000),
      status: z.enum(["aberto", "em_andamento", "resolvido"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      imagens: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const autor = autorDaRequisicao(ctx);
      // Mesmo formato do Manutenção X: RPT-AAMMDD-9999.
      const agora = new Date();
      const protocolo = [
        "RPT-",
        String(agora.getFullYear()).slice(2),
        String(agora.getMonth() + 1).padStart(2, "0"),
        String(agora.getDate()).padStart(2, "0"),
        "-",
        String(Math.floor(1000 + Math.random() * 9000)),
      ].join("");
      const [criado] = await db.insert(reportes).values({
        condominioId: input.condominioId,
        vistoriaId: input.vistoriaId,
        vistoriaItemId: input.vistoriaItemId,
        protocolo,
        itemDesc: input.itemDesc ?? null,
        descricao: input.descricao,
        status: input.status ?? "aberto",
        prioridade: input.prioridade ?? "media",
        imagens: input.imagens ?? [],
        criadoPorId: autor.userId,
        criadoPorNome: autor.nome,
      }).returning();
      return { id: criado.id, protocolo: criado.protocolo };
    }),

  listarReportes: vistoriaProcedure
    .input(z.object({ condominioId: z.number(), vistoriaId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // A tabela `reportes` atende checklist e vistoria: sem filtrar pela
      // origem, esta tela mostraria os problemas abertos no checklist.
      const condicoes = [
        eq(reportes.condominioId, input.condominioId),
        isNotNull(reportes.vistoriaId),
      ];
      if (input.vistoriaId) condicoes.push(eq(reportes.vistoriaId, input.vistoriaId));
      return db.select().from(reportes).where(and(...condicoes)).orderBy(desc(reportes.createdAt));
    }),
});