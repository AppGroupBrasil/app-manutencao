
import { z } from "zod";
import { getDb } from "../../db";
import { 
  linksCompartilhaveis, 
  historicoCompartilhamentos, 
  historicoAtividades,
  vistorias, 
  vistoriaImagens, 
  vistoriaTimeline, 
  manutencoes, 
  manutencaoImagens, 
  manutencaoTimeline, 
  ocorrencias, 
  ocorrenciaImagens, 
  ocorrenciaTimeline, 
  checklists, 
  checklistItens, 
  checklistImagens, 
  checklistTimeline, 
  comentariosItem, 
  anexosComentario, 
  respostasComentario, 
  membrosEquipe 
} from "../../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { publicProcedure, protectedProcedure, protectedOrFuncionarioProcedure, escopoProcedure, publicWriteProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";
import { nanoid } from "nanoid";
import { storagePut } from "../../storage";

/** Helper para registar atividade na timeline */
async function registrarAtividadeLink(
  db: any,
  opts: {
    condominioId: number;
    linkId: number;
    acao: "editado" | "criado" | "compartilhado" | "cancelado";
    descricao: string;
    valorAnterior?: string;
    valorNovo?: string;
    usuarioId?: number | null;
    usuarioNome: string;
  }
) {
  await db.insert(historicoAtividades).values({
    condominioId: opts.condominioId,
    entidadeTipo: "vistoria", // using closest available enum value
    entidadeId: opts.linkId,
    entidadeProtocolo: `LINK-${opts.linkId}`,
    entidadeTitulo: "Link/QR Code",
    acao: opts.acao,
    descricao: opts.descricao,
    valorAnterior: opts.valorAnterior,
    valorNovo: opts.valorNovo,
    usuarioId: opts.usuarioId,
    usuarioNome: opts.usuarioNome,
  }).returning();
}

/**
 * Rotas por id de link: o link precisa ser de uma organização do solicitante.
 * Duas rotas chamam o campo de `linkId`; ambos apontam para a mesma tabela.
 */
const linkProcedure = escopoProcedure(
  escopoPorRegistro({ id: direto(linksCompartilhaveis), linkId: direto(linksCompartilhaveis) }),
);

/** Rotas por `id` de comentário. */
const comentarioProcedure = escopoProcedure(escopoPorRegistro({ id: direto(comentariosItem) }));

