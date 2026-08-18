import { z } from "zod";
import { eq, desc, and, inArray, like, or, sql, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { moduloProcedure, moduloUserProcedure, router } from "../../_core/trpc";
import { unidadesDaConsulta, unidadesSelecionadas } from "../../_core/unidadesConsulta";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { autorDaRequisicao } from "../../_core/autor";
import { getDb } from "../../db";
import { nanoid } from "nanoid";
import { proximoProtocolo, proximoProtocoloComData } from "../../_core/protocolo";

import { generateFuncaoRapidaPDF } from "../../pdfFuncoesRapidas";
import { 
  checklists, 
  checklistTimeline, 
  checklistImagens, 
  checklistAnexos,
  checklistItens,
  checklistItemAnexos,
  reportes,
  checklistTemplates,
  checklistTemplateItens,
  condominios
} from "../../../drizzle/schema";

// Exige o modulo "checklists" habilitado e valida que cada id recebido pertence
// a organizacao da requisicao.
/** `id` aqui é sempre o modelo, nunca um checklist. */
const escopoTemplates = escopoPorRegistro({ id: direto(checklistTemplates) });

const checklistProcedure = moduloProcedure(
  "checklists",
  escopoPorRegistro(
    {
      id: direto(checklists),
      checklistId: direto(checklists),
    },
    {
      updateItem: { id: via(checklistItens, "checklistId", checklists) },
      removeItem: { id: via(checklistItens, "checklistId", checklists) },
      removeImagem: { id: via(checklistImagens, "checklistId", checklists) },
      removeAnexo: { id: via(checklistAnexos, "checklistId", checklists) },
      // Registros por item: o pai é o item, que por sua vez pende do checklist.
      salvarAntesDepois: { itemId: via(checklistItens, "checklistId", checklists) },
      listarAnexosItem: { itemId: via(checklistItens, "checklistId", checklists) },
      adicionarAnexoItem: { itemId: via(checklistItens, "checklistId", checklists) },
      // O anexo fica a dois saltos do tenant (anexo → item → checklist) e o
      // verificador só resolve um. Por isso a rota exige também o `itemId`, que
      // é escopável, e a exclusão casa os dois.
      removerAnexoItem: { itemId: via(checklistItens, "checklistId", checklists) },
      atualizarReporte: { id: direto(reportes) },
      // Sem isto o `id` do template cairia no mapa padrao e seria conferido
      // contra `checklists`, deixando template de outro cliente passar.
      getTemplate: { id: direto(checklistTemplates) },
    },
  ),
  // Permissao individual do funcionario vale aqui, nao so na tela.
  "checklists",
);

/**
 * Modelos de checklist: catalogo da unidade, decisao do gestor. O funcionario
 * usa o modelo para preencher, mas nao cria nem apaga modelo.
 */
const checklistTemplateProcedure = moduloUserProcedure("checklists", escopoTemplates);

/**
 * Modelo de checklist que o cliente pode alterar.
 *
 * O escopo por registro cobre o template de outra organização, mas não o
 * `isPadrao`, que é do catálogo da plataforma e vem sem `condominioId` — sem
 * esta trava, um cliente apagaria o modelo que todos usam.
 */
async function assegurarTemplateDoCliente(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  templateId: number,
): Promise<void> {
  const [template] = await db
    .select({ isPadrao: checklistTemplates.isPadrao })
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, templateId))
    .limit(1);

  if (template?.isPadrao) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Modelo padrão do sistema não pode ser alterado nem removido.",
    });
  }
}

