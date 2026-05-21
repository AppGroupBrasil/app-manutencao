import { z } from "zod";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";

// Auto-criar colunas de assinatura se não existirem
async function ensureSignatureColumns() {
  const db = await getDb();
  if (!db) return;
  const cols = [
    "ALTER TABLE checklists ADD COLUMN assinaturaTecnico TEXT NULL",
    "ALTER TABLE checklists ADD COLUMN assinaturaSolicitante TEXT NULL",
  ];
  for (const ddl of cols) {
    try { await db.execute(sql.raw(ddl)); } catch { /* column may already exist */ }
  }
}
ensureSignatureColumns();
import { generateFuncaoRapidaPDF } from "../../pdfFuncoesRapidas";
import { 
  checklists, 
  checklistTimeline, 
  checklistImagens, 
  checklistAnexos,
  checklistItens,
  checklistTemplates,
  checklistTemplateItens, 
  condominios 
} from "../../../drizzle/schema";

export const checklistRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklists)
        .where(eq(checklists.condominioId, input.condominioId))
        .orderBy(desc(checklists.createdAt));
    }),

  listWithDetails: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db.select().from(checklists)
        .where(eq(checklists.condominioId, input.condominioId))
        .orderBy(desc(checklists.createdAt));
      const result = await Promise.all(items.map(async (item) => {
        const imagens = await db.select().from(checklistImagens)
          .where(eq(checklistImagens.checklistId, item.id));
        const itens = await db.select().from(checklistItens)
          .where(eq(checklistItens.checklistId, item.id));
        return { ...item, imagens, itens };
      }));
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [result] = await db.select().from(checklists).where(eq(checklists.id, input.id));
      return result || null;
    }),

  searchByProtocolo: protectedProcedure
    .input(z.object({ protocolo: z.string(), condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklists)
        .where(and(
          eq(checklists.condominioId, input.condominioId),
          like(checklists.protocolo, `%${input.protocolo}%`)
        ))
        .orderBy(desc(checklists.createdAt));
    }),

  create: protectedProcedure
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
      categoria: z.string().optional(),
      itens: z.array(z.string()).optional(),
      imagens: z.array(z.string()).optional(),
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
        const [existing] = await db.select({ id: checklists.id }).from(checklists).where(eq(checklists.protocolo, protocolo)).limit(1);
        if (!existing) break;
        tentativas++;
      } while (tentativas < 10);
      if (tentativas >= 10) throw new Error("Não foi possível gerar protocolo único");
      
      const { itens, imagens } = input;
      const [result] = await db.insert(checklists).values({
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
        categoria: input.categoria || null,
        totalItens: itens?.length || 0,
        assinaturaTecnico: input.assinaturaTecnico || null,
        assinaturaSolicitante: input.assinaturaSolicitante || null,
      }).returning();
      
      // Inserir itens do checklist
      if (itens && itens.length > 0) {
        for (let i = 0; i < itens.length; i++) {
          await db.insert(checklistItens).values({
            checklistId: result.id,
            descricao: itens[i],
            ordem: i,
          }).returning();
        }
      }

      // Inserir imagens
      if (imagens && imagens.length > 0) {
        await db.insert(checklistImagens).values(
          imagens.map((url, index) => ({
            checklistId: result.id,
            url,
            ordem: index,
          }))
        ).returning();
      }
      
      await db.insert(checklistTimeline).values({
        checklistId: result.id,
        tipo: "abertura",
        descricao: `Checklist criado: ${input.titulo}`,
        statusNovo: "pendente",
        userId: ctx.user?.id,
        userNome: ctx.user?.name || "Sistema",
      }).returning();
      return { id: result.id, protocolo };
    }),

  update: protectedProcedure
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
      categoria: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      const [checklistAtual] = await db.select().from(checklists).where(eq(checklists.id, id));
      const statusAnterior = checklistAtual?.status;
      
      await db.update(checklists)
        .set({
          ...data,
          dataAgendada: data.dataAgendada === undefined ? undefined : (data.dataAgendada ? new Date(data.dataAgendada) : null),
          dataRealizada: data.dataRealizada === undefined ? undefined : (data.dataRealizada ? new Date(data.dataRealizada) : null),
        })
        .where(eq(checklists.id, id));
      
      if (data.status && data.status !== statusAnterior) {
        let tipoEvento: "status_alterado" | "fechamento" | "reabertura" = "status_alterado";
        if (data.status === "finalizada") tipoEvento = "fechamento";
        if (data.status === "reaberta") tipoEvento = "reabertura";
        
        await db.insert(checklistTimeline).values({
          checklistId: id,
          tipo: tipoEvento,
          descricao: `Status alterado de ${statusAnterior} para ${data.status}`,
          statusAnterior,
          statusNovo: data.status,
          userId: ctx.user?.id,
          userNome: ctx.user?.name || "Sistema",
        }).returning();
      } else if (Object.keys(data).length > 0) {
        await db.insert(checklistTimeline).values({
          checklistId: id,
          tipo: "atualizacao",
          descricao: "Checklist atualizado",
          userId: ctx.user?.id,
          userNome: ctx.user?.name || "Sistema",
        });
      }
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(checklistTimeline).where(eq(checklistTimeline.checklistId, input.id));
      await db.delete(checklistImagens).where(eq(checklistImagens.checklistId, input.id));
      await db.delete(checklistAnexos).where(eq(checklistAnexos.checklistId, input.id));
      await db.delete(checklistItens).where(eq(checklistItens.checklistId, input.id));
      await db.delete(checklists).where(eq(checklists.id, input.id));
      return { success: true };
    }),

  // Itens do checklist
  getItens: protectedProcedure
    .input(z.object({ checklistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklistItens)
        .where(eq(checklistItens.checklistId, input.checklistId))
        .orderBy(checklistItens.ordem);
    }),

  addItem: protectedProcedure
    .input(z.object({
      checklistId: z.number(),
      descricao: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(checklistItens).values(input).returning();
      // Atualizar total de itens
      const itens = await db.select().from(checklistItens).where(eq(checklistItens.checklistId, input.checklistId));
      await db.update(checklists).set({ totalItens: itens.length }).where(eq(checklists.id, input.checklistId));
      return { id: result.id };
    }),

  updateItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      descricao: z.string().optional(),
      completo: z.boolean().optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      
      // Buscar item atual
      const [itemAtual] = await db.select().from(checklistItens).where(eq(checklistItens.id, id));
      
      await db.update(checklistItens).set(data).where(eq(checklistItens.id, id));
      
      // Se marcou como completo, adicionar na timeline
      if (data.completo !== undefined && data.completo !== itemAtual?.completo) {
        const checklistId = itemAtual?.checklistId;
        if (checklistId) {
          await db.insert(checklistTimeline).values({
            checklistId,
            tipo: "item_completo",
            descricao: data.completo ? `Item concluÃ­do: ${itemAtual?.descricao}` : `Item reaberto: ${itemAtual?.descricao}`,
            userId: ctx.user?.id,
            userNome: ctx.user?.name || "Sistema",
          }).returning();
          
          // Atualizar contagem de itens completos
          const itens = await db.select().from(checklistItens).where(eq(checklistItens.checklistId, checklistId));
          const completos = itens.filter(i => i.completo).length;
          await db.update(checklists).set({ itensCompletos: completos }).where(eq(checklists.id, checklistId));
        }
      }
      
      return { success: true };
    }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [item] = await db.select().from(checklistItens).where(eq(checklistItens.id, input.id));
      await db.delete(checklistItens).where(eq(checklistItens.id, input.id));
      // Atualizar total de itens
      if (item?.checklistId) {
        const itens = await db.select().from(checklistItens).where(eq(checklistItens.checklistId, item.checklistId));
        await db.update(checklists).set({ 
          totalItens: itens.length,
          itensCompletos: itens.filter(i => i.completo).length
        }).where(eq(checklists.id, item.checklistId));
      }
      return { success: true };
    }),

  getTimeline: protectedProcedure
    .input(z.object({ checklistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklistTimeline)
        .where(eq(checklistTimeline.checklistId, input.checklistId))
        .orderBy(desc(checklistTimeline.createdAt));
    }),

  addTimelineEvent: protectedProcedure
    .input(z.object({
      checklistId: z.number(),
      tipo: z.enum(["abertura", "atualizacao", "status_alterado", "comentario", "imagem_adicionada", "responsavel_alterado", "item_completo", "fechamento", "reabertura"]),
      descricao: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(checklistTimeline).values({
        ...input,
        userId: ctx.user?.id,
        userNome: ctx.user?.name || "Sistema",
      }).returning();
      return { id: result.id };
    }),

  getImagens: protectedProcedure
    .input(z.object({ checklistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklistImagens)
        .where(eq(checklistImagens.checklistId, input.checklistId))
        .orderBy(checklistImagens.ordem);
    }),

  addImagem: protectedProcedure
    .input(z.object({
      checklistId: z.number(),
      url: z.string(),
      legenda: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(checklistImagens).values(input).returning();
      await db.insert(checklistTimeline).values({
        checklistId: input.checklistId,
        tipo: "imagem_adicionada",
        descricao: "Nova imagem adicionada",
        userId: ctx.user?.id,
        userNome: ctx.user?.name || "Sistema",
      }).returning();
      return { id: result.id };
    }),

  removeImagem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(checklistImagens).where(eq(checklistImagens.id, input.id));
      return { success: true };
    }),

  // ========== ANEXOS (PDF/Documentos) ==========
  getAnexos: protectedProcedure
    .input(z.object({ checklistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklistAnexos)
        .where(eq(checklistAnexos.checklistId, input.checklistId))
        .orderBy(desc(checklistAnexos.createdAt));
    }),

  addAnexo: protectedProcedure
    .input(z.object({
      checklistId: z.number(),
      nome: z.string(),
      url: z.string(),
      tipo: z.string(),
      tamanho: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(checklistAnexos).values({
        checklistId: input.checklistId,
        nome: input.nome,
        url: input.url,
        tipo: input.tipo,
        tamanho: input.tamanho || 0,
      }).returning();
      return { id: result.id };
    }),

  removeAnexo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(checklistAnexos).where(eq(checklistAnexos.id, input.id));
      return { success: true };
    }),

  getStats: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0, pendentes: 0, realizadas: 0, finalizadas: 0, requerAcao: 0, reabertas: 0 };
      const stats = await db.select({
        status: checklists.status,
        count: sql<number>`count(*)`,
      }).from(checklists)
        .where(eq(checklists.condominioId, input.condominioId))
        .groupBy(checklists.status);
      
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
  generatePdf: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [checklist] = await db.select().from(checklists).where(eq(checklists.id, input.id));
      if (!checklist) throw new Error("Checklist nÃ£o encontrado");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, checklist.condominioId));
      const imagens = await db.select().from(checklistImagens).where(eq(checklistImagens.checklistId, input.id));
      
      const pdfBuffer = await generateFuncaoRapidaPDF({
        tipo: "checklist",
        protocolo: checklist.protocolo,
        titulo: checklist.titulo,
        subtitulo: checklist.subtitulo,
        descricao: checklist.descricao,
        observacoes: checklist.observacoes,
        status: checklist.status,
        prioridade: checklist.prioridade,
        responsavelNome: checklist.responsavelNome,
        localizacao: checklist.localizacao,
        latitude: checklist.latitude,
        longitude: checklist.longitude,
        enderecoGeo: checklist.enderecoGeo,
        createdAt: checklist.createdAt,
        dataAgendada: checklist.dataAgendada,
        categoria: checklist.categoria,
        totalItens: checklist.totalItens,
        itensCompletos: checklist.itensCompletos,
        imagens: imagens.map(img => ({ url: img.url, legenda: img.legenda })),
        condominioNome: condominio?.nome || "CondomÃ­nio",
        condominioLogo: condominio?.logoUrl,
        // CabeÃ§alho e RodapÃ© personalizados
        cabecalhoLogoUrl: condominio?.cabecalhoLogoUrl,
        cabecalhoNomeCondominio: condominio?.cabecalhoNomeCondominio,
        cabecalhoNomeSindico: condominio?.cabecalhoNomeSindico,
        rodapeTexto: condominio?.rodapeTexto,
        rodapeContato: condominio?.rodapeContato,
        assinaturaTecnico: checklist.assinaturaTecnico,
        assinaturaSolicitante: checklist.assinaturaSolicitante,
      });
      
      return { pdf: pdfBuffer.toString("base64") };
    }),

  // Exportar checklist em JSON para nuvem
  exportJson: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [checklist] = await db.select().from(checklists).where(eq(checklists.id, input.id));
      if (!checklist) throw new Error("Checklist nÃ£o encontrado");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, checklist.condominioId));
      const imagens = await db.select().from(checklistImagens).where(eq(checklistImagens.checklistId, input.id));
      const itens = await db.select().from(checklistItens).where(eq(checklistItens.checklistId, input.id)).orderBy(checklistItens.ordem);
      const timeline = await db.select().from(checklistTimeline).where(eq(checklistTimeline.checklistId, input.id)).orderBy(desc(checklistTimeline.createdAt));
      
      return {
        exportDate: new Date().toISOString(),
        tipo: "checklist",
        checklist: {
          ...checklist,
          organizacao: condominio?.nome || "OrganizaÃ§Ã£o",
        },
        itens,
        imagens,
        timeline,
      };
    }),

  // Exportar todos os checklists em JSON
  exportAllJson: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [condominio] = await db.select().from(condominios).where(eq(condominios.id, input.condominioId));
      const checklistsList = await db.select().from(checklists).where(eq(checklists.condominioId, input.condominioId)).orderBy(desc(checklists.createdAt));
      
      const checklistsComDetalhes = await Promise.all(checklistsList.map(async (c) => {
        const imagens = await db.select().from(checklistImagens).where(eq(checklistImagens.checklistId, c.id));
        const itens = await db.select().from(checklistItens).where(eq(checklistItens.checklistId, c.id)).orderBy(checklistItens.ordem);
        const timeline = await db.select().from(checklistTimeline).where(eq(checklistTimeline.checklistId, c.id)).orderBy(desc(checklistTimeline.createdAt));
        return { ...c, itens, imagens, timeline };
      }));
      
      return {
        exportDate: new Date().toISOString(),
        tipo: "checklists",
        organizacao: condominio?.nome || "OrganizaÃ§Ã£o",
        total: checklistsComDetalhes.length,
        checklists: checklistsComDetalhes,
      };
    }),

  // ==================== TEMPLATES DE CHECKLIST ====================
  listTemplates: protectedProcedure
    .input(z.object({ condominioId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Buscar templates padrÃ£o (isPadrao = true) e templates do condomÃ­nio
      const templates = await db.select().from(checklistTemplates)
        .where(
          input.condominioId 
            ? or(
                eq(checklistTemplates.isPadrao, true),
                eq(checklistTemplates.condominioId, input.condominioId)
              )
            : eq(checklistTemplates.isPadrao, true)
        )
        .orderBy(desc(checklistTemplates.isPadrao), checklistTemplates.nome);
      
      // Buscar itens de cada template
      const templatesComItens = await Promise.all(
        templates.map(async (template) => {
          const itens = await db.select().from(checklistTemplateItens)
            .where(eq(checklistTemplateItens.templateId, template.id))
            .orderBy(checklistTemplateItens.ordem);
          return { ...template, itens };
        })
      );
      
      return templatesComItens;
    }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [template] = await db.select().from(checklistTemplates)
        .where(eq(checklistTemplates.id, input.id));
      if (!template) return null;
      
      const itens = await db.select().from(checklistTemplateItens)
        .where(eq(checklistTemplateItens.templateId, input.id))
        .orderBy(checklistTemplateItens.ordem);
      
      return { ...template, itens };
    }),

  createTemplate: protectedProcedure
    .input(z.object({
      condominioId: z.number().optional(),
      nome: z.string(),
      descricao: z.string().optional(),
      categoria: z.string().optional(),
      icone: z.string().optional(),
      cor: z.string().optional(),
      isPadrao: z.boolean().optional(),
      itens: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { itens, ...templateData } = input;
      const [result] = await db.insert(checklistTemplates).values(templateData).returning();
      const templateId = result.id;
      
      // Inserir itens
      if (itens.length > 0) {
        await db.insert(checklistTemplateItens).values(
          itens.map((descricao, index) => ({
            templateId,
            descricao,
            ordem: index,
          }))
        ).returning();
      }
      
      return { id: templateId };
    }),

  updateTemplate: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      descricao: z.string().optional(),
      categoria: z.string().optional(),
      icone: z.string().optional(),
      cor: z.string().optional(),
      itens: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, itens, ...updateData } = input;
      
      if (Object.keys(updateData).length > 0) {
        await db.update(checklistTemplates)
          .set(updateData)
          .where(eq(checklistTemplates.id, id));
      }
      
      // Atualizar itens se fornecidos
      if (itens) {
        await db.delete(checklistTemplateItens)
          .where(eq(checklistTemplateItens.templateId, id));
        
        if (itens.length > 0) {
          await db.insert(checklistTemplateItens).values(
            itens.map((descricao, index) => ({
              templateId: id,
              descricao,
              ordem: index,
            }))
          );
        }
      }
      
      return { success: true };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Deletar itens primeiro
      await db.delete(checklistTemplateItens)
        .where(eq(checklistTemplateItens.templateId, input.id));
      
      // Deletar template
      await db.delete(checklistTemplates)
        .where(eq(checklistTemplates.id, input.id));
      
      return { success: true };
    }),
});