export const linkCompartilhavelRouter = router({
  list: protectedOrFuncionarioProcedure
    .input(z.object({ condominioId: z.number(), tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "checklist"]).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(linksCompartilhaveis.condominioId, input.condominioId), eq(linksCompartilhaveis.ativo, true)];
      if (input.tipo) {
        conditions.push(eq(linksCompartilhaveis.tipo, input.tipo));
      }
      return db.select().from(linksCompartilhaveis)
        .where(and(...conditions))
        .orderBy(desc(linksCompartilhaveis.createdAt));
    }),

  get: linkProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(linksCompartilhaveis).where(eq(linksCompartilhaveis.id, input.id)).limit(1);
      return result[0] || null;
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(linksCompartilhaveis)
        .where(and(
          eq(linksCompartilhaveis.token, input.token),
          eq(linksCompartilhaveis.ativo, true)
        ))
        .limit(1);
      
      if (!result[0]) return null;
      
      // Verificar expiração
      if (result[0].expiracaoHoras && result[0].createdAt) {
        const createdAt = new Date(result[0].createdAt);
        const expiresAt = new Date(createdAt.getTime() + result[0].expiracaoHoras * 60 * 60 * 1000);
        if (new Date() > expiresAt) {
          return null; // Link expirado
        }
      }
      
      // Incrementar contador de acessos atomicamente
      await db.update(linksCompartilhaveis)
        .set({ acessos: sql`${linksCompartilhaveis.acessos} + 1` })
        .where(eq(linksCompartilhaveis.id, result[0].id));
      
      return result[0];
    }),

  create: protectedOrFuncionarioProcedure
    .input(z.object({
      condominioId: z.number(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "checklist", "ordem-servico"]),
      itemId: z.number(),
      editavel: z.boolean().default(false),
      expiracaoHoras: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const token = nanoid(32);
      const autorNome = ctx.user?.name || ctx.funcionario?.nome || "Usuário";
      const autorId = ctx.user?.id || null;
      const [result] = await db.insert(linksCompartilhaveis).values({
        condominioId: input.condominioId,
        tipo: input.tipo,
        itemId: input.itemId,
        token,
        editavel: input.editavel,
        expiracaoHoras: input.expiracaoHoras || 168,
        criadoPorId: autorId,
        criadoPorNome: autorNome,
      }).returning();
      // Registrar na timeline
      await registrarAtividadeLink(db, {
        condominioId: input.condominioId,
        linkId: result.id,
        acao: "criado",
        descricao: `Link/QR Code do tipo "${input.tipo}" criado por ${autorNome}`,
        usuarioId: autorId,
        usuarioNome: autorNome,
      });
      return { id: result.id, token };
    }),

  update: linkProcedure
    .input(z.object({
      id: z.number(),
      editavel: z.boolean().optional(),
      expiracaoHoras: z.number().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      // Buscar estado anterior para registar mudanças
      const [linkAnterior] = await db.select().from(linksCompartilhaveis).where(eq(linksCompartilhaveis.id, id)).limit(1);
      await db.update(linksCompartilhaveis).set(data).where(eq(linksCompartilhaveis.id, id));
      // Registrar na timeline
      if (linkAnterior) {
        const autorNome = ctx.user?.name || ctx.funcionario?.nome || "Usuário";
        const autorId = ctx.user?.id || null;
        const changes: string[] = [];
        if (data.editavel !== undefined && data.editavel !== linkAnterior.editavel) changes.push(`editável: ${linkAnterior.editavel} → ${data.editavel}`);
        if (data.expiracaoHoras !== undefined && data.expiracaoHoras !== linkAnterior.expiracaoHoras) changes.push(`expiração: ${linkAnterior.expiracaoHoras}h → ${data.expiracaoHoras}h`);
        if (data.ativo !== undefined && data.ativo !== linkAnterior.ativo) changes.push(`ativo: ${linkAnterior.ativo} → ${data.ativo}`);
        await registrarAtividadeLink(db, {
          condominioId: linkAnterior.condominioId,
          linkId: id,
          acao: "editado",
          descricao: `Link/QR Code editado por ${autorNome}: ${changes.join(", ") || "sem alterações"}`,
          valorAnterior: JSON.stringify({ editavel: linkAnterior.editavel, expiracaoHoras: linkAnterior.expiracaoHoras, ativo: linkAnterior.ativo }),
          valorNovo: JSON.stringify(data),
          usuarioId: autorId,
          usuarioNome: autorNome,
        });
      }
      return { success: true };
    }),

  delete: linkProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [link] = await db.select().from(linksCompartilhaveis).where(eq(linksCompartilhaveis.id, input.id)).limit(1);
      await db.update(linksCompartilhaveis).set({ ativo: false }).where(eq(linksCompartilhaveis.id, input.id));
      // Registrar na timeline
      if (link) {
        const autorNome = ctx.user?.name || ctx.funcionario?.nome || "Usuário";
        const autorId = ctx.user?.id || null;
        await registrarAtividadeLink(db, {
          condominioId: link.condominioId,
          linkId: input.id,
          acao: "cancelado",
          descricao: `Link/QR Code desativado por ${autorNome}`,
          usuarioId: autorId,
          usuarioNome: autorNome,
        });
      }
      return { success: true };
    }),

  compartilhar: linkProcedure
    .input(z.object({
      linkId: z.number(),
      membroId: z.number().optional(),
      membroNome: z.string().optional(),
      membroWhatsapp: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar dados do membro se membroId fornecido
      let nome = input.membroNome;
      let whatsapp = input.membroWhatsapp;
      
      if (input.membroId) {
        const membro = await db.select().from(membrosEquipe).where(eq(membrosEquipe.id, input.membroId)).limit(1);
        if (membro[0]) {
          nome = membro[0].nome;
          whatsapp = membro[0].whatsapp;
        }
      }
      
      // Registrar histórico de compartilhamento
      const autorNome = ctx.user?.name || ctx.funcionario?.nome || "Usuário";
      const autorId = ctx.user?.id || null;
      await db.insert(historicoCompartilhamentos).values({
        linkId: input.linkId,
        membroId: input.membroId || null,
        membroNome: nome || null,
        membroWhatsapp: whatsapp || null,
        compartilhadoPorId: autorId,
        compartilhadoPorNome: autorNome,
      }).returning();
      
      // Buscar link para retornar URL completa
      const link = await db.select().from(linksCompartilhaveis).where(eq(linksCompartilhaveis.id, input.linkId)).limit(1);
      
      // Registrar na timeline
      if (link[0]) {
        await registrarAtividadeLink(db, {
          condominioId: link[0].condominioId,
          linkId: input.linkId,
          acao: "compartilhado",
          descricao: `Link compartilhado por ${autorNome} com ${nome || "destinatário"}`,
          usuarioId: autorId,
          usuarioNome: autorNome,
        });
      }
      
      return { 
        success: true, 
        whatsapp,
        token: link[0]?.token,
      };
    }),

  historicoCompartilhamentos: linkProcedure
    .input(z.object({ linkId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(historicoCompartilhamentos)
        .where(eq(historicoCompartilhamentos.linkId, input.linkId))
        .orderBy(desc(historicoCompartilhamentos.createdAt));
    }),
});