export const checklistRouter = router({
  list: checklistProcedure
    .input(z.object({ condominioId: z.number(), unidades: unidadesSelecionadas }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklists)
        .where(inArray(checklists.condominioId, await unidadesDaConsulta(ctx, input, "checklists")))
        .orderBy(desc(checklists.createdAt));
    }),

  listWithDetails: checklistProcedure
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

  getById: checklistProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [result] = await db.select().from(checklists).where(eq(checklists.id, input.id));
      return result || null;
    }),

  searchByProtocolo: checklistProcedure
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

  create: checklistProcedure
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
      // O banco emite o protocolo: sem sorteio, sem retry, sem colisão.
      const protocolo = await proximoProtocolo(db, "checklist");
      
      const { itens, imagens } = input;
      const [result] = await db.insert(checklists).values({
        condominioId: input.condominioId,
        protocolo,
        // Link público de leitura, usado pelo QR do cartão e da folha.
        shareToken: nanoid(32),
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
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      }).returning();
      return { id: result.id, protocolo };
    }),

  update: checklistProcedure
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
          userId: autorDaRequisicao(ctx).userId,
          userNome: autorDaRequisicao(ctx).nome,
        }).returning();
      } else if (Object.keys(data).length > 0) {
        await db.insert(checklistTimeline).values({
          checklistId: id,
          tipo: "atualizacao",
          descricao: "Checklist atualizado",
          userId: autorDaRequisicao(ctx).userId,
          userNome: autorDaRequisicao(ctx).nome,
        });
      }
      
      return { success: true };
    }),

  delete: checklistProcedure
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
  getItens: checklistProcedure
    .input(z.object({ checklistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklistItens)
        .where(eq(checklistItens.checklistId, input.checklistId))
        .orderBy(checklistItens.ordem);
    }),

  addItem: checklistProcedure
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

  updateItem: checklistProcedure
    .input(z.object({
      id: z.number(),
      descricao: z.string().optional(),
      completo: z.boolean().optional(),
      observacao: z.string().optional(),
      fotoAntes: z.string().nullable().optional(),
      descAntes: z.string().optional(),
      fotoDepois: z.string().nullable().optional(),
      descDepois: z.string().optional(),
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
            userId: autorDaRequisicao(ctx).userId,
            userNome: autorDaRequisicao(ctx).nome,
          }).returning();
          
          // Atualizar contagem de itens completos
          const itens = await db.select().from(checklistItens).where(eq(checklistItens.checklistId, checklistId));
          const completos = itens.filter(i => i.completo).length;
          await db.update(checklists).set({ itensCompletos: completos }).where(eq(checklists.id, checklistId));
        }
      }
      
      return { success: true };
    }),

  removeItem: checklistProcedure
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

  getTimeline: checklistProcedure
    .input(z.object({ checklistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklistTimeline)
        .where(eq(checklistTimeline.checklistId, input.checklistId))
        .orderBy(desc(checklistTimeline.createdAt));
    }),

  addTimelineEvent: checklistProcedure
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
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      }).returning();
      return { id: result.id };
    }),

  getImagens: checklistProcedure
    .input(z.object({ checklistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklistImagens)
        .where(eq(checklistImagens.checklistId, input.checklistId))
        .orderBy(checklistImagens.ordem);
    }),

  addImagem: checklistProcedure
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
        userId: autorDaRequisicao(ctx).userId,
        userNome: autorDaRequisicao(ctx).nome,
      }).returning();
      return { id: result.id };
    }),

  removeImagem: checklistProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(checklistImagens).where(eq(checklistImagens.id, input.id));
      return { success: true };
    }),

  // ========== ANEXOS (PDF/Documentos) ==========
  getAnexos: checklistProcedure
    .input(z.object({ checklistId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(checklistAnexos)
        .where(eq(checklistAnexos.checklistId, input.checklistId))
        .orderBy(desc(checklistAnexos.createdAt));
    }),

  addAnexo: checklistProcedure
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

  removeAnexo: checklistProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(checklistAnexos).where(eq(checklistAnexos.id, input.id));
      return { success: true };
    }),

  getStats: checklistProcedure
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
  generatePdf: checklistProcedure
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
  exportJson: checklistProcedure
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
  exportAllJson: checklistProcedure
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
  listTemplates: checklistProcedure
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

  getTemplate: checklistProcedure
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

  createTemplate: checklistTemplateProcedure
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

  updateTemplate: checklistTemplateProcedure
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

      await assegurarTemplateDoCliente(db, id);

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

  deleteTemplate: checklistTemplateProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await assegurarTemplateDoCliente(db, input.id);

      // Deletar itens primeiro
      await db.delete(checklistTemplateItens)
        .where(eq(checklistTemplateItens.templateId, input.id));
      
      // Deletar template
      await db.delete(checklistTemplates)
        .where(eq(checklistTemplates.id, input.id));

      return { success: true };
    }),

  // ========== ANTES E DEPOIS, ANEXOS E REPORTE POR ITEM ==========

  salvarAntesDepois: checklistProcedure
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
      await db
        .update(checklistItens)
        .set({ ...campos, updatedAt: new Date() })
        .where(eq(checklistItens.id, itemId));

      return { success: true };
    }),

  listarAnexosItem: checklistProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(checklistItemAnexos)
        .where(eq(checklistItemAnexos.itemId, input.itemId))
        .orderBy(checklistItemAnexos.createdAt);
    }),

  adicionarAnexoItem: checklistProcedure
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
      const [criado] = await db
        .insert(checklistItemAnexos)
        .values({
          itemId: input.itemId,
          url: input.url,
          nome: input.nome ?? null,
          tipo: input.tipo ?? (/\.pdf$/i.test(input.url) ? "arquivo" : "imagem"),
          autorId: autor.userId,
          autorNome: autor.nome,
        })
        .returning();

      return { id: criado.id };
    }),

  removerAnexoItem: checklistProcedure
    .input(z.object({ itemId: z.number(), anexoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // O `itemId` é o que o verificador de escopo consegue conferir; casar os
      // dois impede apagar anexo de outro item passando só o id do anexo.
      await db
        .delete(checklistItemAnexos)
        .where(
          and(
            eq(checklistItemAnexos.id, input.anexoId),
            eq(checklistItemAnexos.itemId, input.itemId),
          ),
        );

      return { success: true };
    }),

  reportarProblema: checklistProcedure
    .input(z.object({
      condominioId: z.number(),
      checklistId: z.number(),
      itemId: z.number().optional(),
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
      const [criado] = await db
        .insert(reportes)
        .values({
          condominioId: input.condominioId,
          checklistId: input.checklistId,
          itemId: input.itemId,
          protocolo: await proximoProtocoloComData(db, "reporte", "RPT-"),
          itemDesc: input.itemDesc ?? null,
          descricao: input.descricao,
          status: input.status ?? "aberto",
          prioridade: input.prioridade ?? "media",
          imagens: input.imagens ?? [],
          criadoPorId: autor.userId,
          criadoPorNome: autor.nome,
        })
        .returning();

      return { id: criado.id, protocolo: criado.protocolo };
    }),

  listarReportes: checklistProcedure
    .input(z.object({
      condominioId: z.number(),
      unidades: unidadesSelecionadas,
      checklistId: z.number().optional(),
      status: z.enum(["todos", "aberto", "em_andamento", "resolvido"]).optional().default("todos"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // A tabela `reportes` atende checklist e vistoria: sem este filtro a tela
      // de checklist mostraria os problemas abertos na vistoria.
      const condicoes = [
        inArray(reportes.condominioId, await unidadesDaConsulta(ctx, input, "checklists")),
        isNotNull(reportes.checklistId),
      ];
      if (input.checklistId) condicoes.push(eq(reportes.checklistId, input.checklistId));
      if (input.status !== "todos") condicoes.push(eq(reportes.status, input.status));

      return db
        .select()
        .from(reportes)
        .where(and(...condicoes))
        .orderBy(desc(reportes.createdAt));
    }),

  atualizarReporte: checklistProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["aberto", "em_andamento", "resolvido"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...campos } = input;
      if (Object.keys(campos).length > 0) {
        await db.update(reportes).set(campos).where(eq(reportes.id, id));
      }

      return { success: true };
    }),
});