export const itemCompartilhadoRouter = router({
  getVistoria: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const link = await db.select().from(linksCompartilhaveis)
        .where(and(
          eq(linksCompartilhaveis.token, input.token),
          eq(linksCompartilhaveis.tipo, "vistoria"),
          eq(linksCompartilhaveis.ativo, true)
        ))
        .limit(1);
      
      if (!link[0]) return null;
      
      // Verificar expiração
      if (link[0].expiracaoHoras && link[0].createdAt) {
        const createdAt = new Date(link[0].createdAt);
        const expiresAt = new Date(createdAt.getTime() + link[0].expiracaoHoras * 60 * 60 * 1000);
        if (new Date() > expiresAt) return null;
      }
      
      const vistoria = await db.select().from(vistorias).where(eq(vistorias.id, link[0].itemId)).limit(1);
      const imagens = await db.select().from(vistoriaImagens).where(eq(vistoriaImagens.vistoriaId, link[0].itemId));
      const timeline = await db.select().from(vistoriaTimeline).where(eq(vistoriaTimeline.vistoriaId, link[0].itemId)).orderBy(desc(vistoriaTimeline.createdAt));
      
      return { 
        item: vistoria[0] || null, 
        imagens, 
        timeline,
        editavel: link[0].editavel,
      };
    }),

  getManutencao: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const link = await db.select().from(linksCompartilhaveis)
        .where(and(
          eq(linksCompartilhaveis.token, input.token),
          eq(linksCompartilhaveis.tipo, "manutencao"),
          eq(linksCompartilhaveis.ativo, true)
        ))
        .limit(1);
      
      if (!link[0]) return null;
      
      // Verificar expiração
      if (link[0].expiracaoHoras && link[0].createdAt) {
        const createdAt = new Date(link[0].createdAt);
        const expiresAt = new Date(createdAt.getTime() + link[0].expiracaoHoras * 60 * 60 * 1000);
        if (new Date() > expiresAt) return null;
      }
      
      const manutencao = await db.select().from(manutencoes).where(eq(manutencoes.id, link[0].itemId)).limit(1);
      const imagens = await db.select().from(manutencaoImagens).where(eq(manutencaoImagens.manutencaoId, link[0].itemId));
      const timeline = await db.select().from(manutencaoTimeline).where(eq(manutencaoTimeline.manutencaoId, link[0].itemId)).orderBy(desc(manutencaoTimeline.createdAt));
      
      return { 
        item: manutencao[0] || null, 
        imagens, 
        timeline,
        editavel: link[0].editavel,
      };
    }),

  getOcorrencia: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const link = await db.select().from(linksCompartilhaveis)
        .where(and(
          eq(linksCompartilhaveis.token, input.token),
          eq(linksCompartilhaveis.tipo, "ocorrencia"),
          eq(linksCompartilhaveis.ativo, true)
        ))
        .limit(1);
      
      if (!link[0]) return null;
      
      // Verificar expiração
      if (link[0].expiracaoHoras && link[0].createdAt) {
        const createdAt = new Date(link[0].createdAt);
        const expiresAt = new Date(createdAt.getTime() + link[0].expiracaoHoras * 60 * 60 * 1000);
        if (new Date() > expiresAt) return null;
      }
      
      const ocorrencia = await db.select().from(ocorrencias).where(eq(ocorrencias.id, link[0].itemId)).limit(1);
      const imagens = await db.select().from(ocorrenciaImagens).where(eq(ocorrenciaImagens.ocorrenciaId, link[0].itemId));
      const timeline = await db.select().from(ocorrenciaTimeline).where(eq(ocorrenciaTimeline.ocorrenciaId, link[0].itemId)).orderBy(desc(ocorrenciaTimeline.createdAt));
      
      return { 
        item: ocorrencia[0] || null, 
        imagens, 
        timeline,
        editavel: link[0].editavel,
      };
    }),

  getChecklist: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const link = await db.select().from(linksCompartilhaveis)
        .where(and(
          eq(linksCompartilhaveis.token, input.token),
          eq(linksCompartilhaveis.tipo, "checklist"),
          eq(linksCompartilhaveis.ativo, true)
        ))
        .limit(1);
      
      if (!link[0]) return null;
      
      // Verificar expiração
      if (link[0].expiracaoHoras && link[0].createdAt) {
        const createdAt = new Date(link[0].createdAt);
        const expiresAt = new Date(createdAt.getTime() + link[0].expiracaoHoras * 60 * 60 * 1000);
        if (new Date() > expiresAt) return null;
      }
      
      const checklist = await db.select().from(checklists).where(eq(checklists.id, link[0].itemId)).limit(1);
      const itens = await db.select().from(checklistItens).where(eq(checklistItens.checklistId, link[0].itemId));
      const imagens = await db.select().from(checklistImagens).where(eq(checklistImagens.checklistId, link[0].itemId));
      const timeline = await db.select().from(checklistTimeline).where(eq(checklistTimeline.checklistId, link[0].itemId)).orderBy(desc(checklistTimeline.createdAt));
      
      return { 
        item: checklist[0] || null, 
        itens,
        imagens, 
        timeline,
        editavel: link[0].editavel,
      };
    }),
});

export const comentarioRouter = router({
  list: publicProcedure
    .input(z.object({
      itemId: z.number(),
      itemTipo: z.enum(["vistoria", "manutencao", "ocorrencia", "checklist"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const comentarios = await db.select().from(comentariosItem)
        .where(and(
          eq(comentariosItem.itemId, input.itemId),
          eq(comentariosItem.itemTipo, input.itemTipo),
          eq(comentariosItem.isInterno, false)
        ))
        .orderBy(desc(comentariosItem.createdAt));
      
      // Buscar anexos para cada comentÃ¡rio
      const comentariosComAnexos = await Promise.all(
        comentarios.map(async (comentario) => {
          const anexos = await db.select().from(anexosComentario)
            .where(eq(anexosComentario.comentarioId, comentario.id));
          const respostas = await db.select().from(respostasComentario)
            .where(eq(respostasComentario.comentarioId, comentario.id))
            .orderBy(respostasComentario.createdAt);
          return { ...comentario, anexos, respostas };
        })
      );
      
      return comentariosComAnexos;
    }),

  create: publicWriteProcedure
    .input(z.object({
      itemId: z.number(),
      itemTipo: z.enum(["vistoria", "manutencao", "ocorrencia", "checklist"]),
      condominioId: z.number(),
      autorNome: z.string().min(1),
      autorWhatsapp: z.string().optional(),
      autorEmail: z.string().optional(),
      autorFoto: z.string().optional(),
      texto: z.string().min(1),
      isInterno: z.boolean().optional(),
      anexos: z.array(z.object({
        url: z.string(),
        nome: z.string(),
        tipo: z.string(),
        tamanho: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Criar comentÃ¡rio
      const [result] = await db.insert(comentariosItem).values({
        itemId: input.itemId,
        itemTipo: input.itemTipo,
        condominioId: input.condominioId,
        autorNome: input.autorNome,
        autorWhatsapp: input.autorWhatsapp || null,
        autorEmail: input.autorEmail || null,
        autorFoto: input.autorFoto || null,
        texto: input.texto,
        isInterno: input.isInterno || false,
      }).returning();
      
      const comentarioId = result.id;
      
      // Criar anexos se houver
      if (input.anexos && input.anexos.length > 0) {
        await Promise.all(
          input.anexos.map(async (anexo) => {
            let url = anexo.url;
            // Upload base64 to S3 if needed
            if (url.startsWith('data:')) {
              try {
                const base64Data = url.replace(/^data:[^;]+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const uniqueId = nanoid(10);
                const ext = anexo.nome.split('.').pop() || 'bin';
                const fileKey = `comentarios/${input.condominioId}/${uniqueId}.${ext}`;
                const uploaded = await storagePut(fileKey, buffer, anexo.tipo);
                url = uploaded.url;
              } catch (e) {
                console.error("Erro ao fazer upload de anexo:", e);
              }
            }
            return db.insert(anexosComentario).values({
              comentarioId,
              url,
              nome: anexo.nome,
              tipo: anexo.tipo,
              tamanho: anexo.tamanho || null,
            }).returning();
          })
        );
      }
      
      return { id: comentarioId };
    }),

  delete: comentarioProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Excluir anexos primeiro
      await db.delete(anexosComentario).where(eq(anexosComentario.comentarioId, input.id));
      // Excluir respostas
      await db.delete(respostasComentario).where(eq(respostasComentario.comentarioId, input.id));
      // Excluir comentÃ¡rio
      await db.delete(comentariosItem).where(eq(comentariosItem.id, input.id));
      
      return { success: true };
    }),

  marcarLido: comentarioProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(comentariosItem)
        .set({ 
          lido: true, 
          lidoPorId: ctx.user.id,
          lidoEm: new Date(),
        })
        .where(eq(comentariosItem.id, input.id));
      
      return { success: true };
    }),

  responder: publicWriteProcedure
    .input(z.object({
      comentarioId: z.number(),
      autorNome: z.string().min(1),
      autorFoto: z.string().optional(),
      texto: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [result] = await db.insert(respostasComentario).values({
        comentarioId: input.comentarioId,
        autorNome: input.autorNome,
        autorFoto: input.autorFoto || null,
        texto: input.texto,
      }).returning();
      
      return { id: result.id };
    }),

  // Contar comentÃ¡rios nÃ£o lidos por item
  contarNaoLidos: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      itemTipo: z.enum(["vistoria", "manutencao", "ocorrencia", "checklist"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;
      
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(comentariosItem)
        .where(and(
          eq(comentariosItem.itemId, input.itemId),
          eq(comentariosItem.itemTipo, input.itemTipo),
          eq(comentariosItem.lido, false)
        ));
      
      return result[0]?.count || 0;
    }),

  // Listar todos os comentÃ¡rios nÃ£o lidos do condomÃ­nio
  listNaoLidos: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      return db.select().from(comentariosItem)
        .where(and(
          eq(comentariosItem.condominioId, input.condominioId),
          eq(comentariosItem.lido, false)
        ))
        .orderBy(desc(comentariosItem.createdAt));
    }),
});

